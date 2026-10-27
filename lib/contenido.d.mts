import type { AjustesEnvios, AjustesTienda, Producto } from './types';

export function slugify(s: string): string;
export function slugDeArchivo(archivo: string): string;
export function normalizarProducto(raw: unknown, archivo: string): Producto;
export function normalizarTienda(raw: unknown): AjustesTienda;
export function normalizarEnvios(raw: unknown): AjustesEnvios;
export function validarProductos(productos: Producto[]): string[];
export function leerContenido(dir: string): {
  productos: Producto[];
  tienda: AjustesTienda;
  envios: AjustesEnvios;
};
