import { test, expect } from '@playwright/test';

// Hero de la home: marca, H1, subtítulo, CTAs y la línea de 20% off / cuotas / envíos visibles sin
// scroll en 390×844 (mobile) y 1366×850 (desktop). La foto es el LCP: prioridad alta y sin lazy-load.

// En los deploy previews Netlify inyecta el "Netlify Drawer" (iframe fijo abajo que tapa la barra de
// compra). No existe en producción: se bloquea su script para probar el sitio real.
test.beforeEach(async ({ page }) => {
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());
});

for (const vp of [
  { nombre: 'mobile 390×844', width: 390, height: 844 },
  { nombre: 'desktop 1366×850', width: 1366, height: 850 },
]) {
  test(`home hero · todo visible sin scroll en ${vp.nombre}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const hero = page.locator('main > section').first();
    const elementos = [
      hero.getByText('nude', { exact: true }),
      page.getByRole('heading', { level: 1 }),
      hero.getByText(/necesita los correctos, en orden/),
      hero.getByRole('link', { name: 'Ver productos' }),
      hero.getByRole('link', { name: 'Escribinos por WhatsApp' }),
      hero.getByText(/20% off pagando con transferencia/),
    ];
    for (const el of elementos) {
      await expect(el).toBeInViewport({ ratio: 1 });
    }

    const img = hero.locator('picture img');
    await expect(img).toHaveAttribute('fetchpriority', 'high');
    await expect(img).toHaveAttribute('loading', 'eager');
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  });
}
