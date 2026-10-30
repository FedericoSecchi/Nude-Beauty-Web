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
  /** Tono elegido, si el producto tiene variantes (ej. los colores del gloss). */
  variante?: string;
}

export interface LineaCalculada {
  slug: string;
  /** Incluye el tono: «Creamy Gloss… · Tono Strawberry». Así llega igual al mensaje, a MP y al aviso. */
  nombre: string;
  variante?: string;
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
    // Con variantes, el tono es obligatorio y tiene que existir en el catálogo. Sin variantes, se ignora.
    const variantes = prod.variantes ?? [];
    let variante: string | undefined;
    if (variantes.length > 0) {
      if (typeof item.variante !== 'string' || !variantes.includes(item.variante)) {
        throw new PricingError(`elegí el tono de ${prod.nombre}`, item.slug);
      }
      variante = item.variante;
    }
    lineas.push({
      slug: prod.slug,
      nombre: variante ? `${prod.nombre} · Tono ${variante}` : prod.nombre,
      ...(variante ? { variante } : {}),
      cantidad,
      precioUnitario: prod.precio,
      subtotal: prod.precio * cantidad,
    });
  }
  return lineas;
}

// Orden de los descuentos (Soledad, 27-10-2026): primero el de cantidad sobre el precio de lista y
// después el de transferencia sobre el precio ya descontado. 2 × $23.300 = $46.600 → −5% = $44.270 →
// −20% = $35.416. Con Mercado Pago, solo el de cantidad. Si no acumulan, el de transferencia
// reemplaza al de cantidad y se calcula sobre la lista.
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
  const transferencia = medio === 'transferencia' && tienda.descuentoTransferencia > 0;
  let base = subtotal;

  if (aplicaCantidad && (!transferencia || tienda.descuentosAcumulables)) {
    const monto = round0(subtotal * dq.porcentaje);
    descuentos.push({
      motivo: `Descuento por ${dq.minUnidades} o más unidades (${porcentaje(dq.porcentaje)})`,
      monto,
    });
    base = subtotal - monto;
  }

  if (transferencia) {
    descuentos.push({
      motivo: `${porcentaje(tienda.descuentoTransferencia)} off por transferencia`,
      monto: round0(base * tienda.descuentoTransferencia),
    });
  }

  const totalDesc = descuentos.reduce((s, d) => s + d.monto, 0);
  return { descuentos, subtotalConDescuentos: subtotal - totalDesc };
}

function round0(n: number): number {
  return Math.round(n);
}

function porcentaje(p: number): string {
  return `${Math.round(p * 100)}%`;
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
