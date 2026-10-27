// Pedido de punta a punta en las functions, con el contenido real y el snapshot como lo arma el build:
// - Sin ORDER_WEBHOOK_URL en el build (hoy): crear-pedido no guarda nada (409) y pedido-whatsapp arma
//   el mensaje con el alias y, si es retiro, la dirección exacta.
// - Con ORDER_WEBHOOK_URL: transferencia con 5% + 20% ($35.416 por 2 serums), aviso a n8n con
//   entrega.direccionRetiro y /pedido/ (estado-pedido) con alias, total y dirección solo si es retiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { leerContenido, leerDireccionRetiro } from '../../lib/contenido.mjs';
import { blobs, bundle, ctx, fakeFetch, ORDER_URL, resetBlobs, setSnapshot } from './_harness.mjs';

const root = join(import.meta.dirname, '..', '..');
const contenido = leerContenido(join(root, 'content'));
const DIRECCION = leerDireccionRetiro(join(root, 'content'));
const SERUM = contenido.productos.find((p) => p.slug === 'serum-multi-active');

function snapshot({ webhookAviso, tienda = contenido.tienda }) {
  return { buildId: 'test', ...contenido, tienda, mpHabilitado: false, webhookAviso, direccionRetiro: DIRECCION };
}

let crear, estado, whatsapp;
test.before(async () => {
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  crear = (await bundle('netlify/functions/crear-pedido.ts', { snapshot: true })).default;
  estado = (await bundle('netlify/functions/estado-pedido.ts', { snapshot: true })).default;
  whatsapp = (await bundle('netlify/functions/pedido-whatsapp.ts', { snapshot: true })).default;
});
test.beforeEach(() => resetBlobs());

const post = (fn, body) =>
  fn(new Request('https://nudecosmetica.com/.netlify/functions/x', { method: 'POST', body: JSON.stringify(body) }), ctx());

// Datos inventados (repo público).
const COMPRADORA = { nombre: 'Clienta Prueba', email: 'prueba@example.com', telefono: '351 000 0000' };
const pedido = (entrega, cantidad = 2) => ({
  items: [{ slug: SERUM.slug, cantidad }],
  comprador: COMPRADORA,
  entrega,
  medioPago: 'transferencia',
  terminos: true,
});
const ENVIO_ECO = {
  modo: 'envio', zonaId: 'envio-economico', direccion: 'Calle Falsa 123', localidad: 'Unquillo', provincia: 'Córdoba', cp: '5109',
};

// 2 × lista → −5% → −20% sobre lo descontado (con el precio del contenido real).
const conCantidad = 2 * SERUM.precio - Math.round(2 * SERUM.precio * 0.05);
const TOTAL_2 = conCantidad - Math.round(conCantidad * 0.2);

test('el precio real del serum da el ejemplo de Soledad ($35.416)', () => {
  assert.equal(SERUM.precio, 23300, 'si cambió el precio, el ejemplo de abajo ya no es el de Soledad');
  assert.equal(TOTAL_2, 35416);
});

test('sin webhook (alias cargado): crear-pedido no guarda nada', async () => {
  setSnapshot(snapshot({ webhookAviso: false }));
  const avisos = fakeFetch();
  const res = await post(crear, pedido({ modo: 'retiro' }));
  assert.equal(res.status, 409);
  assert.equal(blobs('pedidos').size, 0);
  assert.equal(avisos.avisos.length, 0);
});

