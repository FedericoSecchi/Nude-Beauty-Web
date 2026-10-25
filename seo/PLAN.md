# Plan — NUDE Cosmética Clean

> Fecha: 25-10-2026 · Preparado en el intake (claude.ai) · Aprobado por: Fede ([fecha])
> Este documento es la fuente de verdad del trabajo. Claude Code lo ejecuta sin preguntar.

## 1. Resumen
- Qué vamos a hacer: rehacer nudecosmetica.com en Next.js con una ficha SEO por cada uno de los 14 productos reales,
  home y catálogo. En esta etapa el botón de compra lleva a la ficha del mismo producto en Tiendanube.
- Para quién y para qué: Soledad (NUDE Cosmética Clean, Mendiolaza, Córdoba). Que el dominio propio empiece a
  posicionar por producto y activo, sin cortar las ventas que hoy funcionan en Tiendanube.
- Resultado entregable: PR en la rama `kosmos/nude-tienda` con 16 páginas + página legal, QA por página.
  El checkout propio (etapa 2) reemplaza después el destino del botón sin tocar las fichas.

## 2. Tipo de trabajo y alcance
- Tipo: D (sitio nuevo sobre un sitio publicado sin tráfico no-marca).
- Entra:
  - Base Next.js + tokens de la marca actual (colores, Cormorant Garamond + DM Sans de `styles.css`).
  - Home, `/productos/`, 14 fichas en `/productos/<slug>/`, `/cambios-y-devoluciones/`.
  - Pie legal: nombre, CUIT, Mendiolaza, link a Defensa del Consumidor y botón de arrepentimiento (apunta al de
    Tiendanube mientras la compra sea allá).
  - JSON-LD (Organization, Product + Offer, BreadcrumbList, ItemList), sitemap, robots, OG por página.
  - Medición del clic de compra y de WhatsApp.
- No entra (backlog):
  - Etapa 2: carrito y checkout propio con Mercado Pago, transferencia con descuento, cálculo de envío, botón de
    arrepentimiento propio, CMS para Soledad, guardado de pedidos fuera de GitHub, página "Nosotros".
  - Etapa 3: guías/ingredientes (informacional), Google Business Profile, Merchant Center (fichas gratuitas),
    cambio de links en Instagram, apagar Tiendanube.
- Repo · rama · hosting: `FedericoSecchi/Nude-Beauty-Web` · `kosmos/nude-tienda` · Netlify (sitio `nude-beauty-web`,
  dominio primario nudecosmetica.com). Next.js con `output: 'export'`; Netlify publica `out/` y sigue sirviendo
  `netlify/functions/` (no se tocan en esta etapa).

