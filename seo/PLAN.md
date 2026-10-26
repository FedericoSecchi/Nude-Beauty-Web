# Plan — NUDE Cosmética Clean · tienda propia

> Versión 2 · 26-10-2026 · Reemplaza la v1 del 25-10, que dejaba la compra en Tiendanube.
> Aprobado por: Fede (26-10-2026: "la idea es eliminar Tiendanube y que todo viva en esta web").
> Este documento es la fuente de verdad del trabajo. Claude Code lo ejecuta sin preguntar.

## 1. Resumen
- Objetivo: que **nudecosmetica.com sea la única tienda de NUDE**. Tiendanube se apaga después de que la web propia
  venda y despache sin problemas (ver §11).
- Qué se construye: sitio Next.js con home, catálogo y una ficha SEO por cada uno de los 14 productos; carrito y
  checkout propios (Mercado Pago + transferencia con descuento); envío por zona; pedidos guardados en privado y
  avisados a Soledad por email, Google Sheet y Telegram; panel Decap para que Soledad edite productos, precios,
  fotos, envíos y descuentos; páginas legales argentinas.
- Cómo se vende: SEO por producto y por activo (largo plazo), más el tráfico que hoy llega por Instagram y WhatsApp
  (corto plazo), que pasa a apuntar a la web.
- Entregable: PR (borrador desde la etapa 1, con deploy preview de Netlify) en la rama `kosmos/nude-tienda`.
  Fede mergea; nadie más.

## 2. Alcance
- Entra: todo lo del §1, más `verify.sh`, build-id visible, `CLAUDE.md`, tests unitarios y e2e, guía para Soledad.
- No entra (backlog):
  - Cotización de envío en tiempo real con Andreani o Correo Argentino (necesita contrato y credenciales de
    Soledad; el módulo de envíos queda preparado para enchufarla).
  - Factura electrónica, stock por unidades, cupones, newsletter, cuentas de cliente, mayoristas.
  - Guías e ingredientes (contenido informacional), Google Business Profile, Merchant Center.
  - El flujo de n8n que recibe los pedidos (lo arma el planificador por fuera; acá solo se define el contrato §6).
- Repo · rama · hosting: `FedericoSecchi/Nude-Beauty-Web` · `kosmos/nude-tienda` · Netlify (sitio
  `nude-beauty-web`, dominio nudecosmetica.com). Next.js `output: 'export'` → `out/`; lógica de servidor en
  Netlify Functions (`netlify/functions/`).

