import { test, expect } from '@playwright/test';

// Medios de pago según el flag de Mercado Pago del build (NEXT_PUBLIC_MP_HABILITADO, next.config.mjs).
// E2E_MP=0 → carrito con un solo medio (transferencia) y ni "cuotas", ni "tarjeta", ni "Mercado Pago"
// en las páginas públicas. E2E_MP=1 → transferencia y Mercado Pago, como antes.
const MP = process.env.E2E_MP === '1';
const PALABRAS = /cuotas|tarjeta|mercado ?pago/i;

test.beforeEach(async ({ page }) => {
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());
});

test(`carrito con ${MP ? 'transferencia y Mercado Pago' : 'un solo medio de pago'}`, async ({ page }) => {
  await page.goto('/productos/serum-multi-active/');
  await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
  await page.goto('/carrito/');
  const medios = page.locator('input[name="medio"]');
  await expect(medios.first()).toBeVisible();
  if (MP) {
    await expect(medios).toHaveCount(2);
  } else {
    await expect(medios).toHaveCount(1);
    await expect(medios.first()).toHaveValue('transferencia');
    await expect(medios.first()).toBeChecked();
    expect(await page.locator('body').innerText()).not.toMatch(PALABRAS);
  }
});

test(`páginas del sitemap ${MP ? 'nombran' : 'no nombran'} cuotas / tarjeta / Mercado Pago`, async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const paths = [...sitemap.matchAll(/<loc>https:\/\/nudecosmetica\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  expect(paths.length).toBeGreaterThan(10);
  const conPalabras: string[] = [];
  for (const path of [...paths, '/carrito/', '/pedido/']) {
    await page.goto(path);
    const html = await page.content();
    const texto = await page.locator('body').innerText();
    if (PALABRAS.test(texto) || PALABRAS.test(html)) conPalabras.push(path);
  }
  if (MP) expect(conPalabras).toContain('/');
  else expect(conPalabras, `con MP apagado aparecen en: ${conPalabras.join(', ')}`).toEqual([]);
});
