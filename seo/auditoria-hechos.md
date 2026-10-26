# Auditoría de hechos publicados · nudecosmetica.com

> Estado: **después** de aplicar la auditoría (rama `kosmos/nude-tienda`, 2026-10-26).
> Regla: cada afirmación de hecho que sale publicada (composición, uso, cuidado, duración, origen, ventas,
> cantidades, tamaños, plazos, efectos, materiales, para quién es) tiene que tener fuente en **uno de estos dos
> archivos**, y en ningún otro:
>
> - **CT** = `seo/catalogo-tiendanube.md` (se cita CT:línea)
> - **CX** = `seo/00-contexto.md` (se cita CX:línea)
>
> Si un dato no tiene fuente, se borra, se reescribe solo con hechos que sí la tienen o queda como `[CONFIRMAR: …]`.
> Lo marcado con `[CONFIRMAR` no se publica en producción.
> **UI** = describe cómo funciona el propio sitio (se verifica en el código, no es un hecho de producto).
> **LEGAL** = referencia a una norma; la valida quien se ocupe de legales.
> El lenguaje de apariencia o sensación vale solo si parafrasea algo que tiene fuente. No hay claims terapéuticos
> (várices, flebitis, psoriasis, protección UV, acné, «apto para niños»).

## Decisiones transversales

| # | Tema | Decisión aplicada |
|---|---|---|
| T1 | Razón social | El pie y los Términos muestran «NUDE Cosmética Clean · CUIT 23265636934» (CT:10). La razón social y la condición frente al IVA siguen pendientes solo en la documentación (CX:16); se quitaron de `lib/site.ts`, así que no quedan en el HTML ni en el JS. |
| T2 | Nombre de Soledad | Se sacó de todo el texto público: meta y JSON-LD (`site.description`), home, FAQs, `/pedido/`. CX:10: falta confirmar si quiere aparecer con su nombre. Se usa «la marca», «NUDE» o «te escribimos». |
| T3 | Retiro en Mendiolaza | Sin confirmar (CX:12, CX:97). `retiro.habilitado: false` en `content/ajustes/envios.json`. Se quitaron las menciones: ficha («Elegís la entrega en el paso siguiente.»), Términos y meta del carrito. Se dejó de usar «taller», que no tiene fuente. |
| T4 | Reserva de 48 h / «se libera el stock» | Ninguna fuente lo dice, y el sitio no maneja stock. Se quitó de Términos, carrito y `/pedido/`. `horasReservaTransferencia` sigue en los datos, pero no se muestra. |
| T5 | Alias, CBU y titular | Son datos que carga Soledad desde el panel. Mientras falten, `/pedido/` muestra `[CONFIRMAR con Soledad]` y la puerta de publicación bloquea producción. |
| T6 | «Más conveniente que comprar por separado» | Se borró de los 3 kits. Era falso: comprando los productos sueltos aplica el 5% por 2 o más unidades (CT:7) y el total queda por debajo del precio del kit. |
| T7 | 3 cuotas sin interés | Se mantiene (CT:6, CX:26). Antes de producción hay que verificar que Mercado Pago esté configurado así. |
| T8 | `[REVISAR LEGAL]` | Se mantiene en Términos y Privacidad hasta la revisión legal. |
| T9-T10 | JSON-LD (`returnFees`, `logo`) | Fuera de esta tarea: los corrige el coordinador en `lib/jsonld.ts`. |
| T11 | `**Importante**` con asteriscos visibles en el Óleo | Corregido (texto plano). |
| T12 | Prueba de parche «en la parte interna del brazo» | Reescrito con CT:109 + CX:66: «antes de usarlo por primera vez, probá una pequeña cantidad: incluso los ingredientes naturales pueden dar reacción. Es solo un pequeño paso para asegurarte de que tu piel esté feliz.» |
| — | Creamy Gloss: ángulo niñas / niños / familia | Eliminado entero: texto, FAQ, keywords (pasado a «Descartadas: claim sin respaldo, ver 00-contexto §Riesgo de claims») y `contenido.md`. |
| — | Keywords forzadas | Se reescribieron con frases naturales. Las variantes que no entraban de forma natural se pasaron a «## Descartadas» en `seo/paginas/<slug>/keywords.md`, con el motivo. |
| — | Títulos | Se sacó « \| NUDE» de cada `seo.title`; la marca la agrega una sola vez la plantilla `%s · NUDE Cosmética Clean`. |

