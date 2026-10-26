# Estado SEO — NUDE Cosmética Clean

Sitio: https://nudecosmetica.com · Repo: https://github.com/FedericoSecchi/nude-beauty-web · Inicio: 2026-10-25
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
| Google Business Profile (`gbp.md`) | ⬜ | | |
| 4 · Medición configurada (`medicion.md`) | ⬜ | | |

Modo: multipágina (sitio nuevo, tipo D)

## Páginas
| Slug | Prioridad | Brief | Contenido | Implementada | QA | Hechos OK cliente | Publicada |
|---|---|---|---|---|---|---|---|
| home | 1 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| productos | 2 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| serum-multi-active | 3 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| serum-transformacion | 4 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| contorno-de-ojos-gleaming-eyes | 5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| crema-facial-porcelain | 6 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| agua-micelar-bifasica | 7 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| crema-corporal-velvet | 8 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| oleo-corporal-autobronceante | 9 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| creamy-gloss-blush-2-en-1 | 10 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| kit-facial-experiencia-completa | 11 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| kit-facial-new-skin | 12 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| nude-bag | 13 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| pads-desmaquillantes | 14 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| toalla-microfibra | 15 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| vincha-con-velcro | 16 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| cambios-y-devoluciones | 17 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| terminos-y-condiciones | 18 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| privacidad | 19 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| arrepentimiento | 20 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Etapas de la tienda (PLAN §4)
| Etapa | Estado |
|---|---|
| E0 Preparación | ⬜ |
| E1 Base | ⬜ |
| E2 Catálogo y fichas | ⬜ |
| E3 Carrito, checkout, envíos, pedidos | ⬜ |
| E4 Panel Decap | ⬜ |
| E5 Legal | ⬜ |
| E6 Cierre y PR | ⬜ |

Estados: ⬜ pendiente · 🟡 en curso · ✅ aprobado/hecho · ⛔ bloqueado

## Pendientes del cliente (bloquean publicación)
- [ ] Ver PLAN §9

## Decisiones tomadas sin consultar (y resúmenes de checkpoint)
- 2026-10-25 · intake · supuestos del PLAN §8 y decisiones marcadas "supuesto del intake" en §6.
<!-- fecha · paso · qué se decidió · por qué. Van al PR para que Fede las revise. -->

## Cambios de URL (redirecciones)
<!-- fecha · URL vieja → URL nueva · cómo se resolvió (301 / meta refresh + canonical) -->

## Decisiones de riesgo asumidas por el cliente
- 2026-10-25 · Fede elige terminar el sitio propio en lugar de apuntar el dominio a Tiendanube.
- 2026-10-26 · Fede confirma: la web propia reemplaza a Tiendanube (checkout, envíos, panel). Kosmos queda a cargo de mantenerlos.
- 2026-10-26 · Fede acepta Decap + Netlify Identity pese a que Identity solo recibe parches de seguridad.
<!-- ej. keyword en nombre de GBP pese a la política. Fecha y quién decidió. -->
