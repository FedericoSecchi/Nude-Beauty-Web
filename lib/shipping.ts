import type { AjustesEnvios, ZonaEnvio } from './types';

export interface EnvioSeleccion {
  modo: 'envio' | 'retiro';
  zonaId?: string;
}

export interface EnvioCalculado {
  modo: 'envio' | 'retiro';
  zona: ZonaEnvio | null;
  costo: number;
  plazoTexto: string;
  requiereCoordinacion: boolean;
  /** Quién cotizó el envío, si lo cotizó un proveedor (ver ProveedorEnvio). */
  proveedor?: string;
}

export class ShippingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShippingError';
  }
}

export const NOMBRE_RETIRO = 'Retiro en Mendiolaza';

export function calcularEnvio(
  seleccion: EnvioSeleccion,
  envios: AjustesEnvios,
): EnvioCalculado {
  if (seleccion.modo === 'retiro') {
    if (!envios.retiro.habilitado) {
      throw new ShippingError('Retiro no habilitado');
    }
    return {
      modo: 'retiro',
      zona: null,
      costo: envios.retiro.costo || 0,
      plazoTexto: envios.retiro.direccionTexto,
      requiereCoordinacion: false,
    };
  }

  const zona = envios.zonas.find((z) => z.id === seleccion.zonaId);
  if (!zona) {
    throw new ShippingError('Zona de envío inválida');
  }
  return {
    modo: 'envio',
    zona,
    costo: zona.modo === 'coordinar' ? 0 : zona.costo,
    plazoTexto: zona.plazoTexto,
    requiereCoordinacion: zona.modo === 'coordinar',
  };
}

// --- Cotización con un proveedor (Correo Argentino, Andreani…) ---
// Todavía no hay ninguno enchufado: las zonas «a coordinar» se cotizan por WhatsApp. Para sumar uno,
// implementar ProveedorEnvio (llamada a su API desde una Netlify Function, nunca desde el navegador:
// las credenciales no pueden llegar al sitio) y agregarlo a la lista que recibe cotizarEnvio.

export interface SolicitudCotizacion {
  zona: ZonaEnvio;
  cp: string;
  localidad: string;
  provincia: string;
  items: { slug: string; cantidad: number }[];
}

export interface CotizacionEnvio {
  costo: number;
  plazoTexto: string;
}

export interface ProveedorEnvio {
  /** 'correo-argentino', 'andreani'… Se guarda en el pedido para saber quién cotizó. */
  id: string;
  /** null si no cubre ese destino o no pudo cotizar: se sigue con el próximo o queda a coordinar. */
  cotizar(solicitud: SolicitudCotizacion): Promise<CotizacionEnvio | null>;
}

export const PROVEEDORES_ENVIO: ProveedorEnvio[] = [];

/**
 * Igual que calcularEnvio, pero una zona «a coordinar» con destino completo se le pide a los
 * proveedores en orden. Si ninguno cotiza (o no hay proveedores, como hoy), queda a coordinar.
 * Retiro y zonas con costo fijo no se cotizan: manda lo que cargó Soledad.
 */
export async function cotizarEnvio(
  seleccion: EnvioSeleccion,
  envios: AjustesEnvios,
  destino: Omit<SolicitudCotizacion, 'zona'> | null,
  proveedores: ProveedorEnvio[] = PROVEEDORES_ENVIO,
): Promise<EnvioCalculado> {
  const base = calcularEnvio(seleccion, envios);
  if (!base.requiereCoordinacion || !base.zona || !destino) return base;
  for (const p of proveedores) {
    let c: CotizacionEnvio | null = null;
    try {
      c = await p.cotizar({ ...destino, zona: base.zona });
    } catch {
      c = null; // un proveedor caído no frena el pedido: prueba el siguiente o queda a coordinar
    }
    if (c && Number.isFinite(c.costo) && c.costo > 0) {
      return {
        ...base,
        costo: Math.round(c.costo),
        plazoTexto: c.plazoTexto,
        requiereCoordinacion: false,
        proveedor: p.id,
      };
    }
  }
  return base;
}

export function listarOpciones(envios: AjustesEnvios) {
  const items: {
    id: string;
    nombre: string;
    costo: number;
    plazoTexto: string;
    aclaracion: string;
    modo: 'envio' | 'retiro' | 'coordinar';
  }[] = [];
  for (const z of envios.zonas) {
    items.push({
      id: z.id,
      nombre: z.nombre,
      costo: z.modo === 'coordinar' ? 0 : z.costo,
      plazoTexto: z.plazoTexto,
      aclaracion: z.aclaracion ?? '',
      modo: z.modo === 'coordinar' ? 'coordinar' : 'envio',
    });
  }
  if (envios.retiro.habilitado) {
    items.push({
      id: 'retiro',
      nombre: NOMBRE_RETIRO,
      costo: envios.retiro.costo || 0,
      plazoTexto: envios.retiro.direccionTexto,
      aclaracion: '',
      modo: 'retiro',
    });
  }
  return items;
}
