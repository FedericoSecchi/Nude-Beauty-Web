'use client';

import { useEffect } from 'react';
import { evento } from '@/lib/analytics';

// contacto_whatsapp: clic en cualquier link de consulta por WhatsApp marcado con
// data-wa-ubicacion="…" (header, footer, home, ficha, sin stock, pedido). Un solo listener para todo
// el sitio, así los componentes de servidor no necesitan JS propio. El botón «Enviar pedido por
// WhatsApp» del carrito no lleva el atributo: dispara click_whatsapp (la conversión).
// Solo viaja la ubicación: nunca el href (wa.me con el texto del mensaje).
export function ContactoWhatsapp() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('a[data-wa-ubicacion]');
      if (!el) return;
      evento('contacto_whatsapp', { ubicacion: el.getAttribute('data-wa-ubicacion') ?? 'otra' });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
