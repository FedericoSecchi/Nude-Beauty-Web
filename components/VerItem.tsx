'use client';

import { useEffect } from 'react';
import { eventoEcommerce, itemGA } from '@/lib/analytics';

// view_item al abrir la ficha (con o sin stock).
export function VerItem({ slug, nombre, precio }: { slug: string; nombre: string; precio: number }) {
  useEffect(() => {
    eventoEcommerce('view_item', precio, [itemGA({ slug, nombre, precio, cantidad: 1 })]);
  }, [slug, nombre, precio]);
  return null;
}
