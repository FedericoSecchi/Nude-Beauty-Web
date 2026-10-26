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

export interface MpPreferenceInput {
  pedidoId: string;
  items: { title: string; quantity: number; unit_price: number; currency_id: string }[];
  comprador: { nombre: string; email: string };
  envio: number;
  descuentos: { motivo: string; monto: number }[];
  siteUrl: string;
  notificationUrl: string;
}

export interface MpPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export async function createPreference(
  input: MpPreferenceInput,
  accessToken: string,
): Promise<MpPreference> {
  const items = [
    ...input.items,
    ...(input.envio > 0
      ? [{ title: 'Envío', quantity: 1, unit_price: input.envio, currency_id: 'ARS' }]
      : []),
    ...input.descuentos
      .filter((d) => d.monto > 0)
      .map((d) => ({ title: d.motivo, quantity: 1, unit_price: -d.monto, currency_id: 'ARS' })),
  ];

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
