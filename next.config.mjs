import { join } from 'node:path';
import { leerContenido } from './lib/contenido.mjs';
import { modoVenta } from './lib/modo-venta.mjs';

// Mercado Pago encendido = MP_ACCESS_TOKEN tiene valor en el build. Para prenderlo alcanza con
// cargar el token en Netlify y redeployar: el carrito, los textos y el JSON-LD salen de este flag
// (const mpHabilitado en cada archivo que lo usa). El token nunca llega al navegador, solo el "1"/"0".
// En modo pedido por WhatsApp (falta ORDER_WEBHOOK_URL) queda apagado: no se ofrecen cuotas que no se
// pueden pagar en la web.
const mpToken = (process.env.MP_ACCESS_TOKEN || '').trim();

// Ajustes de la tienda que edita Soledad en el panel (content/ajustes/tienda.json).
function ajustesTienda() {
  try {
    return leerContenido(process.env.NUDE_CONTENT_DIR || join(process.cwd(), 'content')).tienda;
  } catch {
    return null;
  }
}
const tienda = ajustesTienda();

// Aviso de pedidos a n8n: sin ORDER_WEBHOOK_URL en el build no se cobra en la web (lib/modo-venta.mjs).
const modo = modoVenta(tienda, mpToken, process.env.ORDER_WEBHOOK_URL);
const mpHabilitado = mpToken && modo === 'checkout' ? '1' : '0';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MP_HABILITADO: mpHabilitado,
    NEXT_PUBLIC_WHATSAPP: tienda?.whatsapp || '',
    // 'checkout' si hay alias, CBU o MP y además ORDER_WEBHOOK_URL; si no, 'whatsapp' (lib/modo-venta.mjs).
    NEXT_PUBLIC_MODO_VENTA: modo,
  },
};

export default nextConfig;
