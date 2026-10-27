#!/usr/bin/env node
// Preparación del build: fija BUILD_ID visible y copia el catálogo a las Netlify Functions.
import { execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerContenido, leerDireccionRetiro, validarProductos } from '../lib/contenido.mjs';
import { modoVenta, motivoModoWhatsapp } from '../lib/modo-venta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return null;
  }
}

const sha =
  process.env.COMMIT_REF ||
  process.env.GITHUB_SHA ||
  gitSha() ||
  'local';
const shortSha = sha.slice(0, 12);
process.env.NEXT_PUBLIC_BUILD_ID = shortSha;

// Expone BUILD_ID al runtime de Next.
await writeFile(
  join(root, '.env.production.local'),
  `NEXT_PUBLIC_BUILD_ID=${shortSha}\n`,
  'utf8',
);
console.log(`[prebuild] BUILD_ID=${shortSha}`);

// Snapshot del catálogo para las Netlify Functions (en runtime no leen el repo), ya normalizado.
const outDir = join(root, 'netlify', 'functions', '_data');

// Modo de venta del build (lib/modo-venta.mjs). Las functions deciden con lo mismo que vio el build
// (no con el entorno de runtime): sitio y functions no pueden quedar desfasados.
const mpHabilitado = Boolean((process.env.MP_ACCESS_TOKEN || '').trim());
const webhookAviso = Boolean((process.env.ORDER_WEBHOOK_URL || '').trim());
const dirContenido = process.env.NUDE_CONTENT_DIR || join(root, 'content');
{
  const { tienda } = leerContenido(dirContenido);
  const modo = modoVenta(tienda, mpHabilitado, webhookAviso);
  const motivo = motivoModoWhatsapp(tienda, mpHabilitado, webhookAviso);
  console.log(`[prebuild] modo de venta: ${modo === 'whatsapp' ? 'pedido por WhatsApp' : 'checkout'}${motivo ? ` · ${motivo}` : ''}`);
}

if (process.env.NUDE_CONTENT_DIR) {
  // Build de prueba con contenido alternativo (fixture sin stock): no pisamos el snapshot real.
  console.log('[prebuild] NUDE_CONTENT_DIR definido: snapshot omitido');
} else {
  // Si el contenido está roto (precio vacío, sin foto, slug repetido) el build falla acá y Netlify
  // deja publicado el deploy anterior.
  const { productos, tienda, envios } = leerContenido(join(root, 'content'));
  const errores = validarProductos(productos);
  if (errores.length) {
    console.error(`[prebuild] contenido inválido:\n  ${errores.join('\n  ')}`);
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });
  // La dirección exacta del retiro solo viaja en el snapshot (gitignored, no se publica en out/).
  const direccionRetiro = leerDireccionRetiro(join(root, 'content'));
  const snapshot = { buildId: shortSha, productos, tienda, envios, mpHabilitado, webhookAviso, direccionRetiro };
  await writeFile(join(outDir, 'catalogo.json'), JSON.stringify(snapshot), 'utf8');
  console.log(`[prebuild] catálogo snapshot: ${productos.length} productos · modo ${modoVenta(tienda, mpHabilitado, webhookAviso)}`);
}
