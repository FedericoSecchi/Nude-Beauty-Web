// Tests de lib/pricing.ts corriendo con node --test contra la build de TypeScript.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Para no depender de ts-node, compilamos on-the-fly con esbuild si está disponible.
// Si no, buscamos un .mjs equivalente. En este repo tsconfig está en modo noEmit; usamos
// esbuild del lockfile de Next para transpilar lib/*.ts a módulos JS consumibles.
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

let pricing;
let shipping;
let types;
test.before(async () => {
  const outPricing = await build({
    entryPoints: [join(root, 'lib', 'pricing.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    external: ['./types'],
    sourcemap: false,
  });
  const code = outPricing.outputFiles[0].text;
  // Carga vía data: URL para evitar escribir a disco.
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  pricing = await import(url);

  const outShipping = await build({
    entryPoints: [join(root, 'lib', 'shipping.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    external: ['./types'],
  });
  shipping = await import(
    'data:text/javascript;base64,' + Buffer.from(outShipping.outputFiles[0].text).toString('base64')
  );
});

const producto = (slug, precio = 10000, disponible = true) => ({
  slug,
  nombre: slug,
  categoria: 'face',
  precio,
  disponible,
  imagenes: [],
  tamano: null,
  h1: '',
  resumen: '',
  activos: [],
  ingredientes: '',
  modoDeUso: '',
  pasoRutina: null,
  beneficios: [],
  faq: [],
  relacionados: [],
  seo: { title: '', description: '' },
});

const tienda = (over = {}) => ({
  descuentoTransferencia: 0.2,
  descuentoCantidad: { minUnidades: 2, porcentaje: 0.05 },
  descuentosAcumulables: false,
  cuotasTexto: '3 cuotas sin interés',
  alias: null,
  cbu: null,
  titularCuenta: null,
  horasReservaTransferencia: 48,
  whatsapp: '+54',
  emailTienda: '',
  ...over,
});

test('calcularTotal · 1 unidad con transferencia aplica 20% off', () => {
  const t = pricing.calcularTotal(
    [{ slug: 'a', cantidad: 1 }],
    [producto('a', 10000)],
    tienda(),
    'transferencia',
    0,
  );
  assert.equal(t.subtotal, 10000);
  assert.equal(t.descuentos.length, 1);
  assert.equal(t.descuentos[0].monto, 2000);
  assert.equal(t.total, 8000);
});

test('calcularTotal · 2 unidades con MP aplica solo 5% por cantidad (no transferencia)', () => {
  const t = pricing.calcularTotal(
    [{ slug: 'a', cantidad: 2 }],
    [producto('a', 10000)],
    tienda(),
    'mercadopago',
    1500,
  );
  assert.equal(t.subtotal, 20000);
  assert.equal(t.descuentos.length, 1);
  assert.equal(t.descuentos[0].monto, 1000);
  assert.equal(t.total, 20000 - 1000 + 1500);
});

test('calcularTotal · descuentos no acumulables: transferencia reemplaza al 5% por cantidad', () => {
  const t = pricing.calcularTotal(
    [{ slug: 'a', cantidad: 2 }],
    [producto('a', 10000)],
    tienda({ descuentosAcumulables: false }),
    'transferencia',
    0,
  );
  // Solo 20% sobre 20000.
  assert.equal(t.descuentos.length, 1);
  assert.equal(t.descuentos[0].monto, 4000);
  assert.equal(t.total, 16000);
});

test('calcularTotal · acumulables: primero 5% por cantidad y el 20% sobre el precio ya descontado', () => {
  const t = pricing.calcularTotal(
    [{ slug: 'a', cantidad: 2 }],
    [producto('a', 10000)],
    tienda({ descuentosAcumulables: true }),
    'transferencia',
    0,
  );
  assert.equal(t.descuentos.length, 2);
  // 20000 − 5% (1000) = 19000 → − 20% de 19000 (3800) = 15200. No es 25% sobre la lista (15000).
  assert.deepEqual(t.descuentos.map((d) => d.monto), [1000, 3800]);
  assert.equal(t.total, 15200);
});

// Ejemplo de Soledad (WhatsApp 27-10-2026): 2 × $23.300 = $46.600 → −5% = $44.270 → −20% = $35.416.
const SERUM = 23300;
const ACUMULA = { descuentosAcumulables: true };

test('ejemplo de Soledad · 2 × $23.300 con transferencia = $35.416', () => {
  const t = pricing.calcularTotal([{ slug: 's', cantidad: 2 }], [producto('s', SERUM)], tienda(ACUMULA), 'transferencia', 0);
  assert.equal(t.subtotal, 46600);
  assert.deepEqual(t.descuentos.map((d) => d.monto), [2330, 8854]);
  assert.equal(t.subtotal - t.descuentos[0].monto, 44270);
  assert.equal(t.total, 35416);
  assert.match(t.descuentos[0].motivo, /2 o más unidades \(5%\)/);
  assert.equal(t.descuentos[1].motivo, '20% off por transferencia');
});

test('ejemplo de Soledad · 1 unidad con transferencia: solo 20% ($18.640)', () => {
  const t = pricing.calcularTotal([{ slug: 's', cantidad: 1 }], [producto('s', SERUM)], tienda(ACUMULA), 'transferencia', 0);
  assert.equal(t.descuentos.length, 1);
  assert.equal(t.total, 18640);
});

test('ejemplo de Soledad · 2 unidades con Mercado Pago: solo 5% ($44.270)', () => {
  const t = pricing.calcularTotal([{ slug: 's', cantidad: 2 }], [producto('s', SERUM)], tienda(ACUMULA), 'mercadopago', 0);
  assert.equal(t.descuentos.length, 1);
  assert.equal(t.total, 44270);
  assert.ok(t.descuentos.every((d) => d.monto > 0));
});

test('ejemplo de Soledad · el envío se suma después de los descuentos', () => {
  const t = pricing.calcularTotal([{ slug: 's', cantidad: 2 }], [producto('s', SERUM)], tienda(ACUMULA), 'transferencia', 3500);
  assert.equal(t.total, 35416 + 3500);
});

test('el contenido real acumula descuentos (Soledad, 27-10-2026)', async () => {
  const { leerContenido } = await import('../../lib/contenido.mjs');
  const { tienda: real, productos } = leerContenido(join(root, 'content'));
  assert.equal(real.descuentosAcumulables, true);
  const t = pricing.calcularTotal([{ slug: 'serum-multi-active', cantidad: 2 }], productos, real, 'transferencia', 0);
  const p = productos.find((x) => x.slug === 'serum-multi-active').precio;
  const conCantidad = 2 * p - Math.round(2 * p * 0.05);
  assert.equal(t.total, conCantidad - Math.round(conCantidad * 0.2));
});

test('calcularTotal · rechaza precios manipulados: usa el precio del catálogo', () => {
  const t = pricing.calcularTotal(
    [{ slug: 'a', cantidad: 1 }],
    [producto('a', 10000)],
    tienda(),
    'transferencia',
    0,
  );
  // Aunque el cliente mandara { precio: 1 }, calcularLineas usa el precio del catálogo (10000).
  assert.equal(t.lineas[0].precioUnitario, 10000);
});

test('calcularTotal · rechaza producto no disponible', () => {
  assert.throws(
    () =>
      pricing.calcularTotal(
        [{ slug: 'a', cantidad: 1 }],
        [producto('a', 10000, false)],
        tienda(),
        'transferencia',
        0,
      ),
    /sin stock/,
  );
});

test('calcularTotal · rechaza cantidad inválida', () => {
  assert.throws(
    () =>
      pricing.calcularTotal(
        [{ slug: 'a', cantidad: 0 }],
        [producto('a', 10000)],
        tienda(),
        'transferencia',
        0,
      ),
    /cantidad inválida/,
  );
});

test('calcularEnvio · retiro habilitado devuelve costo 0', () => {
  const r = shipping.calcularEnvio(
    { modo: 'retiro' },
    { zonas: [], retiro: { habilitado: true, direccionTexto: 'x', costo: 0 }, envioGratisDesde: null },
  );
  assert.equal(r.costo, 0);
  assert.equal(r.modo, 'retiro');
});

test('calcularEnvio · zona en modo coordinar costo 0', () => {
  const r = shipping.calcularEnvio(
    { modo: 'envio', zonaId: 'a' },
    {
      zonas: [{ id: 'a', nombre: 'A', provincias: [], costo: 5000, plazoTexto: 'x', modo: 'coordinar' }],
      retiro: { habilitado: false, direccionTexto: '', costo: 0 },
      envioGratisDesde: null,
    },
  );
  assert.equal(r.costo, 0);
  assert.equal(r.requiereCoordinacion, true);
});

test('calcularEnvio · zona fija aplica costo', () => {
  const r = shipping.calcularEnvio(
    { modo: 'envio', zonaId: 'a' },
    {
      zonas: [{ id: 'a', nombre: 'A', provincias: [], costo: 5000, plazoTexto: 'x', modo: 'fijo' }],
      retiro: { habilitado: false, direccionTexto: '', costo: 0 },
      envioGratisDesde: null,
    },
  );
  assert.equal(r.costo, 5000);
});

test('calcularEnvio · zona inválida lanza error', () => {
  assert.throws(
    () =>
      shipping.calcularEnvio(
        { modo: 'envio', zonaId: 'no-existe' },
        {
          zonas: [{ id: 'a', nombre: 'A', provincias: [], costo: 5000, plazoTexto: 'x', modo: 'fijo' }],
          retiro: { habilitado: false, direccionTexto: '', costo: 0 },
          envioGratisDesde: null,
        },
      ),
    /Zona de envío inválida/,
  );
});

test('calcularEnvio · retiro deshabilitado lanza error y listarOpciones no lo ofrece', () => {
  const envios = {
    zonas: [{ id: 'a', nombre: 'A', provincias: [], costo: 0, plazoTexto: 'x', modo: 'coordinar' }],
    retiro: { habilitado: false, direccionTexto: 'x', costo: 0 },
    envioGratisDesde: null,
  };
  assert.throws(() => shipping.calcularEnvio({ modo: 'retiro' }, envios), /Retiro no habilitado/);
  assert.deepEqual(shipping.listarOpciones(envios).map((o) => o.id), ['a']);
});

test('listarOpciones · con retiro habilitado lo agrega al final', () => {
  const envios = {
    zonas: [{ id: 'a', nombre: 'A', provincias: [], costo: 0, plazoTexto: 'x', modo: 'coordinar' }],
    retiro: { habilitado: true, direccionTexto: 'Retiro en Mendiolaza', costo: 0 },
    envioGratisDesde: null,
  };
  const ops = shipping.listarOpciones(envios);
  assert.deepEqual(ops.map((o) => o.id), ['a', 'retiro']);
  assert.equal(ops[1].modo, 'retiro');
});


// --- Proveedor de envíos (interfaz lista, sin integración) ---
const ENVIOS_PROV = {
  zonas: [
    { id: 'eco', nombre: 'Eco', provincias: [], costo: 3500, plazoTexto: '', aclaracion: '', modo: 'fijo' },
    { id: 'pais', nombre: 'País', provincias: [], costo: 0, plazoTexto: 'a coordinar', aclaracion: '', modo: 'coordinar' },
  ],
  retiro: { habilitado: true, direccionTexto: 'Retiro gratis', costo: 0 },
  envioGratisDesde: null,
};
const DESTINO = { cp: '5000', localidad: 'X', provincia: 'Córdoba', items: [{ slug: 'a', cantidad: 1 }] };

test('cotizarEnvio · sin proveedores (hoy): igual que calcularEnvio', async () => {
  const r = await shipping.cotizarEnvio({ modo: 'envio', zonaId: 'pais' }, ENVIOS_PROV, DESTINO);
  assert.equal(r.costo, 0);
  assert.equal(r.requiereCoordinacion, true);
  assert.equal(shipping.PROVEEDORES_ENVIO.length, 0);
});

test('cotizarEnvio · un proveedor cotiza las zonas a coordinar, no las fijas ni el retiro', async () => {
  const pedidos = [];
  const prov = { id: 'correo-prueba', cotizar: async (s) => (pedidos.push(s.zona.id), { costo: 7200.4, plazoTexto: '5 días' }) };
  const r = await shipping.cotizarEnvio({ modo: 'envio', zonaId: 'pais' }, ENVIOS_PROV, DESTINO, [prov]);
  assert.deepEqual([r.costo, r.requiereCoordinacion, r.proveedor], [7200, false, 'correo-prueba']);
  const fija = await shipping.cotizarEnvio({ modo: 'envio', zonaId: 'eco' }, ENVIOS_PROV, DESTINO, [prov]);
  assert.equal(fija.costo, 3500);
  const retiro = await shipping.cotizarEnvio({ modo: 'retiro' }, ENVIOS_PROV, null, [prov]);
  assert.equal(retiro.costo, 0);
  assert.deepEqual(pedidos, ['pais']);
});

test('cotizarEnvio · proveedor caído o sin cobertura: queda a coordinar', async () => {
  const caido = { id: 'x', cotizar: async () => { throw new Error('timeout'); } };
  const sinCobertura = { id: 'y', cotizar: async () => null };
  const r = await shipping.cotizarEnvio({ modo: 'envio', zonaId: 'pais' }, ENVIOS_PROV, DESTINO, [caido, sinCobertura]);
  assert.equal(r.requiereCoordinacion, true);
  assert.equal(r.costo, 0);
});

test('listarOpciones · aclaración de la zona y retiro gratis con el texto público', () => {
  const ops = shipping.listarOpciones({ ...ENVIOS_PROV, zonas: [{ ...ENVIOS_PROV.zonas[0], aclaracion: 'Si no estás en la zona…' }] });
  assert.equal(ops[0].aclaracion, 'Si no estás en la zona…');
  assert.deepEqual([ops[1].id, ops[1].costo, ops[1].plazoTexto], ['retiro', 0, 'Retiro gratis']);
});