---

## Home (`app/page.tsx`, `lib/site.ts`)

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 «Cosmética clean hecha a mano en Córdoba» | CX:11, CX:12 | Era el kicker; pasó a H1 sin cambiar el diseño |
| «Tu piel no necesita veinte productos: necesita los correctos, en orden.» | CX:79 (frase de tono) | Era el H1; ahora es un párrafo con el mismo estilo |
| «NUDE es cosmética clean de Mendiolaza, Córdoba: cosmética natural hecha a mano, en pequeños lotes.» | CX:11, CX:12, CX:35 | Reescrita (fuera: «nacida en», «Soledad formula y envasa») |
| «Cada activo va con su nombre: niacinamida al 5%, bakuchiol, ácido hialurónico, péptidos.» | CX:36, CX:41 | Reescrita (fuera: «y porcentaje») |
| «Sin parabenos.» | CX:38 | Reescrita (fuera: «ni fragancias sintéticas») |
| «20% off pagando con transferencia · 3 cuotas sin interés · envíos a todo el país.» | CT:6-7 | — |
| «Kit con los básicos» | CT:90 | Reescrita (era «Kit para empezar») |
| H2 «Qué quiere decir cosmética clean» | — | Keyword forzada eliminada («argentina») |
| «Fórmulas sin parabenos y con activos nombrados… dice qué tiene cada producto y, cuando corresponde, en qué cantidad.» | CX:36, CX:38 | Reescrita (fuera: «conservantes agresivos», «fragancias sintéticas») |
| «Y una rutina armada en orden: agua micelar → contorno de ojos → sérum → crema → protector solar.» | CX:37 | Reescrita (fuera: «skincare natural argentina») |
| «Todo se hace a mano, en pequeños lotes, en Mendiolaza (Córdoba), y se envía a todo el país.» | CX:11-13, CX:35 | Reemplaza la historia inventada («amigas de Soledad», «clientas de todo el país», «cosmética natural/clean córdoba») |
| H2 «Por dónde empezar» | — | Reemplaza «Lo que más eligen las clientas», que no tenía datos de ventas (CX:43, CX:46) |
| Meta / JSON-LD: «Cosmética natural y clean hecha a mano en pequeños lotes en Mendiolaza (Córdoba)… 20% off por transferencia, 3 cuotas sin interés con tarjeta y envíos a todo el país.» | CX:11-13, CX:35-36, CT:6-7 | Reescrita (fuera: «por Soledad») |

## Catálogo (`app/productos/page.tsx`)

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 «Productos de cosmética natural y clean, hechos a mano» | CX:11 | — |
| «Todo el skincare natural de NUDE, en catorce productos: la rutina facial en orden —agua micelar, contorno, sérum, crema—, cuidado corporal, kits y accesorios.» | CX:22, CX:37, CT:15-19 | Reescrita (era «catorce fórmulas»; se sacaron keywords forzadas) |
| «Elegís, pagás con transferencia o Mercado Pago y te lo enviamos a cualquier punto del país.» | CT:7 + UI | Reescrita (fuera: «Comprar cosmética natural online tiene que ser fácil») |
| «20% off pagando con transferencia · 3 cuotas sin interés con tarjeta · envíos a todo el país.» | CT:6-7 | Se sacó la keyword «cosmética natural envíos…» |
| «Qué es skincare clean para NUDE: fórmulas sin parabenos y con activos nombrados» | CX:36, CX:38 | Reescrita |
| «Agua Micelar Bifásica · limpia y desmaquilla.» | CT:57 | — |
| «Contorno de ojos Gleaming Eyes · ojeras y bolsas.» | CT:41 | — |
| «Multi Active de día y de noche · Transformación solo de noche.» | CT:27, CT:36 | Corregida (decía «Multi Active de día») |
| «Crema Facial Porcelain · humecta y repara.» | CT:48 | Reescrita (fuera: «sella») |
| «Durante el día, siempre protector solar (no está en NUDE…)» | CT:27/36/52, CT:15-19 | — |

