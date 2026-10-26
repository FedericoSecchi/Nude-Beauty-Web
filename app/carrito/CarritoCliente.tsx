'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { urls } from '@/lib/urls';
import { formatARS } from '@/lib/format';

const KEY = 'nude.carrito.v1';

interface CartItem {
  slug: string;
  cantidad: number;
  nombre: string;
  precio: number;
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it) =>
        it &&
        typeof it.slug === 'string' &&
        Number.isFinite(it.cantidad) &&
        it.cantidad > 0,
    );
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('nude:cart'));
  } catch {
    /* storage denegado */
  }
}

export function CarritoCliente() {
  const [items, setItems] = useState<CartItem[] | null>(null);

  useEffect(() => {
    setItems(readCart());
  }, []);

  if (items === null) {
    return <p className="text-muted-ink">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div>
        <p className="text-ink/80">Tu carrito está vacío por ahora.</p>
        <Link href={urls.productos} className="btn-primary mt-5">
          Mirá los productos
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const cambiar = (slug: string, cantidad: number) => {
    const siguiente = items
      .map((it) => (it.slug === slug ? { ...it, cantidad } : it))
      .filter((it) => it.cantidad > 0);
    setItems(siguiente);
    writeCart(siguiente);
  };

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((it) => (
          <li key={it.slug} className="py-4 flex items-center gap-4">
            <div className="flex-1">
              <Link href={urls.producto(it.slug)} className="link-ghost">
                {it.nombre}
              </Link>
              <p className="text-sm text-muted-ink mt-1">{formatARS(it.precio)}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`q-${it.slug}`}>Cantidad</label>
              <input
                id={`q-${it.slug}`}
                type="number"
                min={0}
                max={20}
                value={it.cantidad}
                onChange={(e) => cambiar(it.slug, Math.max(0, Number(e.target.value) || 0))}
                className="w-16 rounded border border-border bg-card px-3 py-2 text-center"
              />
            </div>
            <p className="w-28 text-right font-medium">
              {formatARS(it.precio * it.cantidad)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-ink">
          Subtotal (sin descuentos ni envío). En el próximo paso se calcula el total.
        </p>
        <p className="font-heading text-2xl text-charcoal">{formatARS(subtotal)}</p>
      </div>

      <div className="mt-8 rounded-md bg-soft p-5 text-sm text-ink/80">
        El checkout propio está en construcción. Hasta que esté listo, escribinos por WhatsApp con
        el detalle de tu pedido y lo cerramos juntas.
      </div>
    </div>
  );
}
