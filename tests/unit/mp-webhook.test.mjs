// Webhook de Mercado Pago con la API de Orders (netlify/functions/mp-webhook.ts):
// - firma x-signature válida e inválida con notificaciones de la forma documentada por MP;
// - consulta (mockeada) de la order en cada estado y su efecto en el pedido;
// - monto o moneda distintos → «revisar»; notificación duplicada → sin cambios y un solo aviso;
// - notificaciones de payment (Preferences viejas) o desconocidas → 200 sin tocar pedidos.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blobs,
  bundle,
  ctx,
  fakeFetch,
  ORDER_URL,
  orderFixture,
  pedidoFixture,
  putBlob,
  resetBlobs,
  webhookPaymentRequest,
  webhookRequest,
} from './_harness.mjs';

const SECRET = 'secreto-de-prueba';
const ID = 'NUDE-20261026-e2e001';
const OID = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
let webhook, estadoPedido;

test.before(async () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  process.env.MP_ACCESS_TOKEN = 'token-de-mentira'; // nunca se llama a MP: fetch falso
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  webhook = (await bundle('netlify/functions/mp-webhook.ts')).default;
  estadoPedido = (await bundle('netlify/functions/estado-pedido.ts')).default;
});

test.beforeEach(() => resetBlobs());

/** Pedido con la order ya creada por crear-pedido, y la order que devuelve GET /v1/orders/{id}. */
function escenario(order = {}, pedido = {}) {
  const f = fakeFetch();
  f.orders[OID] = orderFixture({ id: OID, external_reference: ID, ...order });
  putBlob('pedidos', ID, pedidoFixture({ pago: { medio: 'mercadopago', mpOrderId: OID }, ...pedido }));
  return f;
}
const pedido = () => blobs('pedidos').get(ID);

// --- Firma ---

test('firma · válida (manifest con data.id en minúsculas) → consulta la order y responde 200', async () => {
  const f = escenario();
  const res = await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(res.status, 200);
  assert.deepEqual(f.consultas, [OID], 'GET /v1/orders/{id} con el id tal cual llegó');
  assert.equal(pedido().estado, 'pagado');
});

test('firma · inválida → 401, sin consultar a MP ni tocar el pedido', async () => {
  const f = escenario();
  const antes = pedido();
  for (const req of [
    webhookRequest(OID, 'otro-secreto'),
    webhookRequest(OID, SECRET, { v1: '00'.repeat(32) }),
    new Request(`https://nudecosmetica.com/.netlify/functions/mp-webhook?data.id=${OID}&type=order`, {
      method: 'POST',
      body: JSON.stringify({ action: 'order.processed', type: 'order', data: { id: OID } }),
    }),
  ]) {
    const res = await webhook(req, ctx());
    assert.equal(res.status, 401);
  }
  assert.equal(f.consultas.length, 0);
  assert.deepEqual(pedido(), antes);
  assert.equal(f.avisos.length, 0);
});

test('firma · firmada con el id en mayúsculas (manifest mal armado) → 401', async () => {
  const f = escenario();
  const ts = String(Date.now());
  const { createHmac } = await import('node:crypto');
  const v1 = createHmac('sha256', SECRET).update(`id:${OID};request-id:r1;ts:${ts};`).digest('hex');
  const res = await webhook(webhookRequest(OID, SECRET, { requestId: 'r1', ts, v1 }), ctx());
  assert.equal(res.status, 401);
  assert.equal(f.consultas.length, 0);
});

test('firma · data.id del body distinto del de la query (firmada) → 401 sin consultar', async () => {
  const f = escenario();
  const res = await webhook(webhookRequest(OID, SECRET, { bodyId: 'ORD01OTRAORDERDISTINTA00000000' }), ctx());
  assert.equal(res.status, 401);
  assert.equal(f.consultas.length, 0);
});

test('firma · sin MP_WEBHOOK_SECRET no acepta nada', async () => {
  const f = escenario();
  const prev = process.env.MP_WEBHOOK_SECRET;
  delete process.env.MP_WEBHOOK_SECRET;
  try {
    const res = await webhook(webhookRequest(OID, SECRET), ctx());
    assert.equal(res.status, 401);
  } finally {
    process.env.MP_WEBHOOK_SECRET = prev;
  }
  assert.equal(f.consultas.length, 0);
});

