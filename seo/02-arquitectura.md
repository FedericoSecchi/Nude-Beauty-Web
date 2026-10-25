# Arquitectura y mapa de keywords — NUDE Cosmética Clean

## Árbol de URLs (etapa 1)
```
/                                   home
├── productos/                      catálogo (14 productos, filtro por categoría en la misma página)
│   ├── serum-multi-active/
│   ├── serum-transformacion/
│   ├── contorno-de-ojos-gleaming-eyes/
│   ├── crema-facial-porcelain/
│   ├── agua-micelar-bifasica/
│   ├── crema-corporal-velvet/
│   ├── oleo-corporal-autobronceante/
│   ├── creamy-gloss-blush-2-en-1/
│   ├── kit-facial-experiencia-completa/
│   ├── kit-facial-new-skin/
│   ├── nude-bag/
│   ├── pads-desmaquillantes/
│   ├── toalla-microfibra/
│   └── vincha-con-velcro/
├── cambios-y-devoluciones/         legal (texto de su política actual)
└── (etapa 2) nosotros/, carrito, checkout, botón de arrepentimiento propio
```
Sin páginas de categoría: con 2–6 productos por categoría serían páginas finas; el filtro vive en `/productos/`.

## Mapa URL → cluster
| URL | Keyword principal | Vol./mes | Cluster (n) | Persona | Veredicto SERP | Prioridad |
|---|---|---|---|---|---|---|
| / | cosmética clean | s/d | 8 | 1 | long-tail + marca | 1 |
| /productos/ | productos de cosmética natural | s/d | 5 | 1, 2 | long-tail | 2 |
| /productos/serum-multi-active/ | serum con niacinamida y vitamina c | s/d | 7 | 1 | long-tail (ML domina "serum niacinamida") | 3 |
| /productos/serum-transformacion/ | serum de bakuchiol y retinol | s/d | 6 | 1 | atacar ya (poca oferta local) | 4 |
| /productos/contorno-de-ojos-gleaming-eyes/ | contorno de ojos para ojeras y bolsas | s/d | 6 | 1 | long-tail | 5 |
| /productos/crema-facial-porcelain/ | crema facial natural hidratante | s/d | 5 | 1 | long-tail | 6 |
| /productos/agua-micelar-bifasica/ | agua micelar bifásica natural | s/d | 5 | 1 | long-tail | 7 |
| /productos/crema-corporal-velvet/ | crema corporal reafirmante natural | s/d | 5 | 3 | long-tail | 8 |
| /productos/oleo-corporal-autobronceante/ | aceite autobronceante natural | s/d | 5 | 3 | atacar ya (estacional: nov–feb) | 9 |
| /productos/creamy-gloss-blush-2-en-1/ | gloss y rubor natural 2 en 1 | s/d | 5 | 1 | long-tail | 10 |
| /productos/kit-facial-experiencia-completa/ | kit de skincare completo | s/d | 4 | 1, 2 | long-tail | 11 |
| /productos/kit-facial-new-skin/ | kit de rutina facial básica | s/d | 4 | 1 | long-tail | 12 |
| /productos/nude-bag/ | set de regalo de skincare | s/d | 4 | 2 | estacional (regalos) | 13 |
| /productos/pads-desmaquillantes/ | pads desmaquillantes reutilizables | s/d | 3 | 1 | ML domina; ficha corta | 14 |
| /productos/toalla-microfibra/ | toalla de microfibra para la cara | s/d | 3 | 1 | ML domina; ficha corta | 15 |
| /productos/vincha-con-velcro/ | vincha para skincare | s/d | 3 | 1 | ML domina; ficha corta | 16 |

s/d = sin datos de volumen (no hay export de Keyword Planner). La SERP del intake no está geolocalizada en
Argentina: la Fase 2 la revalida por página.

## Canibalización revisada
- Los tres kits compiten por "kit skincare". Se separan por intención: completo (5 productos, rutina AM/PM con
  tratamiento de noche) · básico (4, para empezar) · regalo (con accesorios). Cada H1 lo dice.
- Home vs /productos/: la home apunta a la marca + "cosmética clean"; /productos/ a la compra del catálogo.
- Serum Multi Active vs Serum Transformación: día/noche y activo (niacinamida vs bakuchiol). No mezclar
  "antiage" en el H1 del Multi Active.

## Clusters descartados o al backlog (y por qué)
- "qué es la cosmética clean", "niacinamida para qué sirve", "bakuchiol vs retinol": informacionales → backlog de
  guías (etapa 3). Mientras, una pregunta corta en la FAQ de la ficha correspondiente.
- "cosmética natural córdoba": se menciona en home y pie (origen Mendiolaza), sin página propia (no hay local a la calle).
- Keywords con "acné", "estrías y celulitis" como tratamiento: solo si Soledad confirma respaldo (ver riesgo de claims).

## Páginas por zona
Ninguna: venta online a todo el país, sin locales.

## Enlazado interno previsto
- Cada ficha de cosmética facial enlaza al paso anterior y siguiente de la rutina (micelar → contorno → sérum → crema).
- Cada producto incluido en un kit enlaza al kit; cada kit enlaza a sus productos.
- Accesorios ↔ agua micelar (pads) y Nude Bag.
- Home → /productos/ y a los 3 productos prioritarios.
