// Regla única del modo de venta. La usan el sitio (next.config.mjs → NEXT_PUBLIC_MODO_VENTA), las
// functions (crear-pedido y pedido-whatsapp, con lo que el build guardó en el snapshot) y la puerta.
// - Hay medio de pago si Mercado Pago está encendido (MP_ACCESS_TOKEN en el build) o si
//   content/ajustes/tienda.json tiene alias o CBU.
// - El checkout (pedido guardado + cobro) se habilita solo si además ORDER_WEBHOOK_URL tiene valor en
//   el build: así nunca entra un pedido cobrado sin que le llegue el aviso a Soledad (n8n).
// - Si falta cualquiera de las dos cosas, la tienda toma pedidos por WhatsApp: el carrito arma el
//   mensaje y Soledad responde. Cuando se completa lo que falta, el próximo build pasa solo al checkout.

function conValor(v) {
  return typeof v === 'string' ? Boolean(v.trim()) : Boolean(v);
}

/** Alias o CBU cargados en el panel. */
export function hayDatosTransferencia(tienda) {
  return conValor(tienda?.alias) || conValor(tienda?.cbu);
}

/** mp: el token de MP del build (string) o el flag ya calculado (boolean). */
export function hayMedioDePago(tienda, mp) {
  return conValor(mp) || hayDatosTransferencia(tienda);
}

/**
 * 'checkout' (transferencia y/o Mercado Pago, con pedido guardado y aviso a n8n) o 'whatsapp'.
 * webhook: ORDER_WEBHOOK_URL del build (string) o el flag ya calculado (boolean).
 */
export function modoVenta(tienda, mp, webhook) {
  return hayMedioDePago(tienda, mp) && conValor(webhook) ? 'checkout' : 'whatsapp';
}

/** Por qué el build sale en modo WhatsApp (null si sale en checkout). Para los logs del build. */
export function motivoModoWhatsapp(tienda, mp, webhook) {
  if (!hayMedioDePago(tienda, mp)) {
    return 'sin medio de pago (MP_ACCESS_TOKEN vacío y sin alias ni CBU en content/ajustes/tienda.json)';
  }
  if (!conValor(webhook)) {
    const que = hayDatosTransferencia(tienda) ? 'alias cargado' : 'Mercado Pago cargado';
    return `${que}, esperando ORDER_WEBHOOK_URL (sin aviso de pedidos a n8n no se cobra en la web)`;
  }
  return null;
}
