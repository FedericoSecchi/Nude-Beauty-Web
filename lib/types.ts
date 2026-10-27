export type Categoria = 'face' | 'body' | 'sets' | 'accesorios';

export interface FAQ {
  q: string;
  a: string;
}

export interface Activo {
  nombre: string;
  queHace: string;
}

export interface Producto {
  slug: string;
  nombre: string;
  categoria: Categoria | null;
  precio: number;
  disponible: boolean;
  imagenes: string[];
  tamano: string | null;
  h1: string;
  resumen: string;
  activos: Activo[];
  ingredientes: string;
  modoDeUso: string;
  pasoRutina: number | null;
  beneficios: string[];
  faq: FAQ[];
  relacionados: string[];
  incluye?: string[];
  seo: {
    title: string;
    description: string;
  };
  avisoPatch?: boolean;
  tiendanubeUrl?: string;
  fichaCorta?: boolean;
}

export interface AjustesTienda {
  descuentoTransferencia: number;
  descuentoCantidad: { minUnidades: number; porcentaje: number };
  descuentosAcumulables: boolean;
  cuotasTexto: string;
  alias: string | null;
  cbu: string | null;
  titularCuenta: string | null;
  horasReservaTransferencia: number;
  whatsapp: string;
  emailTienda: string;
}

export interface ZonaEnvio {
  id: string;
  nombre: string;
  provincias: string[];
  codigosPostales?: string[];
  costo: number;
  plazoTexto: string;
  /** Texto chico debajo de la zona en el carrito (ej. «Si tu dirección no está en esta zona…»). */
  aclaracion: string;
  modo: 'fijo' | 'coordinar';
}

export interface AjustesEnvios {
  zonas: ZonaEnvio[];
  retiro: {
    habilitado: boolean;
    /** Texto público (días y horario). La dirección exacta NO va acá: ver leerDireccionRetiro. */
    direccionTexto: string;
    costo: number;
  };
  envioGratisDesde: number | null;
}
