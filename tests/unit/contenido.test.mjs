// Contenido que edita Soledad (lib/contenido.mjs) y regla de medio de pago de la puerta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  leerContenido,
  leerDireccionRetiro,
  normalizarEnvios,
  normalizarProducto,
  normalizarTienda,
  slugDeArchivo,
  validarProductos,
} from '../../lib/contenido.mjs';
import { avisoModoWhatsapp, buscarDireccion } from '../../scripts/puerta-publicacion.mjs';
import { hayMedioDePago, modoVenta, motivoModoWhatsapp } from '../../lib/modo-venta.mjs';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('los 14 productos del repo se leen y validan', () => {
  const { productos } = leerContenido(join(root, 'content'));
  assert.equal(productos.length, 14);
  assert.deepEqual(validarProductos(productos), []);
  assert.equal(productos[0].slug, 'serum-multi-active');
  assert.equal(productos[0].categoria, 'face');
});

test('producto nuevo del panel: slug del nombre de archivo y defaults', () => {
  assert.equal(slugDeArchivo('02-serum-transformacion.json'), 'serum-transformacion');
  assert.equal(slugDeArchivo('Bálsamo Labial.json'), 'balsamo-labial');
  const p = normalizarProducto(
    { nombre: 'Bálsamo labial', precio: 9000, disponible: true, imagenes: ['/img/productos/b.jpg'], resumen: 'Corto.' },
    'balsamo-labial.json',
  );
  assert.equal(p.slug, 'balsamo-labial');
  assert.equal(p.h1, 'Bálsamo labial');
  assert.equal(p.seo.title, 'Bálsamo labial');
  assert.equal(p.seo.description, 'Corto.');
  assert.equal(p.categoria, null);
  assert.deepEqual(p.faq, []);
});

test('el slug guardado manda sobre el nombre de archivo', () => {
  const p = normalizarProducto({ nombre: 'X', precio: 1, imagenes: ['a'], avanzado: { slug: 'fijo' } }, '99-otro.json');
  assert.equal(p.slug, 'fijo');
});

test('validación: precio vacío, sin foto y slug repetido frenan el build', () => {
  const ok = normalizarProducto({ nombre: 'A', precio: 100, imagenes: ['a'] }, 'a.json');
  const sinPrecio = normalizarProducto({ nombre: 'B', precio: '', imagenes: ['b'] }, 'b.json');
  const sinFoto = normalizarProducto({ nombre: 'C', precio: 100, imagenes: [] }, 'c.json');
  const repetido = normalizarProducto({ nombre: 'A2', precio: 100, imagenes: ['a'] }, '07-a.json');
  const errores = validarProductos([ok, sinPrecio, sinFoto, repetido]);
  assert.equal(errores.length, 3, errores.join('\n'));
  assert.match(errores.join('\n'), /precio inválido/);
  assert.match(errores.join('\n'), /falta al menos una foto/);
  assert.match(errores.join('\n'), /ya lo usa/);
});

test('envíos: con costo → fijo; sin costo → a coordinar; id del nombre si falta', () => {
  const e = normalizarEnvios({
    zonas: [
      { nombre: 'Gran Córdoba', costo: 4500, plazoTexto: '2 a 3 días hábiles', avanzado: { id: 'gran-cordoba' } },
      { nombre: 'Resto de Córdoba', costo: 6000, plazoTexto: '' },
      { nombre: 'Resto del país', costo: null, plazoTexto: '' },
    ],
    avanzado: { retiro: { habilitado: false, direccionTexto: 'x', costo: 0 }, envioGratisDesde: null },
  });
  assert.deepEqual(e.zonas.map((z) => [z.id, z.modo, z.costo]), [
    ['gran-cordoba', 'fijo', 4500],
    ['resto-de-cordoba', 'fijo', 6000],
    ['resto-del-pais', 'coordinar', 0],
  ]);
  assert.equal(e.zonas[1].plazoTexto, '', 'fijo sin plazo: sin texto');
  assert.match(e.zonas[2].plazoTexto, /coordinar por WhatsApp/);
  assert.equal(e.retiro.habilitado, false);
});

test('tienda: alias/CBU vacíos ("" de Decap) cuentan como sin dato', () => {
  const t = normalizarTienda({ alias: '  ', cbu: '', titularCuenta: null, whatsapp: '+549', avanzado: { descuentoTransferencia: 0.2 } });
  assert.equal(t.alias, null);
  assert.equal(t.cbu, null);
  assert.equal(t.descuentoTransferencia, 0.2);
});

const WEBHOOK = 'https://n8n.test/webhook/pedidos';

test('modo de venta · caso 1: sin alias ni CBU (ni MP) → pedido por WhatsApp, aunque haya webhook', () => {
  assert.equal(modoVenta({ alias: null, cbu: null }, '', WEBHOOK), 'whatsapp');
  assert.equal(modoVenta({ alias: '', cbu: '  ' }, undefined, WEBHOOK), 'whatsapp');
  assert.equal(modoVenta({ alias: null, cbu: null }, '   ', WEBHOOK), 'whatsapp');
  assert.equal(modoVenta({ alias: null, cbu: null }, false, true), 'whatsapp');
  assert.equal(hayMedioDePago({ alias: null, cbu: null }, ''), false);
  assert.match(motivoModoWhatsapp({ alias: null, cbu: null }, '', WEBHOOK), /^sin medio de pago/);
});

