import type { Context } from '@netlify/functions';
import { leer } from './_shared/blobs';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const e2eToken = req.headers.get('x-e2e-token');
  const E2E_TOKEN = process.env.E2E_TOKEN;
  const isE2E = Boolean(e2eToken && E2E_TOKEN && e2eToken === E2E_TOKEN);

  if (!id) {
    return new Response(JSON.stringify({ error: 'falta id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const pedido = await leer(id, isE2E);
  if (!pedido) {
    return new Response(JSON.stringify({ error: 'pedido no encontrado' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Devolvemos solo lo público: nada de datos personales.
  const publico = {
    id: pedido.id,
    estado: pedido.estado,
    medio: pedido.pago.medio,
    items: pedido.items.map((i) => ({
      slug: i.slug,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
    })),
    subtotal: pedido.subtotal,
    descuentos: pedido.descuentos,
    envio: pedido.envio,
    total: pedido.total,
    reservaHoras: pedido.pago.reservaHoras,
    alias: pedido.pago.alias,
    cbu: pedido.pago.cbu,
    titular: pedido.pago.titular,
    entrega: { modo: pedido.entrega.modo, zona: pedido.entrega.zona },
    creado: pedido.creado,
  };

  return new Response(JSON.stringify(publico), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
};

export const config = { path: '/.netlify/functions/estado-pedido' };
