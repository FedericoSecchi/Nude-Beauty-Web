// Utilidades compartidas por los unit tests de las Netlify Functions.
// - bundle(entry): compila un .ts con esbuild y lo importa. `@netlify/blobs` se reemplaza por un
//   store en memoria (global, compartido entre bundles) que respeta onlyIfNew / onlyIfMatch con ETag,
//   igual que el real; así los handlers corren tal cual se despliegan.
// - fetch falso: rutea la API de MP y ORDER_WEBHOOK_URL; cuenta los avisos.
import { build } from 'esbuild';
import { createHmac } from 'node:crypto';
import { join } from 'node:path';

// Raíz del repo = cwd (npm test y Playwright corren desde ahí). Sin import.meta: Playwright pasa este
// archivo a CommonJS cuando lo importa tests/e2e/checkout-local.spec.ts y ahí import.meta no existe.
const root = process.cwd();

const BLOBS_MOCK = `
let n = 0;
export function getStore(opts) {
  const name = typeof opts === 'string' ? opts : opts.name;
  // Se resuelve en cada operación: resetBlobs() reemplaza globalThis.__blobs entre tests.
  const mapa = () => {
    const stores = (globalThis.__blobs ??= new Map());
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };
  const tick = () => new Promise((r) => setImmediate(r));
  return {
    async get(key) { await tick(); const e = mapa().get(key); return e ? JSON.parse(e.data) : null; },
    async getWithMetadata(key) {
      await tick();
      const e = mapa().get(key);
      return e ? { data: JSON.parse(e.data), etag: e.etag, metadata: {} } : null;
    },
    async setJSON(key, value, o = {}) {
      await tick();
      const m = mapa();
      const e = m.get(key);
      if (o.onlyIfNew && e) return { modified: false };
      if (o.onlyIfMatch && (!e || e.etag !== o.onlyIfMatch)) return { modified: false };
      const etag = '"' + ++n + '"';
      m.set(key, { data: JSON.stringify(value), etag });
      return { modified: true, etag };
    },
    async delete(key) { mapa().delete(key); },
    async list() {
      return { blobs: [...mapa().entries()].map(([key, e]) => ({ key, etag: e.etag })), directories: [] };
    },
  };
}
`;

const blobsMockPlugin = {
  name: 'blobs-mock',
  setup(b) {
    b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: 'blobs', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: BLOBS_MOCK, loader: 'js' }));
  },
};

// Con `snapshot: true`, `_shared/catalogo` se reemplaza por uno que devuelve globalThis.__snapshot
// (lo arma cada test con setSnapshot): así se prueba el modo de venta sin depender del último build.
const snapshotMockPlugin = {
  name: 'snapshot-mock',
  setup(b) {
    b.onResolve({ filter: /_shared\/catalogo$/ }, () => ({ path: 'catalogo', namespace: 'snapshot' }));
    b.onLoad({ filter: /.*/, namespace: 'snapshot' }, () => ({
      contents: 'export function loadSnapshot() { if (!globalThis.__snapshot) throw new Error("sin snapshot"); return globalThis.__snapshot; }',
      loader: 'js',
    }));
  },
};

export function setSnapshot(snapshot) {
  globalThis.__snapshot = snapshot;
}

export async function bundle(rel, opts = {}) {
  const out = await build({
    entryPoints: [join(root, rel)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    external: ['node:*'],
    plugins: opts.snapshot ? [blobsMockPlugin, snapshotMockPlugin] : [blobsMockPlugin],
    logLevel: 'silent',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
  );
}

export function blobs(store) {
  const m = globalThis.__blobs?.get(store);
  if (!m) return new Map();
  return new Map([...m.entries()].map(([k, e]) => [k, JSON.parse(e.data)]));
}

export function resetBlobs() {
  globalThis.__blobs = new Map();
}

export function putBlob(store, key, value) {
  globalThis.__blobs ??= new Map();
  if (!globalThis.__blobs.has(store)) globalThis.__blobs.set(store, new Map());
  globalThis.__blobs.get(store).set(key, { data: JSON.stringify(value), etag: '"seed"' });
}

export const ORDER_URL = 'https://n8n.test/webhook/pedidos';

// fetch falso. `estado.aviso` = status HTTP que devuelve n8n; `estado.pagos[id]` = respuesta de MP.
export function fakeFetch() {
  const estado = { aviso: 200, avisos: [], avisosOk: [], pagos: {}, preferencias: [] };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u === ORDER_URL) {
      const body = JSON.parse(init.body);
      estado.avisos.push(body);
      if (estado.aviso >= 200 && estado.aviso < 300) estado.avisosOk.push(body);
      return new Response('', { status: estado.aviso });
    }
    const m = u.match(/api\.mercadopago\.com\/v1\/payments\/(\w+)/);
    if (m) {
      const p = estado.pagos[m[1]];
      return p
        ? new Response(JSON.stringify(p), { status: 200 })
        : new Response('not found', { status: 404 });
    }
    if (u.includes('api.mercadopago.com/checkout/preferences')) {
      const body = JSON.parse(init.body);
      estado.preferencias.push(body);
      return new Response(JSON.stringify({ id: 'pref-1', init_point: 'https://mp.test/init' }), {
        status: 201,
      });
    }
    throw new Error(`fetch inesperado: ${u}`);
  };
  return estado;
}

export function ctx(context = 'production') {
  return { log: () => {}, deploy: { context, id: 'd', published: true } };
}

export function webhookRequest(dataId, secret, requestId = 'req-' + dataId) {
  const ts = String(Date.now());
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  return new Request(
    `https://nudecosmetica.com/.netlify/functions/mp-webhook?data.id=${dataId}&type=payment`,
    {
      method: 'POST',
      headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
      body: JSON.stringify({ type: 'payment', data: { id: dataId } }),
    },
  );
}

export function pedidoFixture(over = {}) {
  // Datos inventados (repo público).
  return {
    id: 'NUDE-20261026-e2e001',
    tipo: 'pedido_pagado',
    estado: 'pendiente_mp',
    creado: '2026-10-26T12:00:00.000Z',
    actualizado: '2026-10-26T12:00:00.000Z',
    source: 'web',
    comprador: { nombre: 'Clienta Prueba', email: 'prueba@example.com', telefono: '000' },
    entrega: { modo: 'retiro', zona: 'Retiro en Mendiolaza' },
    items: [{ slug: 'serum-multi-active', nombre: 'Serum Multi Active', cantidad: 1, precioUnitario: 23300 }],
    subtotal: 23300,
    descuentos: [],
    envio: 0,
    total: 23300,
    pago: { medio: 'mercadopago' },
    ...over,
  };
}
