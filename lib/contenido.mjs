// Lectura del contenido que edita Soledad desde /admin/ (Decap).
// En los JSON los campos simples van arriba y el resto dentro de `avanzado` (el grupo plegado
// "Avanzado: no tocar" del panel). Acá se aplana todo a la forma que usan el sitio y las functions.
// Lo usan lib/catalogo.ts, scripts/prebuild.mjs (snapshot de las functions) y los tests.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

// Envíos fuera de la zona con costo fijo: depende del volumen del paquete y del destino (Soledad, 27-10-2026).
const TEXTO_COORDINAR = 'A coordinar por WhatsApp (depende del tamaño del paquete y el destino)';

function texto(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

// "Serum Transformación 2" → "serum-transformacion-2". También para nombres de archivo de Decap.
export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Los productos existentes tienen `slug` fijo. Los nuevos lo toman del nombre de archivo que arma
// Decap a partir del nombre (sin el prefijo numérico de orden, "02-serum-x.json" → "serum-x").
export function slugDeArchivo(archivo) {
  return slugify(basename(archivo, '.json').replace(/^\d+-/, ''));
}

export function normalizarProducto(raw, archivo) {
  const { avanzado = {}, ...visible } = raw;
  const p = { ...avanzado, ...visible };
  return {
    ...p,
    slug: texto(p.slug) ?? slugDeArchivo(archivo),
    categoria: p.categoria || null,
    precio: p.precio,
    disponible: p.disponible !== false,
    imagenes: Array.isArray(p.imagenes) ? p.imagenes.filter(Boolean) : [],
    tamano: texto(p.tamano),
    variantes: Array.isArray(p.variantes) ? p.variantes.map(texto).filter(Boolean) : [],
    h1: texto(p.h1) ?? p.nombre,
    resumen: p.resumen ?? '',
    activos: p.activos ?? [],
    ingredientes: p.ingredientes ?? '',
    modoDeUso: p.modoDeUso ?? '',
    pasoRutina: p.pasoRutina ?? null,
    beneficios: p.beneficios ?? [],
    faq: p.faq ?? [],
    relacionados: p.relacionados ?? [],
    incluye: p.incluye ?? [],
    seo: {
      title: texto(p.seo?.title) ?? p.nombre,
      description: texto(p.seo?.description) ?? p.resumen ?? '',
    },
    avisoPatch: p.avisoPatch === true,
    tiendanubeUrl: texto(p.tiendanubeUrl) ?? undefined,
    fichaCorta: p.fichaCorta === true,
  };
}

// Alias, CBU y titular vacíos (Decap guarda "") cuentan como "no hay dato".
export function normalizarTienda(raw) {
  const { avanzado = {}, ...visible } = raw;
  const t = { ...avanzado, ...visible };
  return {
    ...t,
    alias: texto(t.alias),
    cbu: texto(t.cbu),
    titularCuenta: texto(t.titularCuenta),
    whatsapp: texto(t.whatsapp) ?? '',
  };
}

// Una zona con costo mayor a 0 es "fijo"; sin costo, "a coordinar por WhatsApp".
export function normalizarEnvios(raw) {
  const { avanzado = {}, ...visible } = raw;
  const e = { ...avanzado, ...visible };
  const zonas = (e.zonas ?? []).map((z) => {
    const { avanzado: za = {}, ...zv } = z;
    const zona = { ...za, ...zv };
    const costo = Number.isFinite(zona.costo) && zona.costo > 0 ? Math.round(zona.costo) : 0;
    const modo = costo > 0 ? 'fijo' : 'coordinar';
    return {
      id: texto(zona.id) ?? slugify(zona.nombre),
      nombre: zona.nombre,
      provincias: zona.provincias ?? [],
      codigosPostales: zona.codigosPostales ?? [],
      costo,
      plazoTexto: texto(zona.plazoTexto) ?? (modo === 'coordinar' ? TEXTO_COORDINAR : ''),
      aclaracion: texto(zona.aclaracion) ?? '',
      modo,
    };
  });
  // `retiro.direccionPrivada` no se copia: el sitio estático nunca la ve (ver leerDireccionRetiro).
  const retiro = e.retiro ?? {};
  return {
    zonas,
    retiro: {
      habilitado: retiro.habilitado === true,
      direccionTexto: texto(retiro.direccionTexto) ?? '',
      costo: Number.isFinite(retiro.costo) && retiro.costo > 0 ? retiro.costo : 0,
    },
    envioGratisDesde: e.envioGratisDesde ?? null,
  };
}

// Errores que tienen que frenar el build (y con eso el deploy: el sitio en vivo queda como estaba).
export function validarProductos(productos) {
  const errores = [];
  const vistos = new Map();
  for (const p of productos) {
    const quien = p.nombre || p.slug || '(sin nombre)';
    if (!p.slug) errores.push(`${quien}: no se pudo armar el slug`);
    if (vistos.has(p.slug)) errores.push(`${quien}: el slug "${p.slug}" ya lo usa ${vistos.get(p.slug)}`);
    vistos.set(p.slug, quien);
    if (!texto(p.nombre)) errores.push(`${p.slug}: falta el nombre`);
    if (!Number.isInteger(p.precio) || p.precio <= 0) errores.push(`${quien}: precio inválido (${p.precio})`);
    if (!p.imagenes.length) errores.push(`${quien}: falta al menos una foto`);
  }
  return errores;
}

// Dirección exacta del retiro (content/ajustes/envios.json › retiro.direccionPrivada). No forma parte
// de normalizarEnvios a propósito: solo la lee scripts/prebuild.mjs para el snapshot de las functions,
// que la muestran después de confirmar un pedido con retiro (/pedido/, mensaje de WhatsApp, aviso a n8n).
export function leerDireccionRetiro(dir) {
  const raw = JSON.parse(readFileSync(join(dir, 'ajustes', 'envios.json'), 'utf8'));
  const retiro = { ...(raw.avanzado?.retiro ?? {}), ...(raw.retiro ?? {}) };
  return retiro.habilitado === true ? texto(retiro.direccionPrivada) : null;
}

export function leerContenido(dir) {
  const dirProductos = join(dir, 'productos');
  const productos = readdirSync(dirProductos)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => normalizarProducto(JSON.parse(readFileSync(join(dirProductos, f), 'utf8')), f));
  const leer = (f) => JSON.parse(readFileSync(join(dir, 'ajustes', f), 'utf8'));
  return {
    productos,
    tienda: normalizarTienda(leer('tienda.json')),
    envios: normalizarEnvios(leer('envios.json')),
  };
}
