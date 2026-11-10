// Eventos de GA4 (ecommerce estándar + los propios de la tienda). Único punto de entrada: si gtag no
// está (build sin NEXT_PUBLIC_GA_ID, bloqueador, error) no hace nada y nunca tira error.
//
// Privacidad: ningún evento lleva datos de la persona (nombre, teléfono, email, dirección) ni la URL
// de wa.me, porque el texto del pedido incluye nombre y teléfono. Además de no pasarlos, el helper
// descarta por las dudas las claves de link (link_url, link_text…) y cualquier texto con «wa.me».

export interface ItemGA {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

type Valor = string | number | boolean | ItemGA[] | undefined;

const CLAVES_PROHIBIDAS = new Set([
  'link_url',
  'link_text',
  'link_domain',
  'link_classes',
  'link_id',
  'outbound',
  'page_location',
  'nombre',
  'telefono',
  'email',
  'direccion',
  'dni',
]);

const tieneWa = (v: unknown) => typeof v === 'string' && /wa\.me|api\.whatsapp\.com/i.test(v);

function limpiar(params: Record<string, Valor>): Record<string, Valor> {
  const out: Record<string, Valor> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || CLAVES_PROHIBIDAS.has(k) || tieneWa(v)) continue;
    out[k] = v;
  }
  return out;
}

export function evento(nombre: string, params: Record<string, Valor> = {}): void {
  try {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', nombre, limpiar(params));
  } catch {
    /* medición opcional: nunca rompe la compra */
  }
}

/** Ítem GA4 desde una línea de la tienda. item_variant solo si hay tono. */
export function itemGA(it: {
  slug: string;
  nombre: string;
  precio: number;
  cantidad: number;
  variante?: string | null;
}): ItemGA {
  return {
    item_id: it.slug,
    item_name: it.nombre,
    ...(it.variante ? { item_variant: it.variante } : {}),
    price: it.precio,
    quantity: it.cantidad,
  };
}

/** Evento de ecommerce en pesos: value = lo que se pasa, items normalizados. */
export function eventoEcommerce(
  nombre: 'view_item' | 'add_to_cart' | 'view_cart' | 'begin_checkout' | 'click_whatsapp' | 'purchase',
  value: number,
  items: ItemGA[],
  extra: Record<string, Valor> = {},
): void {
  evento(nombre, { currency: 'ARS', value, items, ...extra });
}
