#!/usr/bin/env node
// Copia content/ a un directorio temporal con todos los productos en disponible:false.
// verify.sh lo usa para buildear una variante "sin stock" y medir la ficha en 360×740.
// Uso: node scripts/fixture-sin-stock.mjs <dir-destino>
import { cp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = process.argv[2];
if (!dest) {
  console.error('uso: fixture-sin-stock.mjs <dir-destino>');
  process.exit(2);
}
await rm(dest, { recursive: true, force: true });
await cp(join(root, 'content'), dest, { recursive: true });
const dir = join(dest, 'productos');
let n = 0;
for (const f of await readdir(dir)) {
  if (!f.endsWith('.json')) continue;
  const p = JSON.parse(await readFile(join(dir, f), 'utf8'));
  p.disponible = false;
  await writeFile(join(dir, f), JSON.stringify(p, null, 2));
  n++;
}
console.log(`[fixture-sin-stock] ${n} productos sin stock en ${dest}`);
