# CLAUDE.md — Nude-Beauty-Web (nudecosmetica.com)

Este archivo le dice a Claude Code cómo trabajar en este repo. Fuente de verdad: `seo/PLAN.md`.

## Qué es
Tienda propia de **NUDE Cosmética Clean** (Soledad, Mendiolaza, Córdoba). Vende 14 productos de
cosmética natural hecha a mano. Cobra con Mercado Pago (Checkout Pro) o transferencia (20% off).
Panel editable por Soledad con Decap + Netlify Identity. Avisos de pedido vía webhook a n8n.
La web reemplaza a Tiendanube cuando venda sin problemas.

## Stack
- **Next.js 15 (App Router) + TypeScript estricto + Tailwind 3** → `output: 'export'` → `out/`.
- **Hosting**: Netlify (sitio `nude-beauty-web`, dominio `nudecosmetica.com`).
- **Backend**: Netlify Functions en `netlify/functions/` (crear-pedido, mp-webhook, estado-pedido).
- **Pedidos**: Netlify Blobs (store privado `pedidos`), nunca GitHub (repo público).
- **Contenido editable**: JSON en `content/productos/*.json` y `content/ajustes/*.json`, editado con
  Decap en `/admin/`.
- **Medición**: GA4 opcional por `NEXT_PUBLIC_GA_ID`.

## Mapa del código
```
app/                       Next.js App Router (páginas, layout)
  layout.tsx               layout global con build-id y JSON-LD Organization
  globals.css              tokens Tailwind + fuentes
  page.tsx                 home
  productos/               catálogo (/productos/) y fichas (/productos/<slug>/)
  carrito/                 noindex
  pedido/                  noindex
  (legales)/               /cambios-y-devoluciones/, /terminos-y-condiciones/, /privacidad/, /arrepentimiento/
  sitemap.ts               sólo URLs indexables
  robots.ts                bloquea /carrito/, /pedido/, /admin/
components/                UI (Header, Footer, StickyCta, ProductCard, …)
lib/                       catalogo.ts, pricing.ts, shipping.ts, site.ts, build-id.ts, urls.ts, whatsapp.ts
content/
  productos/<slug>.json    hechos de producto (editado por Decap)
  ajustes/tienda.json      descuentos, alias/CBU, horas de reserva, WhatsApp
  ajustes/envios.json      zonas, costos, plazos, retiro
public/
  admin/                   Decap (index.html + config.yml)
  img/productos/<slug>/    imágenes de producto (WebP)
netlify/
  functions/
    crear-pedido.ts        valida, recalcula totales y guarda en Blobs
    mp-webhook.ts          valida x-signature + consulta pago a MP
    estado-pedido.ts       devuelve estado público (sin datos personales)
    _data/catalogo.json    snapshot del build para las funciones
scripts/
  verify.sh                gate obligatorio antes de pushear (ver §9 del PLAN)
  prebuild.mjs             fija BUILD_ID y genera snapshot del catálogo
tests/
  unit/                    pricing, shipping, firma MP, idempotencia
  e2e/                     Playwright (local y remoto contra preview)
seo/                       intake aprobado (contexto, personas, arquitectura, keywords, PLAN)
docs/
  PROGRESS.md              estado por etapa — actualizar al cerrar cada etapa
  guia-soledad.md          cómo usar el panel (lo escribe E4)
legacy/                    sitio viejo congelado, de referencia (no se publica)
```

## Reglas de este repo (fuera del flujo general de Claude Code)
1. **El repo es público**: nada de datos personales en commits, logs o fixtures. Pedidos van a Netlify
   Blobs, no acá. Fixtures con datos inventados y marcados `source: "e2e"`.
2. **El servidor manda**: precios, descuentos, envío y disponibilidad se recalculan en
   `netlify/functions/crear-pedido` desde `netlify/functions/_data/catalogo.json`. Nunca confiar en
   el navegador.
