import Link from 'next/link';
import { urls } from '@/lib/urls';
import { waLink, waMessages } from '@/lib/whatsapp';
import { CartCount } from './CartCount';

export function Header() {
  return (
    <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-30">
      <div className="container flex items-center justify-between py-4">
        <Link
          href={urls.home}
          className="font-heading text-2xl text-charcoal no-underline hover:no-underline"
          aria-label="Inicio NUDE Cosmética Clean"
        >
          nude
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href={urls.productos} className="link-ghost no-underline">
            Productos
          </Link>
          <Link
            href={urls.carrito}
            className="link-ghost no-underline inline-flex items-center gap-1"
            aria-label="Ver carrito"
          >
            Carrito
            <CartCount />
          </Link>
          <a
            href={waLink(waMessages.generica)}
            target="_blank"
            rel="noopener noreferrer"
            className="link-ghost no-underline hidden sm:inline"
          >
            WhatsApp
          </a>
        </nav>
      </div>
    </header>
  );
}
