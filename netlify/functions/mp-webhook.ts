import type { Context } from '@netlify/functions';
import { fetchPayment, verifyXSignature } from './_shared/mp';
import { guardar, leer } from './_shared/blobs';

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

  const pedido = await leer(pedidoId);
  if (!pedido) {
    ctx.log(`[mp-webhook] pedido ${pedidoId} no existe`);
    return new Response('pedido no encontrado', { status: 200 });
  }

  const estadoMp = payment.status;
  const yaEstabaPagado = pedido.estado === 'pagado';
  const pagadoAhora = estadoMp === 'approved';

  pedido.pago.mpPaymentId = String(payment.id);
  pedido.pago.mpEstado = estadoMp;
  pedido.actualizado = new Date().toISOString();

  if (pagadoAhora && !yaEstabaPagado) {
    pedido.estado = 'pagado';
    pedido.tipo = 'pedido_pagado';
  } else if (estadoMp === 'rejected' || estadoMp === 'cancelled') {
    if (!yaEstabaPagado) pedido.estado = 'cancelado';
  }

  await guardar(pedido);

  // Idempotencia: solo mandamos aviso si pasa de "no pagado" a "pagado" y no se mandó antes.
  if (pagadoAhora && !yaEstabaPagado && !pedido.avisoEnviado) {
    try {
      await enviarAviso(pedido);
      pedido.avisoEnviado = true;
      await guardar(pedido);
    } catch (err) {
      ctx.log(`[mp-webhook ${pedidoId}] aviso falló: ${(err as Error).message}`);
      // MP reintenta si devolvemos 5xx; en este caso el pedido ya está guardado como pagado,
      // así que respondemos 200 y el aviso se reintentará desde el próximo webhook o manualmente.
    }
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

async function enviarAviso(p: Awaited<ReturnType<typeof leer>>): Promise<void> {
  if (!p || p.source === 'e2e') return;
  const url = process.env.ORDER_WEBHOOK_URL;
  if (!url) throw new Error('ORDER_WEBHOOK_URL no configurado');
  const payload = {
    tipo: p.tipo,
    id: p.id,
    creado: p.creado,
    estado: p.estado,
    comprador: p.comprador,
    entrega: p.entrega,
    items: p.items,
    subtotal: p.subtotal,
    descuentos: p.descuentos,
    envio: p.envio,
    total: p.total,
    pago: {
      medio: p.pago.medio,
      mpPaymentId: p.pago.mpPaymentId,
      mpEstado: p.pago.mpEstado,
    },
    notas: p.notas,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.ORDER_WEBHOOK_SECRET
        ? { 'x-nude-secret': process.env.ORDER_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`aviso HTTP ${res.status}`);
}

export const config = { path: '/.netlify/functions/mp-webhook' };
