import type { Context } from '@netlify/functions';
import { borrar } from './_shared/blobs';

// Borra un pedido del store de e2e. Requiere x-e2e-token.
export default async (req: Request, _ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const e2eToken = req.headers.get('x-e2e-token');
  const E2E_TOKEN = process.env.E2E_TOKEN;
  if (!E2E_TOKEN || e2eToken !== E2E_TOKEN) {
    return new Response('no autorizado', { status: 401 });
  }
  let body: { id?: string } = {};
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return new Response('json inválido', { status: 400 });
  }
  if (!body.id) return new Response('falta id', { status: 400 });
  await borrar(body.id, true);
  return new Response('ok', { status: 200 });
};

export const config = { path: '/.netlify/functions/e2e-cleanup' };
