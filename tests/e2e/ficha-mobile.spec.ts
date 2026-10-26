import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// PLAN §5: en 360×740, H1, precio, CTA y link de WhatsApp visibles sin scroll en las 14 fichas.
// - "ficha mobile · con stock": contra el build normal (E2E_BASE_URL).
// - "ficha mobile · sin stock": contra el build de prueba con todo en disponible:false
//   (E2E_SINSTOCK_URL, lo levanta verify.sh desde out-sinstock/).

const VIEWPORT = { width: 360, height: 740 };

const slugs = readdirSync(join(process.cwd(), 'content', 'productos'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(process.cwd(), 'content', 'productos', f), 'utf8')).slug as string);

test.use({ viewport: VIEWPORT, isMobile: true, hasTouch: true });

// En los deploy previews Netlify inyecta el "Netlify Drawer" (iframe fijo abajo que tapa la barra de
// compra). No existe en producción: se bloquea su script para probar el sitio real.
test.beforeEach(async ({ page }) => {
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());
});


async function abrir(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  // Medimos la primera pantalla tal cual llega: sin scroll.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

async function bordeInferior(page: Page, testId: string): Promise<number> {
  const box = await page.getByTestId(testId).first().boundingBox();
  expect(box, `${testId} sin caja`).not.toBeNull();
  return box!.y + box!.height;
}

test('ficha mobile · con stock: H1, precio, CTA y WhatsApp sin scroll en las 14 fichas', async ({
  page,
}) => {
  expect(slugs).toHaveLength(14);
  for (const slug of slugs) {
    await abrir(page, `/productos/${slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
    await expect(page.getByTestId('precio')).toBeInViewport({ ratio: 1 });
    const cta = await bordeInferior(page, 'cta-principal');
    expect(cta, `${slug}: CTA termina en y=${cta}`).toBeLessThanOrEqual(VIEWPORT.height);
    const wa = await bordeInferior(page, 'wa-ficha');
    expect(wa, `${slug}: WhatsApp termina en y=${wa}`).toBeLessThanOrEqual(VIEWPORT.height);
    // La barra fija no aparece mientras el CTA principal se ve.
    await expect(page.getByTestId('sticky-cta')).toHaveCount(0);
  }
});

test('ficha mobile · barra fija aparece al scrollear y agrega al carrito', async ({ page }) => {
  await abrir(page, `/productos/${slugs[0]}/`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const barra = page.getByTestId('sticky-cta');
  await expect(barra).toBeVisible();
  await barra.getByRole('button', { name: /agregá al carrito/i }).click();
  await expect(barra.getByRole('link', { name: /ver carrito/i })).toBeVisible();
  const carrito = await page.evaluate(() => localStorage.getItem('nude.carrito.v1'));
  expect(JSON.parse(carrito ?? '[]')[0]?.slug).toBe(slugs[0]);
});

test('ficha mobile · sin stock: mensaje y WhatsApp sin scroll en las 14 fichas', async ({ page }) => {
  const base = process.env.E2E_SINSTOCK_URL;
  test.skip(!base, 'sin E2E_SINSTOCK_URL (lo define verify.sh)');
  for (const slug of slugs) {
    await abrir(page, `${base}/productos/${slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
    await expect(page.getByTestId('cta-principal')).toHaveCount(0);
    const msg = await bordeInferior(page, 'sin-stock');
    expect(msg, `${slug}: "Sin stock" termina en y=${msg}`).toBeLessThanOrEqual(VIEWPORT.height);
    const wa = await bordeInferior(page, 'wa-ficha');
    expect(wa, `${slug}: WhatsApp termina en y=${wa}`).toBeLessThanOrEqual(VIEWPORT.height);
    await expect(page.getByTestId('precio')).toBeInViewport({ ratio: 1 });
  }
});
