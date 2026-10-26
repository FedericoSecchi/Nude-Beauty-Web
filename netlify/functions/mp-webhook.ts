import type { Context } from '@netlify/functions';
import { fetchPayment, verifyXSignature } from './_shared/mp';
import { actualizar, entornoDe, storePedidos, type PedidoGuardado } from './_shared/blobs';
import { procesarAviso } from './_shared/avisos';
import { aplicarPago } from './_shared/pagos';

interface Notification {
  type?: string;
  action?: string;
  data?: { id?: string };
  resource?: string | { id?: string };
}

export default async (req: Request, ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  let body: Notification = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as Notification) : {};
  } catch {
    return new Response('json inválido', { status: 400 });
  }

  // URL puede traer también ?topic=payment&id=... (webhooks viejos).
  const url = new URL(req.url);
  const queryTopic = url.searchParams.get('topic') || url.searchParams.get('type');
  const queryId = url.searchParams.get('data.id') || url.searchParams.get('id');

  const tipo = body.type || body.action?.split('.')[0] || queryTopic || '';
  const dataId = body.data?.id || queryId || resourceId(body.resource) || '';

  const sig = req.headers.get('x-signature');
  const reqId = req.headers.get('x-request-id');

  const verif = verifyXSignature({
    signature: sig,
    requestId: reqId,
    dataId,
    secret: process.env.MP_WEBHOOK_SECRET,
  });
  if (!verif.ok) {
    ctx.log(`[mp-webhook] firma rechazada: ${verif.reason}`);
    return new Response(JSON.stringify({ error: verif.reason }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!tipo.toLowerCase().startsWith('payment') || !dataId) {
    // ACK: notificaciones que no son de pago las ignoramos limpiamente.
    return new Response('ok', { status: 200 });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    ctx.log('[mp-webhook] MP_ACCESS_TOKEN no configurado');
    return new Response('mp token no configurado', { status: 500 });
  }

  let payment;
  try {
    payment = await fetchPayment(dataId, accessToken);
  } catch (err) {
    ctx.log(`[mp-webhook] fetch pago falló: ${(err as Error).message}`);
    // 500 para que MP reintente.
    return new Response('mp fetch error', { status: 500 });
  }

  const pedidoId = payment.external_reference;
  if (!pedidoId) {
    ctx.log(`[mp-webhook] pago ${dataId} sin external_reference`);
    return new Response('sin external_reference', { status: 200 });
  }

  // El pedido puede estar en el store del entorno o, si lo creó un e2e, en el de pruebas.
  const entorno = entornoDe(ctx);
  let store = storePedidos(entorno);
  const ahoraIso = new Date().toISOString();
  let pedido = await actualizar<PedidoGuardado>(store, pedidoId, (p) => aplicarPago(p, payment, ahoraIso));
  if (!pedido) {
    store = storePedidos(entorno, true);
    pedido = await actualizar<PedidoGuardado>(store, pedidoId, (p) => aplicarPago(p, payment, ahoraIso));
  }
  if (!pedido) {
    ctx.log(`[mp-webhook] pedido ${pedidoId} no existe`);
    return new Response('pedido no encontrado', { status: 200 });
  }

  // Aviso: cada vez que MP confirma el pago y el aviso todavía no salió (aunque el pedido ya
  // estuviera pagado por una notificación anterior cuyo aviso falló). procesarAviso toma un lease
  // con escritura condicional, así dos notificaciones simultáneas no mandan dos avisos.
  // Si falla, queda registrado y lo reintenta la función programada `reintentar-avisos`.
  const pagadoAhora = payment.status === 'approved';
  if (pagadoAhora && !pedido.avisoEnviado) {
    await procesarAviso(store, pedidoId, { respetarBackoff: false });
  }

  return new Response('ok', { status: 200 });
};

function resourceId(resource?: Notification['resource']): string {
  if (!resource) return '';
  if (typeof resource === 'string') {
    const m = resource.match(/\/(\d+)(?:\?|$)/);
    return m ? m[1] : '';
  }
  return resource.id ?? '';
}

export const config = { path: '/.netlify/functions/mp-webhook' };
