#!/usr/bin/env node
// Genera los WebP de marca a partir de la foto del sitio viejo (legacy/img-old/hero-bg.jpg, 1920×1080).
// Se corre a mano cuando cambia la foto; los archivos generados se commitean en public/img/marca/.
//   node scripts/imagenes-marca.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'legacy/img-old/hero-bg.jpg';
const OUT = 'public/img/marca';
mkdirSync(OUT, { recursive: true });

// Hero desktop/tablet: la foto entera en 3 anchos.
for (const w of [960, 1440, 1920]) {
  await sharp(SRC).resize({ width: w }).webp({ quality: 72 }).toFile(`${OUT}/hero-${w}.webp`);
}

// Hero mobile: recorte vertical de la izquierda (rama de hojas + sus sombras + lino), para que en
// pantallas angostas se vean las hojas y no solo el fondo liso.
// Calidad 60: es un fondo bajo un velo crema; la textura del lino no gana nada con más.
const mobile = { left: 0, top: 0, width: 760, height: 1080 };
for (const w of [480, 640]) {
  await sharp(SRC).extract(mobile).resize({ width: w }).webp({ quality: 60 }).toFile(`${OUT}/hero-mobile-${w}.webp`);
}

// Detalle decorativo: solo la rama de hojas, para el pie.
await sharp(SRC)
  .extract({ left: 0, top: 60, width: 390, height: 740 })
  .resize({ width: 260 })
  .webp({ quality: 75 })
  .toFile(`${OUT}/hojas-260.webp`);

console.log('ok');
