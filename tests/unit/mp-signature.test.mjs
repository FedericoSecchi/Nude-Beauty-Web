import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

let mp;
test.before(async () => {
  const out = await build({
    entryPoints: [join(root, 'netlify', 'functions', '_shared', 'mp.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    external: ['node:*', '@netlify/*'],
  });
  mp = await import(
    'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
  );
});

function firmar(secret, ts, dataId, requestId) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

test('verifyXSignature · firma válida pasa', () => {
  const secret = 'super-secreto';
  const ts = '1735000000000';
  const r = mp.verifyXSignature({
    signature: firmar(secret, ts, '12345', 'req-abc'),
    requestId: 'req-abc',
    dataId: '12345',
    secret,
  });
  assert.equal(r.ok, true);
});

test('verifyXSignature · firma inválida es rechazada', () => {
  const r = mp.verifyXSignature({
    signature: 'ts=1,v1=' + '00'.repeat(32),
    requestId: 'r',
    dataId: 'd',
    secret: 's',
  });
  assert.equal(r.ok, false);
});

test('verifyXSignature · sin secreto no acepta nada', () => {
  const r = mp.verifyXSignature({
    signature: 'ts=1,v1=abc',
    requestId: 'r',
    dataId: 'd',
    secret: undefined,
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /MP_WEBHOOK_SECRET/);
});

test('verifyXSignature · header mal formado es rechazado', () => {
  const r = mp.verifyXSignature({
    signature: 'esto no sirve',
    requestId: 'r',
    dataId: 'd',
    secret: 's',
  });
  assert.equal(r.ok, false);
});

test('verifyXSignature · falta header', () => {
  const r = mp.verifyXSignature({ signature: null, requestId: 'r', dataId: 'd', secret: 's' });
  assert.equal(r.ok, false);
});

// Orders: el data.id (ORD01…) entra al manifest en minúsculas (doc oficial de notificaciones de
// Checkout Pro vía Orders). Ejemplo con la forma documentada.
test('verifyXSignature · order ORD… se firma con el id en minúsculas', () => {
  const secret = 'super-secreto';
  const ts = '1742505638683';
  const reqId = '2066ca19-c6f1-498a-be75-1923005edd06';
  const id = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
  const ok = mp.verifyXSignature({ signature: firmar(secret, ts, id.toLowerCase(), reqId), requestId: reqId, dataId: id, secret });
  assert.equal(ok.ok, true);
  const mal = mp.verifyXSignature({ signature: firmar(secret, ts, id, reqId), requestId: reqId, dataId: id, secret });
  assert.equal(mal.ok, false);
});

test('verifyXSignature · sin x-request-id se saca del manifest', () => {
  const secret = 's';
  const ts = '1';
  const v1 = createHmac('sha256', secret).update(`id:ord1;ts:${ts};`).digest('hex');
  assert.equal(mp.verifyXSignature({ signature: `ts=${ts},v1=${v1}`, requestId: null, dataId: 'ORD1', secret }).ok, true);
});
