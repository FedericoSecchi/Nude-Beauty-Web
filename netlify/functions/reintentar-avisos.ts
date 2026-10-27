import type { Config, Context } from '@netlify/functions';
import { entornoDe } from './_shared/blobs';
import { reintentarPendientes } from './_shared/avisos';

// Cada 10 minutos (UTC; no depende de la hora local): reintenta el aviso a n8n de todo pedido
// pagado / en revisión / pendiente de transferencia y de todo arrepentimiento con avisoEnviado=false
// y source=web, respetando el backoff de cada registro. Netlify solo corre funciones programadas
// en el deploy publicado (producción), así que en previews no hace nada salvo "Run now".
export default async (_req: Request, ctx: Context): Promise<Response> => {
  const resumen = await reintentarPendientes(entornoDe(ctx));
  console.log(
    `[reintentar-avisos] revisados=${resumen.revisados} enviados=${resumen.enviados} fallidos=${resumen.fallidos}`,
  );
  return new Response('ok');
};

export const config: Config = { schedule: '*/10 * * * *' };