## 3. Diagnóstico express
| Área | Estado | Hallazgo principal | Impacto |
|---|---|---|---|
| Técnico | ❌ | HTTPS del dominio caído (SSL). Productos renderizados solo con JS desde `/products/index.json`. Redirect `/* → /index.html 200` convierte todo 404 en la home | alto |
| SEO on-page | ❌ | Una sola URL. H1 = "nude". 7 clics en 6 meses, todos de marca. og:image y logo apuntaban a archivos inexistentes | alto |
| Copy | ⚠️ | Web en tuteo ("Descubre"); la marca habla en voseo. Fichas de TN: párrafos largos y claims terapéuticos | medio |
| UX / conversión | ❌ | Mostraba productos de prueba en € con foto de un barco (sacado en el hotfix, PR #1) | alto |
| Local / externo | ⚠️ | Sin reseñas relevadas; GBP sin confirmar; Mercado Libre domina búsquedas genéricas | medio |

## 4. Pasos que va a ejecutar Claude Code
1. Preparar rama desde `main` actualizada (si el PR #1 del hotfix ya está mergeado, partir de ahí), leer `seo/`,
   build de referencia del sitio actual (no hay build: es estático; anotarlo).
2. Base del sitio:
   - Mover el sitio viejo a `legacy/` (index.html, app.js, styles.css, products.json, products/, admin-ui/,
     portfolio/, case-studies/, templates/, success.html, n8n.json). No se borra; queda fuera de `out/`.
     `admin/` (Decap) y `netlify/functions/` se quedan donde están; `admin/` se sirve copiándolo a `public/admin/`
     sin cambios.
   - Next.js App Router + TypeScript estricto + Tailwind; tokens desde `legacy/styles.css`.
   - `netlify.toml`: `command = "npm run build"`, `publish = "out"`, `functions = "netlify/functions"`;
     borrar el redirect `/* → /index.html` y los de sitemap/robots; mantener `/#invite_token=*`.
   - `lib/site.ts` con los "Datos del negocio" de `00-contexto.md`; `TRANSFER_DISCOUNT = 0.20` marcado `[CONFIRMAR]`.
   - Contenido de productos en `content/productos/<slug>.json` (un archivo por producto, pensado para que un CMS
     basado en git lo edite en la etapa 2). Campos mínimos: slug, nombre, categoria, precio (número, ARS),
     tiendanubeUrl, imagenes[], tamano, activos[], ingredientes[], modoDeUso, paraQuien, beneficios[], faq[],
     relacionados[], seo {title, description}, h1, disponible.
   - Layout con JSON-LD Organization, header (Productos · Cambios y devoluciones · WhatsApp), footer legal,
     `sitemap.ts`, `robots.ts`, 404 real.
3. Por cada página, en el orden de §5: competencia → encabezados → bloques → texto SEO → capa humana y
   conversión → FAQ → metadata → implementación → QA → commit.
4. Enlaces internos (rutina y kits, §5 de `02-arquitectura.md`), auditoría técnica final.
5. PR con resumen, QA por página, decisiones y pendientes del cliente.

## 5. Páginas
| Orden | URL | Acción | Keyword principal | Vol. | Persona | Schema | Veredicto SERP |
|---|---|---|---|---|---|---|---|
| 1 | / | reescribir | cosmética clean | s/d | 1 | Organization (layout) + ItemList de destacados | long-tail + marca |
| 2 | /productos/ | nueva | productos de cosmética natural | s/d | 1, 2 | CollectionPage + ItemList + Breadcrumb | long-tail |
| 3 | /productos/serum-multi-active/ | nueva | serum con niacinamida y vitamina c | s/d | 1 | Product + Breadcrumb | long-tail |
| 4 | /productos/serum-transformacion/ | nueva | serum de bakuchiol y retinol | s/d | 1 | Product + Breadcrumb | atacar ya |
| 5 | /productos/contorno-de-ojos-gleaming-eyes/ | nueva | contorno de ojos para ojeras y bolsas | s/d | 1 | Product | long-tail |
| 6 | /productos/crema-facial-porcelain/ | nueva | crema facial natural hidratante | s/d | 1 | Product | long-tail |
| 7 | /productos/agua-micelar-bifasica/ | nueva | agua micelar bifásica natural | s/d | 1 | Product | long-tail |
| 8 | /productos/crema-corporal-velvet/ | nueva | crema corporal reafirmante natural | s/d | 3 | Product | long-tail |
| 9 | /productos/oleo-corporal-autobronceante/ | nueva | aceite autobronceante natural | s/d | 3 | Product | atacar ya (estacional) |
| 10 | /productos/creamy-gloss-blush-2-en-1/ | nueva | gloss y rubor natural 2 en 1 | s/d | 1 | Product | long-tail |
| 11 | /productos/kit-facial-experiencia-completa/ | nueva | kit de skincare completo | s/d | 1, 2 | Product | long-tail |
| 12 | /productos/kit-facial-new-skin/ | nueva | kit de rutina facial básica | s/d | 1 | Product | long-tail |
| 13 | /productos/nude-bag/ | nueva | set de regalo de skincare | s/d | 2 | Product | estacional |
| 14 | /productos/pads-desmaquillantes/ | nueva | pads desmaquillantes reutilizables | s/d | 1 | Product | ficha corta |
| 15 | /productos/toalla-microfibra/ | nueva | toalla de microfibra para la cara | s/d | 1 | Product | ficha corta |
| 16 | /productos/vincha-con-velcro/ | nueva | vincha para skincare | s/d | 1 | Product | ficha corta |
| — | /cambios-y-devoluciones/ | nueva | — (legal, sin keyword) | — | — | Breadcrumb | — |

"Ficha corta": mismo componente, Fase 2 abreviada (sin análisis de competencia profundo; 120–200 palabras).
Los clusters de cada página están en `seo/paginas/<slug>/keywords.md`. Hechos de cada producto: solo de
`seo/catalogo-tiendanube.md`.

### Estructura común de una ficha de producto (bloques en orden)
1. Galería + H1 (nombre del producto + qué es, ej. "Serum Multi Active: sérum con niacinamida 5% y vitamina C")
   + precio de lista + línea "$X pagando con transferencia (20% off) · 3 cuotas sin interés · envíos a todo el país"
   + CTA principal + microcopy + link secundario a WhatsApp. Todo esto visible sin scroll en 360×740.
2. Para quién es / qué notás (beneficios en lenguaje de apariencia, sin claims terapéuticos; ver `00-contexto.md`).
3. Activos principales (3–5, con qué hace cada uno en una línea).
4. Cómo se usa + en qué paso de la rutina va (con links al paso anterior y siguiente).
5. Ingredientes completos (tal cual su ficha) + tamaño.
6. FAQ (3–5 preguntas reales o de la SERP; ej. piel sensible, día/noche, con qué combinarlo).
7. Aviso de prueba de parche (texto de ella, reescrito corto).
8. Relacionados: kit que lo incluye + producto siguiente de la rutina.

### CTA y WhatsApp (todas las fichas)
- CTA principal: "Comprar en la tienda" · microcopy: "Pagás en nuestra tienda de Tiendanube, con envío a todo el país"
  · destino: `tiendanubeUrl` del producto.
- Secundario (link de texto, no botón): "¿Dudas? Escribinos por WhatsApp" · prellenado:
  "Hola! Tengo una consulta sobre el [nombre del producto] 😊"
- Home y /productos/: CTA principal "Ver productos" → `/productos/`.
- Medición: eventos `click_comprar` (con `item_id` = slug) y `click_whatsapp` en GA4.
  ID de GA4: [CONFIRMAR]; si falta, dejar el componente listo con la variable de entorno vacía.

### JSON-LD de producto
`Product` con name, description, image, sku (= slug), brand `{ "@type": "Brand", "name": "NUDE Cosmética Clean" }`,
`offers`: `Offer` con price (lista), priceCurrency `ARS`, availability `InStock` si `disponible`, url de la ficha
propia, `seller` → la organización, `hasMerchantReturnPolicy` con los datos de su política (10 días,
`applicableCountry: AR`, devolución por correo, sin productos abiertos). `shippingDetails` solo cuando los costos
estén confirmados. Nada de `aggregateRating` ni `review` (no hay reseñas verificables). El schema coincide con el
texto visible.

## 6. Decisiones tomadas
| Decisión | Elección | Quién / cuándo |
|---|---|---|
| Plataforma | Terminar sitio propio (no apuntar el dominio a Tiendanube) | Fede, 25-10-2026, contra la recomendación del intake |
| Dominio caído | Limpiar productos de prueba (PR #1) y después renovar SSL | Fede, 25-10-2026 |
| Alcance etapa 1 | Fichas de producto SEO + home + catálogo | Fede, 25-10-2026 |
| Compra en etapa 1 | El CTA lleva a la ficha de Tiendanube | Supuesto del intake (permite publicar sin checkout propio) |
| Stack | Next.js `output: 'export'` en Netlify; funciones de MP intactas | Supuesto del intake |
| Categorías | Filtro en `/productos/`, sin URLs por categoría | Supuesto del intake (páginas finas) |
| CMS | Etapa 2. Netlify Identity quedó en mantenimiento desde feb-2025 (seguridad solamente); evaluar Decap con otro login o Sveltia CMS antes de invertir | Intake |

## 7. Restricciones
- URLs que NO se cambian: `/` (única URL publicada). `/admin/` sigue respondiendo.
- URLs que cambian (con redirección): ninguna publicada. Las de Tiendanube están en otro dominio y no se tocan.
- Contenido existente que se conserva: textos de "Nosotros" y "Por qué cosmética clean" de la home actual como
  material de partida (reescritos a voseo), aviso de prueba de parche, política de devoluciones.
- Prácticas descartadas: estrellas propias en schema; claims terapéuticos (várices, flebitis, psoriasis,
  protección UV, "trata el acné"); páginas por ciudad; texto con keywords de relleno.

## 8. Supuestos (defaults usados donde no hubo respuesta)
- Precios de Tiendanube al 25-10-2026; se re-chequean el día de publicar.
- Imágenes: las del CDN de Tiendanube (lista en `catalogo-tiendanube.md`). Si el entorno de Claude Code no puede
  descargarlas, usar las URLs remotas con `images.unoptimized` y listar "descargar y alojar" como pendiente.
- Descuento por transferencia del 20% y 3 cuotas: tal cual el banner de Tiendanube.
- Voseo rioplatense en todo el sitio.

## 9. Pendientes del cliente → `[CONFIRMAR]`
| Dato | Dónde impacta | Estado |
|---|---|---|
| Tamaño de cada producto (ml/g) | Fichas, schema | pendiente |
| Ingredientes del óleo; lista final del Serum Transformación | 2 fichas | pendiente |
| Respaldo de "apto para niños" y claims sobre acné; registro ANMAT | Gloss, sérums | pendiente |
| El óleo no tiene protección solar (confirmar redacción) | Óleo | pendiente |
| Costos, empresas y plazos de envío; retiro en Mendiolaza | FAQ, schema shipping | pendiente |
| Razón social y condición de IVA | Pie legal | pendiente |
| Colores del Creamy Gloss | Ficha gloss | pendiente |
| ID de GA4 de Nude | Medición | pendiente |
| Si existe ficha de Google Business | Pie, sameAs | pendiente |
| Fotos propias en buena resolución | Todas las fichas | pendiente |
| Si mayoristas sigue vigente | Backlog | pendiente |

## 10. Criterios de terminado
- QA técnico ✅ por página: build OK (TS estricto) · HTML estático con el texto · 1 H1 ·
  `kw_coverage.py` ✅ · `copy_lint.py` ✅ · JSON-LD válido · CTA visible en 360×740 ·
  tokens iguales en home e internas
- Ningún producto de prueba, precio en € ni imagen ajena en `out/`.
- `out/` sirve `/admin/`, `sitemap.xml` (17 URLs), `robots.txt` y un 404 real (no la home).
- PR abierto con el resumen; nada mergeado
- Los `[CONFIRMAR]` no bloquean el PR: bloquean el merge (van listados con el mensaje al cliente)

## 11. Después del merge (medición)
- Search Console: reenviar sitemap · Bing Webmaster (importar desde GSC) · eventos `click_comprar` y
  `click_whatsapp` en GA4 · link de Instagram a nudecosmetica.com · revisión a las 4/8/12 semanas
- Etapa 2 arranca cuando haya: credenciales de producción de Mercado Pago, costos de envío y decisión de CMS.