test('modo de venta · caso 2: alias (o CBU, o MP) sin ORDER_WEBHOOK_URL → sigue por WhatsApp', () => {
  assert.equal(modoVenta({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', ''), 'whatsapp');
  assert.equal(modoVenta({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', undefined), 'whatsapp');
  assert.equal(modoVenta({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', '   '), 'whatsapp');
  assert.equal(modoVenta({ alias: null, cbu: '0'.repeat(22) }, undefined, false), 'whatsapp');
  assert.equal(modoVenta({ alias: null, cbu: null }, 'APP_USR-x', ''), 'whatsapp');
  assert.equal(hayMedioDePago({ alias: 'NUDE.CLEAN.CARE', cbu: null }, ''), true);
  assert.match(motivoModoWhatsapp({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', ''), /^alias cargado, esperando ORDER_WEBHOOK_URL/);
  assert.match(motivoModoWhatsapp({ alias: null, cbu: null }, 'APP_USR-x', ''), /^Mercado Pago cargado, esperando ORDER_WEBHOOK_URL/);
});

test('modo de venta · caso 3: alias (o CBU, o MP) con ORDER_WEBHOOK_URL → checkout', () => {
  assert.equal(modoVenta({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', WEBHOOK), 'checkout');
  assert.equal(modoVenta({ alias: null, cbu: '0'.repeat(22) }, undefined, true), 'checkout');
  assert.equal(modoVenta({ alias: null, cbu: null }, 'APP_USR-x', WEBHOOK), 'checkout');
  assert.equal(motivoModoWhatsapp({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', WEBHOOK), null);
});

test('modo de venta · el contenido real hoy (alias cargado) sale por WhatsApp sin webhook y en checkout con webhook', () => {
  const { tienda } = leerContenido(join(root, 'content'));
  assert.equal(tienda.alias, 'NUDE.CLEAN.CARE');
  assert.equal(tienda.titularCuenta, 'María Soledad Tarantelli');
  assert.equal(tienda.cbu, null);
  assert.equal(modoVenta(tienda, '', ''), 'whatsapp');
  assert.equal(modoVenta(tienda, '', WEBHOOK), 'checkout');
});

test('puerta: avisa el motivo del modo WhatsApp y no bloquea', () => {
  assert.match(avisoModoWhatsapp({ alias: null, cbu: null }, '', ''), /MODO PEDIDO POR WHATSAPP/);
  assert.match(avisoModoWhatsapp({ alias: null, cbu: null }, '', ''), /Cargá el alias o el CBU/);
  const esperando = avisoModoWhatsapp({ alias: 'NUDE.CLEAN.CARE', cbu: null }, '', '');
  assert.match(esperando, /alias cargado, esperando ORDER_WEBHOOK_URL/);
  assert.match(esperando, /MODO PEDIDO POR WHATSAPP/);
  assert.match(esperando, /ORDER_WEBHOOK_URL \(y ORDER_WEBHOOK_SECRET\) en Netlify/);
  assert.equal(avisoModoWhatsapp({ alias: 'nude.mp', cbu: null }, '', WEBHOOK), null);
  assert.equal(avisoModoWhatsapp({ alias: null, cbu: null }, 'APP_USR-x', WEBHOOK), null);
});

test('envíos reales: envío económico $3.500 con aclaración, resto a coordinar, retiro gratis', () => {
  const { envios } = leerContenido(join(root, 'content'));
  const [eco, cba, pais] = envios.zonas;
  assert.equal(eco.id, 'envio-economico');
  assert.match(eco.nombre, /^Envío económico · Unquillo, Mendiolaza, Villa Allende y zona Norte de Córdoba$/);
  assert.deepEqual([eco.modo, eco.costo, eco.plazoTexto], ['fijo', 3500, '']);
  assert.equal(eco.aclaracion, 'Si tu dirección no está en esta zona, te avisamos el costo por WhatsApp.');
  for (const z of [cba, pais]) {
    assert.equal(z.modo, 'coordinar');
    assert.equal(z.plazoTexto, 'A coordinar por WhatsApp (depende del tamaño del paquete y el destino)');
  }
  assert.deepEqual([cba.nombre, pais.nombre], ['Resto de Córdoba', 'Resto del país']);
  assert.deepEqual(envios.retiro, {
    habilitado: true,
    direccionTexto: 'Retiro gratis en Mendiolaza, de lunes a viernes de 9 a 18 h',
    costo: 0,
  });
});

test('dirección del retiro: solo la lee leerDireccionRetiro, nunca el contenido que usa el sitio', () => {
  const direccion = leerDireccionRetiro(join(root, 'content'));
  assert.ok(direccion && direccion.length > 5, 'la dirección está cargada en el panel');
  const todo = JSON.stringify(leerContenido(join(root, 'content')));
  assert.ok(!todo.includes(direccion.split(',')[0]), 'el contenido normalizado no trae la dirección');
  assert.ok(!todo.includes('direccionPrivada'));
  // Retiro apagado → no hay dirección para mostrar.
  const dir = mkdtempSync(join(tmpdir(), 'nude-'));
  mkdirSync(join(dir, 'ajustes'));
  writeFileSync(join(dir, 'ajustes', 'envios.json'), JSON.stringify({ zonas: [], retiro: { habilitado: false, direccionPrivada: 'Calle Falsa 123' } }));
  assert.equal(leerDireccionRetiro(dir), null);
});

test('puerta: detecta la dirección del retiro en el sitio generado (sin tildes ni mayúsculas)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nude-out-'));
  writeFileSync(join(dir, 'ok.html'), '<p>Retiro gratis en Mendiolaza</p>');
  assert.deepEqual(await buscarDireccion(dir, 'Calle Falsa 123, Mendiolaza'), []);
  writeFileSync(join(dir, 'chunk.js'), 'x="CALLE FALSA 123"');
  assert.equal((await buscarDireccion(dir, 'Calle Fálsa 123, Mendiolaza')).length, 1);
  assert.deepEqual(await buscarDireccion(dir, null), []);
});
