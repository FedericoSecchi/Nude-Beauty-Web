// Mercado Pago · Checkout Pro con la API de Orders (doc oficial en docs/PROGRESS.md › Orders).
// - verifyXSignature: valida el header x-signature del webhook (manifest con data.id en minúsculas,
//   x-request-id y ts; HMAC-SHA256 con MP_WEBHOOK_SECRET).
// - obtenerOrder: consulta la order a la API (GET /v1/orders/{id}) antes de tocar el pedido.
// - armarOrder / crearOrder: arma y crea la order (POST /v1/orders) con ítems ya recalculados.
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.mercadopago.com';

export interface MpVerifyInput {
  signature: string | null | undefined;
  requestId: string | null | undefined;
  dataId: string | null | undefined;
  secret: string | undefined;
}

export interface MpVerifyResult {
  ok: boolean;
  reason?: string;
}

function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const out: { ts?: string; v1?: string } = {};
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 'ts') out.ts = v;
    if (k === 'v1') out.v1 = v;
  }
  return out;
}

function constantTimeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

export function verifyXSignature(input: MpVerifyInput): MpVerifyResult {
  if (!input.secret) {
    return { ok: false, reason: 'MP_WEBHOOK_SECRET no configurado' };
  }
  if (!input.signature) return { ok: false, reason: 'falta x-signature' };
  const parsed = parseSignatureHeader(input.signature);
  if (!parsed.ts || !parsed.v1) return { ok: false, reason: 'x-signature mal formado' };

  // Manifest por doc oficial: id:<data.id>;request-id:<x-request-id>;ts:<ts>; — el id de una order
  // (ORD01…) va en minúsculas; lo que no vino se saca del manifest.
  const parts: string[] = [];
  if (input.dataId) parts.push(`id:${input.dataId.toLowerCase()};`);
  if (input.requestId) parts.push(`request-id:${input.requestId};`);
  parts.push(`ts:${parsed.ts};`);
  const manifest = parts.join('');

  const hmac = createHmac('sha256', input.secret).update(manifest).digest('hex');
  if (!constantTimeEq(hmac, parsed.v1)) {
    return { ok: false, reason: 'firma inválida' };
  }
  return { ok: true };
}

/** Lo que usamos de GET /v1/orders/{id}. Los montos vienen como string ("1000.00"). */
export interface MpOrder {
  id: string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  total_paid_amount?: string;
  currency?: string;
  transactions?: {
    payments?: { id?: string; status?: string; status_detail?: string; paid_amount?: string }[];
  };
}

export async function obtenerOrder(orderId: string, accessToken: string): Promise<MpOrder> {
  const res = await fetch(`${API}/v1/orders/${encodeURIComponent(orderId)}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`MP orders API ${res.status}`);
  }
  return (await res.json()) as MpOrder;
}

export interface MpOrderInput {
  pedidoId: string;
  /** Líneas a precio de lista (como las calcula lib/pricing; el nombre ya trae el tono). */
  lineas: { title: string; quantity: number; unit_price: number }[];
  comprador: { nombre: string; email: string };
  envio: number;
  /** Total final del pedido (lista − descuentos + envío), calculado en el servidor. */
  total: number;
  siteUrl: string;
}

export interface MpItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface MpOrderCreada {
  id: string;
  status?: string;
  checkout_url: string;
}

/**
 * Ítems de la order sin precios ≤ 0: los descuentos se reparten en el precio unitario de cada línea
 * (redondeo a pesos enteros) y el resto del redondeo va a la última línea. Si la última línea tiene
 * más de una unidad, el resto se aplica a una sola unidad separada, para que la suma de
 * unit_price × quantity sea exactamente el total del pedido (la API exige que coincida con total_amount).
 */
export function itemsOrder(input: Pick<MpOrderInput, 'lineas' | 'envio' | 'total'>): MpItem[] {
  if (!input.lineas.length) throw new Error('order sin líneas');
  const envio = Math.max(0, Math.round(input.envio));
  const subtotal = input.lineas.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const objetivo = Math.round(input.total) - envio;
  if (subtotal <= 0 || objetivo <= 0 || objetivo > subtotal) {
    throw new Error(`totales inconsistentes (subtotal ${subtotal}, productos ${objetivo})`);
  }
  const factor = objetivo / subtotal;

  const items: MpItem[] = input.lineas.map((l) => ({
    title: l.title,
    quantity: l.quantity,
    unit_price: Math.round(l.unit_price * factor),
  }));
  const resto = objetivo - items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  if (resto !== 0) {
    const ultima = items[items.length - 1];
    if (ultima.quantity === 1) {
      ultima.unit_price += resto;
    } else {
      ultima.quantity -= 1;
      items.push({ ...ultima, quantity: 1, unit_price: ultima.unit_price + resto });
    }
  }
  if (envio > 0) items.push({ title: 'Envío', quantity: 1, unit_price: envio });

  if (items.some((i) => !Number.isInteger(i.unit_price) || i.unit_price <= 0)) {
    throw new Error('order con precio unitario inválido');
  }
  return items;
}

const monto = (n: number) => n.toFixed(2);

/** Body de POST /v1/orders para Checkout Pro (type online, processing_mode manual). */
export function armarOrder(input: MpOrderInput) {
  const items = itemsOrder(input);
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const pedido = `${input.siteUrl}/pedido/?id=${encodeURIComponent(input.pedidoId)}`;
  return {
    type: 'online',
    processing_mode: 'manual',
    total_amount: monto(total),
    external_reference: input.pedidoId,
    payer: {
      email: input.comprador.email,
      first_name: input.comprador.nombre,
    },
    items: items.map((i) => ({ title: i.title, quantity: i.quantity, unit_price: monto(i.unit_price) })),
    config: {
      statement_descriptor: 'NUDE',
      online: {
        success_url: pedido,
        failure_url: `${pedido}&estado=fallo`,
        pending_url: `${pedido}&estado=pendiente`,
        auto_return: 'approved',
      },
    },
  };
}

/**
 * Crea la order. `idempotencyKey` va en X-Idempotency-Key (obligatorio en la API): un UUID por pedido,
 * así un reintento del mismo pedido nunca crea dos orders.
 */
export async function crearOrder(
  input: MpOrderInput,
  accessToken: string,
  idempotencyKey: string,
): Promise<MpOrderCreada> {
  const body = armarOrder(input);
  const res = await fetch(`${API}/v1/orders`, {
    signal: AbortSignal.timeout(20_000),
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP orders API ${res.status}: ${text.slice(0, 200)}`);
  }
  const order = (await res.json()) as MpOrderCreada;
  if (!order.id || !order.checkout_url) throw new Error('MP orders API: respuesta sin id o checkout_url');
  if (!esUrlDeMercadoPago(order.checkout_url)) throw new Error('MP orders API: checkout_url fuera de Mercado Pago');
  return order;
}

/** La clienta solo se redirige a un dominio de Mercado Pago por https (el dominio cambia por país). */
export function esUrlDeMercadoPago(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /(^|\.)mercadopago\.(com(\.[a-z]{2})?|cl)$/.test(u.hostname);
  } catch {
    return false;
  }
}
