#!/usr/bin/env node
// Preparación del build: fija BUILD_ID visible y copia el catálogo a las Netlify Functions.
import { execSync } from 'node:child_process';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Snapshot del catálogo para las Netlify Functions (en runtime no leen el repo).
const productsDir = join(root, 'content', 'productos');
const ajustesDir = join(root, 'content', 'ajustes');
const outDir = join(root, 'netlify', 'functions', '_data');

async function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const items = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await readFile(join(dir, f), 'utf8');
    items.push(JSON.parse(raw));
  }
  return items;
}

async function readJsonFile(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

if (process.env.NUDE_CONTENT_DIR) {
  // Build de prueba con contenido alternativo (fixture sin stock): no pisamos el snapshot real.
  console.log('[prebuild] NUDE_CONTENT_DIR definido: snapshot omitido');
} else try {
  await mkdir(outDir, { recursive: true });
  const productos = await readJsonDir(productsDir);
  const tienda = await readJsonFile(join(ajustesDir, 'tienda.json'));
  const envios = await readJsonFile(join(ajustesDir, 'envios.json'));
  const snapshot = { buildId: shortSha, productos, tienda, envios };
  await writeFile(join(outDir, 'catalogo.json'), JSON.stringify(snapshot), 'utf8');
  console.log(`[prebuild] catálogo snapshot: ${productos.length} productos`);
} catch (err) {
  console.warn(`[prebuild] snapshot omitido: ${err.message}`);
}
