// Bloque B: ningún pedido sin aviso. Corre los handlers reales (mp-webhook, arrepentimiento) y la
// lógica de la función programada contra un Blobs en memoria y un fetch falso.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bundle,
  blobs,
  ctx,
  fakeFetch,
  ORDER_URL,
  pedidoFixture,
  putBlob,
  resetBlobs,
  webhookRequest,
} from './_harness.mjs';

const SECRET = 'secreto-de-prueba';
let webhook, arrepentimiento, avisos, blobsMod;

test.before(async () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  process.env.MP_ACCESS_TOKEN = 'TEST-token';
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  webhook = (await bundle('netlify/functions/mp-webhook.ts')).default;
  arrepentimiento = (await bundle('netlify/functions/arrepentimiento.ts')).default;
  avisos = await bundle('netlify/functions/_shared/avisos.ts');
  blobsMod = await bundle('netlify/functions/_shared/blobs.ts');
});

test.beforeEach(() => resetBlobs());

const ID = 'NUDE-20261026-e2e001';
const PROD = { produccion: true };
const enMinutos = (m) => () => Date.now() + m * 60_000;

function pagoAprobado(over = {}) {
  return { id: 555, status: 'approved', external_reference: ID, transaction_amount: 23300, currency_id: 'ARS', ...over };
}

test('avisos · webhook de n8n falla y después anda → un solo aviso exitoso', async () => {
  const f = fakeFetch();
  f.pagos['555'] = pagoAprobado();
  putBlob('pedidos', ID, pedidoFixture());

  f.aviso = 500;
  const res = await webhook(webhookRequest('555', SECRET), ctx());
  assert.equal(res.status, 200);
  let p = blobs('pedidos').get(ID);
  assert.equal(p.estado, 'pagado');
  assert.equal(p.avisoEnviado, undefined);
  assert.equal(p.intentosAviso, 1);
  assert.equal(p.ultimoErrorAviso, 'aviso HTTP 500');
  assert.ok(p.proximoIntentoAviso, 'queda programado el reintento');

  // Antes del backoff la función programada no reintenta.
  f.aviso = 200;
  let r = await avisos.reintentarPendientes(PROD, enMinutos(1));
  assert.equal(r.enviados, 0);

  // Después del backoff, sí.
  r = await avisos.reintentarPendientes(PROD, enMinutos(11));
  assert.equal(r.enviados, 1);
  p = blobs('pedidos').get(ID);
  assert.equal(p.avisoEnviado, true);
  assert.equal(p.intentosAviso, 2);
  assert.equal(p.ultimoErrorAviso, undefined);

  // Ni otra corrida ni otra notificación de MP vuelven a avisar.
  await avisos.reintentarPendientes(PROD, enMinutos(120));
  await webhook(webhookRequest('555', SECRET), ctx());
  assert.equal(f.avisosOk.length, 1);
  assert.equal(f.avisosOk[0].tipo, 'pedido_pagado');
  assert.equal(f.avisosOk[0].estado, 'pagado');
});

test('avisos · si el pedido ya estaba pagado pero el aviso no salió, la próxima notificación de MP lo manda', async () => {
  const f = fakeFetch();
  f.pagos['555'] = pagoAprobado();
  putBlob('pedidos', ID, pedidoFixture({ estado: 'pagado', avisoEnviado: false, intentosAviso: 1 }));
  await webhook(webhookRequest('555', SECRET), ctx());
  assert.equal(f.avisosOk.length, 1);
  assert.equal(blobs('pedidos').get(ID).avisoEnviado, true);
});

test('avisos · dos notificaciones de MP del mismo pago → un solo aviso (seguidas y simultáneas)', async () => {
  const f = fakeFetch();
  f.pagos['555'] = pagoAprobado();

  putBlob('pedidos', ID, pedidoFixture());
  await webhook(webhookRequest('555', SECRET, 'a'), ctx());
  await webhook(webhookRequest('555', SECRET, 'b'), ctx());
  assert.equal(f.avisos.length, 1);

  resetBlobs();
  const g = fakeFetch();
  g.pagos['555'] = pagoAprobado();
  putBlob('pedidos', ID, pedidoFixture());
  await Promise.all([
    webhook(webhookRequest('555', SECRET, 'c'), ctx()),
    webhook(webhookRequest('555', SECRET, 'd'), ctx()),
    avisos.reintentarPendientes(PROD),
  ]);
  assert.equal(g.avisos.length, 1, 'un solo POST a n8n aunque lleguen en paralelo');
  assert.equal(blobs('pedidos').get(ID).avisoEnviado, true);
});

