import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

let ids;
test.before(async () => {
  const out = await build({
    entryPoints: [join(root, 'netlify', 'functions', '_shared', 'ids.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    external: ['node:*'],
  });
  ids = await import(
    'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
  );
});

test('generarIdPedido · formato NUDE-YYYYMMDD-xxxxxx', () => {
  const id = ids.generarIdPedido(new Date('2026-10-26T10:00:00Z'));
  assert.match(id, /^NUDE-20261026-[0-9a-f]{6}$/);
});

test('generarIdPedido · dos llamadas devuelven ids diferentes', () => {
  const a = ids.generarIdPedido();
  const b = ids.generarIdPedido();
  assert.notEqual(a, b);
});
