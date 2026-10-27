import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { leerContenido, leerDireccionRetiro } from '../../lib/contenido.mjs';
import { armarPedidoWhatsapp, pesos } from '../../lib/pedido-whatsapp';
import { listarOpciones, NOMBRE_RETIRO } from '../../lib/shipping';
import { formatARS } from '../../lib/format';

// Modo «pedido por WhatsApp» (sin medio de pago o sin ORDER_WEBHOOK_URL: lib/modo-venta.mjs).
// ficha → carrito → datos → botón con href wa.me al número de la tienda, con todos los ítems y el
// total con transferencia calculado con lib/pricing sobre el mismo contenido que se buildeó.
// Corre solo con E2E_MODO=whatsapp (verify.sh lo pasa según el contenido y el flag de MP).
const SLUG = 'serum-multi-active';
const CONTENIDO = process.env.E2E_CONTENT_DIR || join(process.cwd(), 'content');

test.beforeEach(async ({ page }) => {
  test.skip(process.env.E2E_MODO !== 'whatsapp', 'el build está en checkout normal');
  await page.route('**/.netlify/scripts/cdp*', (route) => route.abort());
});

test('ficha → carrito → «Enviar pedido por WhatsApp» con el total', async ({ page }) => {
  const { productos, tienda, envios } = leerContenido(CONTENIDO);
  const opcion = listarOpciones(envios)[0];
  const compradora = { nombre: 'E2E Nude', telefono: '351 000 0000' };
  const esperado = armarPedidoWhatsapp([{ slug: SLUG, cantidad: 2 }], productos, tienda, opcion, compradora);

  await page.goto(`/productos/${SLUG}/`);
  await expect(page.getByTestId('precio').locator('..')).toContainText('20% off pagando con transferencia');
  await page.locator('#cantidad').fill('2');
  await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
  await page.goto('/carrito/');

  // Sin selector de medio de pago ni paso de checkout.
  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
  await expect(page.locator('input[name="medio"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pago' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /siguiente: tus datos|confirmar pedido/i })).toHaveCount(0);
  await page.locator(`input[name="envio"][value="${opcion.id}"]`).check();

  const boton = page.getByRole('link', { name: 'Enviar pedido por WhatsApp' });
  await expect(page.getByText('Soledad te responde por WhatsApp con los datos para pagar y el envío.')).toBeVisible();

  // Sin nombre ni teléfono no abre WhatsApp: pide los datos.
  await boton.click();
  await expect(page.getByText('Completá tu nombre y tu teléfono para mandar el pedido.')).toBeVisible();

  await page.getByLabel('Nombre y apellido').fill(compradora.nombre);
  await page.getByLabel('Teléfono (WhatsApp)').fill(compradora.telefono);

  const href = await boton.getAttribute('href');
  const numero = tienda.whatsapp.replace(/\D/g, '');
  expect(href).toMatch(new RegExp(`^https://wa\\.me/${numero}\\?text=`));
  const texto = new URL(href!).searchParams.get('text') ?? '';
  expect(texto).toBe(esperado.texto);
  expect(texto).toContain(pesos(esperado.totalTransferencia));
  expect(texto).toContain('2 × Serum Multi Active');
  await expect(page.getByTestId('total-carrito')).toHaveText(formatARS(esperado.totalTransferencia));
  console.log(`[e2e] wa.me con total ${pesos(esperado.totalTransferencia)}`);
});

test('retiro → el mensaje sale de la function con la dirección (preview) o sin ella (local, sin functions)', async ({ page, baseURL }) => {
  const { productos, tienda } = leerContenido(CONTENIDO);
  const remoto = Boolean(baseURL?.startsWith('https://'));
  const compradora = { nombre: 'E2E Nude', telefono: '351 000 0000' };
  const esperado = armarPedidoWhatsapp([{ slug: SLUG, cantidad: 2 }], productos, tienda, {
    nombre: NOMBRE_RETIRO,
    costo: 0,
    retiro: true,
    direccionRetiro: remoto ? leerDireccionRetiro(CONTENIDO) : null,
  }, compradora);

  // wa.me no se abre de verdad: se captura la URL de la pestaña nueva.
  await page.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));

  await page.goto(`/productos/${SLUG}/`);
  await page.locator('#cantidad').fill('2');
  await page.getByRole('button', { name: /agregá al carrito/i }).first().click();
  await page.goto('/carrito/');
  await page.locator('input[name="envio"][value="retiro"]').check();
  await expect(page.getByText('Retiro gratis en Mendiolaza, de lunes a viernes de 9 a 18 h')).toBeVisible();
  await page.getByLabel('Nombre y apellido').fill(compradora.nombre);
  await page.getByLabel('Teléfono (WhatsApp)').fill(compradora.telefono);

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Enviar pedido por WhatsApp' }).click(),
  ]);
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  const texto = new URL(popup.url()).searchParams.get('text') ?? '';
  expect(texto).toBe(esperado.texto);
  expect(texto).toContain('Entrega: Retiro en Mendiolaza · gratis');
  if (tienda.alias) expect(texto).toContain(`Alias para transferir: ${tienda.alias}`);
  expect(texto.includes('Dirección de retiro:')).toBe(remoto);
  console.log(`[e2e] retiro por WhatsApp ${remoto ? 'con' : 'sin'} dirección · total ${pesos(esperado.totalTransferencia)}`);
});

test('crear-pedido no guarda pedidos en modo WhatsApp (preview)', async ({ request, baseURL }) => {
  test.skip(!baseURL?.startsWith('https://'), 'sin functions en el servidor estático local');
  const res = await request.post('/.netlify/functions/crear-pedido', { data: { items: [] } });
  expect(res.status()).toBe(409);
});