## Texto fijo de la ficha (`app/productos/[slug]/page.tsx`, igual en las 14)

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| «$X con transferencia (20% off) · 3 cuotas sin interés con tarjeta de crédito · envíos a todo el país.» | CT:6-7 | — (T7) |
| «Elegís la entrega en el paso siguiente.» | UI | Reescrita (fuera: «o retiro», T3) |
| «Prueba de parche: antes de usarlo por primera vez, probá una pequeña cantidad: incluso los ingredientes naturales pueden dar reacción. Es solo un pequeño paso para asegurarte de que tu piel esté feliz.» | CT:109, CX:66 | Reescrita (fuera: «parte interna del brazo») |

---

## Fichas

### Serum Multi Active

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: niacinamida y vitamina C, apto para piel sensible | CT:25-26 | Reescrita: se sacó la repetición «serum… serum» y « \| NUDE» |
| Serum 5 en 1: manchas, poros, hidratación, luminosidad | CT:25 | — |
| Niacinamida 5%, vit. C estable en liposomas, AH alto/bajo peso, Matrixil-Syn Coll, pro-vit. B5 | CT:25-26 | — |
| «La vitamina C es estable y no irritante, y el serum está indicado para piel sensible.» | CT:25 | Reescrita (fuera: «formulado para que no irrite») |
| Textura ligera, se absorbe rápido; aroma azahar y palmarosa; día y noche | CT:25, CT:27 | — |
| Activo niacinamida: empareja el tono, poros, cambios de a poco | CT:25 | — |
| Activo vit. C: antioxidante, luminosidad, sin irritar, piel sensible | CT:25 | — |
| Activo AH: «Aporta hidratación: combina… alto y bajo peso molecular.» | CT:25 | Reescrita (fuera: «capas más profundas») |
| Activo Matrixil-Syn Coll (líneas finas, elasticidad) | — | **Eliminada**: no tiene fuente |
| Activo centella/aloe/hamamelis: «Acompañan el efecto del serum sobre rojeces e hinchazón.» | CT:25 | Reescrita |
| Ingredientes | CT:26 | — |
| Modo de uso (3 gotas, frente y mejillas, crema + protector, cuello y escote, día y noche) | CT:27 | — |
| FAQ piel sensible: indicado; vit. C estable y no irritante; prueba de parche | CT:25, CT:109 | Reescrita (fuera: «la forma menos irritante», «la dosis que suele tolerarse bien») |
| FAQ manchas y poros: 3 a 4 semanas «según la marca» | CT:25 | Reescrita (fuera: el nombre de Soledad) |
| FAQ 5 en 1 | CT:25 | Reescrita (fuera: «los cinco frentes») |
| FAQ día y noche: después crema y, de día, protector | CT:27 | Reescrita (fuera: «de noche va solo») |
| FAQ paso de la rutina | CX:37, CT:27 | — |

