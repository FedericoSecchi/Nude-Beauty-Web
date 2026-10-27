// Modo «pedido por WhatsApp» (lib/modo-venta.mjs): el carrito arma este mensaje y abre wa.me.
// No se crea pedido en Blobs ni se avisa a n8n: Soledad responde con los datos para pagar.
// Con retiro, el mensaje lo arma la function pedido-whatsapp, que es la única que conoce la dirección
// exacta (no va en el sitio estático); si no responde, el carrito usa este mismo armado sin dirección.
import { calcularTotal, type AjustesDescuentos, type CarritoItem } from './pricing';
import { formatARS } from './format';
import type { AjustesTienda, Producto } from './types';

export interface EntregaWhatsapp {
  /** Nombre visible de la zona o «Retiro en Mendiolaza». */
  nombre: string;
  /** 0 = a coordinar (o gratis, si es retiro). */
  costo: number;
  retiro?: boolean;
  /** Solo la function la completa (snapshot del build). */
  direccionRetiro?: string | null;
}

export interface CompradoraWhatsapp {
  nombre: string;
  telefono: string;
  email?: string;
  dni?: string;
}

export type DatosPagoWhatsapp = Pick<AjustesTienda, 'alias' | 'cbu' | 'titularCuenta'>;

export interface PedidoWhatsapp {
  texto: string;
  subtotalLista: number;
  /** Total pagando con transferencia (descuentos de lib/pricing + envío si tiene costo). */
  totalTransferencia: number;
}

// Espacio común en vez del no separable de Intl: el mensaje se lee igual y se puede buscar.
export function pesos(n: number): string {
  return formatARS(n).replace(/\u00a0/g, ' ');
}

function porcentaje(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function lineaEntrega(entrega: EntregaWhatsapp): string {
  if (entrega.costo > 0) return `Entrega: ${entrega.nombre} · ${pesos(entrega.costo)}`;
  return `Entrega: ${entrega.nombre} · ${entrega.retiro ? 'gratis' : 'a coordinar'}`;
}

export function armarPedidoWhatsapp(
  items: CarritoItem[],
  productos: Producto[],
  tienda: AjustesDescuentos & Partial<DatosPagoWhatsapp>,
  entrega: EntregaWhatsapp,
  compradora: CompradoraWhatsapp,
): PedidoWhatsapp {
  // Mismo cálculo que el checkout (respeta descuentos acumulables o no). Tira PricingError si
  // un producto no existe o no tiene stock.
  const t = calcularTotal(items, productos, tienda, 'transferencia', entrega.costo);
  const conTransferencia = t.subtotal - t.descuentos.reduce((s, d) => s + d.monto, 0);

  // «(20% off)» o, si acumula con el de cantidad, «(5% por cantidad + 20% off)»: en el orden en que
  // se aplican.
  const etiquetas = [`${porcentaje(tienda.descuentoTransferencia)} off`];
  if (t.descuentos.length > 1) etiquetas.unshift(`${porcentaje(tienda.descuentoCantidad.porcentaje)} por cantidad`);

  const lineas = [
    'Hola! Quiero hacer este pedido:',
    '',
    ...t.lineas.map((l) => `• ${l.cantidad} × ${l.nombre} (${pesos(l.precioUnitario)} c/u)`),
    '',
    `Subtotal de lista: ${pesos(t.subtotal)}`,
    `Con transferencia: ${pesos(conTransferencia)} (${etiquetas.join(' + ')})`,
    lineaEntrega(entrega),
  ];
  if (entrega.retiro && entrega.direccionRetiro) lineas.push(`Dirección de retiro: ${entrega.direccionRetiro}`);
  if (entrega.costo > 0) lineas.push(`Total con transferencia y envío: ${pesos(t.total)}`);

  // Datos para transferir, si están cargados en el panel: así la clienta ya los tiene en el chat.
  const titular = tienda.titularCuenta?.trim();
  if (tienda.alias?.trim()) {
    lineas.push('', `Alias para transferir: ${tienda.alias.trim()}${titular ? ` (${titular})` : ''}`);
  }
  if (tienda.cbu?.trim()) {
    if (!tienda.alias?.trim()) lineas.push('');
    lineas.push(`CBU: ${tienda.cbu.trim()}${titular && !tienda.alias?.trim() ? ` (${titular})` : ''}`);
  }

  lineas.push('', `Nombre: ${compradora.nombre.trim()}`, `Teléfono: ${compradora.telefono.trim()}`);
  if (compradora.email?.trim()) lineas.push(`Email: ${compradora.email.trim()}`);
  if (compradora.dni?.trim()) lineas.push(`DNI: ${compradora.dni.trim()}`);

  return { texto: lineas.join('\n'), subtotalLista: t.subtotal, totalTransferencia: t.total };
}
