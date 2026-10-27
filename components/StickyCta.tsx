'use client';

import Link from 'next/link';
import { urls } from '@/lib/urls';

interface Props {
  visible: boolean;
  precio: string;
  nombre: string;
  agregado: boolean;
  onAgregar: () => void;
}

// Barra fija abajo, solo en mobile: precio + "Agregá al carrito". La muestra la ficha cuando el CTA
// principal sale de pantalla, así la compra queda siempre a un toque.
export function StickyCta({ visible, precio, nombre, agregado, onAgregar }: Props) {
  if (!visible) return null;

  return (
    <div
      data-testid="sticky-cta"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg/95 backdrop-blur md:hidden"
    >
      <div className="container py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-ink">{nombre}</p>
          <p className="font-heading text-xl text-charcoal leading-tight">{precio}</p>
        </div>
        {agregado ? (
          <Link href={urls.carrito} className="btn-outline text-sm">
            Ver carrito →
          </Link>
        ) : (
          <button type="button" onClick={onAgregar} className="btn-primary text-sm">
            Agregá al carrito
          </button>
        )}
      </div>
    </div>
  );
}
