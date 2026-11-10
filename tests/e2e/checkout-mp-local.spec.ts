import { test, expect, type Page } from '@playwright/test';
import { join } from 'node:path';
import { leerContenido, leerDireccionRetiro } from '../../lib/contenido.mjs';
import { calcularTotal } from '../../lib/pricing';
// Mismo harness que los unit tests: bundlea las functions reales (crear-pedido, mp-webhook,
// estado-pedido) con Blobs en memoria y el snapshot inyectado; fetch falso para la API de Orders de
// Mercado Pago y para el aviso a n8n. Nunca se llama a Mercado Pago.
import {
  bundle,
  CHECKOUT_URL,
  ctx,
  fakeFetch,
  ORDER_URL,
  orderFixture,
  resetBlobs,
  setSnapshot,
  webhookRequest,
} from '../unit/_harness.mjs';

// Compra con Mercado Pago sobre el build con MP encendido (out-mp/, servido local):
// carrito → «Ir a pagar con Mercado Pago» → redirección al checkout_url que devolvió la API (una página
// simulada en el dominio de MP) → webhook firmado de la order → vuelta a /pedido/ con el estado.
const SLUG = 'serum-multi-active';
const CONTENIDO = join(process.cwd(), 'content');
const SECRET = 'secreto-e2e-local';

type Handler = (req: Request, c: unknown) => Promise<Response>;
type FetchFalso = {
  avisosOk: { tipo: string; estado: string }[];
  orders: Record<string, Record<string, unknown>>;
  ordersCreadas: { body: { external_reference: string; total_amount: string; config: { online: Record<string, string> } } }[];
};
let crear: Handler;
let estado: Handler;
let webhook: Handler;
let mp: FetchFalso;

test.beforeAll(async () => {
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  process.env.MP_ACCESS_TOKEN = 'token-de-mentira';
  process.env.MP_WEBHOOK_SECRET = SECRET;
  crear = (await bundle('netlify/functions/crear-pedido.ts', { snapshot: true })).default;
  estado = (await bundle('netlify/functions/estado-pedido.ts', { snapshot: true })).default;
  webhook = (await bundle('netlify/functions/mp-webhook.ts')).default;
});

