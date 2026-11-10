// Cobro con Mercado Pago · Checkout Pro con la API de Orders (armado de la order en crear-pedido).
// - Ítems sin precios ≤ 0, con el tono en el título y suma exacta = total_amount = total de lib/pricing
//   (con MP solo el 5% por cantidad, nunca el 20% de transferencia).
// - external_reference = id del pedido, URLs de retorno a /pedido/?id=…, X-Idempotency-Key por pedido.
// - crear-pedido redirige al checkout_url y guarda el id de la order en Blobs.
// - Base URL por contexto de deploy y validación de cantidad/notas.
// Nada llama a Mercado Pago: fetch falso (tests/unit/_harness.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { leerContenido, leerDireccionRetiro } from '../../lib/contenido.mjs';
import { blobs, bundle, CHECKOUT_URL, ctx, fakeFetch, ORDER_URL, resetBlobs, setSnapshot } from './_harness.mjs';

const root = join(import.meta.dirname, '..', '..');
const contenido = leerContenido(join(root, 'content'));
const { productos, tienda } = contenido;
const GLOSS = productos.find((p) => p.variantes?.length);

const TOKEN = 'token-de-mentira'; // nunca se llama a MP: fetch falso
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let mp, pricing, sitio, validar, crear;

test.before(async () => {
  process.env.MP_ACCESS_TOKEN = TOKEN;
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  mp = await bundle('netlify/functions/_shared/mp.ts');
  pricing = await bundle('lib/pricing.ts');
  sitio = await bundle('netlify/functions/_shared/sitio.ts');
  validar = await bundle('netlify/functions/_shared/validar.ts');
  crear = (await bundle('netlify/functions/crear-pedido.ts', { snapshot: true })).default;
});

test.beforeEach(() => resetBlobs());

function orderDe(carrito, envio = 0, pedidoId = 'NUDE-20261110-e2e001') {
  const t = pricing.calcularTotal(carrito, productos, tienda, 'mercadopago', envio);
  const body = mp.armarOrder({
    pedidoId,
    lineas: t.lineas.map((l) => ({ title: l.nombre, quantity: l.cantidad, unit_price: l.precioUnitario })),
    comprador: { nombre: 'Clienta Prueba', email: 'prueba@example.com' },
    envio: t.envio,
    total: t.total,
    siteUrl: 'https://nudecosmetica.com',
  });
  return { t, body };
}

const suma = (items) => items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);

function chequear({ t, body }, msg = '') {
  assert.equal(suma(body.items), t.total, `suma de ítems = total del pedido ${msg}`);
  assert.equal(body.total_amount, t.total.toFixed(2), `total_amount = total de lib/pricing ${msg}`);
  for (const i of body.items) {
    assert.equal(typeof i.unit_price, 'string', 'la API de Orders recibe montos como string');
    assert.match(i.unit_price, /^\d+\.00$/);
    assert.ok(Number(i.unit_price) > 0, `unit_price > 0 ${msg}: ${i.unit_price}`);
    assert.ok(Number.isInteger(i.quantity) && i.quantity > 0, `quantity > 0 ${msg}`);
  }
}

test('order · forma de Checkout Pro: type online, processing_mode manual, external_reference y URLs de retorno', () => {
  const { body } = orderDe([{ slug: 'serum-multi-active', cantidad: 1 }]);
  assert.equal(body.type, 'online');
  assert.equal(body.processing_mode, 'manual');
  assert.equal(body.external_reference, 'NUDE-20261110-e2e001');
  assert.match(body.external_reference, /^[\w-]{1,64}$/, 'formato aceptado por la API');
  assert.equal(body.payer.email, 'prueba@example.com');
  assert.deepEqual(body.config.online, {
    success_url: 'https://nudecosmetica.com/pedido/?id=NUDE-20261110-e2e001',
    failure_url: 'https://nudecosmetica.com/pedido/?id=NUDE-20261110-e2e001&estado=fallo',
    pending_url: 'https://nudecosmetica.com/pedido/?id=NUDE-20261110-e2e001&estado=pendiente',
    auto_return: 'approved',
  });
  assert.equal(body.notification_url, undefined, 'las notificaciones van por el panel, no por order');
});

