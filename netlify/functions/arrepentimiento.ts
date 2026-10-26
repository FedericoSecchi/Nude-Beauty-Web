import type { Context } from '@netlify/functions';
import { randomBytes } from 'node:crypto';

interface Payload {
  numeroOrden: string;
  nombre: string;
  email: string;
  motivo?: string;
}

export default async (req: Request, ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: 'json inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const problemas: string[] = [];
  if (!payload.numeroOrden?.trim()) problemas.push('numeroOrden');
  if (!payload.nombre?.trim()) problemas.push('nombre');
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
    problemas.push('email');
  if (problemas.length) {
    return new Response(JSON.stringify({ error: 'campos', faltantes: problemas }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const codigo = 'NUDE-ARR-' + randomBytes(3).toString('hex').toUpperCase();

  const url = process.env.ORDER_WEBHOOK_URL;
  if (!url) {
    ctx.log('[arrepentimiento] ORDER_WEBHOOK_URL no configurado');
    // Devolvemos código igual: el formulario tiene aviso para contactar por mail/WhatsApp.
    return new Response(JSON.stringify({ codigo }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = {
    tipo: 'arrepentimiento',
    id: codigo,
    creado: new Date().toISOString(),
    numeroOrden: payload.numeroOrden.trim(),
    nombre: payload.nombre.trim(),
    email: payload.email.trim(),
    motivo: payload.motivo?.trim() ?? '',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.ORDER_WEBHOOK_SECRET
          ? { 'x-nude-secret': process.env.ORDER_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    ctx.log(`[arrepentimiento ${codigo}] aviso falló: ${(err as Error).message}`);
  }

  return new Response(JSON.stringify({ codigo }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const config = { path: '/.netlify/functions/arrepentimiento' };