test.beforeEach(async ({ page, baseURL }) => {
  test.skip(process.env.E2E_MP !== '1' || process.env.E2E_MODO !== 'checkout', 'el build no tiene Mercado Pago encendido');
  test.skip(!baseURL?.startsWith('http://127.0.0.1'), 'solo local (out-mp/)');
  resetBlobs();
  mp = fakeFetch() as FetchFalso;
  const c = leerContenido(CONTENIDO);
  setSnapshot({ buildId: 'e2e', ...c, mpHabilitado: true, webhookAviso: true, direccionRetiro: leerDireccionRetiro(CONTENIDO) });
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());
  await page.route('**/.netlify/functions/crear-pedido', async (route) => {
    const res = await crear(new Request('https://nudecosmetica.com/.netlify/functions/crear-pedido', {
      method: 'POST',
      body: route.request().postData() ?? '',
    }), ctx());
    await route.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
  });
  await page.route('**/.netlify/functions/estado-pedido?*', async (route) => {
    const id = new URL(route.request().url()).searchParams.get('id') ?? '';
    const res = await estado(new Request(`https://nudecosmetica.com/.netlify/functions/estado-pedido?id=${id}`), ctx());
    await route.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
  });
  // Checkout de Mercado Pago simulado: el navegador llega al checkout_url y la página ofrece volver
  // por las URLs de retorno de la order (cambiadas al servidor local, como haría MP con el dominio real).
  await page.route(`${CHECKOUT_URL}*`, async (route) => {
    const online = mp.ordersCreadas.at(-1)!.body.config.online;
    const local = (u: string) => u.replace('https://nudecosmetica.com', baseURL!);
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Mercado Pago (simulado)</title><h1>Checkout simulado</h1>
        <a id="ok" href="${local(online.success_url)}">volver aprobado</a>
        <a id="fallo" href="${local(online.failure_url)}">volver rechazado</a>`,
    });
  });
});

async function irAPagar(page: Page): Promise<{ orderId: string; pedidoId: string; total: number }> {
  await page.goto(`/productos/${SLUG}/`);
  await page.locator('#cantidad').fill('2');
  await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
  await page.goto('/carrito/');
  await page.locator('input[name="envio"][value="retiro"]').check();
  await page.locator('input[name="medio"][value="mercadopago"]').check();
  await page.getByRole('button', { name: /siguiente: tus datos/i }).click();
  await page.getByLabel('Nombre y apellido').fill('E2E Nude');
  await page.getByLabel('Email').fill('e2e@example.com');
  await page.getByLabel('Teléfono (WhatsApp)').fill('351 000 0000');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Ir a pagar con Mercado Pago' }).click();

  // Redirección al link de pago que devolvió la API (checkout_url), no a una URL armada en el navegador.
  await page.waitForURL(/mercadopago\.com\.ar\/checkout\/v1\/redirect\?order_id=ORD/);
  const orderId = new URL(page.url()).searchParams.get('order_id')!;
  expect(Object.keys(mp.orders)).toEqual([orderId]);
  const creada = mp.ordersCreadas[0].body;
  const { productos, tienda } = leerContenido(CONTENIDO);
  const total = calcularTotal([{ slug: SLUG, cantidad: 2 }], productos, tienda, 'mercadopago', 0).total;
  expect(total).toBe(44270); // 2 serums con MP: solo 5% por cantidad
  expect(creada.total_amount).toBe('44270.00');
  return { orderId, pedidoId: creada.external_reference, total };
}

async function notificar(orderId: string, pedidoId: string, over: Record<string, unknown>) {
  mp.orders[orderId] = orderFixture({ id: orderId, external_reference: pedidoId, ...over });
  const res = await webhook(webhookRequest(orderId, SECRET), ctx());
  expect(res.status).toBe(200);
}

test('MP · carrito → pagar → checkout_url → webhook processed → /pedido/ «pagado»', async ({ page }) => {
  const { orderId, pedidoId, total } = await irAPagar(page);

  // Antes del webhook, /pedido/ todavía espera a Mercado Pago.
  await page.goto(`/pedido/?id=${pedidoId}`);
  await expect(page.getByText('Esperando a Mercado Pago')).toBeVisible();

  await page.goBack();
  await notificar(orderId, pedidoId, { total_amount: total.toFixed(2), total_paid_amount: total.toFixed(2) });
  await page.locator('#ok').click();
  await page.waitForURL(new RegExp(`/pedido/\\?id=${pedidoId}$`));
  await expect(page.getByRole('heading', { name: '¡Pedido pagado!' })).toBeVisible();
  expect(mp.avisosOk).toHaveLength(1);
  expect(mp.avisosOk[0]).toMatchObject({ tipo: 'pedido_pagado', estado: 'pagado' });
});

test('MP · pago rechazado (order failed) → /pedido/ «cancelado» y sin aviso', async ({ page }) => {
  const { orderId, pedidoId } = await irAPagar(page);
  await notificar(orderId, pedidoId, { status: 'failed', status_detail: 'rejected_by_issuer', total_paid_amount: '0.00' });
  await page.locator('#fallo').click();
  await page.waitForURL(/\/pedido\/\?id=.*&estado=fallo$/);
  await expect(page.getByRole('heading', { name: 'Pedido cancelado' })).toBeVisible();
  await expect(page.getByText('Mercado Pago no aprobó el pago')).toBeVisible();
  expect(mp.avisosOk).toHaveLength(0);
});

test('MP · pago pendiente (order processing) → /pedido/ sigue «Esperando a Mercado Pago»', async ({ page }) => {
  const { orderId, pedidoId } = await irAPagar(page);
  await notificar(orderId, pedidoId, { status: 'processing', status_detail: 'in_process', total_paid_amount: '0.00' });
  await page.goto(`/pedido/?id=${pedidoId}&estado=pendiente`);
  await expect(page.getByText('Esperando a Mercado Pago')).toBeVisible();
  expect(mp.avisosOk).toHaveLength(0);
});