// --- Estados de la order → pedido (la order se consulta a la API, no se lee del body) ---

const casos = [
  { order: { status: 'processed', status_detail: 'accredited' }, estado: 'pagado', avisos: 1 },
  { order: { status: 'created', status_detail: 'created', total_paid_amount: '0.00', transactions: { payments: [] } }, estado: 'pendiente_mp', avisos: 0 },
  { order: { status: 'processing', status_detail: 'in_process', total_paid_amount: '0.00' }, estado: 'pendiente_mp', avisos: 0 },
  { order: { status: 'processing', status_detail: 'pending_review_manual', total_paid_amount: '0.00' }, estado: 'pendiente_mp', avisos: 0 },
  { order: { status: 'action_required', status_detail: 'waiting_capture', total_paid_amount: '0.00' }, estado: 'pendiente_mp', avisos: 0 },
  { order: { status: 'failed', status_detail: 'rejected_by_issuer', total_paid_amount: '0.00' }, estado: 'cancelado', avisos: 0 },
  { order: { status: 'failed', status_detail: 'high_risk', total_paid_amount: '0.00' }, estado: 'cancelado', avisos: 0 },
  { order: { status: 'canceled', status_detail: 'canceled', total_paid_amount: '0.00' }, estado: 'cancelado', avisos: 0 },
  { order: { status: 'expired', status_detail: 'expired', total_paid_amount: '0.00' }, estado: 'cancelado', avisos: 0 },
  { order: { status: 'refunded', status_detail: 'refunded' }, estado: 'reembolsado', avisos: 0 },
  { order: { status: 'processed', status_detail: 'partially_refunded' }, estado: 'revisar', avisos: 1 },
  { order: { status: 'charged_back', status_detail: 'in_process' }, estado: 'revisar', avisos: 1 },
  { order: { status: 'un_estado_nuevo', status_detail: 'x' }, estado: 'pendiente_mp', avisos: 0 },
];

for (const c of casos) {
  test(`estado · order ${c.order.status}/${c.order.status_detail} → pedido ${c.estado}`, async () => {
    const f = escenario(c.order);
    const res = await webhook(webhookRequest(OID, SECRET, { action: `order.${c.order.status}` }), ctx());
    assert.equal(res.status, 200);
    const p = pedido();
    assert.equal(p.estado, c.estado);
    assert.equal(p.pago.mpEstado, c.order.status);
    assert.equal(p.pago.mpEstadoDetalle, c.order.status_detail);
    assert.equal(f.avisosOk.length, c.avisos);
    if (c.estado === 'pagado') {
      assert.equal(f.avisosOk[0].tipo, 'pedido_pagado');
      assert.equal(f.avisosOk[0].pago.mpOrderId, OID);
      assert.equal(f.avisosOk[0].pago.mpPaymentId, 'PAY01J67CQQH5904WDBVZEM4JMEP3');
    }
  });
}

test('estado · el body dice processed pero la API dice created → el pedido sigue pendiente', async () => {
  const f = escenario({ status: 'created', status_detail: 'created', total_paid_amount: '0.00' });
  await webhook(webhookRequest(OID, SECRET, { action: 'order.processed' }), ctx());
  assert.equal(pedido().estado, 'pendiente_mp');
  assert.equal(f.avisos.length, 0);
});

test('estado · pagado y después reembolsado; un rechazo posterior no lo des-reembolsa', async () => {
  const f = escenario();
  await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(pedido().estado, 'pagado');
  f.orders[OID] = orderFixture({ id: OID, external_reference: ID, status: 'refunded', status_detail: 'refunded' });
  await webhook(webhookRequest(OID, SECRET, { requestId: 'r2' }), ctx());
  assert.equal(pedido().estado, 'reembolsado');
  f.orders[OID] = orderFixture({ id: OID, external_reference: ID, status: 'canceled', status_detail: 'canceled' });
  await webhook(webhookRequest(OID, SECRET, { requestId: 'r3' }), ctx());
  assert.equal(pedido().estado, 'reembolsado');
  assert.equal(f.avisosOk.length, 1);
});

