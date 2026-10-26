import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Mercado Pago encendido = MP_ACCESS_TOKEN tiene valor en el build. Para prenderlo alcanza con
// cargar el token en Netlify y redeployar: el carrito, los textos y el JSON-LD salen de este flag
// (const mpHabilitado en cada archivo que lo usa). El token nunca llega al navegador, solo el "1"/"0".
const mpHabilitado = (process.env.MP_ACCESS_TOKEN || '').trim() ? '1' : '0';

// WhatsApp de la tienda: lo edita Soledad en el panel (content/ajustes/tienda.json).
function whatsappTienda() {
  try {
    const dir = process.env.NUDE_CONTENT_DIR || join(process.cwd(), 'content');
    return JSON.parse(readFileSync(join(dir, 'ajustes', 'tienda.json'), 'utf8')).whatsapp?.trim() || '';
  } catch {
    return '';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MP_HABILITADO: mpHabilitado,
    NEXT_PUBLIC_WHATSAPP: whatsappTienda(),
  },
};

export default nextConfig;
