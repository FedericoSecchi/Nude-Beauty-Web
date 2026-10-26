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
}

export class ShippingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShippingError';
  }
}

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
      plazoTexto: 'Coordinamos el día por WhatsApp',
      requiereCoordinacion: true,
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

export function listarOpciones(envios: AjustesEnvios) {
  const items: { id: string; nombre: string; costo: number; plazoTexto: string; modo: 'envio' | 'retiro' | 'coordinar' }[] = [];
  for (const z of envios.zonas) {
    items.push({
      id: z.id,
      nombre: z.nombre,
      costo: z.modo === 'coordinar' ? 0 : z.costo,
      plazoTexto: z.plazoTexto,
      modo: z.modo === 'coordinar' ? 'coordinar' : 'envio',
    });
  }
  if (envios.retiro.habilitado) {
    items.push({
      id: 'retiro',
      nombre: 'Retiro en Mendiolaza',
      costo: envios.retiro.costo || 0,
      plazoTexto: envios.retiro.direccionTexto,
      modo: 'retiro',
    });
  }
  return items;
}
