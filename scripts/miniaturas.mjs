#!/usr/bin/env node
// Miniaturas de 480 y 768 px de ancho para las tarjetas de producto (components/ProductCard.tsx).
// Las fotos originales miden 1024 px y pesan hasta 240 KB; en una tarjeta se ven a ~360 px.
// Corre en cada build, así también cubre las fotos que Soledad suba desde el panel.
// Salida: junto a cada foto, <nombre>-480w.webp y <nombre>-768w.webp (ignoradas por git).
import { readdir, copyFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIR = 'public/img/productos';
const ANCHOS = [480, 768];
const esMiniatura = (nombre) => ANCHOS.some((w) => nombre.endsWith(`-${w}w.webp`));

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[miniaturas] sharp no disponible: copio las originales (sin ahorro de peso)');
}

async function* fotos(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* fotos(p);
    else if (/\.(webp|jpe?g|png)$/i.test(e.name) && !esMiniatura(e.name)) yield p;
  }
}

let n = 0;
for await (const src of fotos(DIR)) {
  for (const ancho of ANCHOS) {
    const dest = src.slice(0, -extname(src).length) + `-${ancho}w.webp`;
    const [s, d] = await Promise.all([stat(src), stat(dest).catch(() => null)]);
    if (d && d.mtimeMs >= s.mtimeMs) continue;
    if (sharp) {
      await sharp(src).resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 74 }).toFile(dest);
    } else {
      await copyFile(src, dest);
    }
    n++;
  }
}
console.log(`[miniaturas] ${n} generadas`);
