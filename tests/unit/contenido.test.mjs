// Contenido que edita Soledad (lib/contenido.mjs) y regla de medio de pago de la puerta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  leerContenido,
  normalizarEnvios,
  normalizarProducto,
  normalizarTienda,
  slugDeArchivo,
  validarProductos,
} from '../../lib/contenido.mjs';
import { avisoModoWhatsapp } from '../../scripts/puerta-publicacion.mjs';
import { hayMedioDePago, modoVenta } from '../../lib/modo-venta.mjs';

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

test('modo de venta: sin MP y sin alias ni CBU → pedido por WhatsApp', () => {
  assert.equal(modoVenta({ alias: null, cbu: null }, ''), 'whatsapp');
  assert.equal(modoVenta({ alias: '', cbu: '  ' }, undefined), 'whatsapp');
  assert.equal(modoVenta({ alias: null, cbu: null }, '   '), 'whatsapp');
  assert.equal(modoVenta({ alias: null, cbu: null }, false), 'whatsapp');
  assert.equal(modoVenta({ alias: 'nude.mp', cbu: null }, ''), 'checkout');
  assert.equal(modoVenta({ alias: null, cbu: '0'.repeat(22) }, undefined), 'checkout');
  assert.equal(modoVenta({ alias: null, cbu: null }, 'APP_USR-x'), 'checkout');
  assert.equal(modoVenta({ alias: null, cbu: null }, true), 'checkout');
  assert.equal(hayMedioDePago({ alias: null, cbu: null }, ''), false);
});

test('puerta: sin medio de pago avisa (modo WhatsApp), no bloquea', () => {
  assert.match(avisoModoWhatsapp({ alias: null, cbu: null }, ''), /MODO PEDIDO POR WHATSAPP/);
  assert.equal(avisoModoWhatsapp({ alias: 'nude.mp', cbu: null }, ''), null);
  assert.equal(avisoModoWhatsapp({ alias: null, cbu: null }, 'APP_USR-x'), null);
});