test('order · 2 productos con MP: 5% por cantidad, sin 20% de transferencia, sin negativos y suma exacta', () => {
  const r = orderDe([
    { slug: 'serum-multi-active', cantidad: 1 },
    { slug: 'crema-facial-porcelain', cantidad: 1 },
  ]);
  assert.deepEqual(r.t.descuentos.map((d) => d.motivo), ['Descuento por 2 o más unidades (5%)']);
  chequear(r);
  // 2 serums con MP = $44.270 (lista $46.600 − 5%), el ejemplo de PROGRESS.
  const dos = orderDe([{ slug: 'serum-multi-active', cantidad: 2 }]);
  assert.equal(dos.t.total, 44270);
  chequear(dos);
});

test('order · el tono va en el título del ítem', () => {
  const r = orderDe([{ slug: GLOSS.slug, cantidad: 1, variante: GLOSS.variantes[1] }]);
  assert.equal(r.body.items[0].title, `${GLOSS.nombre} · Tono ${GLOSS.variantes[1]}`);
  chequear(r);
});

test('order · misma línea con varias unidades y envío', () => {
  const r = orderDe([{ slug: 'toalla-microfibra', cantidad: 3 }], 4500);
  chequear(r, '3 toallas + envío');
  assert.deepEqual(r.body.items.at(-1), { title: 'Envío', quantity: 1, unit_price: '4500.00' });
  chequear(orderDe([{ slug: 'serum-transformacion', cantidad: 20 }]), '20 unidades');
});

test('order · 500 carritos al azar: siempre suma exacta = total de lib/pricing y precios > 0', () => {
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
      // Con tonos (gloss), uno al azar: el servidor lo exige.
      const variante = p.variantes?.length ? p.variantes[rnd(p.variantes.length)] : undefined;
      if (!carrito.some((c) => c.slug === p.slug)) carrito.push({ slug: p.slug, cantidad: 1 + rnd(20), variante });
    }
    chequear(orderDe(carrito, rnd(3) * 3000), JSON.stringify(carrito));
  }
});

