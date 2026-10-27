#!/usr/bin/env node
// Puerta de publicación: corre después de `next build`.
// Si el build es de producción (CONTEXT=production) y out/ contiene "[CONFIRMAR" o "[REVISAR", el
// build falla y lista qué falta. Así un merge con datos pendientes no reemplaza al sitio en vivo.
// En deploy previews, branch deploys y local solo avisa.
// Sin medio de pago (MP apagado y sin alias ni CBU) o sin ORDER_WEBHOOK_URL no bloquea: el build sale
// en modo «pedido por WhatsApp» (lib/modo-venta.mjs) y el log dice por qué.
// Además, la dirección exacta del retiro (envios.json › retiro.direccionPrivada) no puede aparecer en
// el sitio generado: si aparece, el build falla en cualquier contexto.
// Uso: node scripts/puerta-publicacion.mjs [dir] [dir-contenido]   (default: out content)
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { leerContenido, leerDireccionRetiro } from '../lib/contenido.mjs';
import { motivoModoWhatsapp } from '../lib/modo-venta.mjs';

const MARCAS = ['[CONFIRMAR', '[REVISAR'];
const EXTENSIONES = /\.(html|txt|json|xml|js|webmanifest)$/;

async function* archivos(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* archivos(p);
    else if (EXTENSIONES.test(e.name)) yield p;
  }
}

export async function buscarPendientes(dir) {
  const hallazgos = [];
  for await (const file of archivos(dir)) {
    const lineas = (await readFile(file, 'utf8')).split('\n');
    lineas.forEach((linea, i) => {
      for (const marca of MARCAS) {
        let desde = 0;
        let pos;
        while ((pos = linea.indexOf(marca, desde)) !== -1) {
          const fin = linea.indexOf(']', pos);
          const fragmento = linea.slice(pos, fin === -1 ? pos + 80 : Math.min(fin + 1, pos + 120));
          hallazgos.push({ archivo: relative(process.cwd(), file), linea: i + 1, fragmento });
          desde = pos + marca.length;
        }
      }
    });
  }
  return hallazgos;
}

// Aviso (no bloquea) cuando el sitio no cobra en la web: se publica en modo pedido por WhatsApp.
export function avisoModoWhatsapp(tienda, mpToken, webhook) {
  const motivo = motivoModoWhatsapp(tienda, mpToken, webhook);
  if (!motivo) return null;
  const como = motivo.startsWith('sin medio de pago')
    ? 'Cargá el alias o el CBU en el panel'
    : 'Cargá ORDER_WEBHOOK_URL (y ORDER_WEBHOOK_SECRET) en Netlify y redeployá';
  return `${motivo}: el sitio sale en MODO PEDIDO POR WHATSAPP. ${como} y el próximo build pasa al checkout normal.`;
}

// Archivos del sitio generado que contienen la dirección exacta del retiro (comparación sin
// mayúsculas ni tildes, para que «Cadiz 445» también cuente).
export async function buscarDireccion(dir, direccion) {
  if (!direccion) return [];
  const plano = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Con la calle y el número alcanza: «Cádiz 445» sola ya es la dirección.
  const aguja = plano(direccion.split(',')[0].trim());
  const hallazgos = [];
  for await (const file of archivos(dir)) {
    if (plano(await readFile(file, 'utf8')).includes(aguja)) hallazgos.push(relative(process.cwd(), file));
  }
  return hallazgos;
}

const esMain = import.meta.url === `file://${resolve(process.argv[1] ?? '')}`;
if (esMain) {
  const dir = resolve(process.argv[2] || 'out');
  const produccion = process.env.CONTEXT === 'production';
  const dirContenido = resolve(process.argv[3] || process.env.NUDE_CONTENT_DIR || 'content');
  const hallazgos = await buscarPendientes(dir);
  const conDireccion = await buscarDireccion(dir, leerDireccionRetiro(dirContenido));
  if (conDireccion.length) {
    console.error('[puerta] BUILD BLOQUEADO: la dirección exacta del retiro aparece en el sitio público:');
    for (const f of conDireccion) console.error(`  ${f}`);
    console.error('[puerta] Va solo en envios.json › retiro.direccionPrivada (la usan las functions).');
    process.exit(1);
  }
  const aviso = avisoModoWhatsapp(leerContenido(dirContenido).tienda, process.env.MP_ACCESS_TOKEN, process.env.ORDER_WEBHOOK_URL);
  if (aviso) console.warn(`[puerta] AVISO: ${aviso}`);
  if (!hallazgos.length) {
    console.log(`[puerta] sin [CONFIRMAR] ni [REVISAR] en el sitio generado · sin la dirección del retiro · ${aviso ? 'modo pedido por WhatsApp' : 'con medio de pago y aviso a n8n (checkout normal)'}`);
    process.exit(0);
  }
  const titulo = produccion
    ? `[puerta] BUILD DE PRODUCCIÓN BLOQUEADO: ${hallazgos.length} datos pendientes en ${relative(process.cwd(), dir) || dir}/`
    : `[puerta] aviso (CONTEXT=${process.env.CONTEXT || 'local'}): ${hallazgos.length} datos pendientes; en producción este build fallaría`;
  console[produccion ? 'error' : 'warn'](titulo);
  for (const h of hallazgos) {
    console[produccion ? 'error' : 'warn'](`  ${h.archivo}:${h.linea}  ${h.fragmento}`);
  }
  if (produccion) {
    console.error('[puerta] Completá o sacá esos datos (ver docs/PROGRESS.md › [CONFIRMAR]) y volvé a deployar.');
    process.exit(1);
  }
}
