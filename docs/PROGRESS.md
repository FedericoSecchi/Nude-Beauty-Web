# PROGRESS — NUDE Cosmética Clean · tienda propia

> Avance por etapa del `seo/PLAN.md`. Si la sesión se corta: **leé este archivo primero** y retomá desde la primera ⬜.
> Rama: `kosmos/nude-tienda` · PR: borrador hasta E6 · Nunca push a `main`.

## Resumen por etapa
| Etapa | Estado | Fecha | Deploy preview |
|---|---|---|---|
| E0 Preparación | ✅ | 2026-10-26 | [deploy-preview-2](https://deploy-preview-2--nude-beauty-web.netlify.app) · build-id `9a82323e7348` |
| E1 Base del sitio | ✅ | 2026-10-26 | [deploy-preview-2](https://deploy-preview-2--nude-beauty-web.netlify.app) · build-id `3d8833598110` · 20 URLs sitemap OK |
| E2 Catálogo y fichas | ⬜ | — | — |
| E3 Carrito, checkout, envíos, pedidos | ⬜ | — | — |
| E4 Panel Decap | ⬜ | — | — |
| E5 Legal (AR) | ⬜ | — | — |
| E6 Cierre y PR fuera de borrador | ⬜ | — | — |

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
| 20 URLs indexables en sitemap | ✅ | `scripts/preview-check.sh $PREVIEW` → `OK 20/20` |
| 404 real para URL inexistente | ✅ | `curl -sI $PREVIEW/nope-9999/` → 404 |
| JSON-LD Organization + Product + FAQ + Breadcrumb | ✅ | `components/JsonLd` en layout y fichas |
| kw_coverage.py por página | ⏭️ SKIP | aún sin contenido real (E2) |
| copy_lint.py por página | ⏭️ SKIP | aún sin contenido real (E2) |
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

## [CONFIRMAR] pendientes (bloquean publicación)
<!-- se llenan a medida que aparecen; ver seo/00-contexto.md §Pendientes para pedir al cliente -->

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