### Serum Transformación

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: serum de noche con bakuchiol y retinoides | CT:33-34 | Reescrita (fuera: «retinol natural», «retinol») |
| Bakuchiol, liposomas de retinoides (retinyl acetate), AH 1%, Matrixil-Syn Coll | CT:33-34 | Reescrita (fuera: «la alternativa natural al retinol») |
| Para arrugas, líneas de expresión, manchas, luminosidad y barrera; aroma azahar y palmarosa | CT:33 | Reescrita (fuera: «textura») |
| Activos: bakuchiol / retinoides (arrugas, manchas, luminosidad), AH 1% (hidrata, efecto relleno), resveratrol (antioxidante) | CT:33-34 | Reescritas (fuera: «mejor tolerancia», «renuevan la piel», «en profundidad») |
| Activo Matrixil-Syn Coll (elasticidad) | — | **Eliminada** |
| Ingredientes | CT:34 | **`[CONFIRMAR: lista final — hay dos versiones en la ficha original]`** (CT:35) |
| Modo de uso: solo de noche, 3 gotas, protector al día siguiente | CT:36 | — |
| FAQ piel sensible | CT:33, CT:109 | Reescrita (reemplaza «¿alternativa natural al retinol?») |
| FAQ «¿Qué diferencia hay con un serum de retinoides común?» (dosis baja, menos irritación) | — | **Eliminada** |
| FAQ ¿de día? No; protector | CT:36, CX:61 | — |
| FAQ combinar con Multi Active: vienen juntos en el Kit Experiencia Completa | CT:86, CT:27, CT:36 | Reescrita (fuera: el esquema día/noche inventado) |
| FAQ líneas de expresión, «según lo presenta la marca» | CT:33 | Reescrita (fuera: «textura») |

### Contorno de ojos Gleaming Eyes

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: ojeras y bolsas, AH y cafeína | CT:41 | Se sacó « \| NUDE» |
| Más de cinco activos para arrugas, ojeras y bolsas; pH específico para contorno de ojos y labios | CT:41 | Reescrita |
| Regu-Age PF, AH alto/bajo, cafeína-carnitina (descongestiona), alantoína (regeneradora, calmante) | CT:41 | — |
| También para el contorno de labios (líneas finas) | CT:43 | — |
| «Textura ligera, se absorbe rápido» | — | **Eliminada**: la fuente lo dice del Multi Active, no de este producto |
| Activo AH: «Hidrata y aporta efecto relleno.» | CT:41 | Reescrita |
| Activo alantoína: «Regeneradora y calmante.» | CT:41 | Reescrita (fuera: «tersa») |
| Activo células madre/centella (líneas finas) | — | **Eliminada** |
| Beneficio «Una sola gota por aplicación» | CT:43 | Reemplaza «textura ligera» |
| FAQ «¿crema para ojeras…?» (líquida, concentrada, no grasa) | — | **Eliminada** |
| FAQ cuánto uso: una gota en las yemas de los anulares | CT:43 | Reescrita (fuera: «muy concentrado y rinde») |
| FAQ contorno de labios | CT:43 | Reescrita (fuera: la atribución causal) |
| FAQ paso de la rutina: después del agua micelar, antes del serum, día y noche | CX:37, CT:43 | — |

### Crema Facial Porcelain

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: crema facial natural hidratante y antiage | CT:48-49 | Se sacó « \| NUDE» |
| Para todo tipo de piel; células madre Green Cell, alantoína, trigo hidrolizado, liposomas de colágeno y elastina, rosa mosqueta/argán/jojoba | CT:48, CT:50 | Reordenada |
| Día y noche; textura ligera; aroma azahar, palmarosa, vainilla | CT:48, CT:52 | — |
| «Contiene trigo.» / ingredientes «Contiene trigo (proteína de trigo hidrolizada).» | CT:50-51 | Se reemplazó el marcador `[CONFIRMAR …celiaquía]` por el dato |
| Activos: Green Cell (antioxidante, tersa), trigo (firmeza, humedad), alantoína (calmante, regeneradora), colágeno/elastina (acción antiage), aceites (nutrición) | CT:41, CT:48-49 | Reescritas (fuera: «elasticidad», «sin sensación grasa») |
| FAQ todo tipo de piel | CT:48 | Reescrita (fuera: «incluida la sensible», «piel grasa: capa fina») |
| FAQ antiage: humectante, nutritiva, reparadora, antioxidante, antiage; poros; colágeno | CT:48-49 | Reescrita (fuera: «péptidos del colágeno», «colágeno de origen vegetal») |
| FAQ protector solar: no | CX:32, CT:52 | — |
| FAQ trigo: lo contiene; si tenés celiaquía, consultanos | CT:50-51 | Se sacó el marcador |
| SEO description: sin «péptidos» | CT:48-50 | Reescrita |

