#!/usr/bin/env node
// Contraste WCAG del botón principal (.btn-primary) medido en el navegador: lee los colores ya
// calculados (texto y fondo, normal y hover) y exige ≥ 4,5:1 (AA texto normal).
//   node scripts/check-contraste.mjs <base-url>
import { chromium } from '@playwright/test';

const base = process.argv[2];
if (!base) {
  console.error('uso: node scripts/check-contraste.mjs <base-url>');
  process.exit(2);
}
const MIN = 4.5;
// Home ("Ver productos"), ficha ("Agregá al carrito") y carrito vacío ("Ver productos").
const paginas = ['/', '/productos/serum-multi-active/', '/carrito/'];

function parseRgb(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`color no soportado: ${s}`);
  return m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
}
function lum([r, g, b]) {
  const c = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
let falla = false;
let medidos = 0;
for (const ruta of paginas) {
  await page.goto(new URL(ruta, base).toString(), { waitUntil: 'networkidle' });
  const btn = page.locator('.btn-primary').first();
  if ((await btn.count()) === 0) continue;
  const leer = () =>
    btn.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fg: cs.color, bg: cs.backgroundColor, texto: el.textContent?.trim() ?? '' };
    });
  const normal = await leer();
  await btn.hover();
  await page.waitForTimeout(250); // transición
  const hover = await leer();
  for (const [estado, c] of [['normal', normal], ['hover', hover]]) {
    const r = ratio(parseRgb(c.fg), parseRgb(c.bg));
    medidos++;
    const ok = r >= MIN;
    if (!ok) falla = true;
    console.log(
      `${ok ? 'OK  ' : 'FALLA'} ${ruta} «${c.texto}» ${estado}: ${c.fg} sobre ${c.bg} = ${r.toFixed(2)}:1`,
    );
  }
}
await browser.close();
if (medidos === 0) {
  console.error('no se encontró ningún .btn-primary');
  process.exit(1);
}
process.exit(falla ? 1 : 0);
