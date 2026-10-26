import type { Context } from '@netlify/functions';
import { randomBytes } from 'node:crypto';
import { entornoDe, storeArrepentimientos, type ArrepentimientoGuardado } from './_shared/blobs';
import { procesarAviso } from './_shared/avisos';

interface Payload {
  numeroOrden: string;
  nombre: string;
  email: string;
  motivo?: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Botón de arrepentimiento (obligación legal): la solicitud se guarda primero en Blobs y después
// se avisa a n8n. Si el aviso falla, queda pendiente y lo reintenta `reintentar-avisos`.
export default async (req: Request, ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ error: 'json inválido' }, 400);
  }

  const problemas: string[] = [];
  if (!payload.numeroOrden?.trim() || payload.numeroOrden.trim().length > 60) problemas.push('numeroOrden');
  if (!payload.nombre?.trim() || payload.nombre.trim().length > 120) problemas.push('nombre');
  if (
    !payload.email?.trim() ||
    payload.email.trim().length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())
  )
    problemas.push('email');
  if ((payload.motivo ?? '').length > 1000) problemas.push('motivo');
  if (problemas.length) {
    return json({ error: 'campos', faltantes: problemas }, 400);
  }

  const e2eToken = req.headers.get('x-e2e-token');
  const isE2E = Boolean(e2eToken && process.env.E2E_TOKEN && e2eToken === process.env.E2E_TOKEN);

  const ahora = new Date().toISOString();
  const registro: ArrepentimientoGuardado = {
    id: 'NUDE-ARR-' + randomBytes(3).toString('hex').toUpperCase(),
    tipo: 'arrepentimiento',
    estado: 'arrepentimiento',
    creado: ahora,
    actualizado: ahora,
    source: isE2E ? 'e2e' : 'web',
    numeroOrden: payload.numeroOrden.trim(),
    nombre: payload.nombre.trim(),
    email: payload.email.trim(),
    motivo: payload.motivo?.trim() ?? '',
    avisoEnviado: false,
    intentosAviso: 0,
  };

  const store = storeArrepentimientos(entornoDe(ctx), isE2E);
  try {
    const res = await store.setJSON(registro.id, registro, { onlyIfNew: true });
    if (!res.modified) throw new Error('código repetido');
  } catch (err) {
    ctx.log(`[arrepentimiento] no se pudo guardar: ${(err as Error).message}`);
    // Sin registro no hay código válido: el formulario muestra los contactos alternativos.
    return json({ error: 'no se pudo registrar la solicitud' }, 500);
  }

  await procesarAviso(store, registro.id, { respetarBackoff: false });

  return json({ codigo: registro.id }, 200);
};

export const config = { path: '/.netlify/functions/arrepentimiento' };
