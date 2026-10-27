// Mercado Pago helpers.
// - verifyXSignature: valida el header x-signature del webhook según la doc oficial
//   (manifest con data.id, x-request-id y ts, HMAC-SHA256 con MP_WEBHOOK_SECRET).
// - fetchPayment: consulta el pago a la API de MP para confirmar estado real antes de marcar pagado.
// - createPreference: crea la preferencia de Checkout Pro con ítems ya recalculados.
import { createHmac, timingSafeEqual } from 'node:crypto';

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
    const [k, v] = part.trim().split('=');
    if (!k || !v) continue;
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

  // Manifest por doc oficial: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  const parts: string[] = [];
  if (input.dataId) parts.push(`id:${input.dataId};`);
  if (input.requestId) parts.push(`request-id:${input.requestId};`);
  parts.push(`ts:${parsed.ts};`);
  const manifest = parts.join('');

  const hmac = createHmac('sha256', input.secret).update(manifest).digest('hex');
  if (!constantTimeEq(hmac, parsed.v1)) {
    return { ok: false, reason: 'firma inválida' };
  }
  return { ok: true };
}

export interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
}

export async function fetchPayment(
  paymentId: string,
  accessToken: string,
): Promise<MpPayment> {
  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`MP payments API ${res.status}`);
  }
  return (await res.json()) as MpPayment;
}

export interface MpItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: 'ARS';
}

export interface MpPreferenceInput {
  pedidoId: string;
  /** Líneas a precio de lista (como las calcula lib/pricing). */
  lineas: { title: string; quantity: number; unit_price: number }[];
  comprador: { nombre: string; email: string };
  envio: number;
  /** Total final del pedido (lista − descuentos + envío), calculado en el servidor. */
  total: number;
  siteUrl: string;
  notificationUrl: string;
}

export interface MpPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

/**
 * Ítems de la preferencia de Checkout Pro sin precios ≤ 0: los descuentos se reparten en el precio
 * unitario de cada línea (redondeo a pesos enteros) y el resto del redondeo va a la última línea.
 * Si la última línea tiene más de una unidad, el resto se aplica a una sola unidad separada, para
 * que la suma de unit_price × quantity sea exactamente el total del pedido.
 */
export function itemsPreferencia(input: Pick<MpPreferenceInput, 'lineas' | 'envio' | 'total'>): MpItem[] {
  if (!input.lineas.length) throw new Error('preferencia sin líneas');
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
    currency_id: 'ARS',
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
  if (envio > 0) items.push({ title: 'Envío', quantity: 1, unit_price: envio, currency_id: 'ARS' });

  if (items.some((i) => !Number.isInteger(i.unit_price) || i.unit_price <= 0)) {
    throw new Error('preferencia con precio unitario inválido');
  }
  return items;
}

export async function createPreference(
  input: MpPreferenceInput,
  accessToken: string,
): Promise<MpPreference> {
  const items = itemsPreferencia(input);

  const body = {
    items,
    external_reference: input.pedidoId,
    notification_url: input.notificationUrl,
    back_urls: {
      success: `${input.siteUrl}/pedido/?id=${encodeURIComponent(input.pedidoId)}`,
      failure: `${input.siteUrl}/pedido/?id=${encodeURIComponent(input.pedidoId)}&estado=fallo`,
      pending: `${input.siteUrl}/pedido/?id=${encodeURIComponent(input.pedidoId)}&estado=pendiente`,
    },
    payer: {
      name: input.comprador.nombre,
      email: input.comprador.email,
    },
    statement_descriptor: 'NUDE',
  };

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    signal: AbortSignal.timeout(20_000),
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP preferences API ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as MpPreference;
}
