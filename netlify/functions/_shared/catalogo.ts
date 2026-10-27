import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import type { AjustesEnvios, AjustesTienda, Producto } from '../../../lib/types';

export interface Snapshot {
  buildId: string;
  productos: Producto[];
  tienda: AjustesTienda;
  envios: AjustesEnvios;
  /** MP_ACCESS_TOKEN tenía valor en el build (scripts/prebuild.mjs). */
  mpHabilitado?: boolean;
  /** ORDER_WEBHOOK_URL tenía valor en el build: sin eso no se cobra en la web (lib/modo-venta.mjs). */
  webhookAviso?: boolean;
  /** Dirección exacta del retiro. Solo para pedidos con retiro: nunca va al sitio estático. */
  direccionRetiro?: string | null;
}

let cache: Snapshot | null = null;

function candidatePaths(): string[] {
  const here = typeof __dirname === 'string'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
  // En runtime de Netlify, el bundle vive en /var/task/netlify/functions/<name>.
  // En dev local, en el cwd del repo. Probamos varios caminos.
  return [
    join(here, '..', '_data', 'catalogo.json'),
    join(here, '_data', 'catalogo.json'),
    resolve(process.cwd(), 'netlify', 'functions', '_data', 'catalogo.json'),
    resolve(process.cwd(), '_data', 'catalogo.json'),
  ];
}

export function loadSnapshot(): Snapshot {
  if (cache) return cache;
  const tried: string[] = [];
  for (const p of candidatePaths()) {
    try {
      const raw = readFileSync(p, 'utf8');
      cache = JSON.parse(raw) as Snapshot;
      return cache;
    } catch {
      tried.push(p);
    }
  }
  throw new Error(
    `No se encontró _data/catalogo.json. Caminos probados: ${tried.join(', ')}`,
  );
}
