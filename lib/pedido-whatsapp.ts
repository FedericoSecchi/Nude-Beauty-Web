// Modo «pedido por WhatsApp» (lib/modo-venta.mjs): el carrito arma este mensaje y abre wa.me.
// No se crea pedido en Blobs ni se avisa a n8n: Soledad responde con los datos para pagar.
import { calcularTotal, type AjustesDescuentos, type CarritoItem } from './pricing';
import { formatARS } from './format';
import type { Producto } from './types';

export interface EntregaWhatsapp {
  /** Nombre visible de la zona o «Retiro en Mendiolaza». */
  nombre: string;
  /** 0 = a coordinar. */
  costo: number;
}

export interface CompradoraWhatsapp {
  nombre: string;
  telefono: string;
  email?: string;
}

export interface PedidoWhatsapp {
  texto: string;
  subtotalLista: number;
  /** Total pagando con transferencia (descuentos de lib/pricing + envío si tiene costo). */
  totalTransferencia: number;
}

// Espacio común en vez del no separable de Intl: el mensaje se lee igual y se puede buscar.
export function pesos(n: number): string {
  return formatARS(n).replace(/ /g, ' ');
}

function porcentaje(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function armarPedidoWhatsapp(
  items: CarritoItem[],
  productos: Producto[],
  tienda: AjustesDescuentos,
  entrega: EntregaWhatsapp,
  compradora: CompradoraWhatsapp,
): PedidoWhatsapp {
  // Mismo cálculo que el checkout (respeta descuentos acumulables o no). Tira PricingError si
  // un producto no existe o no tiene stock.
  const t = calcularTotal(items, productos, tienda, 'transferencia', entrega.costo);
  const conTransferencia = t.subtotal - t.descuentos.reduce((s, d) => s + d.monto, 0);

  // «(20% off)» o, si acumula con el de cantidad, «(20% off + 5% por cantidad)».
  const etiquetas = [`${porcentaje(tienda.descuentoTransferencia)} off`];
  if (t.descuentos.length > 1) etiquetas.push(`${porcentaje(tienda.descuentoCantidad.porcentaje)} por cantidad`);

  const lineas = [
    'Hola! Quiero hacer este pedido:',
    '',
    ...t.lineas.map((l) => `• ${l.cantidad} × ${l.nombre} (${pesos(l.precioUnitario)} c/u)`),
    '',
    `Subtotal de lista: ${pesos(t.subtotal)}`,
    `Con transferencia: ${pesos(conTransferencia)} (${etiquetas.join(' + ')})`,
    `Entrega: ${entrega.nombre} · ${entrega.costo > 0 ? pesos(entrega.costo) : 'a coordinar'}`,
  ];
  if (entrega.costo > 0) lineas.push(`Total con transferencia y envío: ${pesos(t.total)}`);
  lineas.push('', `Nombre: ${compradora.nombre.trim()}`, `Teléfono: ${compradora.telefono.trim()}`);
  if (compradora.email?.trim()) lineas.push(`Email: ${compradora.email.trim()}`);

  return { texto: lineas.join('\n'), subtotalLista: t.subtotal, totalTransferencia: t.total };
}