test('estado · un pedido pagado no vuelve a cancelado por una notificación vieja de rechazo', async () => {
  const f = escenario({ status: 'failed', status_detail: 'rejected_by_issuer' }, { estado: 'pagado', avisoEnviado: true });
  await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(pedido().estado, 'pagado');
  assert.equal(f.avisos.length, 0);
});

test('estado · cancelado y después processed (la API manda) → pagado', async () => {
  const f = escenario({ status: 'failed', status_detail: 'insufficient_amount', total_paid_amount: '0.00' });
  await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(pedido().estado, 'cancelado');
  f.orders[OID] = orderFixture({ id: OID, external_reference: ID });
  await webhook(webhookRequest(OID, SECRET, { requestId: 'r2' }), ctx());
  assert.equal(pedido().estado, 'pagado');
  assert.equal(f.avisosOk.length, 1);
});

// --- Monto ---

test('monto · cobrado distinto en más de $1 → revisar + aviso pedido_revisar', async () => {
  const f = escenario({ total_paid_amount: '100.00' });
  await webhook(webhookRequest(OID, SECRET), ctx());
  const p = pedido();
  assert.equal(p.estado, 'revisar');
  assert.equal(p.tipo, 'pedido_revisar');
  assert.match(p.motivoRevision, /monto/);
  assert.equal(f.avisosOk.length, 1);
  assert.equal(f.avisosOk[0].tipo, 'pedido_revisar');
  assert.equal(f.avisosOk[0].estado, 'revisar');
  assert.equal(f.avisosOk[0].pago.mpMonto, 100);
});

test('monto · moneda distinta de ARS → revisar', async () => {
  const f = escenario({ currency: 'USD' });
  await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(pedido().estado, 'revisar');
  assert.equal(f.avisosOk[0].tipo, 'pedido_revisar');
});

test('monto · sin total_paid_amount → revisar (nunca pagado a ciegas)', async () => {
  escenario({ total_paid_amount: undefined });
  await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(pedido().estado, 'revisar');
  assert.equal(pedido().motivoRevision, 'monto desconocido');
});

test('monto · diferencia de hasta $1 (redondeo) → pagado', async () => {
  const f = escenario({ total_paid_amount: '23301.00' });
  await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(pedido().estado, 'pagado');
  assert.equal(f.avisosOk[0].tipo, 'pedido_pagado');
});

// --- Idempotencia ---

test('idempotencia · la misma notificación dos veces: el pedido no cambia y sale un solo aviso', async () => {
  const f = escenario();
  const req1 = webhookRequest(OID, SECRET, { requestId: 'mismo', ts: '1762776000000' });
  const req2 = webhookRequest(OID, SECRET, { requestId: 'mismo', ts: '1762776000000' });
  assert.equal((await webhook(req1, ctx())).status, 200);
  const despuesDeLaPrimera = pedido();
  assert.equal((await webhook(req2, ctx())).status, 200);
  assert.deepEqual(pedido(), despuesDeLaPrimera, 'ni actualizado ni ningún otro campo cambia');
  assert.equal(f.avisos.length, 1);
});

test('idempotencia · dos notificaciones simultáneas de la misma order → un solo aviso', async () => {
  const f = escenario();
  await Promise.all([
    webhook(webhookRequest(OID, SECRET, { requestId: 'a' }), ctx()),
    webhook(webhookRequest(OID, SECRET, { requestId: 'b' }), ctx()),
  ]);
  assert.equal(pedido().estado, 'pagado');
  assert.equal(f.avisos.length, 1);
});

test('idempotencia · una notificación pendiente repetida no reescribe el pedido', async () => {
  escenario({ status: 'processing', status_detail: 'in_process', total_paid_amount: '0.00' });
  await webhook(webhookRequest(OID, SECRET), ctx());
  const uno = pedido();
  await webhook(webhookRequest(OID, SECRET, { requestId: 'otra' }), ctx());
  assert.deepEqual(pedido(), uno);
});

