import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AjustesEnvios, AjustesTienda, Producto } from './types';

// NUDE_CONTENT_DIR solo lo usa verify.sh para el build de prueba "sin stock" (scripts/fixture-sin-stock.mjs).
const CONTENT_DIR = process.env.NUDE_CONTENT_DIR || join(process.cwd(), 'content');

let _productos: Producto[] | null = null;
let _tienda: AjustesTienda | null = null;
let _envios: AjustesEnvios | null = null;

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as T;
}

export function getProductos(): Producto[] {
  if (_productos) return _productos;
  const dir = join(CONTENT_DIR, 'productos');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  _productos = files.map((f) => loadJson<Producto>(join(dir, f)));
  return _productos;
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
  };
}

export function getAjustesTienda(): AjustesTienda {
  if (_tienda) return _tienda;
  _tienda = loadJson<AjustesTienda>(join(CONTENT_DIR, 'ajustes', 'tienda.json'));
  return _tienda;
}

export function getAjustesEnvios(): AjustesEnvios {
  if (_envios) return _envios;
  _envios = loadJson<AjustesEnvios>(join(CONTENT_DIR, 'ajustes', 'envios.json'));
  return _envios;
}

export function slugsIndexables(): string[] {
  return getProductos().map((p) => p.slug);
}
