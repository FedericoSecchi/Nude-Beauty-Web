import type { Context } from '@netlify/functions';
import { obtenerOrder, verifyXSignature, type MpOrder } from './_shared/mp';
import { actualizar, entornoDe, storePedidos, type PedidoGuardado } from './_shared/blobs';
import { procesarAviso } from './_shared/avisos';
import { aplicarOrder } from './_shared/pagos';

// Webhook de Mercado Pago · Checkout Pro con la API de Orders. En el panel de MP se tilda el evento
// «Order (Mercado Pago)»: llega un POST con ?data.id=ORD…&type=order y body
// { action: "order.processed", type: "order", data: { id: "ORD…" } }.
// 1. Solo se procesan notificaciones de order; payment (Preferences/IPN viejas) u otros tipos → 200 sin
//    tocar pedidos, se loguea el tipo.
// 2. Firma x-signature validada con MP_WEBHOOK_SECRET (manifest con data.id de la query en minúsculas).
// 3. GET /v1/orders/{id}: el estado sale de la API, nunca del body de la notificación.
// 4. Escritura condicional e idempotente: la misma notificación repetida no cambia nada ni re-avisa.

interface Notification {
  type?: string;
  action?: string;
  data?: { id?: string };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Para loguear un valor que manda un tercero sin meter basura ni datos en el log. */
const limpio = (v: string) => v.replace(/[^\w.-]/g, '').slice(0, 40) || '(vacío)';

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

  const url = new URL(req.url);
  const tipo = url.searchParams.get('type') || body.type || url.searchParams.get('topic') || '';
  if (tipo !== 'order') {
    ctx.log(`[mp-webhook] notificación ignorada: tipo ${limpio(tipo)}`);
    return new Response('ok', { status: 200 });
  }

  // El id firmado es el de la query (doc oficial); si el body trae otro, no se confía en ninguno.
  const idQuery = url.searchParams.get('data.id') || '';
  const idBody = body.data?.id || '';
  if (idQuery && idBody && idQuery.toLowerCase() !== idBody.toLowerCase()) {
    ctx.log('[mp-webhook] data.id de la query y del body no coinciden');
    return json(401, { error: 'data.id inconsistente' });
  }
  const orderId = idQuery || idBody;

  const verif = verifyXSignature({
    signature: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId: orderId,
    secret: process.env.MP_WEBHOOK_SECRET,
  });
  if (!verif.ok) {
    ctx.log(`[mp-webhook] firma rechazada: ${verif.reason}`);
    return json(401, { error: verif.reason });
  }
  if (!orderId) {
    return json(400, { error: 'falta data.id' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    ctx.log('[mp-webhook] MP_ACCESS_TOKEN no configurado');
    return new Response('mp token no configurado', { status: 500 });
  }

  let order: MpOrder;
  try {
    order = await obtenerOrder(orderId, accessToken);
  } catch (err) {
    ctx.log(`[mp-webhook] consulta de order falló: ${(err as Error).message}`);
    // 500 para que MP reintente.
    return new Response('mp fetch error', { status: 500 });
  }

  const pedidoId = order.external_reference;
  if (!pedidoId) {
    ctx.log(`[mp-webhook] order ${limpio(orderId)} sin external_reference`);
    return new Response('sin external_reference', { status: 200 });
  }

  // El pedido puede estar en el store del entorno o, si lo creó un e2e, en el de pruebas.
  // `visto` guarda el pedido leído aunque aplicarOrder no cambie nada (notificación repetida).
  const entorno = entornoDe(ctx);
  const ahoraIso = new Date().toISOString();
  const visto: { pedido?: PedidoGuardado; otraOrder?: boolean } = {};
  const mutar = (p: PedidoGuardado): PedidoGuardado | null => {
    visto.pedido = p;
    // Una order que no es la que creamos para este pedido no lo toca.
    if (p.pago.mpOrderId && p.pago.mpOrderId !== order.id) {
      visto.otraOrder = true;
      return null;
    }
    const nuevo = aplicarOrder(p, order, ahoraIso);
    return nuevo === p ? null : nuevo;
  };

  let store = storePedidos(entorno);
  let escrito = await actualizar<PedidoGuardado>(store, pedidoId, mutar);
  if (!visto.pedido) {
    store = storePedidos(entorno, true);
    escrito = await actualizar<PedidoGuardado>(store, pedidoId, mutar);
  }
  if (!visto.pedido) {
    ctx.log(`[mp-webhook] pedido ${limpio(pedidoId)} no existe`);
    return new Response('pedido no encontrado', { status: 200 });
  }
  if (visto.otraOrder) {
    ctx.log(`[mp-webhook] order ${limpio(order.id)} no es la del pedido ${limpio(pedidoId)}`);
    return new Response('ok', { status: 200 });
  }
  const pedido = escrito ?? visto.pedido;

  // Aviso a n8n cuando el pedido queda pagado o a revisar y el aviso todavía no salió (aunque una
  // notificación anterior lo haya dejado así y su aviso fallara). procesarAviso toma un lease con
  // escritura condicional: dos notificaciones simultáneas no mandan dos avisos, y una vez enviado
  // (avisoEnviado) no se repite. Si falla, lo reintenta la función programada `reintentar-avisos`.
  if ((pedido.estado === 'pagado' || pedido.estado === 'revisar') && !pedido.avisoEnviado) {
    await procesarAviso(store, pedidoId, { respetarBackoff: false });
  }

  return new Response('ok', { status: 200 });
};

export const config = { path: '/.netlify/functions/mp-webhook' };
