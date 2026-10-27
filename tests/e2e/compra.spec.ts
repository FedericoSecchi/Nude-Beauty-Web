import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { leerContenido } from '../../lib/contenido.mjs';
import { calcularTotal } from '../../lib/pricing';
import { formatARS } from '../../lib/format';

// Smoke e2e: ficha → add to cart → carrito → datos → confirmar pedido.
// Local (static server servido con `npx serve out`): el POST a /.netlify/functions/... va a fallar,
// pero la UI del carrito y el checkout tienen que renderizar bien.
// Remoto (contra el deploy preview): si está E2E_TOKEN, hacemos la compra desde la interfaz contra el
// store `pedidos-e2e`, verificamos /pedido/ (alias y total) y después borramos el pedido.

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

test('e2e remoto: ficha → carrito → zona → transferencia → /pedido/ (requiere E2E_TOKEN)', async ({
  page,
  baseURL,
}) => {
  test.skip(process.env.E2E_MODO === 'whatsapp', 'modo pedido por WhatsApp: no se crean pedidos (pedido-whatsapp.spec.ts)');
  const token = process.env.E2E_TOKEN;
  if (!token || !baseURL?.startsWith('https://')) {
    test.skip(true, 'sin E2E_TOKEN o sin preview remoto');
    return;
  }
  // El token va solo a las functions del preview (nunca a otros orígenes ni a los logs). Con el
  // header, crear-pedido guarda en el store `pedidos-e2e` y no manda avisos a n8n.
  const origen = new URL(baseURL).origin;
  await page.route(`${origen}/.netlify/functions/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-e2e-token': token } }),
  );
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());

  // Lo que /pedido/ tiene que mostrar, calculado desde el mismo contenido que se buildeó.
  const { productos, tienda, envios } = leerContenido(join(process.cwd(), 'content'));
  const zona = envios.zonas[0];
  const esperado = calcularTotal([{ slug: SLUG, cantidad: 1 }], productos, tienda, 'transferencia', zona.modo === 'fijo' ? zona.costo : 0);

  let pedidoId: string | null = null;
  try {
    await page.goto(`/productos/${SLUG}/`);
    await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
    await page.goto('/carrito/');
    await page.locator(`input[name="envio"][value="${zona.id}"]`).check();
    await page.locator('input[name="medio"][value="transferencia"]').check();
    await page.getByRole('button', { name: /siguiente: tus datos/i }).click();
    await page.getByLabel('Nombre y apellido').fill('E2E Nude');
    await page.getByLabel('Email').fill(`e2e+${Date.now()}@nudecosmetica.com`);
    await page.getByLabel('Teléfono (WhatsApp)').fill('+54 9 351 000 0000');
    await page.getByLabel('Dirección (calle y número)').fill('Calle Falsa 123');
    await page.getByLabel('Localidad').fill('Mendiolaza');
    await page.getByLabel('Provincia').fill('Córdoba');
    await page.getByLabel('Código postal').fill('5107');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await page.waitForURL(/\/pedido\/\?id=NUDE-/, { timeout: 20_000 });
    pedidoId = new URL(page.url()).searchParams.get('id');
    await expect(page.getByText(/falta la transferencia/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('monto')).toHaveText(formatARS(esperado.total));
    await expect(page.getByTestId('total')).toHaveText(formatARS(esperado.total));
    if (tienda.alias) {
      await expect(page.getByTestId('alias')).toHaveText(tienda.alias);
    } else {
      // Sin alias cargado no se muestra ningún dato inventado (y producción no se publica).
      await expect(page.getByTestId('alias')).toHaveCount(0);
      testInfoAnotar('alias vacío en content/ajustes/tienda.json: /pedido/ sin alias (esperado)');
    }
    if (tienda.cbu) await expect(page.getByTestId('cbu')).toHaveText(tienda.cbu);
    else await expect(page.getByTestId('cbu')).toHaveCount(0);
  } finally {
    // Limpieza automática, pase o falle el test.
    if (pedidoId) {
      const cleanup = await page.request.post('/.netlify/functions/e2e-cleanup', {
        headers: { 'x-e2e-token': token, 'content-type': 'application/json' },
        data: { id: pedidoId },
      });
      expect(cleanup.ok(), `cleanup respondió ${cleanup.status()}`).toBeTruthy();
      console.log(`[e2e] pedido de prueba ${pedidoId} creado y borrado`);
    }
  }
});

function testInfoAnotar(nota: string) {
  test.info().annotations.push({ type: 'nota', description: nota });
  console.log(`[e2e] ${nota}`);
}
