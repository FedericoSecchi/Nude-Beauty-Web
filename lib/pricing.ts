import type { AjustesTienda, Producto } from './types';

// Lo único de los ajustes que usa el cálculo de precios.
export type AjustesDescuentos = Pick<
  AjustesTienda,
  'descuentoTransferencia' | 'descuentoCantidad' | 'descuentosAcumulables'
>;

export type MedioPago = 'mercadopago' | 'transferencia';

export interface CarritoItem {
  slug: string;
  cantidad: number;
}

export interface LineaCalculada {
  slug: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DescuentoAplicado {
  motivo: string;
  monto: number;
}

export interface TotalesCalculados {
  lineas: LineaCalculada[];
  cantidadTotal: number;
  subtotal: number;
  descuentos: DescuentoAplicado[];
  envio: number;
  total: number;
  medio: MedioPago;
}

export class PricingError extends Error {
  public readonly slug?: string;
  constructor(message: string, slug?: string) {
    super(message);
    this.name = 'PricingError';
    this.slug = slug;
  }
}

export function calcularLineas(
  items: CarritoItem[],
  productos: Producto[],
): LineaCalculada[] {
  const lineas: LineaCalculada[] = [];
  for (const item of items) {
    if (!item.slug || typeof item.slug !== 'string') {
      throw new PricingError('item sin slug válido');
    }
    const cantidad = Math.floor(Number(item.cantidad));
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      throw new PricingError(`cantidad inválida para ${item.slug}`, item.slug);
    }
    const prod = productos.find((p) => p.slug === item.slug);
    if (!prod) {
      throw new PricingError(`producto no encontrado: ${item.slug}`, item.slug);
    }
    if (!prod.disponible) {
      throw new PricingError(`sin stock: ${item.slug}`, item.slug);
    }
    if (!Number.isFinite(prod.precio) || prod.precio <= 0) {
      throw new PricingError(`precio inválido en catálogo: ${item.slug}`, item.slug);
    }
    lineas.push({
      slug: prod.slug,
      nombre: prod.nombre,
      cantidad,
      precioUnitario: prod.precio,
      subtotal: prod.precio * cantidad,
    });
  }
  return lineas;
}

export function calcularDescuentos(
  lineas: LineaCalculada[],
  tienda: AjustesDescuentos,
  medio: MedioPago,
): { descuentos: DescuentoAplicado[]; subtotalConDescuentos: number } {
  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
  const cantidadTotal = lineas.reduce((s, l) => s + l.cantidad, 0);
  const descuentos: DescuentoAplicado[] = [];

  const dq = tienda.descuentoCantidad;
  const aplicaCantidad = cantidadTotal >= dq.minUnidades && dq.porcentaje > 0;
  if (aplicaCantidad) {
    descuentos.push({
      motivo: `Descuento por ${dq.minUnidades} o más unidades (${(dq.porcentaje * 100).toFixed(0)}%)`,
      monto: round0(subtotal * dq.porcentaje),
    });
  }

  if (medio === 'transferencia' && tienda.descuentoTransferencia > 0) {
    let base = subtotal;
    if (!tienda.descuentosAcumulables && aplicaCantidad) {
      // Si no acumula, el descuento por transferencia reemplaza al de cantidad.
      descuentos.length = 0;
      base = subtotal;
    }
    descuentos.push({
      motivo: `20% off por transferencia`,
      monto: round0(base * tienda.descuentoTransferencia),
    });
  }

  const totalDesc = descuentos.reduce((s, d) => s + d.monto, 0);
  return { descuentos, subtotalConDescuentos: subtotal - totalDesc };
}

function round0(n: number): number {
  return Math.round(n);
}

export function calcularTotal(
  items: CarritoItem[],
  productos: Producto[],
  tienda: AjustesDescuentos,
  medio: MedioPago,
  envio: number,
): TotalesCalculados {
  const lineas = calcularLineas(items, productos);
  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
  const cantidadTotal = lineas.reduce((s, l) => s + l.cantidad, 0);
  const { descuentos, subtotalConDescuentos } = calcularDescuentos(lineas, tienda, medio);
  const envioNormalizado = Number.isFinite(envio) && envio >= 0 ? round0(envio) : 0;
  return {
    lineas,
    cantidadTotal,
    subtotal,
    descuentos,
    envio: envioNormalizado,
    total: subtotalConDescuentos + envioNormalizado,
    medio,
  };
}

export function precioConTransferencia(precioLista: number, tienda: AjustesDescuentos): number {
  if (!tienda.descuentoTransferencia) return precioLista;
  return round0(precioLista * (1 - tienda.descuentoTransferencia));
}
