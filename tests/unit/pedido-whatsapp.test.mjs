// Modo «pedido por WhatsApp»: el mensaje que arma el carrito (lib/pedido-whatsapp.ts).
// Tres carritos: todos los ítems, precios de lista, subtotal y total con transferencia según lib/pricing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let wa;
test.before(async () => {
  const out = await build({
    entryPoints: [join(root, 'lib', 'pedido-whatsapp.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  });
  wa = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
});

const producto = (slug, nombre, precio) => ({
  slug, nombre, categoria: 'face', precio, disponible: true, imagenes: [], tamano: null, h1: '',
  resumen: '', activos: [], ingredientes: '', modoDeUso: '', pasoRutina: null, beneficios: [], faq: [],
  relacionados: [], seo: { title: '', description: '' },
});
const PRODUCTOS = [
  producto('serum', 'Serum Multi Active', 23300),
  producto('crema', 'Crema Facial Porcelain', 18900),
  producto('micelar', 'Agua Micelar Bifásica', 12500),
];
const tienda = (acumulables = false) => ({
  descuentoTransferencia: 0.2,
  descuentoCantidad: { minUnidades: 2, porcentaje: 0.05 },
  descuentosAcumulables: acumulables,
});
// Datos inventados (repo público).
const COMPRADORA = { nombre: 'Clienta Prueba', telefono: '351 000 0000' };

test('carrito 1 · un producto, envío a coordinar, sin email', () => {
  const r = wa.armarPedidoWhatsapp(
    [{ slug: 'serum', cantidad: 1 }], PRODUCTOS, tienda(),
    { nombre: 'Gran Córdoba', costo: 0 }, COMPRADORA,
  );
  assert.equal(r.subtotalLista, 23300);
  assert.equal(r.totalTransferencia, 18640);
  assert.equal(r.texto, [
    'Hola! Quiero hacer este pedido:',
    '',
    '• 1 × Serum Multi Active ($ 23.300 c/u)',
    '',
    'Subtotal de lista: $ 23.300',
    'Con transferencia: $ 18.640 (20% off)',
    'Entrega: Gran Córdoba · a coordinar',
    '',
    'Nombre: Clienta Prueba',
    'Teléfono: 351 000 0000',
  ].join('\n'));
});

test('carrito 2 · tres productos (uno ×2), descuentos no acumulables: solo 20% off', () => {
  const r = wa.armarPedidoWhatsapp(
    [{ slug: 'serum', cantidad: 2 }, { slug: 'crema', cantidad: 1 }, { slug: 'micelar', cantidad: 1 }],
    PRODUCTOS, tienda(false),
    { nombre: 'Retiro en Mendiolaza', costo: 0 },
    { ...COMPRADORA, email: ' prueba@example.com ' },
  );
  // 46600 + 18900 + 12500 = 78000 → 20% = 15600 (el 5% por cantidad no se suma).
  assert.equal(r.subtotalLista, 78000);
  assert.equal(r.totalTransferencia, 62400);
  const lineas = r.texto.split('\n');
  assert.deepEqual(lineas.filter((l) => l.startsWith('• ')), [
    '• 2 × Serum Multi Active ($ 23.300 c/u)',
    '• 1 × Crema Facial Porcelain ($ 18.900 c/u)',
    '• 1 × Agua Micelar Bifásica ($ 12.500 c/u)',
  ]);
  assert.ok(lineas.includes('Subtotal de lista: $ 78.000'));
  assert.ok(lineas.includes('Con transferencia: $ 62.400 (20% off)'));
  assert.ok(lineas.includes('Entrega: Retiro en Mendiolaza · a coordinar'));
  assert.ok(lineas.includes('Email: prueba@example.com'));
  assert.ok(!r.texto.includes('Total con transferencia y envío'));
});

test('carrito 3 · acumulables + zona con costo: 5% y después 20% sobre lo descontado, más envío', () => {
  const r = wa.armarPedidoWhatsapp(
    [{ slug: 'crema', cantidad: 3 }], PRODUCTOS, tienda(true),
    { nombre: 'Resto del país', costo: 4500 }, COMPRADORA,
  );
  // 56700 − 5% (2835) = 53865 → − 20% (10773) = 43092; + envío 4500 = 47592.
  assert.equal(r.subtotalLista, 56700);
  assert.equal(r.totalTransferencia, 47592);
  const lineas = r.texto.split('\n');
  assert.ok(lineas.includes('• 3 × Crema Facial Porcelain ($ 18.900 c/u)'));
  assert.ok(lineas.includes('Subtotal de lista: $ 56.700'));
  assert.ok(lineas.includes('Con transferencia: $ 43.092 (5% por cantidad + 20% off)'));
  assert.ok(lineas.includes('Entrega: Resto del país · $ 4.500'));
  assert.ok(lineas.includes('Total con transferencia y envío: $ 47.592'));
  assert.ok(!/cuotas|tarjeta|mercado ?pago/i.test(r.texto));
});

// Ejemplo de Soledad (WhatsApp 27-10-2026) con el alias real y retiro.
const PAGO = { alias: 'NUDE.CLEAN.CARE', titularCuenta: 'María Soledad Tarantelli', cbu: null };

test('ejemplo de Soledad · 2 × $23.300 → $35.416, con alias y envío económico', () => {
  const r = wa.armarPedidoWhatsapp(
    [{ slug: 'serum', cantidad: 2 }], PRODUCTOS, { ...tienda(true), ...PAGO },
    { nombre: 'Envío económico', costo: 3500 }, { ...COMPRADORA, dni: ' 00000000 ' },
  );
  assert.equal(r.totalTransferencia, 35416 + 3500);
  assert.equal(r.texto, [
    'Hola! Quiero hacer este pedido:',
    '',
    '• 2 × Serum Multi Active ($ 23.300 c/u)',
    '',
    'Subtotal de lista: $ 46.600',
    'Con transferencia: $ 35.416 (5% por cantidad + 20% off)',
    'Entrega: Envío económico · $ 3.500',
    'Total con transferencia y envío: $ 38.916',
    '',
    'Alias para transferir: NUDE.CLEAN.CARE (María Soledad Tarantelli)',
    '',
    'Nombre: Clienta Prueba',
    'Teléfono: 351 000 0000',
    'DNI: 00000000',
  ].join('\n'));
});

test('retiro · gratis; la dirección va solo si la pasa el servidor', () => {
  const sinDireccion = wa.armarPedidoWhatsapp(
    [{ slug: 'serum', cantidad: 1 }], PRODUCTOS, { ...tienda(true), ...PAGO },
    { nombre: 'Retiro en Mendiolaza', costo: 0, retiro: true }, COMPRADORA,
  );
  assert.ok(sinDireccion.texto.includes('Entrega: Retiro en Mendiolaza · gratis'));
  assert.ok(!sinDireccion.texto.includes('Dirección de retiro'));
  // Dirección inventada: la real solo está en el panel y en el snapshot de las functions.
  const conDireccion = wa.armarPedidoWhatsapp(
    [{ slug: 'serum', cantidad: 1 }], PRODUCTOS, { ...tienda(true), ...PAGO },
    { nombre: 'Retiro en Mendiolaza', costo: 0, retiro: true, direccionRetiro: 'Calle Falsa 123, Mendiolaza' }, COMPRADORA,
  );
  assert.ok(conDireccion.texto.includes('Entrega: Retiro en Mendiolaza · gratis\nDirección de retiro: Calle Falsa 123, Mendiolaza'));
  assert.equal(conDireccion.totalTransferencia, 18640);
});

test('sin alias ni CBU: no hay línea de datos para transferir', () => {
  const r = wa.armarPedidoWhatsapp([{ slug: 'serum', cantidad: 1 }], PRODUCTOS, tienda(), { nombre: 'x', costo: 0 }, COMPRADORA);
  assert.ok(!/Alias|CBU/.test(r.texto));
});

test('sin stock o producto inexistente: no arma mensaje', () => {
  const sinStock = [{ ...PRODUCTOS[0], disponible: false }];
  assert.throws(() => wa.armarPedidoWhatsapp([{ slug: 'serum', cantidad: 1 }], sinStock, tienda(), { nombre: 'x', costo: 0 }, COMPRADORA));
  assert.throws(() => wa.armarPedidoWhatsapp([{ slug: 'nada', cantidad: 1 }], PRODUCTOS, tienda(), { nombre: 'x', costo: 0 }, COMPRADORA));
});
