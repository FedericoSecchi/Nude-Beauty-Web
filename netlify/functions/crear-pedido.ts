import type { Context } from '@netlify/functions';
import { loadSnapshot } from './_shared/catalogo';
import { generarIdPedido } from './_shared/ids';
import { entornoDe, storePedidos, type PedidoGuardado } from './_shared/blobs';
import { procesarAviso } from './_shared/avisos';
import { baseUrlSitio } from './_shared/sitio';
import { validarPayload } from './_shared/validar';
import { createPreference } from './_shared/mp';
import { calcularTotal, PricingError, type MedioPago } from '../../lib/pricing';
import { cotizarEnvio, NOMBRE_RETIRO, ShippingError } from '../../lib/shipping';
import { modoVenta } from '../../lib/modo-venta.mjs';

interface CarritoItemInput {
  slug: string;
  cantidad: number;
}

interface Payload {
  items: CarritoItemInput[];
  comprador: {
    nombre: string;
    email: string;
    telefono: string;
    dni?: string;
  };
  entrega:
    | {
        modo: 'envio';
        zonaId: string;
        direccion: string;
        localidad: string;
        provincia: string;
        cp: string;
      }
    | { modo: 'retiro' };
  medioPago: MedioPago;
  terminos: boolean;
  source?: 'web' | 'e2e';
  notas?: string;
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ error: message, ...extra }),
    { status: 400, headers: { 'content-type': 'application/json' } },
  );
}

function serverError(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 500, headers: { 'content-type': 'application/json' } },
  );
}

