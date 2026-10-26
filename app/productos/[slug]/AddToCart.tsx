'use client';

import { useState } from 'react';
import Link from 'next/link';
import { urls } from '@/lib/urls';

interface Props {
  slug: string;
  nombre: string;
  precio: number;
}

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
      (it) => it && typeof it.slug === 'string' && Number.isFinite(it.cantidad),
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
    // storage lleno o denegado: igual se avisa al usuario
  }
}

export function AddToCart({ slug, nombre, precio }: Props) {
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const agregar = () => {
    const items = readCart();
    const existente = items.find((i) => i.slug === slug);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({ slug, cantidad, nombre, precio });
    }
    writeCart(items);
    setAgregado(true);
    if (typeof window !== 'undefined' && 'gtag' in window) {
      try {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
          'event',
          'add_to_cart',
          {
            currency: 'ARS',
            value: precio * cantidad,
            items: [{ item_id: slug, item_name: nombre, price: precio, quantity: cantidad }],
          },
        );
      } catch {
        /* medición opcional */
      }
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <label htmlFor="cantidad" className="sr-only">
          Cantidad
        </label>
        <input
          id="cantidad"
          type="number"
          min={1}
          max={10}
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
          className="w-16 rounded border border-border bg-card px-3 py-2 text-center"
        />
        <button type="button" onClick={agregar} className="btn-primary flex-1">
          Agregá al carrito
        </button>
      </div>
      {agregado ? (
        <p className="mt-3 text-sm">
          Agregado al carrito. <Link href={urls.carrito} className="link-ghost">Ir al carrito →</Link>
        </p>
      ) : null}
    </div>
  );
}
