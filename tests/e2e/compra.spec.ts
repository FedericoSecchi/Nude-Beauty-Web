import { test, expect } from '@playwright/test';

// Smoke e2e: ficha → add to cart → carrito → datos → confirmar pedido.
// Local (static server servido con `npx serve out`): el POST a /.netlify/functions/... va a fallar,
// pero la UI del carrito y el checkout tienen que renderizar bien.
// Remoto (contra el deploy preview): si está E2E_TOKEN, hacemos el checkout real contra el store
// `pedidos-e2e`, verificamos el redirect a /pedido/ con transferencia y después borramos el pedido.

const SLUG = 'serum-multi-active';

test('home + ficha + add to cart + carrito muestra el ítem', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto(`/productos/${SLUG}/`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/serum/i);
  await page.getByRole('button', { name: /agregá al carrito/i }).click();
  await page.goto('/carrito/');
  await expect(page.getByText(/Serum Multi Active/i)).toBeVisible();
  await expect(page.getByText(/Subtotal/)).toBeVisible();
});

test('e2e remoto: checkout por transferencia (requiere E2E_TOKEN)', async ({
  page,
  baseURL,
}, testInfo) => {
  const token = process.env.E2E_TOKEN;
  if (!token || !baseURL?.startsWith('http')) {
    test.skip(true, 'sin E2E_TOKEN');
    return;
  }
  const ts = Date.now();
  const email = `e2e+${ts}@nudecosmetica.com`;

  const res = await page.request.post('/.netlify/functions/crear-pedido', {
    headers: { 'x-e2e-token': token, 'content-type': 'application/json' },
    data: {
      items: [{ slug: SLUG, cantidad: 1 }],
      comprador: { nombre: 'E2E Nude', email, telefono: '+54 9 351 000 0000' },
      // Retiro deshabilitado (auditoría T3): envío a una zona real de content/ajustes/envios.json,
      // con dirección inventada.
      entrega: {
        modo: 'envio',
        zonaId: 'gran-cordoba',
        direccion: 'Calle Falsa 123',
        localidad: 'Mendiolaza',
        provincia: 'Córdoba',
        cp: '5107',
      },
      medioPago: 'transferencia',
      terminos: true,
      source: 'e2e',
    },
  });
  expect(res.ok(), `crear-pedido respondió ${res.status()}`).toBeTruthy();
  const body = await res.json();
  expect(body.id).toMatch(/^NUDE-/);
  expect(body.estado).toBe('pendiente_transferencia');

  await page.goto(`/pedido/?id=${encodeURIComponent(body.id)}`);
  await expect(page.getByText(/falta la transferencia/i)).toBeVisible();

  // Limpieza.
  const cleanup = await page.request.post('/.netlify/functions/e2e-cleanup', {
    headers: { 'x-e2e-token': token, 'content-type': 'application/json' },
    data: { id: body.id },
  });
  expect(cleanup.ok(), `cleanup respondió ${cleanup.status()}`).toBeTruthy();
});
