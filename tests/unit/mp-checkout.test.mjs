// Bloque C: cobro con Mercado Pago.
// - Preferencia sin precios ≤ 0 y con suma exacta al total del pedido.
// - Webhook: monto o moneda distintos → estado `revisar` y aviso `pedido_revisar`.
// - Base URL por contexto de deploy.
// - Validación de cantidad (1–20) y notas (≤ 500).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { leerContenido } from '../../lib/contenido.mjs';
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

const root = join(import.meta.dirname, '..', '..');
const { productos, tienda } = leerContenido(join(root, 'content'));

const SECRET = 'secreto-de-prueba';
let mp, pricing, sitio, validar, webhook;

test.before(async () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  process.env.MP_ACCESS_TOKEN = 'TEST-token';
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  mp = await bundle('netlify/functions/_shared/mp.ts');
  pricing = await bundle('lib/pricing.ts');
  sitio = await bundle('netlify/functions/_shared/sitio.ts');
  validar = await bundle('netlify/functions/_shared/validar.ts');
  webhook = (await bundle('netlify/functions/mp-webhook.ts')).default;
});

test.beforeEach(() => resetBlobs());

function itemsDe(carrito, envio = 0) {
  const t = pricing.calcularTotal(carrito, productos, tienda, 'mercadopago', envio);
  const items = mp.itemsPreferencia({
    lineas: t.lineas.map((l) => ({ title: l.nombre, quantity: l.cantidad, unit_price: l.precioUnitario })),
    envio: t.envio,
    total: t.total,
  });
  return { t, items };
}

const suma = (items) => items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

function chequear({ t, items }, msg = '') {
  assert.equal(suma(items), t.total, `suma de ítems = total ${msg}`);
  for (const i of items) {
    assert.ok(Number.isInteger(i.unit_price) && i.unit_price > 0, `unit_price > 0 entero ${msg}: ${i.unit_price}`);
    assert.ok(Number.isInteger(i.quantity) && i.quantity > 0, `quantity > 0 ${msg}`);
    assert.equal(i.currency_id, 'ARS');
  }
}

test('preferencia · 2 productos con MP (5% por cantidad): sin precios negativos y suma exacta', () => {
  const r = itemsDe([
    { slug: 'serum-multi-active', cantidad: 1 },
    { slug: 'crema-facial-porcelain', cantidad: 1 },
  ]);
  assert.ok(r.t.descuentos.length > 0, 'aplica el descuento por cantidad');
  chequear(r);
});

test('preferencia · misma línea con varias unidades y envío', () => {
  chequear(itemsDe([{ slug: 'toalla-microfibra', cantidad: 3 }], 4500), '3 toallas + envío');
  chequear(itemsDe([{ slug: 'serum-transformacion', cantidad: 20 }]), '20 unidades');
});

test('preferencia · 500 carritos al azar: siempre suma exacta y precios > 0', () => {
  let seed = 42;
  const rnd = (n) => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed % n;
  };
  const disponibles = productos.filter((p) => p.disponible);
  for (let k = 0; k < 500; k++) {
    const lineas = 1 + rnd(5);
    const carrito = [];
    for (let j = 0; j < lineas; j++) {
      const p = disponibles[rnd(disponibles.length)];
      if (!carrito.some((c) => c.slug === p.slug)) carrito.push({ slug: p.slug, cantidad: 1 + rnd(20) });
    }
    chequear(itemsDe(carrito, rnd(3) * 3000), JSON.stringify(carrito));
  }
});

test('preferencia · createPreference nunca manda unit_price ≤ 0 a MP', async () => {
  const f = fakeFetch();
  const t = pricing.calcularTotal(
    [{ slug: 'serum-multi-active', cantidad: 2 }],
    productos,
    tienda,
    'mercadopago',
    0,
  );
  await mp.createPreference(
    {
      pedidoId: 'NUDE-20261026-e2e002',
      lineas: t.lineas.map((l) => ({ title: l.nombre, quantity: l.cantidad, unit_price: l.precioUnitario })),
      comprador: { nombre: 'Clienta Prueba', email: 'prueba@example.com' },
      envio: 0,
      total: t.total,
      siteUrl: 'https://nudecosmetica.com',
      notificationUrl: 'https://nudecosmetica.com/.netlify/functions/mp-webhook',
    },
    'TEST-token',
  );
  const body = f.preferencias[0];
  assert.ok(body.items.every((i) => i.unit_price > 0));
  assert.equal(suma(body.items), t.total);
  assert.match(body.back_urls.success, /^https:\/\/nudecosmetica\.com\/pedido\/\?id=/);
});

