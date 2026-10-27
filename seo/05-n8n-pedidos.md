# 05 · Flujo de pedidos en n8n — NUDE

Actualizado: 26-10-2026 (tarde)

> El repo es público: acá no van la URL del webhook, los links al workflow ni a la planilla, ni IDs
> internos de n8n. Los tiene Fede (workflow **Nude - Pedidos web** en su proyecto personal de n8n,
> planilla **Nude - Pedidos web** en su Drive). La URL del webhook se carga solo en Netlify como
> `ORDER_WEBHOOK_URL`.

- Planilla, columnas: Fecha, ID, Tipo, Estado, Cliente, Email, Teléfono, DNI, Entrega, Dirección,
  Productos, Subtotal, Descuentos, Envío, Total, Medio de pago, ID pago MP, Notas o motivo, Pedido
  relacionado, Despachado (la completa Soledad).
- Data table de n8n `nude_avisos_enviados`: registra pedido + tipo ya avisados.

## Qué hace
1. Recibe el POST de la web (contrato de `seo/PLAN.md` §6). Si el header `x-nude-secret` no coincide
   con el secreto, responde 401 y no hace nada.
2. Guarda o actualiza la fila por ID: un reintento de la web no la duplica. Recién ahí responde OK a
   la web; si la planilla falla, la web recibe error y reintenta.
3. Si ese pedido + tipo no se avisó antes: lo registra, avisa a Soledad por Telegram y por mail, y le
   manda confirmación a la clienta (salvo en "pago a revisar"). Si el aviso es repetido, no manda
   nada. Si un aviso falla, el pedido igual queda guardado.
4. Tipos: pedido pagado (MP), pedido por transferencia, pago a revisar y arrepentimiento.

## Encaje con la web (revisado contra el código)
- `netlify/functions/_shared/avisos.ts` → `postAviso` manda `x-nude-secret` y trata cualquier
  respuesta que no sea 2xx como fallo: el registro queda `avisoEnviado: false` y `reintentar-avisos`
  lo reintenta con backoff. Coincide con el punto 2 (OK recién después de guardar la fila).
- Timeout del POST: 15 s. Guardar la fila antes de responder tiene que entrar en ese tiempo; si no,
  la web lo toma como fallo y reintenta (la fila no se duplica y el aviso tampoco, por el punto 3).
- Dedupe por `id` + `tipo`: es lo que pide PLAN §6 para la entrega "al menos una vez".
- Un 401 (secreto distinto en Netlify y en n8n) se reintenta para siempre con techo de 6 h: si los
  pedidos no aparecen en la planilla, revisar primero que el secreto sea el mismo en los dos lados.

## Probado (26-10, con datos de prueba)
- Pedido por transferencia: datos ordenados, total "$ 38.800", Telegram, mail a Soledad y mail a la
  clienta bien armados.
- Arrepentimiento: código de trámite y pedido relacionado en Telegram y mails.
- Secreto incorrecto: responde 401 y no procesa nada.
- El mismo aviso enviado dos veces: la primera pasa; la segunda se frena en "¿Aviso nuevo?". En la
  data table quedó una fila de prueba (`NUDE-TEST-DEDUPE`), que no molesta.
- Falta probar: la escritura real en la planilla y el envío real de Telegram y mails, porque todavía
  no están conectadas las cuentas (ver abajo).

## Pendiente (Fede)
- "Guardar en la planilla", "Mail a Soledad" y "Mail a la clienta" quedaron **desactivados**: n8n les
  asignó credenciales de otros proyectos de la instancia. Hay que cambiarlas por las de Nude y
  activarlos.
- Telegram: token nuevo del bot (el anterior daba 401) y chat ID de Soledad.
- Secreto: el mismo texto en el nodo "Configuración" y en `ORDER_WEBHOOK_SECRET` de Netlify.
- Cargar `ORDER_WEBHOOK_URL` en Netlify.
- Publicar el workflow.
- Compartir la planilla con Soledad.
