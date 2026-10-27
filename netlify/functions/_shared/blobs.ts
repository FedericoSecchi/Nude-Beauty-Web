import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

// Stores separados por contexto de deploy: solo producción escribe en `pedidos` / `arrepentimientos`.
// Deploy previews, branch deploys y dev van a `*-preview`; los pedidos de e2e a `*-e2e`.
export interface Entorno {
  produccion: boolean;
}

export function entornoDe(ctx?: Pick<Context, 'deploy'> | null): Entorno {
  const contexto = ctx?.deploy?.context || process.env.CONTEXT || 'dev';
  return { produccion: contexto === 'production' };
}

export function nombreStore(
  base: 'pedidos' | 'arrepentimientos',
  entorno: Entorno,
  e2e = false,
): string {
  if (e2e) return `${base}-e2e`;
  return entorno.produccion ? base : `${base}-preview`;
}

export function storePedidos(entorno: Entorno, e2e = false) {
  return getStore({ name: nombreStore('pedidos', entorno, e2e), consistency: 'strong' });
}

export function storeArrepentimientos(entorno: Entorno, e2e = false) {
  return getStore({ name: nombreStore('arrepentimientos', entorno, e2e), consistency: 'strong' });
}

type Store = ReturnType<typeof getStore>;

// Campos de seguimiento del aviso a n8n (ver _shared/avisos.ts).
export interface SeguimientoAviso {
  avisoEnviado?: boolean;
  intentosAviso?: number;
  ultimoErrorAviso?: string;
  /** Backoff: la función programada no reintenta antes de esta fecha. */
  proximoIntentoAviso?: string;
  /** Lease: hay un envío en curso hasta esta fecha; nadie más lo intenta. */
  avisoEnCursoHasta?: string;
  avisoEnviadoEn?: string;
}

export type EstadoPedido =
  | 'pendiente_mp'
  | 'pagado'
  | 'revisar'
  | 'pendiente_transferencia'
  | 'cancelado';

export interface PedidoGuardado extends SeguimientoAviso {
  id: string;
  tipo: 'pedido_pagado' | 'pedido_transferencia' | 'pedido_revisar';
  estado: EstadoPedido;
  creado: string;
  actualizado: string;
  source?: 'web' | 'e2e';
  comprador: {
    nombre: string;
    email: string;
    telefono: string;
    dni?: string;
  };
  entrega: {
    modo: 'envio' | 'retiro';
    zona: string;
    direccion?: string;
    localidad?: string;
    provincia?: string;
    cp?: string;
    /** Solo con retiro: la dirección exacta (snapshot del build). Va en /pedido/ y en el aviso a n8n. */
    direccionRetiro?: string;
    /** Si un proveedor de envíos cotizó (lib/shipping.ts › ProveedorEnvio). */
    proveedorEnvio?: string;
  };
  items: {
    slug: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  subtotal: number;
  descuentos: { motivo: string; monto: number }[];
  envio: number;
  total: number;
  pago: {
    medio: 'mercadopago' | 'transferencia';
    mpPaymentId?: string;
    mpEstado?: string;
    mpMonto?: number;
    mpMoneda?: string;
    mpPreferenceId?: string;
    mpInitPoint?: string;
    reservaHoras?: number;
    alias?: string | null;
    cbu?: string | null;
    titular?: string | null;
  };
  /** Por qué quedó en `revisar` (monto o moneda distintos). Sin datos personales. */
  motivoRevision?: string;
  notas?: string;
}

export interface ArrepentimientoGuardado extends SeguimientoAviso {
  id: string;
  tipo: 'arrepentimiento';
  estado: 'arrepentimiento';
  creado: string;
  actualizado: string;
  source: 'web' | 'e2e';
  numeroOrden: string;
  nombre: string;
  email: string;
  motivo: string;
}

export type Registro = PedidoGuardado | ArrepentimientoGuardado;

export async function leer(
  id: string,
  entorno: Entorno,
  e2e = false,
): Promise<PedidoGuardado | null> {
  const raw = (await storePedidos(entorno, e2e).get(id, { type: 'json' })) as PedidoGuardado | null;
  return raw ?? null;
}

export async function guardar(p: PedidoGuardado, entorno: Entorno): Promise<void> {
  await storePedidos(entorno, p.source === 'e2e').setJSON(p.id, p);
}

export async function borrar(id: string, entorno: Entorno, e2e = false): Promise<void> {
  await storePedidos(entorno, e2e).delete(id);
}

export class ConflictoEscritura extends Error {}

/**
 * Lectura-modificación-escritura con control de concurrencia (ETag + onlyIfMatch).
 * `mutar` recibe el valor actual y devuelve el nuevo, o null para no escribir nada.
 * Si otro proceso escribió en el medio, se relee y se vuelve a aplicar `mutar`.
 * Devuelve el valor escrito, o null si la clave no existe o `mutar` decidió no escribir.
 */
export async function actualizar<T>(
  store: Store,
  key: string,
  mutar: (actual: T) => T | null,
  intentos = 5,
): Promise<T | null> {
  for (let i = 0; i < intentos; i++) {
    const actual = await store.getWithMetadata(key, { type: 'json' });
    if (!actual) return null;
    const nuevo = mutar(actual.data as T);
    if (!nuevo) return null;
    const res = await store.setJSON(key, nuevo, { onlyIfMatch: actual.etag });
    if (res.modified) return nuevo;
  }
  throw new ConflictoEscritura(`no se pudo escribir ${key} tras ${intentos} intentos`);
}