## 3. Diagnóstico (lo que hay hoy en el repo y en producción)
| Área | Estado | Hallazgo | Impacto |
|---|---|---|---|
| Dominio | ❌ | HTTPS caído (SSL). DNS a Netlify OK | alto |
| Datos de clientes | ❌ | `create-order.js` y `mp-webhook.js` guardan cada pedido (email del cliente incluido) como archivo en GitHub, y **el repo es público**. Además cada pedido dispararía un deploy | alto |
| Cobro | ❌ | `create-order.js` toma el precio que manda el navegador: cualquiera puede pagar $1 por un kit. Moneda `EUR` | alto |
| Webhook MP | ⚠️ | La firma se valida como `ts.body`, que no es el formato de Mercado Pago (usa `data.id`, `x-request-id` y `ts`). Con secreto configurado rechazaría todo; sin secreto acepta todo (lo salva que vuelve a consultar el pago a MP) | medio |
| Catálogo | ❌ | Productos de prueba y precios en € (se limpia en el PR #1). Render solo con JS | alto |
| SEO | ❌ | Una URL, H1 "nude", 7 clics en 6 meses (todos de marca) | alto |
| Panel | ⚠️ | Decap configurado con `git-gateway` + Netlify Identity, sin terminar. Identity está en mantenimiento (solo parches de seguridad) desde feb-2025; hay reportes de jul-2026 de Git Gateway devolviendo 404 en algunos sitios | medio |

## 4. Etapas (cada una cierra con `verify.sh` en PASS, commit, push y chequeo del deploy preview)

### E0 · Preparación
- Rama `kosmos/nude-tienda` (ya existe, con `seo/`). Si el PR #1 está mergeado, `git rebase origin/main`.
- Mover el sitio viejo a `legacy/` (index.html, app.js, styles.css, products.json, products/, admin-ui/,
  portfolio/, case-studies/, templates/, success.html, n8n.json, scripts/generate-products-index.js) y borrar
  `.github/workflows/generate-products-index.yml`. Las funciones viejas se reescriben en E3 (las originales quedan
  en `legacy/netlify-functions/` como referencia).
- Crear `scripts/verify.sh`, build-id visible (`<meta name="build-id">` con `COMMIT_REF` de Netlify o el SHA local),
  `CLAUDE.md` (stack, mapa del código, reglas de este plan) y `docs/PROGRESS.md`.
- Abrir el PR como **borrador** apenas haya un build que pase, para tener deploy preview
  (`deploy-preview-<n>--nude-beauty-web.netlify.app`). Toda verificación "en producción" de este plan se hace ahí.

### E1 · Base del sitio
- Next.js App Router + TypeScript estricto + Tailwind; tokens de marca desde `legacy/styles.css`
  (Cormorant Garamond + DM Sans, paleta nude).
- `netlify.toml`: `command = "npm run build"`, `publish = "out"`, `functions = "netlify/functions"`. Sin el
  redirect `/* → /index.html`. Mantener `/#invite_token=*` si Decap lo necesita. 404 real.
- `lib/site.ts`: datos del negocio de `seo/00-contexto.md`.
- Contenido editable en JSON (lo edita Decap):
  - `content/productos/<slug>.json`: slug, nombre, categoria (face|body|sets|accesorios), precio (número ARS),
    disponible (bool), imagenes[], tamano, h1, resumen, activos[{nombre, queHace}], ingredientes, modoDeUso,
    pasoRutina (1–5 o null), beneficios[], faq[{q,a}], relacionados[], incluye[] (kits), seo{title,description}.
  - `content/ajustes/tienda.json`: descuentoTransferencia (0.20), descuentoCantidad {minUnidades: 2, porcentaje: 0.05},
    descuentosAcumulables (false · [CONFIRMAR]), cuotasTexto ("3 cuotas sin interés" · [CONFIRMAR que sigue en MP]),
    alias, cbu, titularCuenta ([CONFIRMAR]), horasReservaTransferencia (48 · [CONFIRMAR]), whatsapp, emailTienda.
  - `content/ajustes/envios.json`: zonas[{id, nombre, provincias[], codigosPostales[] opcional, costo,
    plazoTexto, modo: "fijo"|"coordinar"}], retiro {habilitado, direccionTexto, costo: 0}, envioGratisDesde
    (null · [CONFIRMAR]). Default de zonas, todas con montos [CONFIRMAR]: Gran Córdoba · Resto de Córdoba ·
    Resto del país · Retiro en Mendiolaza.
- Layout: JSON-LD Organization, header (Productos · Carrito con contador · WhatsApp), footer legal (§7).
- `sitemap.ts` (solo indexables), `robots.ts` (bloquea `/carrito/`, `/pedido/`, `/admin/`).

### E2 · Catálogo y fichas SEO
- Páginas del §5 en ese orden, con el método de la skill kosmos-web (`fase-2-pagina.md` → `fase-3-nextjs.md`):
  SERP → encabezados → texto SEO → capa humana → FAQ → metadata → implementación → QA → commit `seo(<slug>): …`.
- Hechos de producto **solo** de `seo/catalogo-tiendanube.md`. Imágenes: descargar las del CDN de Tiendanube a
  `public/img/productos/<slug>/` (WebP, con width/height); si no se puede descargar, URL remota y pendiente anotado.
- Estructura de ficha y CTA: §5.

### E3 · Carrito, checkout, envíos y pedidos
- Carrito en el navegador (localStorage con try/catch). Página `/carrito/` (noindex): ítems, cantidades, zona de
  envío o retiro, datos del comprador (nombre, email, teléfono, dirección completa si hay envío, DNI
  [CONFIRMAR si lo quiere]), medio de pago (Mercado Pago · Transferencia con 20% off), aceptación de términos.
- **El servidor manda.** `netlify/functions/crear-pedido`: recalcula todo (precios, disponibilidad, descuentos,
  envío) desde los JSON del build (generar `netlify/functions/_data/catalogo.json` en el build); ignora los precios
  del navegador; rechaza productos no disponibles; valida datos con un esquema.
- Pedidos en **Netlify Blobs** (store `pedidos`, consistencia strong). Clave = id no adivinable
  (`NUDE-<fecha>-<aleatorio>`). Nunca en el repo, nunca en logs con datos personales.
- Mercado Pago (Checkout Pro): preferencia con ítems recalculados, `external_reference` = id, back_urls a
  `/pedido/?id=…`, `notification_url` al webhook. Moneda ARS.
- `netlify/functions/mp-webhook`: valida `x-signature` según la documentación oficial de MP (manifest con
  `data.id`, `x-request-id` y `ts`; HMAC con `MP_WEBHOOK_SECRET`), **y además** consulta el pago a la API de MP antes
  de marcar `pagado`. Idempotente (dos notificaciones del mismo pago no duplican avisos).
- Transferencia: el pedido queda `pendiente_transferencia`; `/pedido/` muestra alias/CBU, titular, monto con
  descuento, plazo de reserva y botón de WhatsApp "Ya transferí" con el id prellenado.
- Avisos: al crear un pedido por transferencia y al aprobarse un pago de MP, POST a `ORDER_WEBHOOK_URL` con el
  contrato del §6. Si la variable falta o el POST falla: el pedido igual se guarda, se loguea el id (sin datos
  personales) y se reintenta en la próxima notificación de MP.
- `/pedido/?id=` (noindex): estado del pedido y próximos pasos, vía `netlify/functions/estado-pedido`
  (devuelve solo estado, ítems y total; nada de datos personales).
- Interruptor `CHECKOUT_MODE` (env): `propio` (default) | `tiendanube` (el botón de compra va a `tiendanubeUrl` del
  producto; plan B si las credenciales de MP se demoran).
- Medición: eventos GA4 `add_to_cart`, `begin_checkout`, `purchase` (en `/pedido/` cuando el estado es pagado o
  pendiente de transferencia, una sola vez por id) y `click_whatsapp`. ID de GA4 por env (`NEXT_PUBLIC_GA_ID`, vacío
  = sin script).

### E4 · Panel para Soledad (Decap)
- `public/admin/` con Decap 3 y `config.yml`: backend `git-gateway`, rama `main`, `media_folder:
  public/img/productos`, colecciones: Productos (folder `content/productos`, campos del E1 con etiquetas en
  español y ayudas cortas), Envíos (file `content/ajustes/envios.json`), Tienda (file `content/ajustes/tienda.json`).
  Identity widget en `/admin/` y en el layout para procesar invitaciones.
- Al guardar, Decap commitea a `main` y Netlify publica: el cambio aparece en unos minutos. Decirlo en la guía.
- `docs/guia-soledad.md`: cómo entrar, cambiar un precio, cambiar una foto, pausar un producto, cambiar un costo de
  envío. Pasos cortos, sin jerga.
- Riesgo asumido (Fede, 26-10): Netlify Identity sin mejoras futuras. Si Git Gateway falla en este sitio, dejar
  constancia en el reporte y no improvisar otro login (lo decide el planificador).

### E5 · Legal (Argentina)
- Pie en todas las páginas: razón social [CONFIRMAR], CUIT 23265636934, domicilio [CONFIRMAR], email, WhatsApp,
  link a Defensa de las y los consumidores (URL oficial vigente en argentina.gob.ar; verificarla) y link
  "Botón de arrepentimiento".
- `/arrepentimiento/`: formulario (número de pedido, email, nombre) que se manda por `ORDER_WEBHOOK_URL`
  (`tipo: "arrepentimiento"`) y muestra un código de trámite. Leer y cumplir la Res. SCI 424/2020
  (https://www.argentina.gob.ar/normativa/nacional/norma-342869/texto): visibilidad, sin registro previo, código.
- `/cambios-y-devoluciones/` (texto de su política actual), `/terminos-y-condiciones/` y `/privacidad/`
  (Ley 25.326): borradores marcados `[REVISAR LEGAL]` en el reporte. No inventar condiciones: lo que no esté en la
  política actual o en `00-contexto.md` va `[CONFIRMAR]`.

### E6 · Cierre
- Enlazado interno (rutina y kits, `seo/02-arquitectura.md`), auditoría técnica final, `seo/ESTADO.md` al día.
- PR listo para revisión (sale de borrador) con el reporte del §10.

## 5. Páginas
| Orden | URL | Keyword principal | Schema | Index |
|---|---|---|---|---|
| 1 | / | cosmética clean | Organization (layout) + ItemList | sí |
| 2 | /productos/ | productos de cosmética natural | CollectionPage + ItemList + Breadcrumb | sí |
| 3 | /productos/serum-multi-active/ | serum con niacinamida y vitamina c | Product + Breadcrumb | sí |
| 4 | /productos/serum-transformacion/ | serum de bakuchiol y retinol | Product + Breadcrumb | sí |
| 5 | /productos/contorno-de-ojos-gleaming-eyes/ | contorno de ojos para ojeras y bolsas | Product + Breadcrumb | sí |
| 6 | /productos/crema-facial-porcelain/ | crema facial natural hidratante | Product + Breadcrumb | sí |
| 7 | /productos/agua-micelar-bifasica/ | agua micelar bifásica natural | Product + Breadcrumb | sí |
| 8 | /productos/crema-corporal-velvet/ | crema corporal reafirmante natural | Product + Breadcrumb | sí |
| 9 | /productos/oleo-corporal-autobronceante/ | aceite autobronceante natural | Product + Breadcrumb | sí |
| 10 | /productos/creamy-gloss-blush-2-en-1/ | gloss y rubor natural 2 en 1 | Product + Breadcrumb | sí |
| 11 | /productos/kit-facial-experiencia-completa/ | kit de skincare completo | Product + Breadcrumb | sí |
| 12 | /productos/kit-facial-new-skin/ | kit de rutina facial básica | Product + Breadcrumb | sí |
| 13 | /productos/nude-bag/ | set de regalo de skincare | Product + Breadcrumb | sí |
| 14 | /productos/pads-desmaquillantes/ | pads desmaquillantes reutilizables | Product + Breadcrumb | sí (ficha corta) |
| 15 | /productos/toalla-microfibra/ | toalla de microfibra para la cara | Product + Breadcrumb | sí (ficha corta) |
| 16 | /productos/vincha-con-velcro/ | vincha para skincare | Product + Breadcrumb | sí (ficha corta) |
| 17 | /cambios-y-devoluciones/ | — | Breadcrumb | sí |
| 18 | /terminos-y-condiciones/ | — | Breadcrumb | sí |
| 19 | /privacidad/ | — | Breadcrumb | sí |
| 20 | /arrepentimiento/ | — | Breadcrumb | sí |
| — | /carrito/, /pedido/, /admin/ | — | — | no (noindex, fuera del sitemap) |

Clusters: `seo/paginas/<slug>/keywords.md`. "Ficha corta" = 120–200 palabras, sin análisis de competencia profundo.

### Estructura de una ficha (bloques en orden)
1. Galería + H1 (nombre + qué es) + precio + "$X con transferencia (20% off) · [cuotasTexto] · envíos a todo el país"
   + **Agregar al carrito** (CTA principal) + microcopy "Elegís el envío o retiro en el paso siguiente" + link de
   texto "¿Dudas? Escribinos por WhatsApp" (prellenado: "Hola! Tengo una consulta sobre el [producto] 😊").
   Todo visible sin scroll en 360×740. Si `disponible` es false: "Sin stock por ahora" + WhatsApp, sin botón.
2. Para quién es / qué notás (lenguaje de apariencia; nada de claims terapéuticos, ver `00-contexto.md`).
3. Activos principales (3–5, una línea cada uno).
4. Cómo se usa + paso de la rutina (links al paso anterior y siguiente).
5. Ingredientes completos + tamaño.
6. FAQ (3–5).
7. Aviso de prueba de parche (texto de ella, corto).
8. Relacionados: kit que lo incluye + siguiente paso de la rutina.

### JSON-LD de producto
`Product` (name, description, image, sku = slug, brand NUDE Cosmética Clean) con `Offer` (price de lista,
priceCurrency ARS, availability según `disponible`, url propia, seller → organización) y
`hasMerchantReturnPolicy` según su política (10 días, AR, sin productos abiertos). `shippingDetails` solo con montos
confirmados. Sin `aggregateRating` ni `review`. Coincide con el texto visible.

## 6. Contrato del aviso de pedidos (`ORDER_WEBHOOK_URL`, lo consume n8n)
POST JSON, header `x-nude-secret: <ORDER_WEBHOOK_SECRET>`:
```json
{
  "tipo": "pedido_pagado | pedido_transferencia | arrepentimiento",
  "id": "NUDE-20261026-ab12cd",
  "creado": "ISO-8601",
  "estado": "pagado | pendiente_transferencia",
  "comprador": { "nombre": "", "email": "", "telefono": "", "dni": "" },
  "entrega": { "modo": "envio | retiro", "zona": "", "direccion": "", "localidad": "", "provincia": "", "cp": "" },
  "items": [{ "slug": "", "nombre": "", "cantidad": 1, "precioUnitario": 0 }],
  "subtotal": 0, "descuentos": [{ "motivo": "", "monto": 0 }], "envio": 0, "total": 0,
  "pago": { "medio": "mercadopago | transferencia", "mpPaymentId": "", "mpEstado": "" },
  "notas": ""
}
```
n8n hace: fila en la Google Sheet de pedidos, mensaje de Telegram a Soledad, email a Soledad y email de
confirmación al comprador. Pedidos de prueba (`source: "e2e"`) nunca llegan acá (§9).

Arrepentimiento (`tipo: "arrepentimiento"`): `{ "tipo", "id": "NUDE-ARR-XXXXXX", "creado", "estado": "arrepentimiento",
"numeroOrden", "nombre", "email", "motivo" }`.

Entrega "al menos una vez" (revisión post-E6): pedidos y arrepentimientos se guardan en Blobs antes de avisar
(`pedidos`, `arrepentimientos`; fuera de producción `*-preview`). Si el POST falla, la función programada
`reintentar-avisos` (cada 10 min, backoff 10→20→40… min, techo 6 h) reintenta todo registro `source: "web"`
con `avisoEnviado: false` en estado `pagado`, `revisar`, `pendiente_transferencia` o `arrepentimiento`.
Un caído justo después de un POST exitoso puede repetir el aviso: **n8n deduplica por `id` + `tipo`**.

## 7. Restricciones
- URLs publicadas: solo `/`. No hay redirecciones que hacer. Las URLs de Tiendanube son de otro dominio.
- Repo público: **ningún dato personal** en commits, fixtures ni logs. Fixtures con datos inventados y marcados.
- No prometer en la interfaz lo que no existe (ej. "envío gratis", "llega en 48 h") sin dato confirmado.
- Prácticas descartadas: estrellas propias en schema; claims terapéuticos (várices, flebitis, psoriasis,
  protección UV, "trata el acné"); páginas por ciudad; keywords de relleno.
- Idioma: español rioplatense con voseo (como escribe Soledad), con un test que lo haga cumplir (§9).

## 8. Decisiones
| Decisión | Elección | Quién / cuándo |
|---|---|---|
| Plataforma | Web propia como única tienda; Tiendanube se apaga al final | Fede, 26-10-2026 |
| Panel | Decap + Netlify Identity (riesgo de mantenimiento asumido) | Fede, 26-10-2026 |
| Avisos de pedido | Email + Google Sheet + Telegram, vía n8n | Fede, 26-10-2026 |
| Envíos | Tabla fija por zona editable; API de correo en backlog; "a coordinar por WhatsApp" como modo de zona si hace falta | Fede, 26-10-2026 |
| Dónde se guardan los pedidos | Netlify Blobs (privado), no GitHub | Planificador (el repo es público) |
| Dónde se trabaja | Rama + PR con deploy preview, no `main` | Planificador (es el dominio en vivo de una clienta y un rearmado completo) |
| Plan B de cobro | `CHECKOUT_MODE=tiendanube` mientras falten credenciales de MP | Planificador |
| Categorías | Filtro en `/productos/`, sin URLs por categoría | Planificador (páginas finas) |

## 9. Verificación (`scripts/verify.sh` debe cubrir todo esto)
- `npm ci`, typecheck estricto, lint, build.
- Unit: cálculo de totales (descuento por transferencia, por cantidad, acumulables o no), envío por zona y retiro,
  rechazo de precios manipulados, producto no disponible, validación de firma de MP (casos válido e inválido),
  idempotencia del webhook.
- Sobre `out/`: las 20 URLs indexables existen con 1 H1 y texto prerenderizado; sitemap con exactamente esas 20;
  JSON-LD parsea; ningún "€", "Lorem", "test1", "Hey", "barco"; build-id presente; ningún tuteo (lista mínima:
  descubre, agrega, puedes, tienes, quieres, elige, haz clic, contáctanos, escríbenos, compra ahora).
- SEO por página: `kw_coverage.py` y `copy_lint.py` de la skill kosmos-web en ✅.
- E2E local (Playwright, 360×740 y desktop): ficha → agregar → carrito → elegir zona → transferencia → `/pedido/`
  muestra alias y total correcto; con MP, la función devuelve un `init_point` de Mercado Pago (credenciales de
  prueba).
- E2E remoto contra el deploy preview, sin retries: mismo flujo con pedido marcado (`source: "e2e"`, email
  `e2e+<timestamp>@nudecosmetica.com`, header `x-e2e-token` = `E2E_TOKEN`). Esos pedidos van al store
  `pedidos-e2e`, nunca disparan `ORDER_WEBHOOK_URL` y el test los borra al terminar. Si `E2E_TOKEN` no está
  configurado, se saltea y queda como pendiente en el reporte (no se simula).
- Chequeo del preview: build-id = commit pusheado, las 20 URLs en 200, `/admin/` en 200, una URL inexistente en 404.

## 10. Reporte final (en el PR y en `docs/PROGRESS.md`)
Tabla de checks con evidencia · qué cambió en 3–5 líneas de producto · decisiones técnicas tomadas · `[CONFIRMAR]`
con un mensaje listo para Soledad · variables de entorno que faltan · revisiones manuales para Fede (cómo se ve,
cómo suena, prueba de compra real).

## 11. Después del merge (Fede + planificador)
1. Variables de producción en Netlify (`MP_ACCESS_TOKEN` de producción de Soledad, etc.) y webhook de MP apuntando a
   `https://nudecosmetica.com/.netlify/functions/mp-webhook`.
2. Compra real de punta a punta con un producto barato (pago, aviso, Sheet, Telegram, email) y reintegro.
3. Search Console: enviar sitemap. Link de Instagram → nudecosmetica.com.
4. Tiendanube: banner "Nos mudamos a nudecosmetica.com" y links a la web.
5. Apagar Tiendanube cuando la web propia tenga varias ventas reales cobradas y despachadas sin problemas.