### Agua Micelar Bifásica

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title / 300 ml | CT:57, CT:60 | Se sacó « \| NUDE» |
| Dos fases, 5 en 1 (desmaquilla, limpia, humecta, nutre, suaviza) | CT:57 | — |
| Almendras dulces (también saca el maquillaje), rosas, aloe, caléndula, manzanilla: activos suaves que no dañan la barrera lipídica | CT:57-58 | Reescrita (fuera: «a prueba de agua») |
| Rostro, contorno de ojos y labios; todo tipo de piel; aroma azahar y vainilla | CT:57, CT:59 | — |
| Activos reescritos (sacar el maquillaje, barrera lipídica, suavizar, humectar) | CT:57 | Reescritas (fuera: «calman y refrescan», «piel sensible») |
| Modo de uso + «Es el primer paso de la rutina.» | CT:59, CX:37 | Reescrita (fuera: «día y noche») |
| FAQ ¿saca el maquillaje? / ¿ojos? / ¿piel sensible? / ¿qué pads? | CT:57, CT:59, CT:106, CT:109 | Reescritas (fuera: «a prueba de agua», «calman», «menos basura») |

### Crema corporal y de manos Velvet

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: reafirmante, cuerpo y manos | CT:64 | Se sacó « \| NUDE» |
| Karité, urea, alantoína, centella, ginkgo, rosa mosqueta, cafeína-carnitina | CT:64-65 | — |
| Piel más tersa y flexible; apariencia de estrías y celulitis; aroma azahar, palmarosa, lavanda | CT:64 | Reescrita (keywords forzadas fuera) |
| Activos: karité (tersa y flexible), urea/alantoína (humectación, barrera), ginkgo (antioxidante), cafeína (celulitis), rosa mosqueta (estrías) | CT:64 | Reescritas (fuera: «nutre», centella como «antioxidante») |
| Modo de uso: dos veces por día, después de la ducha, día y noche | CT:66 | — |
| Beneficio «Humecta cuerpo y manos» | CT:64 | Reescrita (fuera: «nutre») |
| FAQ estrías y celulitis | CT:64-65 | — |
| FAQ todo tipo de piel + prueba de parche | CT:64, CT:109 | Reescrita (fuera: «urea en baja proporción») |
| FAQ embarazo / después de depilarse / ¿mancha la ropa? | — | **Eliminadas** (consejo de salud y datos sin fuente) |
| Claims de CT:68 (venotónica, várices, flebitis, psoriasis, UV) | — | No se publican ✔ |

### Óleo Corporal Autobronceante

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: aceite autobronceante natural con urucum | CT:72 | Se sacó « \| NUDE» |
| Aceites vegetales, urucum, zanahoria (betacarotenos), micas perladas; glow perlado; potencia el bronceado natural | CT:72 | Reescrita (keywords forzadas fuera) |
| «No tiene protección solar…» | CX:32, CT:75 | Se mantiene (la redacción final la confirma Soledad) |
| Activos: urucum / zanahoria (betacarotenos) / micas (glow perlado) | CT:72 | Reescritas (fuera: «antioxidantes», «dorado») |
| Ingredientes: «Ingredientes principales: aceites vegetales, óleo de urucum, aceite de zanahoria y micas perladas. Si necesitás la lista completa, escribinos por WhatsApp.» | CT:72, CT:74 | Reemplaza el marcador `[CONFIRMAR: lista completa]`; la lista completa sigue pendiente |
| Tres usos; 15 minutos como máximo; bronceado de 15 a 20 días «según la marca»; glow por algunas horas | CT:73 | Reescrita (fuera: `**`, «antes o después») |
| Beneficios: glow perlado, potencia el bronceado, «100% natural» | CT:72 | Reescrita (fuera: «dorado al instante») |
| FAQ: color sin sol / potenciar el bronceado / brillo para una noche / ¿protege? | CT:72-73, CX:32 | Reescritas (fuera: «en cualquier piel», «uso principal», «capa fina», «más sutil», el nombre de Soledad) |
| FAQ ¿en la cara? / ¿mancha la ropa? | — | **Eliminadas** |

