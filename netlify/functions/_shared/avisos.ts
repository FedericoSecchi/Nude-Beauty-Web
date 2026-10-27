// Aviso de pedidos y arrepentimientos a n8n (ORDER_WEBHOOK_URL, contrato en seo/PLAN.md §6).
// Entrega "al menos una vez": cada registro guarda avisoEnviado, intentosAviso y ultimoErrorAviso;
// lo que falla lo reintenta la función programada `reintentar-avisos` con backoff.
// Para que nunca salgan dos avisos en paralelo, quien envía primero toma un lease con escritura
// condicional (ver `actualizar` en blobs.ts). Los logs llevan solo ids y errores, nunca datos personales.
import {
  actualizar,
  storeArrepentimientos,
  storePedidos,
  type ArrepentimientoGuardado,
  type Entorno,
  type PedidoGuardado,
  type Registro,
} from './blobs';

const ESTADOS_CON_AVISO = new Set(['pagado', 'revisar', 'pendiente_transferencia', 'arrepentimiento']);

/** Tiempo máximo que un envío en curso bloquea a los demás (el POST tiene timeout de 15 s). */
export const LEASE_MS = 2 * 60 * 1000;
const TIMEOUT_POST_MS = 15_000;
const BACKOFF_BASE_MIN = 10;
const BACKOFF_MAX_MIN = 6 * 60;
const PRESUPUESTO_MS = 20_000;

export function requiereAviso(r: Registro): boolean {
  return r.source === 'web' && !r.avisoEnviado && ESTADOS_CON_AVISO.has(r.estado);
}

/** Minutos de espera después del intento n (1, 2, 3…): 10, 20, 40, 80… con techo de 6 h. */
export function backoffMinutos(intentos: number): number {
  return Math.min(BACKOFF_BASE_MIN * 2 ** Math.max(0, intentos - 1), BACKOFF_MAX_MIN);
}

function antesDe(iso: string | undefined, ahora: number): boolean {
  return !iso || Date.parse(iso) <= ahora;
}

export function payloadAviso(r: Registro): Record<string, unknown> {
  if (r.tipo === 'arrepentimiento') {
    return {
      tipo: 'arrepentimiento',
      id: r.id,
      creado: r.creado,
      estado: r.estado,
      numeroOrden: r.numeroOrden,
      nombre: r.nombre,
      email: r.email,
      motivo: r.motivo,
    };
  }
  return {
    tipo: r.tipo,
    id: r.id,
    creado: r.creado,
    estado: r.estado,
    comprador: r.comprador,
    entrega: r.entrega,
    items: r.items,
    subtotal: r.subtotal,
    descuentos: r.descuentos,
    envio: r.envio,
    total: r.total,
    pago: {
      medio: r.pago.medio,
      mpPaymentId: r.pago.mpPaymentId,
      mpEstado: r.pago.mpEstado,
      ...(r.estado === 'revisar'
        ? { mpMonto: r.pago.mpMonto, mpMoneda: r.pago.mpMoneda, motivoRevision: r.motivoRevision }
        : {}),
    },
    notas: r.notas,
  };
}

export async function postAviso(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.ORDER_WEBHOOK_URL;
  if (!url) throw new Error('ORDER_WEBHOOK_URL no configurado');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.ORDER_WEBHOOK_SECRET
        ? { 'x-nude-secret': process.env.ORDER_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_POST_MS),
  });
  if (!res.ok) throw new Error(`aviso HTTP ${res.status}`);
}

type Store = ReturnType<typeof storePedidos>;
export type ResultadoAviso = 'enviado' | 'fallo' | 'omitido';

/**
 * Intenta mandar el aviso de un registro.
 * - `respetarBackoff: false` (webhook / alta): intenta ya si no hay otro envío en curso.
 * - `respetarBackoff: true` (función programada): además espera a `proximoIntentoAviso`.
 */
export async function procesarAviso(
  store: Store,
  id: string,
  opts: { respetarBackoff: boolean; ahora?: () => number },
): Promise<ResultadoAviso> {
  const ahora = opts.ahora ?? Date.now;
  const t0 = ahora();

  const tomado = await actualizar<Registro>(store, id, (r) => {
    if (!requiereAviso(r)) return null;
    if (!antesDe(r.avisoEnCursoHasta, t0)) return null;
    if (opts.respetarBackoff && !antesDe(r.proximoIntentoAviso, t0)) return null;
    return { ...r, avisoEnCursoHasta: new Date(t0 + LEASE_MS).toISOString() };
  });
  if (!tomado) return 'omitido';

  try {
    await postAviso(payloadAviso(tomado));
  } catch (err) {
    const msg = ((err as Error).message || 'error').slice(0, 200);
    const fin = ahora();
    const r = await actualizar<Registro>(store, id, (actual) => {
      const intentos = (actual.intentosAviso ?? 0) + 1;
      return {
        ...actual,
        intentosAviso: intentos,
        ultimoErrorAviso: msg,
        proximoIntentoAviso: new Date(fin + backoffMinutos(intentos) * 60_000).toISOString(),
        avisoEnCursoHasta: undefined,
      };
    });
    console.log(`[avisos] ${id} intento ${r?.intentosAviso ?? '?'} falló: ${msg}`);
    return 'fallo';
  }

  const fin = ahora();
  await actualizar<Registro>(store, id, (actual) => ({
    ...actual,
    avisoEnviado: true,
    avisoEnviadoEn: new Date(fin).toISOString(),
    intentosAviso: (actual.intentosAviso ?? 0) + 1,
    ultimoErrorAviso: undefined,
    proximoIntentoAviso: undefined,
    avisoEnCursoHasta: undefined,
  }));
  console.log(`[avisos] ${id} enviado`);
  return 'enviado';
}

export interface ResumenReintentos {
  revisados: number;
  enviados: number;
  fallidos: number;
}

/** Recorre pedidos y arrepentimientos del entorno y reintenta los avisos pendientes. */
export async function reintentarPendientes(
  entorno: Entorno,
  ahora: () => number = Date.now,
): Promise<ResumenReintentos> {
  const resumen: ResumenReintentos = { revisados: 0, enviados: 0, fallidos: 0 };
  // Las funciones programadas cortan a los 30 s: dejamos margen y lo que quede va en la próxima corrida.
  const limite = Date.now() + PRESUPUESTO_MS;
  for (const store of [storePedidos(entorno), storeArrepentimientos(entorno)]) {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      if (Date.now() > limite) return resumen;
      const r = (await store.get(key, { type: 'json' })) as Registro | null;
      if (!r || !requiereAviso(r)) continue;
      resumen.revisados++;
      const res = await procesarAviso(store, key, { respetarBackoff: true, ahora });
      if (res === 'enviado') resumen.enviados++;
      if (res === 'fallo') resumen.fallidos++;
    }
  }
  return resumen;
}

export type { ArrepentimientoGuardado, PedidoGuardado };
