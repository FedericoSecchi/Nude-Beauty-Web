# Estado SEO — NUDE Cosmética Clean

Sitio: https://nudecosmetica.com · Repo: https://github.com/FedericoSecchi/Nude-Beauty-Web · Inicio: 2026-10-25
Fuente de verdad del avance. Claude Code (modo ejecución de kosmos-web) retoma desde el primer ⬜.

## Fases del proyecto
| Fase | Estado | Fecha | Notas |
|---|---|---|---|
| 0 · Contexto (`00-contexto.md`) | ✅ | 2026-10-25 | |
| 1 · Personas (`01-personas.md`) | ✅ | 2026-10-25 | |
| 1 · Hipótesis de arquitectura | ✅ | 2026-10-25 | |
| 1 · Keywords con datos (`keywords/`) | 🟡 | 2026-10-25 | sin Keyword Planner: volumen s/d, hipótesis por página |
| 1 · Mapa final y realismo (`02-arquitectura.md`) | ✅ | 2026-10-25 | |
| Plan aprobado en el intake (`PLAN.md`) | ✅ | 2026-10-26 | v2: tienda propia, Tiendanube se apaga |
| Google Business Profile (`gbp.md`) | ⬜ | | depende de que Soledad confirme si tiene ficha |
| 4 · Medición configurada (`medicion.md`) | 🟡 | 2026-10-26 | GA4 opcional por `NEXT_PUBLIC_GA_ID`; eventos add_to_cart / begin_checkout / purchase. Falta ID real. |

Modo: multipágina (sitio nuevo, tipo D)

## Páginas
| Slug | Prioridad | Brief | Contenido | Implementada | QA | Hechos OK cliente | Publicada |
|---|---|---|---|---|---|---|---|
| home | 1 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| productos | 2 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| serum-multi-active | 3 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| serum-transformacion | 4 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| contorno-de-ojos-gleaming-eyes | 5 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| crema-facial-porcelain | 6 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| agua-micelar-bifasica | 7 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| crema-corporal-velvet | 8 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| oleo-corporal-autobronceante | 9 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| creamy-gloss-blush-2-en-1 | 10 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| kit-facial-experiencia-completa | 11 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| kit-facial-new-skin | 12 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| nude-bag | 13 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| pads-desmaquillantes | 14 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| toalla-microfibra | 15 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| vincha-con-velcro | 16 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| cambios-y-devoluciones | 17 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| terminos-y-condiciones | 18 | ✅ | ✅ (borrador) | ✅ | ⚠️ [REVISAR LEGAL] | ⬜ | ⬜ |
| privacidad | 19 | ✅ | ✅ (borrador) | ✅ | ⚠️ [REVISAR LEGAL] | ⬜ | ⬜ |
| arrepentimiento | 20 | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ |

## Etapas de la tienda (PLAN §4)
| Etapa | Estado |
|---|---|
| E0 Preparación | ✅ |
| E1 Base | ✅ |
| E2 Catálogo y fichas | ✅ |
| E3 Carrito, checkout, envíos, pedidos | ✅ |
| E4 Panel Decap | ✅ |
| E5 Legal | ✅ |
| E6 Cierre y PR | ✅ |

Estados: ⬜ pendiente · 🟡 en curso · ✅ aprobado/hecho · ⛔ bloqueado

## Pendientes del cliente (bloquean publicación)
Ver `docs/PROGRESS.md` §[CONFIRMAR] pendientes: tamaños, ingredientes del Óleo y lista final del Serum Transformación, variantes de color del gloss, alérgeno de trigo en Porcelain, razón social y domicilio para el pie legal, alias/CBU/titular, costos y plazos reales de envío, GBP, fotos propias.

## Decisiones tomadas sin consultar (y resúmenes de checkpoint)
- 2026-10-25 · intake · supuestos del PLAN §8 y decisiones marcadas "supuesto del intake" en §6.
- 2026-10-26 · E0 · Next.js 15.5.28 (último parche de 15.x) para evitar CVE-2025-66478.
- 2026-10-26 · E1 · Zonas de envío en modo "coordinar" hasta que Soledad confirme costos/plazos.
- 2026-10-26 · E1 · Descuento 20% transferencia **no acumulable** con 5% por 2+ unidades (reemplaza).
- 2026-10-26 · E2 · `scripts/snapshot-content.mjs` genera `seo/paginas/<slug>/contenido.md` desde el JSON del producto. Una fuente de verdad, no duplicada.
- 2026-10-26 · E2 · "Apto para niños" (gloss) → en condicional en la FAQ, con `[CONFIRMAR]`.
- 2026-10-26 · E3 · GA4 opcional detrás de `NEXT_PUBLIC_GA_ID`; sin ID, no se cargan scripts.
- 2026-10-26 · E3 · Playwright: Chromium Pixel 5 + Desktop Chrome (sin webkit).
- 2026-10-26 · E3 · `CHECKOUT_MODE=tiendanube` como plan B: redirige al carrito de la tienda vieja cuando faltan credenciales de MP.
- 2026-10-26 · E4 · Netlify Identity sigue en mantenimiento (feb-2025) — riesgo aceptado por Fede. Si el panel falla, no se improvisa un login alternativo: se avisa.

## Cambios de URL (redirecciones)
- No se cambia ninguna URL publicada: `nudecosmetica.com/` era la única URL y se mantiene como home.
- Las URLs de productos nuevas (`/productos/<slug>/`) no reemplazan a URLs anteriores propias: las URLs de Tiendanube están en otro dominio (`nudecosmeticaclean.mitiendanube.com`), no requieren redirección desde este sitio.

## Decisiones de riesgo asumidas por el cliente
- 2026-10-25 · Fede elige terminar el sitio propio en lugar de apuntar el dominio a Tiendanube.
- 2026-10-26 · Fede confirma: la web propia reemplaza a Tiendanube (checkout, envíos, panel). Kosmos queda a cargo de mantenerlos.
- 2026-10-26 · Fede acepta Decap + Netlify Identity pese a que Identity solo recibe parches de seguridad.
