// Regla única del medio de pago. La usan el sitio (next.config.mjs → NEXT_PUBLIC_MODO_VENTA), las
// functions (crear-pedido, con lo que el build guardó en el snapshot) y la puerta de publicación.
// - Hay medio de pago si Mercado Pago está encendido (MP_ACCESS_TOKEN en el build) o si
//   content/ajustes/tienda.json tiene alias o CBU.
// - Si no hay ninguno, la tienda toma pedidos por WhatsApp: el carrito arma el mensaje y Soledad
//   responde con los datos para pagar. Cuando se carga el alias en el panel, el próximo build vuelve
//   solo al checkout normal.

function conValor(v) {
  return typeof v === 'string' ? Boolean(v.trim()) : Boolean(v);
}

/** mp: el token de MP del build (string) o el flag ya calculado (boolean). */
export function hayMedioDePago(tienda, mp) {
  return conValor(mp) || conValor(tienda?.alias) || conValor(tienda?.cbu);
}

/** 'checkout' (transferencia y/o Mercado Pago, como siempre) o 'whatsapp' (pedido por WhatsApp). */
export function modoVenta(tienda, mp) {
  return hayMedioDePago(tienda, mp) ? 'checkout' : 'whatsapp';
}