### Creamy Gloss & Blush Natural 2 en 1

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: gloss para labios y rubor en crema, 2 en 1 | CT:79 | Reescrita |
| Acabado luminoso, no pegajoso; sin fragancias ni alcoholes | CT:79 | — |
| Ingredientes (karité, mango, cacao, jojoba, ricino, coco, fitoescualeno, vit. E, pigmentos, micas) | CT:80 | — |
| «apto para toda la familia», «pensado para pieles sensibles» | — | **Eliminadas** (ángulo niños; CX:53-55) |
| Activos: mantecas (nutrición), jojoba/ricino (humectan, brillo, no pegajoso), pigmentos (color, acabado luminoso) | CT:78 («humectante-nutritivo»), CT:79 | Reescritas |
| Activo fitoescualeno/vit. E («cuidar los labios») | — | **Eliminada** |
| Modo de uso: «Usalo como gloss en los labios o como rubor en crema en las mejillas.» | CT:79 | Reescrita (la fuente no tiene modo de uso detallado) |
| FAQ «¿maquillaje natural para niñas?» | — | **Eliminada** |
| FAQ párpados («muchas clientas») | — | **Eliminada** |
| FAQ piel sensible + «parte interna del brazo» | — | **Eliminada**; ahora «¿Tiene fragancia?» (CT:79) |
| FAQ colores: «Consultá los colores disponibles por WhatsApp antes de comprar.» | CT:81 | Reescrita (fuera: el marcador y la promesa de un selector en el checkout que no existe) |

### Kit Facial Experiencia Completa

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: kit de skincare completo | CT:86 | Reescrita (fuera: la repetición «completo/completa») |
| Incluye los cinco productos faciales; suma al New Skin el serum antiage de noche con bakuchiol y retinoides | CT:86, CT:90, CT:33 | Reescrita (fuera: «cinco pasos», «sin pelearse», «serum de día») |
| Orden de la rutina; Multi Active día y noche; Transformación solo de noche | CX:37, CT:27, CT:36 | Reescrita (fuera: el reparto AM/PM inventado) |
| «Más conveniente…», «Pensada para quien quiere rutina y resultados» | — | **Eliminadas** (T6) |
| FAQ «¿Cuánto dura?» `[CONFIRMAR]` | — | **Eliminada** (CX:62) |
| FAQ regalo: «en el checkout cargá la dirección de la persona que lo recibe» | UI | Reescrita |

### Kit Facial New Skin

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: kit de rutina facial básica (para empezar) | CT:90 («los básicos») | Se sacó « \| NUDE» |
| Los cuatro básicos: agua micelar (300 cc), contorno, crema, Multi Active; clean y hecho a mano | CT:90, CX:11 | Reescrita (fuera: «que funcione sin complicarse») |
| Rutina diaria + protector de día | CX:37, CT:27 | — |
| «Más conveniente…», «Ideal para quien recién arranca» | — | **Eliminadas** |
| FAQ diferencia con Experiencia Completa | CT:86, CT:90 | — |
| FAQ piel sensible: Multi Active indicado; micelar y crema para todo tipo de piel; prueba de parche | CT:25, CT:48, CT:57, CT:109 | Reescrita (fuera: «los cuatro pensados para piel sensible») |
| FAQ qué sigue: Serum Transformación o Kit Experiencia Completa | CT:33, CT:86 | — |