test('sin webhook: pedido-whatsapp con retiro trae la dirección exacta y el alias', async () => {
  setSnapshot(snapshot({ webhookAviso: false }));
  const res = await post(whatsapp, { items: [{ slug: SERUM.slug, cantidad: 2 }], comprador: COMPRADORA, entrega: { modo: 'retiro' } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json();
  assert.equal(body.totalTransferencia, 35416);
  const lineas = body.texto.split('\n');
  assert.ok(lineas.includes('Con transferencia: $ 35.416 (5% por cantidad + 20% off)'));
  assert.ok(lineas.includes('Entrega: Retiro en Mendiolaza · gratis'));
  assert.ok(lineas.includes(`Dirección de retiro: ${DIRECCION}`));
  assert.ok(lineas.includes('Alias para transferir: NUDE.CLEAN.CARE (María Soledad Tarantelli)'));
  assert.ok(body.url.startsWith('https://wa.me/5493517033348?text='));
  assert.equal(new URL(body.url).searchParams.get('text'), body.texto);
  // Para el reporte: sin la dirección exacta (los logs y el PR son públicos).
  console.log(`[ejemplo] mensaje de WhatsApp (retiro):\n${body.texto.replace(DIRECCION, '[dirección del panel]')}`);
});

test('sin webhook: pedido-whatsapp con envío no trae la dirección del retiro', async () => {
  setSnapshot(snapshot({ webhookAviso: false }));
  const res = await post(whatsapp, { items: [{ slug: SERUM.slug, cantidad: 2 }], comprador: COMPRADORA, entrega: { modo: 'envio', zonaId: 'envio-economico' } });
  const body = await res.json();
  assert.equal(body.totalTransferencia, 35416 + 3500);
  assert.ok(!body.texto.includes(DIRECCION));
  assert.ok(body.texto.includes('Total con transferencia y envío: $ 38.916'));
});

test('pedido-whatsapp valida: sin teléfono 400, producto inexistente 400, GET 405', async () => {
  setSnapshot(snapshot({ webhookAviso: false }));
  const sinTel = await post(whatsapp, { items: [{ slug: SERUM.slug, cantidad: 1 }], comprador: { nombre: 'x' }, entrega: { modo: 'retiro' } });
  assert.equal(sinTel.status, 400);
  const inexistente = await post(whatsapp, { items: [{ slug: 'nada', cantidad: 1 }], comprador: COMPRADORA, entrega: { modo: 'retiro' } });
  assert.equal(inexistente.status, 400);
  const get = await whatsapp(new Request('https://nudecosmetica.com/.netlify/functions/pedido-whatsapp'), ctx());
  assert.equal(get.status, 405);
});

test('con webhook: pedido-whatsapp responde 409 (se cobra en la web)', async () => {
  setSnapshot(snapshot({ webhookAviso: true }));
  const res = await post(whatsapp, { items: [{ slug: SERUM.slug, cantidad: 1 }], comprador: COMPRADORA, entrega: { modo: 'retiro' } });
  assert.equal(res.status, 409);
});

test('sin alias ni CBU, aunque haya webhook: crear-pedido 409', async () => {
  setSnapshot(snapshot({ webhookAviso: true, tienda: { ...contenido.tienda, alias: null, cbu: null } }));
  const res = await post(crear, pedido({ modo: 'retiro' }));
  assert.equal(res.status, 409);
});

test('con webhook: retiro por transferencia → total $35.416, aviso con direccionRetiro y /pedido/ con alias y dirección', async () => {
  setSnapshot(snapshot({ webhookAviso: true }));
  const avisos = fakeFetch();
  const res = await post(crear, pedido({ modo: 'retiro' }));
  assert.equal(res.status, 201);
  const { id, total } = await res.json();
  assert.equal(total, 35416);

  const guardado = blobs('pedidos').get(id);
  assert.deepEqual(guardado.descuentos.map((d) => d.monto), [2330, 8854]);
  assert.equal(guardado.entrega.direccionRetiro, DIRECCION);

  assert.equal(avisos.avisosOk.length, 1);
  assert.equal(avisos.avisosOk[0].entrega.direccionRetiro, DIRECCION);
  assert.equal(avisos.avisosOk[0].total, 35416);

  const pub = await (await estado(new Request(`https://nudecosmetica.com/.netlify/functions/estado-pedido?id=${id}`), ctx())).json();
  assert.equal(pub.alias, 'NUDE.CLEAN.CARE');
  assert.equal(pub.titular, 'María Soledad Tarantelli');
  assert.equal(pub.cbu, null);
  assert.equal(pub.total, 35416);
  assert.equal(pub.entrega.direccionRetiro, DIRECCION);
  assert.ok(!('comprador' in pub), 'sin datos personales');
});

test('con webhook: envío económico → +$3.500 y sin dirección del retiro en /pedido/ ni en el aviso', async () => {
  setSnapshot(snapshot({ webhookAviso: true }));
  const avisos = fakeFetch();
  const res = await post(crear, pedido(ENVIO_ECO));
  assert.equal(res.status, 201);
  const { id, total } = await res.json();
  assert.equal(total, 35416 + 3500);
  assert.ok(!JSON.stringify(avisos.avisosOk[0]).includes(DIRECCION));
  const pub = await (await estado(new Request(`https://nudecosmetica.com/.netlify/functions/estado-pedido?id=${id}`), ctx())).json();
  assert.deepEqual(pub.entrega, { modo: 'envio', zona: contenido.envios.zonas[0].nombre });
});

test('con webhook: 1 unidad → solo 20%', async () => {
  setSnapshot(snapshot({ webhookAviso: true }));
  fakeFetch();
  const res = await post(crear, pedido({ modo: 'retiro' }, 1));
  assert.equal((await res.json()).total, 18640);
});