export default async (req: Request, ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let snapshot;
  try {
    snapshot = loadSnapshot();
  } catch (err) {
    return serverError(`catálogo no disponible: ${(err as Error).message}`);
  }

  // Sin medio de pago o sin ORDER_WEBHOOK_URL el sitio está en modo pedido por WhatsApp: no se procesa
  // ni se guarda ningún pedido (misma regla que el build, con lo que vio el build). Así nunca entra un
  // pedido cobrado sin aviso a Soledad. Va antes de leer el body: en este modo cualquier POST se
  // rechaza igual.
  if (modoVenta(snapshot.tienda, snapshot.mpHabilitado ?? false, snapshot.webhookAviso ?? false) === 'whatsapp') {
    return new Response(
      JSON.stringify({ error: 'La tienda toma los pedidos por WhatsApp por ahora.' }),
      { status: 409, headers: { 'content-type': 'application/json' } },
    );
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return badRequest('JSON inválido');
  }

  // Modo e2e: requiere header x-e2e-token y E2E_TOKEN configurado.
  const e2eToken = req.headers.get('x-e2e-token');
  const E2E_TOKEN = process.env.E2E_TOKEN;
  const isE2E = Boolean(e2eToken && E2E_TOKEN && e2eToken === E2E_TOKEN);
  if (payload.source === 'e2e' && !isE2E) {
    return badRequest('source=e2e sin token válido');
  }

  try {
    validarPayload(payload);
  } catch (err) {
    return badRequest((err as Error).message);
  }

  // Recálculo server-side desde el snapshot del build.

  let totales;
  let envio;
  try {
    // Zonas «a coordinar»: si algún día hay un proveedor (Correo Argentino, Andreani), cotiza acá.
    envio = await cotizarEnvio(
      payload.entrega.modo === 'envio'
        ? { modo: 'envio', zonaId: payload.entrega.zonaId }
        : { modo: 'retiro' },
      snapshot.envios,
      payload.entrega.modo === 'envio'
        ? {
            cp: payload.entrega.cp,
            localidad: payload.entrega.localidad,
            provincia: payload.entrega.provincia,
            items: payload.items.map((i) => ({ slug: i.slug, cantidad: i.cantidad })),
          }
        : null,
    );
    totales = calcularTotal(
      payload.items.map((i) => ({ slug: i.slug, cantidad: i.cantidad })),
      snapshot.productos,
      snapshot.tienda,
      payload.medioPago,
      envio.costo,
    );
  } catch (err) {
    if (err instanceof PricingError || err instanceof ShippingError) {
      return badRequest(err.message);
    }
    return serverError((err as Error).message);
  }

  const entorno = entornoDe(ctx);
  const id = generarIdPedido();
  const ahora = new Date().toISOString();

  const esMp = payload.medioPago === 'mercadopago';
  const pedido: PedidoGuardado = {
    id,
    tipo: esMp ? 'pedido_pagado' : 'pedido_transferencia',
    estado: esMp ? 'pendiente_mp' : 'pendiente_transferencia',
    creado: ahora,
    actualizado: ahora,
    source: isE2E ? 'e2e' : 'web',
    comprador: {
      nombre: payload.comprador.nombre.trim(),
      email: payload.comprador.email.trim(),
      telefono: payload.comprador.telefono.trim(),
      dni: payload.comprador.dni?.trim(),
    },
    entrega:
      payload.entrega.modo === 'envio'
        ? {
            modo: 'envio',
            zona: envio.zona?.nombre ?? '',
            direccion: payload.entrega.direccion,
            localidad: payload.entrega.localidad,
            provincia: payload.entrega.provincia,
            cp: payload.entrega.cp,
            ...(envio.proveedor ? { proveedorEnvio: envio.proveedor } : {}),
          }
        : {
            modo: 'retiro',
            zona: NOMBRE_RETIRO,
            ...(snapshot.direccionRetiro ? { direccionRetiro: snapshot.direccionRetiro } : {}),
          },
    items: totales.lineas.map((l) => ({
      slug: l.slug,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
    })),
    subtotal: totales.subtotal,
    descuentos: totales.descuentos,
    envio: totales.envio,
    total: totales.total,
    pago: {
      medio: payload.medioPago,
      reservaHoras: snapshot.tienda.horasReservaTransferencia,
      alias: snapshot.tienda.alias,
      cbu: snapshot.tienda.cbu,
      titular: snapshot.tienda.titularCuenta,
    },
    notas: payload.notas?.trim() || undefined,
  };

  // Si es MP y hay credenciales, creamos preferencia.
  const checkoutMode = (process.env.CHECKOUT_MODE || 'propio').toLowerCase();
  if (esMp && checkoutMode === 'propio' && process.env.MP_ACCESS_TOKEN) {
    try {
      const siteUrl = baseUrlSitio({
        produccion: entorno.produccion,
        URL: process.env.URL,
        DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
        origen: new URL(req.url).origin,
      });
      const notificationUrl = `${siteUrl}/.netlify/functions/mp-webhook`;
      const preference = await createPreference(
        {
          pedidoId: id,
          lineas: totales.lineas.map((l) => ({
            title: l.nombre,
            quantity: l.cantidad,
            unit_price: l.precioUnitario,
          })),
          comprador: pedido.comprador,
          envio: totales.envio,
          total: totales.total,
          siteUrl,
          notificationUrl,
        },
        process.env.MP_ACCESS_TOKEN,
      );
      pedido.pago.mpPreferenceId = preference.id;
      pedido.pago.mpInitPoint = preference.init_point;
    } catch (err) {
      return serverError(`Mercado Pago: ${(err as Error).message}`);
    }
  } else if (esMp && checkoutMode === 'tiendanube') {
    // Plan B: el UI redirige al carrito de Tiendanube; devolvemos la señal.
    pedido.pago.mpInitPoint =
      'https://nudecosmeticaclean.mitiendanube.com/carrito/';
  } else if (esMp && !process.env.MP_ACCESS_TOKEN) {
    return badRequest('Mercado Pago no está habilitado en este deploy', {
      hint: 'MP_ACCESS_TOKEN no configurado — probá con transferencia.',
    });
  }

  const store = storePedidos(entorno, isE2E);
  try {
    const res = await store.setJSON(pedido.id, pedido, { onlyIfNew: true });
    if (!res.modified) throw new Error('id de pedido repetido');
  } catch (err) {
    return serverError(`no se pudo guardar el pedido: ${(err as Error).message}`);
  }

  // Transferencia: el aviso sale ya. Si falla queda guardado y lo reintenta `reintentar-avisos`.
  if (!esMp) {
    await procesarAviso(store, pedido.id, { respetarBackoff: false });
  }

  return new Response(
    JSON.stringify({
      id: pedido.id,
      estado: pedido.estado,
      medio: pedido.pago.medio,
      initPoint: pedido.pago.mpInitPoint,
      total: pedido.total,
    }),
    { status: 201, headers: { 'content-type': 'application/json' } },
  );
};

export const config = { path: '/.netlify/functions/crear-pedido' };