### Nude Bag

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| H1 / title: set de regalo de skincare con accesorios | CT:18, CT:94 | Se sacó « \| NUDE» |
| Contenido: micelar, crema, contorno, los dos serums, pads (x2), vincha, toalla | CT:94 | Reescrita (fuera: «empezar a cuidarse», «listo para entregar», «regalo cosmética natural») |
| Modo de uso: rutina + pads reutilizables, vincha para el pelo, toalla para secar sin frotar | CX:37, CT:98, CT:102, CT:106 | — |
| «Más conveniente…» | — | **Eliminada** (T6) |
| FAQ envío a quien lo recibe: dirección en el checkout | UI | Reescrita (fuera: «le sumamos una tarjeta») |
| FAQ tipo de piel | CT:25, CT:48, CT:57 | Reescrita (fuera: «casi todo») |
| FAQ agua micelar 200 o 300 cc `[CONFIRMAR]` | — | **Eliminada** (CT:60, CT:94) |
| SEO: «crema facial» en singular | CT:94 | Corregida (decía «cremas») |

### Pads Desmaquillantes

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| 2 unidades, 10 cm de diámetro, con bolsita, reutilizables | CT:106 | — |
| «Cada pad tiene un lado de polar soft y el otro de microfibra.» | CT:106 | Corregida (antes decía «uno de polar soft y otro de microfibra») |
| Se usan con el limpiador | CT:106 | — |
| H1 / title | CT:106 | Reescrita (fuera: «discos desmaquillantes reutilizables», la variante repetida del nombre) |
| Material: «Polar soft y microfibra.» | CT:106 | Reescrita (fuera: «100% tela sintética») |
| Lavado con jabón neutro, lavarropas, «dura muchos meses», «bolsita para el lavarropas», «más suave / más abrasiva», «menos basura» | — | **Eliminadas** |

### Toalla Microfibra

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| Secar el rostro después de la rutina; absorbe rápido; sin frotar; uso diario | CT:98 | Reescrita (fuera: variantes repetidas del nombre) |
| Material: «Microfibra.» | CT:98 (nombre del producto) | Reescrita (fuera: «100%») |
| «Lavala con jabón neutro», lavarropas, «más rápido que una toalla común», «suave con pieles sensibles» | — | **Eliminadas** |

### Vincha con velcro

| Afirmación publicada | Fuente | Acción |
|---|---|---|
| Sujeta el pelo durante la rutina; ajustable con velcro | CT:102 | Reescrita (fuera: variantes repetidas del nombre) |
| Material: «Cierre de velcro, ajustable.» | CT:102 | Reescrita (fuera: «tela sintética suave») |
| «Suave con la piel y el pelo», «uso diario», «sumá un prendedor» | — | **Eliminadas** |

---

## Legales, carrito, pedido y globales

| Página | Afirmación publicada | Fuente | Acción |
|---|---|---|---|
| Cambios | Devoluciones a 10 días de la compra; cambios a 10 días de la recepción; sin uso y con sello; 48 h con fotos por falla; quién paga el envío; reembolso menos packaging; mismo medio de pago; WhatsApp o email | CT:112-118, CX:31 | — |
| Términos | «NUDE Cosmética Clean, CUIT 23265636934», Mendiolaza, Córdoba, email | CT:10-11 | T1 |
| Términos | Precios en ARS; precios, descuentos y disponibilidad se confirman al comprar | CT:5 + UI | Reescrita (fuera: «incluyen IVA», «stock») |
| Términos | Transferencia con 20% off: «al confirmar el pedido te mostramos los datos para transferir» | CT:6 + UI | Reescrita (T4) |
| Términos | Envíos a todo el país; costo y plazo se coordinan por WhatsApp | CT:7, CX:27 + UI | Se sacó el retiro (T3) |
| Términos / Privacidad | Ley 25.326, Defensa del Consumidor, `[REVISAR LEGAL]` | LEGAL, CT:12 | T8 |
| Privacidad | Datos: nombre, email, teléfono, dirección y DNI opcional | UI | Se agregó el DNI, que el checkout ya pide |
| Arrepentimiento | 10 días corridos; Res. SCI 424/2020; mismo medio de pago; sin uso y con sello | CT:12, CT:114, CT:118, LEGAL | — |
| Arrepentimiento (form) | «Recibimos tu solicitud. Te escribimos para coordinar la devolución.» | UI | Reescrita (fuera: «en las próximas horas») |
| Carrito | Zonas «a coordinar por WhatsApp»; sin opción de retiro | UI, CX:27 | T3 |
| Carrito | «Al confirmar el pedido te mostramos alias y CBU.» | UI | Reescrita (T4) |
| Carrito | 5% por 2 o más unidades; 20% por transferencia; 3 cuotas | CT:6-7 | — |
| Pedido | «Para completar el pedido, transferí a:» | UI | Reescrita (T4) |
| Pedido | Alias / CBU / titular | — | `[CONFIRMAR con Soledad]` (T5, dato) |
| Pedido | «Recibimos el pago. Te escribimos por WhatsApp para coordinar la entrega.» / «Lo revisamos y te escribimos por WhatsApp.» | UI | Reescritas (T2) |
| Pie | «Cosmética natural hecha a mano, en pequeños lotes, en Mendiolaza (Córdoba).» | CX:11-12, CX:35 | Reescrita |
| Pie | «NUDE Cosmética Clean · CUIT 23265636934 · Mendiolaza, Córdoba, Argentina.» | CT:10 | T1 |
| Pie | WhatsApp, email, Instagram, Defensa del Consumidor, botón de arrepentimiento | CT:11-12 | — |