test('avisos · arrepentimiento con webhook caído → queda guardado y se reintenta', async () => {
  const f = fakeFetch();
  f.aviso = 503;
  const res = await arrepentimiento(
    new Request('https://nudecosmetica.com/.netlify/functions/arrepentimiento', {
      method: 'POST',
      body: JSON.stringify({ numeroOrden: 'NUDE-20261026-abc123', nombre: 'Clienta Prueba', email: 'prueba@example.com', motivo: 'cambié de idea' }),
    }),
    ctx(),
  );
  assert.equal(res.status, 200);
  const { codigo } = await res.json();
  assert.match(codigo, /^NUDE-ARR-/);

  let a = blobs('arrepentimientos').get(codigo);
  assert.equal(a.estado, 'arrepentimiento');
  assert.equal(a.source, 'web');
  assert.equal(a.avisoEnviado, false);
  assert.equal(a.intentosAviso, 1);
  assert.equal(a.ultimoErrorAviso, 'aviso HTTP 503');

  f.aviso = 200;
  const r = await avisos.reintentarPendientes(PROD, enMinutos(11));
  assert.equal(r.enviados, 1);
  a = blobs('arrepentimientos').get(codigo);
  assert.equal(a.avisoEnviado, true);
  assert.equal(f.avisosOk.length, 1);
  assert.equal(f.avisosOk[0].tipo, 'arrepentimiento');
  assert.equal(f.avisosOk[0].id, codigo);
});

test('avisos · arrepentimiento sin ORDER_WEBHOOK_URL igual se guarda y devuelve código', async () => {
  fakeFetch();
  const prev = process.env.ORDER_WEBHOOK_URL;
  delete process.env.ORDER_WEBHOOK_URL;
  try {
    const res = await arrepentimiento(
      new Request('https://x/', { method: 'POST', body: JSON.stringify({ numeroOrden: '1', nombre: 'A', email: 'a@example.com' }) }),
      ctx(),
    );
    const { codigo } = await res.json();
    const a = blobs('arrepentimientos').get(codigo);
    assert.equal(a.avisoEnviado, false);
    assert.equal(a.ultimoErrorAviso, 'ORDER_WEBHOOK_URL no configurado');
  } finally {
    process.env.ORDER_WEBHOOK_URL = prev;
  }
});

test('avisos · pedidos e2e y estados que no corresponden no se avisan', async () => {
  const f = fakeFetch();
  putBlob('pedidos', 'a', pedidoFixture({ id: 'a', source: 'e2e', estado: 'pagado' }));
  putBlob('pedidos', 'b', pedidoFixture({ id: 'b', estado: 'pendiente_mp' }));
  putBlob('pedidos', 'c', pedidoFixture({ id: 'c', estado: 'cancelado' }));
  putBlob('pedidos', 'd', pedidoFixture({ id: 'd', estado: 'pendiente_transferencia', tipo: 'pedido_transferencia' }));
  const r = await avisos.reintentarPendientes(PROD);
  assert.equal(r.enviados, 1);
  assert.deepEqual(f.avisosOk.map((x) => x.id), ['d']);
});

test('avisos · backoff crece y tiene techo de 6 h', () => {
  assert.deepEqual([1, 2, 3, 4].map(avisos.backoffMinutos), [10, 20, 40, 80]);
  assert.equal(avisos.backoffMinutos(30), 360);
});

test('stores · producción usa pedidos/arrepentimientos; preview, branch y dev usan *-preview', async () => {
  const { entornoDe, nombreStore } = blobsMod;
  const prod = entornoDe(ctx('production'));
  assert.equal(nombreStore('pedidos', prod), 'pedidos');
  assert.equal(nombreStore('arrepentimientos', prod), 'arrepentimientos');
  for (const c of ['deploy-preview', 'branch-deploy', 'dev']) {
    const e = entornoDe(ctx(c));
    assert.equal(nombreStore('pedidos', e), 'pedidos-preview', c);
    assert.equal(nombreStore('arrepentimientos', e), 'arrepentimientos-preview', c);
  }
  assert.equal(nombreStore('pedidos', prod, true), 'pedidos-e2e');
  // Sin contexto de la función, cae a la variable CONTEXT y, si no está, a dev.
  const prev = process.env.CONTEXT;
  process.env.CONTEXT = 'production';
  assert.equal(entornoDe(null).produccion, true);
  delete process.env.CONTEXT;
  assert.equal(entornoDe(null).produccion, false);
  if (prev !== undefined) process.env.CONTEXT = prev;
});

test('stores · un pedido de deploy preview no cae en el store de producción', async () => {
  const f = fakeFetch();
  f.pagos['555'] = pagoAprobado();
  putBlob('pedidos-preview', ID, pedidoFixture());
  await webhook(webhookRequest('555', SECRET), ctx('deploy-preview'));
  assert.equal(blobs('pedidos-preview').get(ID).estado, 'pagado');
  assert.equal(blobs('pedidos').size, 0);
});
