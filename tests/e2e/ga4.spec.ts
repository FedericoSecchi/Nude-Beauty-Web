import { test, expect, type Page } from '@playwright/test';

// GA4 con un ID de prueba (verify.sh buildea out-ga/ con NEXT_PUBLIC_GA_ID=G-TEST0000). gtag.js no
// se descarga (se corta la red a Google): los eventos quedan en window.dataLayer y se leen de ahí.
// Además de que cada evento salga, se comprueba que ninguno lleve el nombre, el teléfono ni wa.me.
const GA_ID = process.env.E2E_GA_ID;
const GLOSS = 'creamy-gloss-blush-2-en-1';
const COMPRADORA = { nombre: 'Clienta Analytics', telefono: '351 999 0000' };

type Evento = { nombre: string; params: Record<string, unknown> };

async function eventos(page: Page): Promise<Evento[]> {
  return page.evaluate(() => {
    const dl = ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((a) =>
      Array.from(a),
    );
    return dl
      .filter((a) => a[0] === 'event')
      .map((a) => ({ nombre: String(a[1]), params: (a[2] ?? {}) as Record<string, unknown> }));
  });
}

async function esperarEvento(page: Page, nombre: string): Promise<Evento> {
  await expect.poll(async () => (await eventos(page)).some((e) => e.nombre === nombre)).toBe(true);
  return (await eventos(page)).filter((e) => e.nombre === nombre).at(-1)!;
}

const vistos: Evento[] = [];

test.beforeEach(async ({ page }) => {
  test.skip(!GA_ID, 'sin E2E_GA_ID: el build no carga GA4');
  await page.context().route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
  await page.context().route('https://wa.me/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }),
  );
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());
});

test.afterEach(async ({ page }) => {
  vistos.push(...(await eventos(page).catch(() => [])));
});

test('gtag config con el ID del build', async ({ page }) => {
  await page.goto('/');
  const config = await page.evaluate(() =>
    ((window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer ?? [])
      .map((a) => Array.from(a))
      .find((a) => a[0] === 'config'),
  );
  expect(config?.[1]).toBe(GA_ID);
});

test('view_item, add_to_cart con tono, view_cart y click_whatsapp con valor', async ({ page }) => {
  await page.goto(`/productos/${GLOSS}/`);
  const vi = await esperarEvento(page, 'view_item');
  expect(vi.params.currency).toBe('ARS');
  expect((vi.params.items as { item_id: string }[])[0].item_id).toBe(GLOSS);

  // Primer tono disponible.
  const tono = await page.locator('input[name="tono"]').first().getAttribute('value');
  await page.locator('input[name="tono"]').first().check({ force: true });
  await page.locator('#cantidad').fill('2');
  await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
  const atc = await esperarEvento(page, 'add_to_cart');
  const item = (atc.params.items as Record<string, unknown>[])[0];
  expect(item).toMatchObject({ item_id: GLOSS, item_variant: tono, quantity: 2 });
  expect(atc.params.value).toBe((item.price as number) * 2);
  vistos.push(...(await eventos(page)));

  await page.goto('/carrito/');
  const vc = await esperarEvento(page, 'view_cart');
  expect(vc.params.value).toBeGreaterThan(0);

  test.skip(process.env.E2E_MODO !== 'whatsapp', 'el build está en checkout: no hay botón de WhatsApp');
  await page.getByLabel('Nombre y apellido').fill(COMPRADORA.nombre);
  await page.getByLabel('Teléfono (WhatsApp)').fill(COMPRADORA.telefono);
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Enviar pedido por WhatsApp' }).click(),
  ]);
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  const cw = await esperarEvento(page, 'click_whatsapp');
  expect(cw.params.currency).toBe('ARS');
  expect(cw.params.value as number).toBeGreaterThan(0);
  expect((cw.params.items as Record<string, unknown>[])[0]).toMatchObject({ item_id: GLOSS, item_variant: tono });
  // El evento de consulta no se dispara con el botón del pedido.
  expect((await eventos(page)).some((e) => e.nombre === 'contacto_whatsapp')).toBe(false);
});

test('contacto_whatsapp con ubicación en la ficha y en el pie', async ({ page }) => {
  await page.goto(`/productos/${GLOSS}/`);
  await Promise.all([page.waitForEvent('popup'), page.getByTestId('wa-ficha').click()]);
  const c1 = await esperarEvento(page, 'contacto_whatsapp');
  expect(c1.params).toEqual({ ubicacion: 'ficha_dudas' });

  await Promise.all([
    page.waitForEvent('popup'),
    page.locator('footer a[data-wa-ubicacion="footer"]').click(),
  ]);
  await expect
    .poll(async () => (await eventos(page)).filter((e) => e.nombre === 'contacto_whatsapp').map((e) => e.params.ubicacion))
    .toEqual(['ficha_dudas', 'footer']);
});

test('purchase una sola vez por pedido aunque se recargue /pedido/', async ({ page }) => {
  await page.route('**/.netlify/functions/estado-pedido*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'NUDE-E2E-GA4',
        estado: 'pendiente_transferencia',
        medio: 'transferencia',
        items: [{ slug: GLOSS, nombre: 'Creamy Gloss', cantidad: 1, precioUnitario: 10000, variante: 'Bronze' }],
        subtotal: 10000,
        descuentos: [],
        envio: 0,
        total: 8000,
        entrega: { modo: 'retiro', zona: 'Retiro' },
        creado: '2026-11-10T12:00:00.000Z',
        source: 'e2e',
      }),
    }),
  );
  await page.goto('/pedido/?id=NUDE-E2E-GA4');
  const p = await esperarEvento(page, 'purchase');
  expect(p.params).toMatchObject({ transaction_id: 'NUDE-E2E-GA4', value: 8000, currency: 'ARS' });
  expect((p.params.items as Record<string, unknown>[])[0]).toMatchObject({ item_variant: 'Bronze' });
  vistos.push(...(await eventos(page)));

  await page.reload();
  await expect(page.getByRole('heading', { name: /Pedido NUDE-E2E-GA4/ })).toBeVisible();
  expect((await eventos(page)).some((e) => e.nombre === 'purchase')).toBe(false);
});

test.afterAll(() => {
  if (!GA_ID) return;
  // Ningún parámetro de ningún evento lleva datos de la compradora ni la URL de wa.me.
  expect(vistos.length).toBeGreaterThan(0);
  const tel = COMPRADORA.telefono.replace(/\D/g, '');
  for (const e of vistos) {
    const json = JSON.stringify(e.params);
    const digitos = json.replace(/\D/g, '');
    expect(json, e.nombre).not.toContain(COMPRADORA.nombre);
    expect(json, e.nombre).not.toContain(COMPRADORA.telefono);
    expect(digitos.includes(tel), `${e.nombre} con el teléfono`).toBe(false);
    expect(json, e.nombre).not.toMatch(/wa\.me|link_url|link_text/i);
  }
  console.log(`[e2e] ${vistos.length} eventos sin datos personales: ${[...new Set(vistos.map((e) => e.nombre))].join(', ')}`);
});
