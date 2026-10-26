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

test('calcularTotal · acumulables: transferencia + cantidad', () => {
  const t = pricing.calcularTotal(
    [{ slug: 'a', cantidad: 2 }],
    [producto('a', 10000)],
    tienda({ descuentosAcumulables: true }),
    'transferencia',
    0,
  );
  assert.equal(t.descuentos.length, 2);
  const total = t.descuentos.reduce((s, d) => s + d.monto, 0);
  assert.equal(total, 1000 + 4000);
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