test('order · crearOrder manda X-Idempotency-Key y Authorization a POST /v1/orders', async () => {
  const f = fakeFetch();
  const { t } = orderDe([{ slug: 'serum-multi-active', cantidad: 2 }]);
  const key = '7f1c2c55-3c4e-4b4b-9a51-2f0f3c1b9e10';
  const order = await mp.crearOrder(
    {
      pedidoId: 'NUDE-20261110-e2e002',
      lineas: t.lineas.map((l) => ({ title: l.nombre, quantity: l.cantidad, unit_price: l.precioUnitario })),
      comprador: { nombre: 'Clienta Prueba', email: 'prueba@example.com' },
      envio: 0,
      total: t.total,
      siteUrl: 'https://nudecosmetica.com',
    },
    TOKEN,
    key,
  );
  const { body, headers } = f.ordersCreadas[0];
  assert.equal(headers['X-Idempotency-Key'], key);
  assert.equal(headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(body.total_amount, '44270.00');
  assert.equal(order.checkout_url, CHECKOUT_URL + order.id);
});

test('order · un checkout_url fuera de Mercado Pago no se usa', () => {
  assert.equal(mp.esUrlDeMercadoPago('https://www.mercadopago.com.ar/checkout/v1/redirect?order_id=ORD1'), true);
  assert.equal(mp.esUrlDeMercadoPago('https://mercadopago.com/checkout'), true);
  assert.equal(mp.esUrlDeMercadoPago('http://www.mercadopago.com.ar/checkout'), false);
  assert.equal(mp.esUrlDeMercadoPago('https://mercadopago.com.ar.evil.test/checkout'), false);
  assert.equal(mp.esUrlDeMercadoPago('https://evilmercadopago.com/checkout'), false);
  assert.equal(mp.esUrlDeMercadoPago('no es una url'), false);
});

// --- crear-pedido con Mercado Pago, de punta a punta en la function ---

const COMPRADORA = { nombre: 'Clienta Prueba', email: 'prueba@example.com', telefono: '351 000 0000' };
const postCrear = (body) =>
  crear(
    new Request('https://nudecosmetica.com/.netlify/functions/crear-pedido', { method: 'POST', body: JSON.stringify(body) }),
    ctx(),
  );
const pedidoMp = (items) => ({ items, comprador: COMPRADORA, entrega: { modo: 'retiro' }, medioPago: 'mercadopago', terminos: true });

function snapshotMp() {
  setSnapshot({
    buildId: 'test',
    ...contenido,
    mpHabilitado: true,
    webhookAviso: true,
    direccionRetiro: leerDireccionRetiro(join(root, 'content')),
  });
}

test('crear-pedido · MP: crea la order con el total del servidor, guarda el id y devuelve el checkout_url', async () => {
  snapshotMp();
  const f = fakeFetch();
  const items = [{ slug: 'serum-multi-active', cantidad: 2 }, { slug: GLOSS.slug, cantidad: 1, variante: 'Bronze' }];
  const res = await postCrear(pedidoMp(items));
  assert.equal(res.status, 201);
  const data = await res.json();

  const esperado = pricing.calcularTotal(items, productos, tienda, 'mercadopago', 0);
  assert.equal(data.total, esperado.total);
  assert.equal(f.ordersCreadas.length, 1);
  const { body, headers } = f.ordersCreadas[0];
  assert.equal(body.external_reference, data.id);
  assert.equal(body.total_amount, esperado.total.toFixed(2));
  assert.equal(suma(body.items), esperado.total);
  assert.ok(body.items.some((i) => i.title.endsWith('· Tono Bronze')));
  assert.equal(body.config.online.success_url, `https://nudecosmetica.com/pedido/?id=${data.id}`);
  assert.match(headers['X-Idempotency-Key'], UUID);

  const orderId = Object.keys(f.orders)[0];
  assert.equal(data.checkoutUrl, CHECKOUT_URL + orderId, 'el navegador va al checkout_url que devolvió la API');
  const guardado = blobs('pedidos').get(data.id);
  assert.equal(guardado.estado, 'pendiente_mp');
  assert.equal(guardado.pago.mpOrderId, orderId);
  assert.equal(guardado.pago.mpCheckoutUrl, data.checkoutUrl);
  assert.equal(f.avisos.length, 0, 'el aviso a n8n sale recién cuando MP confirma el pago');
});

test('crear-pedido · MP: cada pedido usa su propia X-Idempotency-Key', async () => {
  snapshotMp();
  const f = fakeFetch();
  await postCrear(pedidoMp([{ slug: 'serum-multi-active', cantidad: 1 }]));
  await postCrear(pedidoMp([{ slug: 'serum-multi-active', cantidad: 1 }]));
  const [a, b] = f.ordersCreadas.map((o) => o.headers['X-Idempotency-Key']);
  assert.match(a, UUID);
  assert.notEqual(a, b);
});

test('crear-pedido · MP: si la API falla no se guarda ningún pedido', async () => {
  snapshotMp();
  fakeFetch();
  const fetchFalso = globalThis.fetch;
  globalThis.fetch = async (url, init) =>
    String(url).endsWith('/v1/orders') ? new Response('{"errors":[]}', { status: 400 }) : fetchFalso(url, init);
  const res = await postCrear(pedidoMp([{ slug: 'serum-multi-active', cantidad: 1 }]));
  assert.equal(res.status, 500);
  assert.equal(blobs('pedidos').size, 0);
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