const ID = 'NUDE-20261026-e2e001';
function pago(over = {}) {
  return { id: 777, status: 'approved', external_reference: ID, transaction_amount: 23300, currency_id: 'ARS', ...over };
}

test('webhook · monto distinto en más de $1 → revisar + aviso pedido_revisar', async () => {
  const f = fakeFetch();
  f.pagos['777'] = pago({ transaction_amount: 100 });
  putBlob('pedidos', ID, pedidoFixture());
  await webhook(webhookRequest('777', SECRET), ctx());
  const p = blobs('pedidos').get(ID);
  assert.equal(p.estado, 'revisar');
  assert.equal(p.tipo, 'pedido_revisar');
  assert.match(p.motivoRevision, /monto/);
  assert.equal(f.avisosOk.length, 1);
  assert.equal(f.avisosOk[0].tipo, 'pedido_revisar');
  assert.equal(f.avisosOk[0].estado, 'revisar');
  assert.equal(f.avisosOk[0].pago.mpMonto, 100);
});

test('webhook · moneda distinta de ARS → revisar', async () => {
  const f = fakeFetch();
  f.pagos['777'] = pago({ currency_id: 'USD' });
  putBlob('pedidos', ID, pedidoFixture());
  await webhook(webhookRequest('777', SECRET), ctx());
  assert.equal(blobs('pedidos').get(ID).estado, 'revisar');
  assert.equal(f.avisosOk[0].tipo, 'pedido_revisar');
});

test('webhook · diferencia de hasta $1 (redondeo) → pagado', async () => {
  const f = fakeFetch();
  f.pagos['777'] = pago({ transaction_amount: 23301 });
  putBlob('pedidos', ID, pedidoFixture());
  await webhook(webhookRequest('777', SECRET), ctx());
  assert.equal(blobs('pedidos').get(ID).estado, 'pagado');
  assert.equal(f.avisosOk[0].tipo, 'pedido_pagado');
});

test('base URL · producción usa URL (nudecosmetica.com); el resto, DEPLOY_PRIME_URL', () => {
  const env = {
    URL: 'https://nudecosmetica.com',
    DEPLOY_PRIME_URL: 'https://deploy-preview-2--nude-beauty-web.netlify.app',
    origen: 'https://otro.netlify.app',
  };
  assert.equal(sitio.baseUrlSitio({ produccion: true, ...env }), 'https://nudecosmetica.com');
  assert.equal(
    sitio.baseUrlSitio({ produccion: false, ...env }),
    'https://deploy-preview-2--nude-beauty-web.netlify.app',
  );
  // Producción sin URL: igual el dominio, nunca un *.netlify.app.
  assert.equal(sitio.baseUrlSitio({ produccion: true, DEPLOY_PRIME_URL: env.DEPLOY_PRIME_URL }), 'https://nudecosmetica.com');
});

function payload(over = {}) {
  return {
    items: [{ slug: 'serum-multi-active', cantidad: 1 }],
    comprador: { nombre: 'Clienta Prueba', email: 'prueba@example.com', telefono: '000' },
    entrega: { modo: 'retiro' },
    medioPago: 'transferencia',
    terminos: true,
    ...over,
  };
}

test('validación · cantidad por línea entera entre 1 y 20', () => {
  for (const cantidad of [1, 20]) {
    assert.doesNotThrow(() => validar.validarPayload(payload({ items: [{ slug: 'x', cantidad }] })));
  }
  for (const cantidad of [0, 21, 1.5, -1, '2', null]) {
    assert.throws(() => validar.validarPayload(payload({ items: [{ slug: 'x', cantidad }] })), /cantidad/, String(cantidad));
  }
});

test('validación · notas hasta 500 caracteres', () => {
  assert.doesNotThrow(() => validar.validarPayload(payload({ notas: 'a'.repeat(500) })));
  assert.throws(() => validar.validarPayload(payload({ notas: 'a'.repeat(501) })), /notas/);
});
