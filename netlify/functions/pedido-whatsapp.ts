// Modo «pedido por WhatsApp» (lib/modo-venta.mjs): arma el mensaje del pedido en el servidor, con los
// precios del snapshot del build. El carrito la usa cuando la clienta elige retiro, porque la dirección
// exacta del retiro solo está en el snapshot (no en el sitio estático). No guarda nada ni avisa a n8n:
// el registro del pedido es el chat de WhatsApp. En checkout normal responde 409 (no hace falta).
import { loadSnapshot } from './_shared/catalogo';
import { armarPedidoWhatsapp } from '../../lib/pedido-whatsapp';
import { PricingError } from '../../lib/pricing';
import { calcularEnvio, NOMBRE_RETIRO, ShippingError } from '../../lib/shipping';
import { modoVenta } from '../../lib/modo-venta.mjs';
import { CANTIDAD_MAX } from './_shared/validar';

interface Payload {
  items: { slug: string; cantidad: number; variante?: string }[];
  comprador: { nombre: string; telefono: string; email?: string; dni?: string };
  entrega: { modo: 'retiro' } | { modo: 'envio'; zonaId: string };
}

const HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex',
};

function responder(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function texto(v: unknown, campo: string, max: number, requerido = true): string {
  if (v === undefined || v === null || v === '') {
    if (requerido) throw new Error(`${campo} requerido`);
    return '';
  }
  if (typeof v !== 'string') throw new Error(`${campo} inválido`);
  const t = v.trim();
  if (requerido && !t) throw new Error(`${campo} requerido`);
  if (t.length > max) throw new Error(`${campo} supera ${max} caracteres`);
  return t;
}

function validar(p: any): Payload {
  if (!p || typeof p !== 'object') throw new Error('payload inválido');
  if (!Array.isArray(p.items) || p.items.length === 0) throw new Error('items vacío');
  if (p.items.length > 50) throw new Error('demasiados items');
  for (const it of p.items) {
    if (!it || typeof it.slug !== 'string') throw new Error('item sin slug válido');
    if (!Number.isInteger(it.cantidad) || it.cantidad < 1 || it.cantidad > CANTIDAD_MAX) {
      throw new Error(`cantidad inválida para ${it.slug}: entre 1 y ${CANTIDAD_MAX}`);
    }
    if (it.variante !== undefined && (typeof it.variante !== 'string' || it.variante.length > 60)) {
      throw new Error(`tono inválido para ${it.slug}`);
    }
  }
  const comprador = {
    nombre: texto(p.comprador?.nombre, 'nombre', 120),
    telefono: texto(p.comprador?.telefono, 'telefono', 40),
    email: texto(p.comprador?.email, 'email', 120, false),
    dni: texto(p.comprador?.dni, 'dni', 20, false),
  };
  const modo = p.entrega?.modo;
  if (modo === 'retiro') return { items: p.items, comprador, entrega: { modo } };
  if (modo === 'envio') {
    return { items: p.items, comprador, entrega: { modo, zonaId: texto(p.entrega.zonaId, 'zona de envío', 40) } };
  }
  throw new Error('entrega.modo inválido');
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  let snapshot;
  try {
    snapshot = loadSnapshot();
  } catch (err) {
    return responder(500, { error: `catálogo no disponible: ${(err as Error).message}` });
  }
  if (modoVenta(snapshot.tienda, snapshot.mpHabilitado ?? false, snapshot.webhookAviso ?? false) !== 'whatsapp') {
    return responder(409, { error: 'La tienda cobra en la web: confirmá el pedido desde el carrito.' });
  }

  let payload: Payload;
  try {
    payload = validar(await req.json().catch(() => null));
  } catch (err) {
    return responder(400, { error: (err as Error).message });
  }

  try {
    const retiro = payload.entrega.modo === 'retiro';
    const envio = calcularEnvio(
      payload.entrega.modo === 'envio' ? { modo: 'envio', zonaId: payload.entrega.zonaId } : { modo: 'retiro' },
      snapshot.envios,
    );
    const pedido = armarPedidoWhatsapp(
      payload.items.map((i) => ({ slug: i.slug, cantidad: i.cantidad, variante: i.variante })),
      snapshot.productos,
      snapshot.tienda,
      {
        nombre: retiro ? NOMBRE_RETIRO : envio.zona?.nombre ?? '',
        costo: envio.costo,
        retiro,
        direccionRetiro: retiro ? snapshot.direccionRetiro : null,
      },
      payload.comprador,
    );
    const numero = snapshot.tienda.whatsapp.replace(/\D/g, '');
    return responder(200, {
      texto: pedido.texto,
      url: `https://wa.me/${numero}?text=${encodeURIComponent(pedido.texto)}`,
      totalTransferencia: pedido.totalTransferencia,
    });
  } catch (err) {
    if (err instanceof PricingError || err instanceof ShippingError) {
      return responder(400, { error: err.message });
    }
    return responder(500, { error: (err as Error).message });
  }
};

export const config = { path: '/.netlify/functions/pedido-whatsapp' };
