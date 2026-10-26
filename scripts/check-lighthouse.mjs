#!/usr/bin/env node
// Lighthouse mobile (perfil por defecto: Moto G Power, 4G lenta simulada) sobre una URL.
// Falla si LCP > 2,5 s o CLS > 0,1. Corre 3 veces y usa la mediana del LCP para no depender de un
// pico de la máquina. Usa el Chromium de Playwright.
// En los deploy previews Netlify inyecta /.netlify/scripts/cdp (el "Netlify Drawer" de comentarios:
// ~300 KB de JS de app.netlify.com, Segment y Bugsnag). Producción no lo tiene, así que se bloquea
// para medir el sitio tal como lo va a ver la clienta. Contra out/ local no cambia nada.
//   node scripts/check-lighthouse.mjs <url> [salida.json]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
const salida = process.argv[3];
if (!url) {
  console.error('uso: node scripts/check-lighthouse.mjs <url> [salida.json]');
  process.exit(2);
}
const LCP_MAX = 2500;
const CLS_MAX = 0.1;
const RUNS = 3;

const dir = mkdtempSync(join(tmpdir(), 'nude-lh-'));
const corridas = [];
for (let i = 0; i < RUNS; i++) {
  const out = join(dir, `lh-${i}.json`);
  execFileSync(
    'npx',
    [
      '--yes', 'lighthouse@12.8.2', url,
      '--only-categories=performance', '--form-factor=mobile',
      '--output=json', `--output-path=${out}`, '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--blocked-url-patterns=*/.netlify/scripts/cdp*',
      '--blocked-url-patterns=*app.netlify.com/*',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, CHROME_PATH: chromium.executablePath() } },
  );
  const r = JSON.parse(readFileSync(out, 'utf8'));
  corridas.push({
    performance: r.categories.performance.score,
    lcp: r.audits['largest-contentful-paint'].numericValue,
    cls: r.audits['cumulative-layout-shift'].numericValue,
    fcp: r.audits['first-contentful-paint'].numericValue,
  });
}
corridas.sort((a, b) => a.lcp - b.lcp);
const med = corridas[Math.floor(RUNS / 2)];
const clsMax = Math.max(...corridas.map((c) => c.cls));
const res = {
  url,
  fecha: new Date().toISOString(),
  lcpMedianaMs: Math.round(med.lcp),
  fcpMs: Math.round(med.fcp),
  clsMax: Number(clsMax.toFixed(4)),
  performance: med.performance,
  corridas,
};
if (salida) writeFileSync(salida, JSON.stringify(res, null, 2));
console.log(
  `Lighthouse mobile ${url}: LCP ${(res.lcpMedianaMs / 1000).toFixed(2)} s (mediana de ${RUNS}) · ` +
    `CLS ${res.clsMax} (máx) · FCP ${(res.fcpMs / 1000).toFixed(2)} s · performance ${Math.round(med.performance * 100)}`,
);
if (res.lcpMedianaMs > LCP_MAX || res.clsMax > CLS_MAX) {
  console.error(`FALLA: LCP ≤ ${LCP_MAX / 1000} s y CLS ≤ ${CLS_MAX}`);
  process.exit(1);
}
