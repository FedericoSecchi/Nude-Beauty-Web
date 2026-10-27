import { join } from 'node:path';
import { leerContenido } from './lib/contenido.mjs';
import { modoVenta } from './lib/modo-venta.mjs';

// Mercado Pago encendido = MP_ACCESS_TOKEN tiene valor en el build. Para prenderlo alcanza con
// cargar el token en Netlify y redeployar: el carrito, los textos y el JSON-LD salen de este flag
// (const mpHabilitado en cada archivo que lo usa). El token nunca llega al navegador, solo el "1"/"0".
const mpHabilitado = (process.env.MP_ACCESS_TOKEN || '').trim() ? '1' : '0';

// Ajustes de la tienda que edita Soledad en el panel (content/ajustes/tienda.json).
function ajustesTienda() {
  try {
    return leerContenido(process.env.NUDE_CONTENT_DIR || join(process.cwd(), 'content')).tienda;
  } catch {
    return null;
  }
}
const tienda = ajustesTienda();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MP_HABILITADO: mpHabilitado,
    NEXT_PUBLIC_WHATSAPP: tienda?.whatsapp || '',
    // 'whatsapp' si no hay ningún medio de pago (lib/modo-venta.mjs); 'checkout' si hay alias, CBU o MP.
    NEXT_PUBLIC_MODO_VENTA: modoVenta(tienda, process.env.MP_ACCESS_TOKEN),
  },
};

export default nextConfig;
