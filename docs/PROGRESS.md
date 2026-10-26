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
| B Ningún pedido sin aviso | ✅ | 2026-10-26 | 9 unit tests en `tests/unit/avisos.test.mjs` (falla→éxito = 1 aviso, 2 notificaciones MP = 1 aviso, arrepentimiento con webhook caído se reintenta, stores por contexto) |
| C Cobro con Mercado Pago | ✅ | 2026-10-26 | 10 unit tests en `tests/unit/mp-checkout.test.mjs` (500 carritos al azar: suma = total y precios > 0; monto/moneda → `revisar`; base URL por contexto; cantidad 1–20; notas ≤ 500) |
| D Textos con fuente | ✅ | 2026-10-26 | `seo/auditoria-hechos.md` · kw_coverage ✅ y copy_lint ✅ en 16/16 · grep en `out/` sin "parte interna del brazo", "lavarropas", "niñ", "más eligen", "\| NUDE" |
| E Schema y puerta de publicación | ✅ | 2026-10-26 | `returnFees` = ReturnFeesCustomerResponsibility · puerta simulada en verify.sh (producción bloquea, preview avisa, limpio pasa) · widget de Identity solo en /admin/ |

Estados: ⬜ pendiente · 🟡 en curso · ✅ cerrado · ⛔ bloqueado

