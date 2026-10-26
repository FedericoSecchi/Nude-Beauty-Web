#!/usr/bin/env node
// Capturas de primera pantalla (sin scroll) para comparar antes/después.
// Uso: node scripts/capturas.mjs <base-url> <prefijo> <dir-salida> [ruta ...]
// Ej.: node scripts/capturas.mjs https://deploy-preview-2--nude-beauty-web.netlify.app despues docs/capturas / /productos/serum-multi-active/
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [base, prefijo, outDir, ...rutas] = process.argv.slice(2);
if (!base || !prefijo || !outDir) {
  console.error('uso: node scripts/capturas.mjs <base-url> <prefijo> <dir-salida> [ruta ...]');
  process.exit(2);
}
const paginas = rutas.length ? rutas : ['/'];
const viewports = [
  { nombre: 'desktop-1366x850', width: 1366, height: 850, mobile: false },
  { nombre: 'mobile-390x844', width: 390, height: 844, mobile: true },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();
  for (const ruta of paginas) {
    await page.goto(new URL(ruta, base).toString(), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800); // animaciones de entrada del sitio viejo
    const slug = ruta === '/' ? 'home' : ruta.replace(/^\/|\/$/g, '').split('/').pop();
    const file = join(outDir, `${prefijo}-${slug}-${vp.nombre}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
