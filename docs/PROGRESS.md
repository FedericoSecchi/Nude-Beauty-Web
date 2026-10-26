# PROGRESS — NUDE Cosmética Clean · tienda propia

> Avance por etapa del `seo/PLAN.md`. Si la sesión se corta: **leé este archivo primero** y retomá desde la primera ⬜.
> Rama: `kosmos/nude-tienda` · PR: borrador hasta E6 · Nunca push a `main`.

## Resumen por etapa
| Etapa | Estado | Fecha | Deploy preview |
|---|---|---|---|
| E0 Preparación | ✅ | 2026-10-26 | [deploy-preview-2](https://deploy-preview-2--nude-beauty-web.netlify.app) · build-id `9a82323e7348` |
| E1 Base del sitio | ✅ | 2026-10-26 | [deploy-preview-2](https://deploy-preview-2--nude-beauty-web.netlify.app) · build-id `3d8833598110` · 20 URLs sitemap OK |
| E2 Catálogo y fichas | ✅ | 2026-10-26 | [deploy-preview-2](https://deploy-preview-2--nude-beauty-web.netlify.app) · build-id `184f5665f151` · 16/16 páginas kw ✅ copy ✅ |
| E3 Carrito, checkout, envíos, pedidos | ✅ | 2026-10-26 | [deploy-preview-2](https://deploy-preview-2--nude-beauty-web.netlify.app) · build-id `1000c93a5c83` · functions ok · 18/18 unit tests · e2e local ✅ |
| E4 Panel Decap | ✅ | 2026-10-26 | /admin/ en 200, /admin/config.yml en 200 · guía para Soledad en docs/guia-soledad.md |
| E5 Legal (AR) | ✅ | 2026-10-26 | /cambios-y-devoluciones · /terminos · /privacidad · /arrepentimiento + pie legal · link Defensa vigente |
| E6 Cierre y PR fuera de borrador | ✅ | 2026-10-26 | PR [#2](https://github.com/FedericoSecchi/Nude-Beauty-Web/pull/2) listo para revisión · build-id `0334e7df3191` |

## Revisión post-E6 (correcciones de la revisión independiente)
| Bloque | Estado | Fecha | Evidencia |
|---|---|---|---|
| A Compra en el celular | ✅ | 2026-10-26 | CTA en y≈551–575 px en 360×740 (antes ≈1090) · e2e `ficha-mobile.spec.ts` 14 fichas con y sin stock |
| B Ningún pedido sin aviso | ⬜ | | |
| C Cobro con Mercado Pago | ⬜ | | |
| D Textos con fuente | ⬜ | | |
| E Schema y puerta de publicación | ⬜ | | |

Estados: ⬜ pendiente · 🟡 en curso · ✅ cerrado · ⛔ bloqueado

## Checks (lo que ya pasa en `verify.sh`)
<!-- cada etapa agrega las filas del §9 del PLAN que ya cubre -->

| Check | Resultado | Evidencia |
|---|---|---|
| typecheck estricto | ✅ | `npm run typecheck` |
| build + export | ✅ | `out/index.html` |
| build-id visible en HTML | ✅ | `curl -sL $PREVIEW/ \| grep build-id` → `9a82323e7348` (coincide con el commit pusheado) |
| 404 real | ✅ | `curl -sI $PREVIEW/nope-404/` → `HTTP/2 404` |
| sin tuteo (voseo rioplatense) | ✅ | lista mínima de PLAN §9 |
| sin `€` ni placeholders viejos | ✅ | grep en `out/` |
| cálculo server-side (precios, descuentos, envío, stock) | ✅ | 11 unit tests en `tests/unit/pricing.test.mjs` |
| firma `x-signature` de MP + consulta a la API | ✅ | 5 unit tests en `tests/unit/mp-signature.test.mjs` |
| idempotencia del webhook de MP | ✅ | `avisoEnviado` persistido; aviso solo en no-pagado → pagado |
| modo e2e con `x-e2e-token` | ✅ | pedidos van a store `pedidos-e2e`, nunca disparan avisos reales |
| CHECKOUT_MODE `propio` / `tiendanube` | ✅ | redirige al carrito de Tiendanube si está activado |
| GA4 events (add_to_cart, begin_checkout, purchase) | ✅ | detrás de `NEXT_PUBLIC_GA_ID`; sin ID no se cargan scripts |
| 20 URLs indexables en sitemap | ✅ | `scripts/preview-check.sh $PREVIEW` → `OK 20/20` |
| 404 real para URL inexistente | ✅ | `curl -sI $PREVIEW/nope-9999/` → 404 |
| JSON-LD Organization + Product + FAQ + Breadcrumb | ✅ | `components/JsonLd` en layout y fichas |
| kw_coverage.py por página | ✅ | 16/16 ≥ 80% (menor: 83% en `serum-transformacion`) |
| copy_lint.py por página | ✅ | 16/16, 0 señales fuertes |
| unit tests | ⏭️ SKIP | aún sin tests (E3) |
| e2e local y remoto | ⏭️ SKIP | aún sin Playwright / `E2E_TOKEN` (E3) |

## Decisiones técnicas tomadas sin consultar
<!-- fecha · etapa · decisión · porqué -->
- 2026-10-26 · E0 · Next.js 15.5.28 (último parche de 15.x) en vez de 15.0.3 (CVE-2025-66478). Subir a 16 sería breaking.
- 2026-10-26 · E0 · Vulnerabilidades moderadas residuales de postcss/tailwindcss se dejan — el fix pide `tailwind@4` (breaking). Issue a resolver aparte si Fede lo decide.
- 2026-10-26 · E0 · Sitio viejo íntegro a `legacy/` (incluye funciones Netlify originales) como referencia. Nada de `legacy/` se publica.
- 2026-10-26 · E0 · `scripts/prebuild.mjs` escribe `.env.production.local` con `NEXT_PUBLIC_BUILD_ID` para que el meta aparezca en el HTML sin hidratación.
- 2026-10-26 · E0 · `verify.sh` corre e2e y kw/copy sólo cuando hay contenido real / credenciales; si no, SKIP (nunca simula PASS).
- 2026-10-26 · E1 · Zonas de envío: todas en modo `coordinar` (costo = 0 hasta que Soledad confirme) con texto "A coordinar por WhatsApp cuando se confirma el pedido". Evita prometer plazos sin dato real.
- 2026-10-26 · E1 · Descuentos no acumulables (`descuentosAcumulables: false`): el 20% transferencia reemplaza al 5% por 2 o más unidades. [CONFIRMAR] con Soledad; es la lectura conservadora.
- 2026-10-26 · E1 · Horas de reserva de transferencia: 48 ([CONFIRMAR]). Las URLs de Mercado Pago y el flujo real llegan en E3.
- 2026-10-26 · E1 · Imágenes de productos: una por producto, descargada del CDN de Tiendanube (WebP 1024). Fotos adicionales y mejores quedan pendientes del cliente.
- 2026-10-26 · E1 · Página `/pedido/` y `/carrito/` noindex pero fuera del sitemap: la validez de las 20 URLs del sitemap se mantiene estricta.
- 2026-10-26 · E1 · `scripts/preview-check.sh` verifica preview sin depender del shell del harness (usa `/usr/bin/curl` por si el PATH no lo tiene).
- 2026-10-26 · E2 · Los `contenido.md` por página son snapshots generados por `scripts/snapshot-content.mjs` a partir del JSON. Lo verifica `verify.sh` para medir cobertura y copy-lint sin duplicar la fuente de verdad.
- 2026-10-26 · E2 · Las keywords del cluster se integran en H1, resumen, FAQ y modo de uso en voseo. Nada de rellenar: cada mención suena a Soledad.
- 2026-10-26 · E2 · "Apto para niños" en el gloss queda en condicional dentro de la FAQ, con un `[CONFIRMAR]` para pedirle a Soledad el respaldo (política de claims cosméticos).
- 2026-10-26 · E3 · Netlify Functions escritas en TypeScript (bundler esbuild automático). Los functions importan `lib/pricing.ts` y `lib/shipping.ts` directo: esbuild resuelve el bundle; una sola fuente de verdad del cálculo (misma función que corre en el navegador para preview).
- 2026-10-26 · E3 · Snapshot del catálogo (`netlify/functions/_data/catalogo.json`) generado por `scripts/prebuild.mjs`. Lo levantan las functions al iniciar; evita tocar `content/*.json` en runtime y asegura que una edición del panel sin build no afecte pedidos en vuelo.
- 2026-10-26 · E3 · GA4 opcional (`NEXT_PUBLIC_GA_ID`): sin ID no se cargan scripts; con ID, dispara `add_to_cart`, `begin_checkout` y `purchase` (una sola vez por id, flag en `sessionStorage`).
- 2026-10-26 · E3 · Playwright: proyectos Chromium (Pixel 5 + Desktop Chrome) en lugar de iPhone 13 (webkit) para no depender de un browser extra; mobile/desktop cubre lo mismo del PLAN §9.
- 2026-10-26 · E3 · Preview smoke contra las functions: `estado-pedido` sin id → 400, con id inexistente → 404, `crear-pedido` GET → 405, POST inválido → 400 "items vacío". Las functions están desplegadas y validando.

- 2026-10-26 · A · Ficha mobile: grilla con `order` (H1 → foto a 30vh con `object-contain` → precio/CTA/WhatsApp → resumen); desktop conserva la grilla de 2 columnas con posiciones explícitas. El descriptor del H1 ("· qué es") va más chico en mobile; el texto del H1 no cambia.
- 2026-10-26 · A · `StickyCta` pasa a ser un botón que agrega al carrito (antes era un link sin uso). Aparece cuando el CTA principal sale de pantalla (IntersectionObserver), solo en mobile.
- 2026-10-26 · A · El caso "sin stock" se prueba con un build de prueba (`NUDE_CONTENT_DIR` + `scripts/fixture-sin-stock.mjs` → `out-sinstock/`) en vez de tocar el contenido real. No genera snapshot para las functions.
- 2026-10-26 · A · Breadcrumb visible solo desde `md` (en mobile el JSON-LD BreadcrumbList sigue igual) para ganar alto en la primera pantalla.

## [CONFIRMAR] pendientes (bloquean publicación)
<!-- se llenan a medida que aparecen; ver seo/00-contexto.md §Pendientes para pedir al cliente -->
- Tamaños (ml / g) de cada producto; presentaciones del agua micelar (200/300) y cuál lleva la Nude Bag.
- Serum Transformación: lista final de ingredientes (en la ficha original hay dos versiones).
- Óleo autobronceante: lista completa de ingredientes.
- Creamy Gloss & Blush: variantes de color disponibles y respaldo del claim "apto para niños".
- Crema Facial Porcelain: cómo quiere comunicar el ingrediente con trigo (celiaquía / intolerancia).
- Crema corporal Velvet: uso en embarazo.
- Tienda: alias, CBU y titular de la cuenta para transferencia; si siguen las 3 cuotas sin interés y las condiciones del descuento por 2+ unidades (actual: 5% no acumulable con 20% transferencia).
- Envíos: costos y plazos por zona (hoy están en modo "coordinar por WhatsApp").
- Legales: razón social, condición de IVA y domicilio exacto; registro ANMAT si lo tiene.
- Google Business Profile: si existe, con qué categoría.
- Material visual: fotos de los productos en mejor resolución que las de Tiendanube; foto de Soledad o del taller para "Nosotros".
- Reseñas / consultas reales por WhatsApp (sin datos personales) para capa social.

## Variables de entorno faltantes
<!-- qué check quedó SKIP por cada variable que no esté en Netlify -->
- `E2E_TOKEN` → bloquea e2e remoto contra el preview (SKIP en `verify.sh`). Se cargan en E3.
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` → bloquean el flujo real de MP (se usa `CHECKOUT_MODE=tiendanube` como plan B hasta cargar).
- `ORDER_WEBHOOK_URL`, `ORDER_WEBHOOK_SECRET` → bloquean el aviso a n8n (el pedido igual se guarda; se reintenta en la próxima notificación).
- `NEXT_PUBLIC_GA_ID` → sin GA no se cargan los scripts, el sitio funciona igual.

## Revisiones manuales para Fede (al cerrar E6)
- [ ] Mobile 360×740: hero + CTA sin scroll, carrito con contador.
- [ ] Tono: el sitio suena como Soledad (voseo, cálido, sin claims médicos).
- [ ] Compra real después del merge: 1 producto barato, pago, aviso, Sheet, Telegram, email, reintegro.
