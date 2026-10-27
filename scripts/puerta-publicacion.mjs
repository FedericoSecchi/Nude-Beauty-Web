#!/usr/bin/env node
// Puerta de publicación: corre después de `next build`.
// Si el build es de producción (CONTEXT=production) y out/ contiene "[CONFIRMAR" o "[REVISAR", el
// build falla y lista qué falta. Así un merge con datos pendientes no reemplaza al sitio en vivo.
// En deploy previews, branch deploys y local solo avisa.
// Sin medio de pago (MP apagado y sin alias ni CBU) no bloquea: el build sale en modo «pedido por
// WhatsApp» (lib/modo-venta.mjs) y el log lo dice.
// Uso: node scripts/puerta-publicacion.mjs [dir] [dir-contenido]   (default: out content)
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { leerContenido } from '../lib/contenido.mjs';
import { hayMedioDePago } from '../lib/modo-venta.mjs';

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

// Aviso (no bloquea) cuando no hay medio de pago: el sitio se publica en modo pedido por WhatsApp.
export function avisoModoWhatsapp(tienda, mpToken) {
  if (hayMedioDePago(tienda, mpToken)) return null;
  return 'sin medio de pago (MP_ACCESS_TOKEN vacío y sin alias ni CBU en content/ajustes/tienda.json): ' +
    'el sitio sale en MODO PEDIDO POR WHATSAPP. Cargá el alias o el CBU en el panel y el próximo build vuelve al checkout normal.';
}

const esMain = import.meta.url === `file://${resolve(process.argv[1] ?? '')}`;
if (esMain) {
  const dir = resolve(process.argv[2] || 'out');
  const produccion = process.env.CONTEXT === 'production';
  const dirContenido = resolve(process.argv[3] || process.env.NUDE_CONTENT_DIR || 'content');
  const hallazgos = await buscarPendientes(dir);
  const aviso = avisoModoWhatsapp(leerContenido(dirContenido).tienda, process.env.MP_ACCESS_TOKEN);
  if (aviso) console.warn(`[puerta] AVISO: ${aviso}`);
  if (!hallazgos.length) {
    console.log(`[puerta] sin [CONFIRMAR] ni [REVISAR] en el sitio generado · ${aviso ? 'modo pedido por WhatsApp' : 'con medio de pago (checkout normal)'}`);
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