// --- Lo que no es de este pedido o no es una order ---

test('order de otro pedido (mpOrderId distinto) → 200 sin tocar el pedido', async () => {
  const f = escenario({}, { pago: { medio: 'mercadopago', mpOrderId: 'ORD01OTRAORDERDISTINTA00000000' } });
  const antes = pedido();
  const res = await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(res.status, 200);
  assert.deepEqual(pedido(), antes);
  assert.equal(f.avisos.length, 0);
});

test('order sin pedido en Blobs → 200 (MP no reintenta) y nada guardado', async () => {
  const f = fakeFetch();
  f.orders[OID] = orderFixture({ id: OID, external_reference: 'NUDE-20261026-noexiste' });
  const res = await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(res.status, 200);
  assert.equal(blobs('pedidos').size, 0);
});

test('la API de MP falla al consultar la order → 500 para que MP reintente, pedido intacto', async () => {
  const f = escenario();
  delete f.orders[OID];
  const antes = pedido();
  const res = await webhook(webhookRequest(OID, SECRET), ctx());
  assert.equal(res.status, 500);
  assert.deepEqual(pedido(), antes);
});

test('notificación de payment (Preferences vieja) → 200, sin consultar a MP ni tocar pedidos, y se loguea el tipo', async () => {
  const f = escenario();
  const antes = pedido();
  const logs = [];
  const res = await webhook(webhookPaymentRequest('123456789', SECRET), { ...ctx(), log: (m) => logs.push(m) });
  assert.equal(res.status, 200);
  assert.equal(f.consultas.length, 0);
  assert.deepEqual(pedido(), antes);
  assert.deepEqual(logs, ['[mp-webhook] notificación ignorada: tipo payment']);
});

test('notificaciones desconocidas o IPN viejas (?topic=…) → 200 sin tocar pedidos', async () => {
  const f = escenario();
  const antes = pedido();
  for (const [query, body] of [
    ['?topic=merchant_order&id=1', ''],
    ['?type=chargebacks&data.id=1', JSON.stringify({ type: 'chargebacks', data: { id: '1' } })],
    ['', JSON.stringify({ type: 'point_integration_wh', data: { id: '1' } })],
    ['', ''],
  ]) {
    const logs = [];
    const res = await webhook(
      new Request(`https://nudecosmetica.com/.netlify/functions/mp-webhook${query}`, { method: 'POST', body }),
      { ...ctx(), log: (m) => logs.push(m) },
    );
    assert.equal(res.status, 200, query || body);
    assert.match(logs[0], /^\[mp-webhook\] notificación ignorada: tipo [\w.-]+|\(vacío\)$/);
  }
  assert.equal(f.consultas.length, 0);
  assert.deepEqual(pedido(), antes);
});

// --- estado-pedido (lo que lee /pedido/) ---

for (const [order, esperado] of [
  [{ status: 'processed', status_detail: 'accredited' }, 'pagado'],
  [{ status: 'processing', status_detail: 'in_process', total_paid_amount: '0.00' }, 'pendiente_mp'],
  [{ status: 'failed', status_detail: 'rejected_by_issuer', total_paid_amount: '0.00' }, 'cancelado'],
  [{ status: 'refunded', status_detail: 'refunded' }, 'reembolsado'],
]) {
  test(`estado-pedido · order ${order.status} → /pedido/ recibe «${esperado}» sin datos de MP ni personales`, async () => {
    escenario(order);
    await webhook(webhookRequest(OID, SECRET), ctx());
    const res = await estadoPedido(new Request(`https://nudecosmetica.com/.netlify/functions/estado-pedido?id=${ID}`), ctx());
    assert.equal(res.status, 200);
    const texto = await res.text();
    const body = JSON.parse(texto);
    assert.equal(body.estado, esperado);
    assert.equal(body.medio, 'mercadopago');
    for (const privado of [OID, 'PAY01', 'prueba@example.com', 'Clienta Prueba', 'checkout_url']) {
      assert.ok(!texto.includes(privado), `estado-pedido no expone ${privado}`);
    }
  });
}