## Identidad visual de NUDE (2026-10-26)
| Bloque | Estado | Fecha | Evidencia |
|---|---|---|---|
| Rebase sobre `origin/main` (PR #1 mergeado) | ✅ | 2026-10-26 | el hotfix de la landing interina quedó en `legacy/index.html`; productos de prueba borrados también de `legacy/` |
| Hero con foto, terracota, secciones del sitio viejo, fichas y catálogo | ✅ | 2026-10-26 | preview build-id `cc53bdff6821` · 20/20 URLs en 200 · capturas en `docs/capturas/diseno/` |

### Reporte · identidad visual

#### 1. Checks con evidencia
| Check | Resultado | Evidencia |
|---|---|---|
| `verify.sh` | ✅ PASS=17 FAIL=0 SKIP=1 | SKIP = e2e remoto (falta `E2E_TOKEN`), igual que antes |
| Contraste AA del botón principal | ✅ 4,58:1 normal · 5,49:1 hover | `scripts/check-contraste.mjs` mide en el navegador: blanco `rgb(255,255,255)` sobre `rgb(162,103,78)` (hover `rgb(145,92,70)`) en home, ficha y carrito (la barra fija mobile usa la misma clase) |
| Lighthouse mobile home · local (`serve` con gzip) | ✅ LCP 2,41 s · CLS 0 · perf 98 | mediana de 3, dentro de `verify.sh` |
| Lighthouse mobile home · preview | ✅ LCP 2,25 s · CLS 0 · FCP 0,97 s · perf 96 | `docs/capturas/diseno/lighthouse-preview-home.json` (sin el Netlify Drawer, ver decisiones) |
| Lighthouse mobile ficha · preview | ✅ LCP 2,31 s · CLS 0 · perf 98 | `docs/capturas/diseno/lighthouse-preview-ficha.json` |
| Antes (preview del PR #2 previo a este cambio) | LCP 6,79 s · CLS 0,033 · perf 68 | medido con el Drawer incluido: no es una comparación 1 a 1, pero el `@import` de Google Fonts sí bloqueaba el render (FCP 3,1 s) |
| Hero visible sin scroll en 390×844 y 1366×850 | ✅ | `tests/e2e/home-hero.spec.ts` (marca, H1, subtítulo, 2 CTAs, línea de 20% off; foto con `fetchpriority=high` y `loading=eager`), local y contra el preview |
| CTA visible en 360×740 en las 14 fichas (con y sin stock) + barra fija | ✅ | `tests/e2e/ficha-mobile.spec.ts`, local y contra el preview |
| H1, title y meta description | ✅ sin cambios | comparación de las 20 URLs del sitemap: build nuevo vs preview anterior, 20/20 iguales |
| kw_coverage / copy_lint de la home | ✅ | 100% cobertura · 100/100 humano (`seo/paginas/home/contenido.md` actualizado) |
| Preview: build-id del commit pusheado + sitemap | ✅ | `scripts/preview-check.sh` |

#### 2. Capturas antes / después (`docs/capturas/diseno/`)
- Sitio viejo: `antes-legacy-home-{desktop-1366x850,mobile-390x844}.png` (servido localmente desde `legacy/`).
- PR #2 antes de este cambio: `antes-pr2-{home,serum-multi-active}-{desktop,mobile}.png`.
- Después (preview): `despues-preview-{home,serum-multi-active}-{desktop,mobile}.png`.
- Se regeneran con `node scripts/capturas.mjs <url> <prefijo> docs/capturas/diseno / /productos/serum-multi-active/`.

#### 3. Qué cambió (producto)
- La home abre con la foto de las hojas a pantalla completa, "nude" grande en Cormorant y el H1 debajo, botón terracota "Ver productos" y "Escribinos por WhatsApp" con borde. En el celular se ven las hojas arriba y el texto abajo, todo sin scrollear.
- Debajo: la presentación de NUDE, "¿Por qué cosmética clean?" en 3 tarjetas sobre fondo nude suave y "Por dónde empezar" con las fotos reales.
- Todos los botones de compra son terracota (incluidos "Agregá al carrito" y la barra fija del celular).
- Catálogo y fichas con tarjetas de radio y sombra suave como el sitio viejo; el detalle de la ficha va en una tarjeta. Mismo orden de bloques.
- La rama de hojas aparece como detalle en el pie (desde tablet).

#### 4. Decisiones de diseño y técnicas (tomadas sin consultar)
- 2026-10-26 · Terracota oscurecido 1 punto de luminosidad: `18 35% 48%` → `18 35% 47%`. El original daba 4,42:1 con texto blanco (no llega a AA); 47% da 4,58:1. Hover a 42% (5,49:1) en vez de bajar la opacidad como el sitio viejo, que aclaraba y bajaba el contraste. El contador del carrito pasa a texto blanco por lo mismo.
- 2026-10-26 · Hero mobile: recorte vertical de la izquierda de la foto (hojas + sombras + lino) en vez de solo `object-position`, contenido abajo y velo crema en degradé desde abajo: con el velo parejo las hojas quedaban detrás del texto. Desktop: foto entera con velo parejo (`bg/40`, como el sitio viejo).
- 2026-10-26 · La foto del hero va con `<picture>` + `<img>` nativo (WebP 960/1440/1920 y 480/640 para mobile), no con `next/image`: con `output: export` e `images.unoptimized`, `next/image` no genera `srcset`. Calidad 60 en mobile (fondo bajo un velo; el lino no gana nada con más).
- 2026-10-26 · Fuentes con `next/font` en vez del `@import` de Google Fonts: era una cadena bloqueante HTML → CSS → otro origen y el 92% del LCP era "render delay". Cormorant solo en peso 400 (el único que usan encabezados y marca; antes también se cargaban 500/600 sin usarse): el archivo estático pesa 23 KB contra 38 KB del variable. Se probó no precargar DM Sans: no movía el LCP y empeoraba el FCP, se descartó.
- 2026-10-26 · Miniaturas de producto 480/768 px generadas en cada build (`scripts/miniaturas.mjs`, ignoradas por git): las fotos de 1024 px pesaban hasta 240 KB y en una tarjeta se ven a ~360 px (la del Serum Multi Active pasa de 81 KB a 7 KB). Cubre también lo que Soledad suba desde el panel. Si `sharp` no estuviera, copia la original (nunca rompe una imagen). `sharp` queda fijado en `devDependencies` (ya venía con Next).
- 2026-10-26 · Lighthouse en `verify.sh` corre contra `out/` servido con `serve` (gzip, como Netlify con brotli), 3 corridas, mediana del LCP y CLS máximo. Lo que fija el piso del LCP simulado es el JS base de Next/React (~100 KB gzip): sin él la home da 1,66 s. No hay margen para sumar JS en la home sin pasarse de 2,5 s.
- 2026-10-26 · En los deploy previews Netlify inyecta `/.netlify/scripts/cdp` (Netlify Drawer: ~300 KB de JS de app.netlify.com + Segment + Bugsnag) con un iframe fijo abajo. No existe en producción. Lighthouse, las capturas y los e2e remotos lo bloquean para medir el sitio real; con él el LCP del preview da 5,8 s y el iframe tapa la barra fija de compra (el test de la barra fallaba por eso). No se tocó la configuración de Netlify (fuera de alcance).
- 2026-10-26 · "¿Por qué cosmética clean?": "Sin parabenos", "Cada activo con su nombre" y "Hecho a mano, en pequeños lotes", con textos que ya estaban en la home (fuente: `seo/00-contexto.md` líneas 35, 36 y 38). No va "Sin crueldad animal / cruelty-free y vegano" del sitio viejo: está en `[CONFIRMAR]`.
- 2026-10-26 · Textos: solo lo que pide el punto 1 (CTAs "Ver productos" y "Escribinos por WhatsApp", antes "Mirá la rutina completa" y "Kit con los básicos"; el H2 "Qué quiere decir cosmética clean" → "¿Por qué cosmética clean?"). El párrafo largo del hero pasó intacto a la sección siguiente. Se sacó la "Y" inicial de "Y una rutina armada en orden…" porque ahora va sola debajo de las tarjetas.
- 2026-10-26 · No se recuperó "Belleza natural, hecha con amor" del sitio viejo: el texto no tiene fuente y la foto del taller no existe (era un recuadro vacío).
- 2026-10-26 · Rama de hojas del pie: recorte de `hero-bg.jpg` con `mix-blend-multiply` y máscara radial; oculta en mobile, donde pisaba los links legales.
- 2026-10-26 · Rebase: `legacy/products/{hey,hola,test1}.json` y su imagen, que main borró en el PR #1, también se borran en `legacy/`. Respaldo de la rama previa al rebase en la rama local `backup/pre-rebase-diseno` (no se pushea).

#### 5. Pendiente
- e2e remoto completo: sigue sin `E2E_TOKEN` en Netlify (los specs de hero y ficha se corrieron a mano contra el preview y pasan).
- El check "no hay placeholders ni productos viejos" de `verify.sh` usa `\|` dentro de `grep -E` (donde es un `|` literal), así que hoy no detecta nada. Viene de antes; no se tocó porque al arreglarlo saltaría con "Hola" del texto de WhatsApp y hay que ajustar la lista. Conviene corregirlo aparte.
- Fotos de producto en mejor resolución y una foto del taller para recuperar la sección "Nosotros" (ya estaba en la lista de pedidos a Soledad).
- Revisión visual de Soledad: que el hero nuevo se reconozca como NUDE (es la misma foto y tipografía de redes).


### Reporte · revisión post-E6 (bloques A–E)

#### 1. Checks con evidencia
| Check | Resultado | Evidencia |
|---|---|---|
| `verify.sh` | ✅ PASS=16 FAIL=0 SKIP=1 | `bash scripts/verify.sh` (SKIP = e2e remoto, falta `E2E_TOKEN`) |
| CTA mobile 360×740 en las 14 fichas (con stock) | ✅ | `tests/e2e/ficha-mobile.spec.ts`: borde inferior del CTA ≤ 740 y precio visible sin scroll. En el preview: CTA en y=587 / 551 / 555 px (serum-multi-active / nude-bag / vincha); antes ≈1090 |
| Ídem sin stock ("Sin stock" + WhatsApp) | ✅ | mismo spec contra el build de prueba `out-sinstock/` (14 fichas con `disponible: false`) |
| Barra fija mobile | ✅ | aparece al scrollear y agrega al carrito (mismo spec) |
| Reintento de avisos | ✅ | `tests/unit/avisos.test.mjs` (9): falla→éxito = 1 aviso; 2 notificaciones de MP (seguidas y simultáneas) = 1 aviso; arrepentimiento con webhook caído se guarda y se reintenta; stores `*-preview` fuera de producción |
| Preferencia de MP sin precios ≤ 0 | ✅ | `tests/unit/mp-checkout.test.mjs`: 500 carritos al azar, suma de ítems = total y todos los `unit_price` > 0 |
| Monto/moneda verificados | ✅ | mismo archivo: monto ±$1 o moneda ≠ ARS → `revisar` + aviso `pedido_revisar` |
| Base URL por contexto | ✅ | mismo archivo: producción → `URL`, resto → `DEPLOY_PRIME_URL` |
| Cantidad 1–20 / notas ≤ 500 | ✅ | unit tests + en vivo: `crear-pedido` con `cantidad: 21` → 400 en el preview |
| Puerta de publicación simulada | ✅ | `verify.sh`: `CONTEXT=production` con `[CONFIRMAR`/`[REVISAR` falla y lista `archivo:línea`; preview solo avisa; limpio pasa |
| Widget de Identity solo en /admin/ | ✅ | `curl $PREVIEW/ \| grep -c netlify-identity-widget` → 0 · `/admin/` → 1 |
| `returnFees` | ✅ | `ReturnFeesCustomerResponsibility` en las fichas del preview |
| kw_coverage / copy_lint | ✅ 16/16 | `verify.sh` |
| Preview: build-id del último commit | ✅ | `scripts/preview-check.sh` → build-id = commit pusheado (ver abajo) |
| Preview: URLs del sitemap | ✅ 20/20 en 200 + 404 real | `scripts/preview-check.sh` |
| Función programada desplegada | ✅ | `reintentar-avisos` en `available_functions` del deploy |
| e2e remoto | ⏭️ SKIP | `E2E_TOKEN` no está cargado en Netlify |

Capturas 360×740 del preview: serum-multi-active, nude-bag, vincha-con-velcro (abajo).

#### 2. Qué cambió (producto)
- En el celular, quien entra desde Instagram ve nombre, precio, precio con transferencia, "Agregá al carrito" y WhatsApp sin scrollear; al bajar aparece una barra fija con precio y botón de compra.
- Ninguna venta cobrada ni arrepentimiento queda sin aviso a Soledad: todo se guarda primero y, si n8n no responde, se reintenta cada 10 minutos hasta que salga (una sola vez).
- Comprar 2 o más productos con Mercado Pago ya no arma una preferencia con precios negativos; si MP cobra un monto distinto, el pedido queda "a revisar" en lugar de "pagado"; la clienta vuelve siempre a nudecosmetica.com.
- Los textos dicen solo lo que está en las fuentes (fuera la historia inventada, los cuidados de lavado, el ángulo para niñas, las 48 h, el retiro sin confirmar).
- Un merge con datos pendientes ya no puede reemplazar al sitio en vivo: el build de producción falla y dice qué falta.

#### 3. Decisiones técnicas
Detalle con fecha en `docs/PROGRESS.md` › Decisiones (A–E). Resumen:
- Escrituras condicionales (ETag de Blobs) + lease de 2 min: nunca dos avisos en paralelo. Entrega "al menos una vez": PLAN §6 pide a n8n deduplicar por `id` + `tipo`.
- Backoff 10→20→40… min con techo de 6 h y sin límite de intentos (el arrepentimiento es obligación legal).
- Contexto desde `context.deploy.context` de la función; ante la duda, nunca producción.
- Descuentos repartidos en el precio unitario; si la última línea tiene varias unidades, el resto del redondeo va en una unidad separada para que la suma sea exacta.
- Faltante de `transaction_amount` → `revisar` (lo más seguro).
- Caso "sin stock" probado con un build de prueba (`NUDE_CONTENT_DIR`), sin tocar el contenido real.
- Pie legal con marca + CUIT (como Tiendanube); nombre de Soledad fuera del texto público; retiro deshabilitado hasta confirmar; H1 de la home = keyword principal, mismo aspecto.

#### 4. `[CONFIRMAR]`: qué cambió respecto del reporte anterior
- **Sale** "apto para niños" del Creamy Gloss: ya no se publica, no hace falta confirmarlo para salir.
- **Deja de bloquear** la razón social: el pie muestra "NUDE Cosmética Clean · CUIT". Sigue pendiente para completar el pie.
- **Nuevos** (no bloquean, hoy no se muestran): si hay retiro en Mendiolaza (deshabilitado), si Soledad quiere aparecer con su nombre, si hay plazo de reserva por transferencia, cómo elige el color del gloss quien compra (no hay selector), ingredientes completos del Óleo, que las 3 cuotas sin interés estén configuradas en Mercado Pago.
- **Siguen bloqueando producción** (12 marcas en `out/`): alias/CBU/titular, ingredientes finales del Serum Transformación y el aviso `[REVISAR LEGAL]` de términos y privacidad.
- Mensaje listo para Soledad: `seo/auditoria-hechos.md` › "Mensaje listo para Soledad".

#### 5. Qué no se pudo verificar y por qué
- **Mercado Pago en la práctica**: `MP_ACCESS_TOKEN` está cargado pero es secreto (Netlify no devuelve el valor) y no hay credenciales de prueba a mano. La doc oficial solo lista el error `invalid_items` ("unit_price invalid") sin precisar valores; no hay mecanismo documentado de ítem negativo. El arreglo elimina el riesgo igual. Falta probar una preferencia real con credenciales de prueba.
- **e2e remoto**: sin `E2E_TOKEN` en Netlify.
- **Aviso real a n8n**: sin `ORDER_WEBHOOK_URL` / `ORDER_WEBHOOK_SECRET`. Probado con unit tests contra los handlers reales.
- **Función programada en vivo**: Netlify solo la ejecuta en el deploy de producción; en el preview está desplegada pero no corre.
- **Stores `*-preview` en vivo**: probado en unit tests con el contexto de la función; no se escribió un pedido real en el preview para no generar datos.
- **Producción**: con las 12 marcas pendientes, el build de producción va a fallar a propósito al mergear hasta que se completen.

Capturas: `docs/capturas/revision-post-e6/`.

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
- 2026-10-26 · E2 · ~~"Apto para niños" en el gloss queda en condicional dentro de la FAQ~~ → reemplazado en el bloque D: se sacó por completo (texto, FAQ y keywords) hasta que Soledad confirme el respaldo.
- 2026-10-26 · E3 · Netlify Functions escritas en TypeScript (bundler esbuild automático). Los functions importan `lib/pricing.ts` y `lib/shipping.ts` directo: esbuild resuelve el bundle; una sola fuente de verdad del cálculo (misma función que corre en el navegador para preview).
- 2026-10-26 · E3 · Snapshot del catálogo (`netlify/functions/_data/catalogo.json`) generado por `scripts/prebuild.mjs`. Lo levantan las functions al iniciar; evita tocar `content/*.json` en runtime y asegura que una edición del panel sin build no afecte pedidos en vuelo.
- 2026-10-26 · E3 · GA4 opcional (`NEXT_PUBLIC_GA_ID`): sin ID no se cargan scripts; con ID, dispara `add_to_cart`, `begin_checkout` y `purchase` (una sola vez por id, flag en `sessionStorage`).
- 2026-10-26 · E3 · Playwright: proyectos Chromium (Pixel 5 + Desktop Chrome) en lugar de iPhone 13 (webkit) para no depender de un browser extra; mobile/desktop cubre lo mismo del PLAN §9.
- 2026-10-26 · E3 · Preview smoke contra las functions: `estado-pedido` sin id → 400, con id inexistente → 404, `crear-pedido` GET → 405, POST inválido → 400 "items vacío". Las functions están desplegadas y validando.

- 2026-10-26 · A · Ficha mobile: grilla con `order` (H1 → foto a 30vh con `object-contain` → precio/CTA/WhatsApp → resumen); desktop conserva la grilla de 2 columnas con posiciones explícitas. El descriptor del H1 ("· qué es") va más chico en mobile; el texto del H1 no cambia.
- 2026-10-26 · A · `StickyCta` pasa a ser un botón que agrega al carrito (antes era un link sin uso). Aparece cuando el CTA principal sale de pantalla (IntersectionObserver), solo en mobile.
- 2026-10-26 · A · El caso "sin stock" se prueba con un build de prueba (`NUDE_CONTENT_DIR` + `scripts/fixture-sin-stock.mjs` → `out-sinstock/`) en vez de tocar el contenido real. No genera snapshot para las functions.
- 2026-10-26 · A · Breadcrumb visible solo desde `md` (en mobile el JSON-LD BreadcrumbList sigue igual) para ganar alto en la primera pantalla.
- 2026-10-26 · B · Escrituras de pedidos con control de concurrencia (ETag + `onlyIfMatch` de Netlify Blobs) y un lease de 2 min mientras se envía el aviso: dos notificaciones de MP simultáneas, o una notificación y la función programada, nunca mandan dos avisos. Entrega "al menos una vez": si la función se cae justo después del POST, el aviso puede repetirse → PLAN §6 pide a n8n deduplicar por `id` + `tipo`.
- 2026-10-26 · B · `reintentar-avisos` (programada `*/10 * * * *` UTC): backoff 10, 20, 40… min con techo de 6 h, sin límite de intentos (el arrepentimiento es obligación legal: no se abandona). Corta a los 20 s para no pasar el límite de 30 s; lo que falte va en la corrida siguiente. Netlify solo la ejecuta en producción.
- 2026-10-26 · B · Contexto de deploy desde `context.deploy.context` de la función (fallback `CONTEXT`, y si no hay, `dev`): solo `production` usa `pedidos` / `arrepentimientos`; el resto `*-preview`. Ante la duda, nunca producción.
- 2026-10-26 · B · El arrepentimiento ahora se guarda antes de avisar; si no se puede guardar, responde 500 y el formulario muestra WhatsApp / mail (sin código no hay constancia).
- 2026-10-26 · C · Ítems negativos: la referencia oficial de preferencias solo documenta el error `invalid_items` ("unit_price invalid") sin precisar valores y no ofrece ítems negativos como mecanismo de descuento. No se probó en la práctica: `MP_ACCESS_TOKEN` está cargado pero es secreto (la API de Netlify no devuelve el valor) y no se usan credenciales de Soledad. Se elimina el riesgo igual: descuentos repartidos en el precio unitario, redondeo a pesos y resto en la última línea; si esa línea tiene varias unidades, el resto va en una unidad separada para que la suma sea exacta.
- 2026-10-26 · C · Monto verificado: tolerancia $1; si falta `transaction_amount` también va a `revisar` (lo más seguro). Un pedido en `revisar` no vuelve a `pagado` solo: lo resuelve Soledad.
- 2026-10-26 · C · Base URL: producción → `URL` (y si faltara, `https://nudecosmetica.com`, nunca un `*.netlify.app`); otros contextos → `DEPLOY_PRIME_URL`, o el origen del request si faltara. El contexto sale de `context.deploy.context`.
- 2026-10-26 · C · Cantidad: el servidor rechaza no enteros (antes redondeaba hacia abajo); el carrito y la ficha topean en 20.
- 2026-10-26 · D · Auditoría oración por oración de las 20 páginas + carrito/pedido + componentes globales: 144 afirmaciones sin fuente, todas borradas o reescritas con hechos de `catalogo-tiendanube.md` / `00-contexto.md`; solo la lista de ingredientes del Serum Transformación queda en `[CONFIRMAR]`.
- 2026-10-26 · D · Pie legal: "NUDE Cosmética Clean · CUIT …" (como el pie de Tiendanube) en vez de `[CONFIRMAR: razón social]`; la razón social y el IVA siguen pendientes para el pie, pero no se imprime un marcador en todas las páginas.
- 2026-10-26 · D · Nombre de Soledad fuera del texto público ("te escribimos", "la marca") hasta que confirme si quiere aparecer (00-contexto: pendiente).
- 2026-10-26 · D · Retiro en Mendiolaza deshabilitado (`retiro.habilitado: false`) hasta que se confirme: no se promete en la interfaz. Soledad lo puede volver a activar desde el panel.
- 2026-10-26 · D · Sin "48 h para transferir" ni "se libera el stock" (sin dato y sin manejo de stock). Sin "más conveniente que por separado" en los kits: con el 5% por 2+ unidades, los productos sueltos salen más baratos que el kit con Mercado Pago.
- 2026-10-26 · D · Home: el H1 pasa a ser el kicker "Cosmética clean hecha a mano en Córdoba" (keyword principal) y el eslogan queda como párrafo con el mismo estilo; visualmente igual.
- 2026-10-26 · D · Keywords que solo entraban con frases forzadas → "Descartadas" en cada `keywords.md` con una línea de justificación (p. ej. "serum de bakuchiol y retinol": el producto lleva retinoides, no retinol).
- 2026-10-26 · D · Títulos: la marca aparece una sola vez (la pone el template del layout); se sacó "| NUDE" de los `seo.title`.
- 2026-10-26 · E · Puerta de publicación (`scripts/puerta-publicacion.mjs`, al final de `npm run build`): busca `[CONFIRMAR` y `[REVISAR` en HTML, TXT (payload RSC), JSON, XML y JS de `out/`; con `CONTEXT=production` el build falla y lista archivo:línea y fragmento; en otros contextos solo avisa. Hoy quedan 12 marcas (alias/CBU, ingredientes del Transformación, aviso legal): **un merge hoy no reemplaza al sitio en vivo** hasta completarlas.
- 2026-10-26 · E · Netlify Identity: las páginas públicas ya no cargan el widget; un script inline mínimo manda los links con `#invite_token` / `#recovery_token` / `#confirmation_token` a `/admin/`, donde el widget los procesa.
- 2026-10-26 · E · JSON-LD Organization sin `logo` (apuntaba a `/img/logo.png`, que no existe). Se agrega cuando haya logo.

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
- `ORDER_WEBHOOK_URL`, `ORDER_WEBHOOK_SECRET` → bloquean el aviso a n8n (el pedido igual se guarda; se reintenta en la próxima notificación). El flujo de n8n ya está armado y probado con datos de prueba, pero todavía sin publicar ni con las cuentas conectadas: ver `seo/05-n8n-pedidos.md` › Pendiente.
- `NEXT_PUBLIC_GA_ID` → sin GA no se cargan los scripts, el sitio funciona igual.

## Revisiones manuales para Fede (al cerrar E6)
- [ ] Mobile 360×740: hero + CTA sin scroll, carrito con contador.
- [ ] Tono: el sitio suena como Soledad (voseo, cálido, sin claims médicos).
- [ ] Compra real después del merge: 1 producto barato, pago, aviso, Sheet, Telegram, email, reintegro.
