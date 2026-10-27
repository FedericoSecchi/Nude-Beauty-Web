import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { leerContenido, leerDireccionRetiro } from '../../lib/contenido.mjs';
import { calcularTotal } from '../../lib/pricing';
import { formatARS } from '../../lib/format';
// Mismo harness que los unit tests: bundlea las functions reales con Blobs en memoria y el snapshot
// inyectado; fetch falso para el aviso a n8n.
import { bundle, ctx, fakeFetch, ORDER_URL, resetBlobs, setSnapshot } from '../unit/_harness.mjs';

// Checkout con transferencia en un build con ORDER_WEBHOOK_URL de prueba (out-webhook/, servido local):
// la interfaz real del carrito y de /pedido/ contra crear-pedido y estado-pedido corriendo en este
// proceso (el servidor estático no tiene functions). Cubre lo mismo que el e2e remoto de compra cuando
// el preview no tiene ORDER_WEBHOOK_URL.
const SLUG = 'serum-multi-active';
const CONTENIDO = join(process.cwd(), 'content');

type Handler = (req: Request, c: unknown) => Promise<Response>;
let crear: Handler;
let estado: Handler;
let avisos: { avisosOk: { entrega: { direccionRetiro?: string } }[] };

test.beforeAll(async () => {
  process.env.ORDER_WEBHOOK_URL = ORDER_URL;
  crear = (await bundle('netlify/functions/crear-pedido.ts', { snapshot: true })).default;
  estado = (await bundle('netlify/functions/estado-pedido.ts', { snapshot: true })).default;
});

test.beforeEach(async ({ page, baseURL }) => {
  test.skip(process.env.E2E_MODO !== 'checkout', 'el build está en modo pedido por WhatsApp');
  test.skip(!baseURL?.startsWith('http://127.0.0.1'), 'solo local (en el preview corre compra.spec.ts)');
  resetBlobs();
  avisos = fakeFetch();
  const c = leerContenido(CONTENIDO);
  setSnapshot({ buildId: 'e2e', ...c, mpHabilitado: false, webhookAviso: true, direccionRetiro: leerDireccionRetiro(CONTENIDO) });
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
});

async function comprar(page: import('@playwright/test').Page, entrega: string) {
  await page.goto(`/productos/${SLUG}/`);
  await page.locator('#cantidad').fill('2');
  await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
  await page.goto('/carrito/');
  await page.locator(`input[name="envio"][value="${entrega}"]`).check();
  await expect(page.locator('input[name="medio"]')).toHaveCount(1);
  await page.getByRole('button', { name: /siguiente: tus datos/i }).click();
  await expect(page.getByText('DNI (opcional, a veces lo pide el correo)')).toBeVisible();
  await page.getByLabel('Nombre y apellido').fill('E2E Nude');
  await page.getByLabel('Email').fill('e2e@example.com');
  await page.getByLabel('Teléfono (WhatsApp)').fill('351 000 0000');
  if (entrega !== 'retiro') {
    await page.getByLabel('Dirección (calle y número)').fill('Calle Falsa 123');
    await page.getByLabel('Localidad').fill('Unquillo');
    await page.getByLabel('Provincia').fill('Córdoba');
    await page.getByLabel('Código postal').fill('5109');
  }
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await page.waitForURL(/\/pedido\/\?id=NUDE-/);
  await expect(page.getByText(/falta la transferencia/i)).toBeVisible();
}

test('retiro · 2 unidades: /pedido/ con alias, total 5% + 20% y la dirección del retiro', async ({ page }) => {
  const { productos, tienda } = leerContenido(CONTENIDO);
  const esperado = calcularTotal([{ slug: SLUG, cantidad: 2 }], productos, tienda, 'transferencia', 0);
  expect(esperado.total).toBe(35416); // ejemplo de Soledad, con el precio actual del serum

  await comprar(page, 'retiro');
  await expect(page.getByTestId('alias')).toHaveText('NUDE.CLEAN.CARE');
  await expect(page.getByText('María Soledad Tarantelli')).toBeVisible();
  await expect(page.getByTestId('cbu')).toHaveCount(0);
  await expect(page.getByTestId('monto')).toHaveText(formatARS(35416));
  await expect(page.getByTestId('total')).toHaveText(formatARS(35416));
  await expect(page.getByTestId('direccion-retiro')).toHaveText(leerDireccionRetiro(CONTENIDO)!);
  expect(avisos.avisosOk).toHaveLength(1);
  expect(avisos.avisosOk[0].entrega.direccionRetiro).toBe(leerDireccionRetiro(CONTENIDO));
});

test('envío económico · 2 unidades: total 5% + 20% + $3.500 y sin dirección del retiro', async ({ page }) => {
  await comprar(page, 'envio-economico');
  await expect(page.getByTestId('alias')).toHaveText('NUDE.CLEAN.CARE');
  await expect(page.getByTestId('monto')).toHaveText(formatARS(35416 + 3500));
  await expect(page.getByTestId('direccion-retiro')).toHaveCount(0);
});
