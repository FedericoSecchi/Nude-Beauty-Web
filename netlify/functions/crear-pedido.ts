import type { Context } from '@netlify/functions';
import { loadSnapshot } from './_shared/catalogo';
import { generarIdPedido } from './_shared/ids';
import { guardar, type PedidoGuardado } from './_shared/blobs';
import { createPreference } from './_shared/mp';
import { calcularTotal, PricingError, type MedioPago } from '../../lib/pricing';
import { calcularEnvio, ShippingError } from '../../lib/shipping';

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

function assertString(v: unknown, field: string, max = 200): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new Error(`${field} requerido`);
  }
  const trimmed = v.trim();
  if (trimmed.length > max) throw new Error(`${field} supera ${max} caracteres`);
  return trimmed;
}

function assertEmail(v: unknown): string {
  const s = assertString(v, 'email', 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('email inválido');
  return s;
}

export default async (req: Request, ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
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

  // Validaciones mínimas.
  try {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('items vacío');
    }
    if (payload.items.length > 50) throw new Error('demasiados items');
    assertString(payload.comprador?.nombre, 'nombre', 120);
    assertEmail(payload.comprador?.email);
    assertString(payload.comprador?.telefono, 'telefono', 40);
    if (!payload.terminos) throw new Error('tenés que aceptar los términos');
    if (!payload.entrega || !payload.entrega.modo) throw new Error('entrega requerida');
    if (payload.entrega.modo === 'envio') {
      assertString(payload.entrega.zonaId, 'zona de envío', 40);
      assertString(payload.entrega.direccion, 'dirección', 200);
      assertString(payload.entrega.localidad, 'localidad', 120);
      assertString(payload.entrega.provincia, 'provincia', 120);
      assertString(payload.entrega.cp, 'código postal', 20);
    } else if (payload.entrega.modo !== 'retiro') {
      throw new Error('entrega.modo inválido');
    }
    if (payload.medioPago !== 'mercadopago' && payload.medioPago !== 'transferencia') {
      throw new Error('medio de pago inválido');
    }
  } catch (err) {
    return badRequest((err as Error).message);
  }

  // Recálculo server-side desde el snapshot del build.
  let snapshot;
  try {
    snapshot = loadSnapshot();
  } catch (err) {
    return serverError(`catálogo no disponible: ${(err as Error).message}`);
  }

  let totales;
  let envio;
  try {
    envio = calcularEnvio(
      payload.entrega.modo === 'envio'
        ? { modo: 'envio', zonaId: payload.entrega.zonaId }
        : { modo: 'retiro' },
      snapshot.envios,
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
          }
        : { modo: 'retiro', zona: 'Retiro en Mendiolaza' },
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
    notas: payload.notas,
  };

  // Si es MP y hay credenciales, creamos preferencia.
  const checkoutMode = (process.env.CHECKOUT_MODE || 'propio').toLowerCase();
  if (esMp && checkoutMode === 'propio' && process.env.MP_ACCESS_TOKEN) {
    try {
      const siteUrl =
        process.env.DEPLOY_PRIME_URL ||
        process.env.URL ||
        'https://nudecosmetica.com';
      const notificationUrl = `${siteUrl.replace(/\/+$/, '')}/.netlify/functions/mp-webhook`;
      const preference = await createPreference(
        {
          pedidoId: id,
          items: totales.lineas.map((l) => ({
            title: l.nombre,
            quantity: l.cantidad,
            unit_price: l.precioUnitario,
            currency_id: 'ARS',
          })),
          comprador: pedido.comprador,
          envio: totales.envio,
          descuentos: totales.descuentos,
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

  try {
    await guardar(pedido);
  } catch (err) {
    return serverError(`no se pudo guardar el pedido: ${(err as Error).message}`);
  }

  // Si es transferencia, disparamos el aviso ahora (idempotente desde el id).
  if (!esMp) {
    try {
      await enviarAviso(pedido);
      pedido.avisoEnviado = true;
      await guardar(pedido);
    } catch (err) {
      ctx.log(`[crear-pedido ${id}] aviso falló: ${(err as Error).message}`);
    }
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

async function enviarAviso(p: PedidoGuardado): Promise<void> {
  if (p.source === 'e2e') return; // pedidos de prueba nunca disparan aviso real
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

export const config = { path: '/.netlify/functions/crear-pedido' };
