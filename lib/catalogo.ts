import { join } from 'node:path';
import { leerContenido, validarProductos } from './contenido.mjs';
import type { AjustesEnvios, AjustesTienda, Producto } from './types';

// NUDE_CONTENT_DIR solo lo usa verify.sh para el build de prueba "sin stock" (scripts/fixture-sin-stock.mjs).
const CONTENT_DIR = process.env.NUDE_CONTENT_DIR || join(process.cwd(), 'content');

let _contenido: ReturnType<typeof leerContenido> | null = null;

function contenido() {
  if (_contenido) return _contenido;
  const c = leerContenido(CONTENT_DIR);
  const errores = validarProductos(c.productos);
  if (errores.length) throw new Error(`contenido inválido:\n  ${errores.join('\n  ')}`);
  _contenido = c;
  return c;
}

export function getProductos(): Producto[] {
  return contenido().productos;
}

export function getProducto(slug: string): Producto | null {
  return getProductos().find((p) => p.slug === slug) ?? null;
}

export function getProductosPorCategoria() {
  const todos = getProductos();
  return {
    face: todos.filter((p) => p.categoria === 'face'),
    body: todos.filter((p) => p.categoria === 'body'),
    sets: todos.filter((p) => p.categoria === 'sets'),
    accesorios: todos.filter((p) => p.categoria === 'accesorios'),
    // Productos nuevos cargados desde el panel, antes de que Kosmos les asigne categoría.
    otros: todos.filter((p) => !p.categoria),
  };
}

export function getAjustesTienda(): AjustesTienda {
  return contenido().tienda;
}

export function getAjustesEnvios(): AjustesEnvios {
  return contenido().envios;
}

export function slugsIndexables(): string[] {
  return getProductos().map((p) => p.slug);
}