3. **Hechos de producto solo de `seo/catalogo-tiendanube.md`**. Lo que falte: `[CONFIRMAR: …]`. Nada
   con `[CONFIRMAR` se publica; el PR lo lista con un mensaje listo para Soledad.
4. **Nada de claims terapéuticos** (ver `seo/00-contexto.md` §Riesgo de claims): várices, flebitis,
   psoriasis, protección UV, "trata el acné", "apto para niños" sin respaldo.
5. **Español rioplatense con voseo** en todo el sitio ("agregá", "mirá", "elegí"). `verify.sh` corre
   un test anti-tuteo (lista mínima en PLAN §9).
6. **Mercado Pago**: validar `x-signature` según la documentación oficial (manifest con `data.id`,
   `x-request-id`, `ts`; HMAC con `MP_WEBHOOK_SECRET`) **y además** consultar el pago a la API de MP
   antes de marcarlo pagado. Idempotente.
7. **Nunca pushear a `main` ni mergear.** Trabajar siempre en `kosmos/nude-tienda`. Push sólo si
   `scripts/verify.sh` termina en PASS. PR en borrador hasta E6.
8. **No prometer en la interfaz lo que no existe** (envío gratis, plazos de 48 h, cuotas) sin dato
   confirmado.
9. **Nada de parches que sólo hacen pasar tests** (timeouts, retries) sin explicar la causa raíz.
10. **No tocar DNS, Netlify dashboard, cuentas de terceros, ni Tiendanube.**

## Variables de entorno
Las carga Fede en Netlify. Si falta alguna: el código la tolera, el check que dependa queda SKIP en
`verify.sh` y se lista como pendiente.

| Variable | Para qué |
|---|---|
| `MP_ACCESS_TOKEN` | Mercado Pago (de prueba en deploy preview, de producción en producción) |
| `MP_WEBHOOK_SECRET` | Secreto para validar `x-signature` del webhook de MP |
| `ORDER_WEBHOOK_URL` | Endpoint de n8n al que se avisan los pedidos |
| `ORDER_WEBHOOK_SECRET` | Secreto en el header `x-nude-secret` del aviso |
| `E2E_TOKEN` | Habilita e2e remotos sin disparar avisos reales (header `x-e2e-token`) |
| `NEXT_PUBLIC_GA_ID` | ID de GA4 (vacío = sin script) |
| `CHECKOUT_MODE` | `propio` (default) o `tiendanube` (plan B) |

Variables de build sugeridas de Netlify (set automáticamente): `COMMIT_REF`, `DEPLOY_URL`,
`DEPLOY_PRIME_URL`.

## Comandos
```bash
npm install                    # instalar deps
npm run dev                    # desarrollo local
npm run build                  # build + export (genera out/)
npm run typecheck              # TypeScript estricto
npm test                       # unit tests (node --test)
bash scripts/verify.sh         # gate obligatorio antes de pushear
```

## Flujo de trabajo (resumen)
1. Trabajá sobre `kosmos/nude-tienda`. Nunca push a `main`.
2. Cada etapa E0–E6 del `seo/PLAN.md` cierra con `verify.sh` en PASS, commit, push y chequeo del
   deploy preview de Netlify (`deploy-preview-<n>--nude-beauty-web.netlify.app`): build-id =
   commit pusheado, URLs del sitemap en 200, e2e remoto en verde.
3. Actualizá `docs/PROGRESS.md` al cerrar cada etapa.
4. Si la sesión se corta: al retomar leé `docs/PROGRESS.md` primero.
5. En E2, cada ficha sigue el método de la skill `kosmos-web` (fase-2-pagina.md → fase-3-nextjs.md)
   **sin frenar en los checkpoints**: anotá el resumen en `seo/ESTADO.md` y seguí. Commit por
   página: `seo(<slug>): …`.

## Después del merge (lo hace Fede)
Ver `seo/PLAN.md` §11: cargar variables de producción, probar compra real, enviar sitemap a Search
Console, banner "Nos mudamos" en Tiendanube, apagar Tiendanube cuando la web venda sin problemas.