---

## `[CONFIRMAR]` y datos pendientes

| Dónde | Qué falta | Se ve hoy |
|---|---|---|
| Serum Transformación · ingredientes | Lista final (la ficha de TN tiene dos versiones) | Sí: bloquea producción |
| `/pedido/` (transferencia) | Alias, CBU y titular | Sí, cuando alguien elige transferencia: bloquea producción |
| Óleo Autobronceante | Lista completa de ingredientes (hoy se publican los principales) | No |
| Creamy Gloss & Blush | Qué colores hay y cómo elige el color quien compra (el checkout no tiene selector) | No (la FAQ manda a WhatsApp) |
| Razón social y condición frente al IVA | Para el pie legal | No (se muestra la marca + CUIT) |
| Nombre público de Soledad | Si quiere aparecer con su nombre | No (se sacó del sitio) |
| Retiro en Mendiolaza | Si existe, dónde y cómo | No (está deshabilitado) |
| Plazo de reserva por transferencia | Si hay un plazo (hoy el dato dice 48 h, pero no se muestra) | No |
| Óleo: aviso de que no protege del sol | Cómo lo quiere decir | Sí, con un texto prudente |
| Tamaños (ml/g) de cada producto | Para la ficha y para responder «¿cuánto dura?» | No |
| 3 cuotas sin interés | Que esté configurado en Mercado Pago | Sí (dato de TN) |

### Mensaje listo para Soledad

> ¡Hola Sole! Estamos terminando la web nueva y nos faltan algunos datos para poder publicarla. ¿Nos pasás esto cuando puedas?
> 1. **Datos para la transferencia**: alias, CBU y titular de la cuenta.
> 2. **Serum Transformación**: la lista final de ingredientes (en Tiendanube hay dos versiones distintas).
> 3. **Óleo Autobronceante**: la lista completa de ingredientes, y cómo querés que digamos que no tiene protección solar.
> 4. **Creamy Gloss & Blush**: qué colores tenés hoy y cómo preferís que la clienta te avise cuál quiere.
> 5. **Tamaños** (ml o g) de cada producto, y si el agua micelar viene solo en 300 ml o también en 200.
> 6. **Retiro en Mendiolaza**: ¿lo ofrecés? Si sí, ¿cómo lo coordinás?
> 7. Con transferencia, ¿reservás el pedido algunas horas? ¿Cuántas?
> 8. ¿Querés aparecer con tu nombre en la web? ¿Y cuál es la razón social y la condición frente al IVA para el pie?
> 9. ¿Seguís ofreciendo 3 cuotas sin interés con Mercado Pago?
>
> ¡Gracias! Con esto la dejamos lista para salir 💛
