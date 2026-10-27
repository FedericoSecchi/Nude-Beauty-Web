import type { Metadata } from 'next';
import Link from 'next/link';
import { urls } from '@/lib/urls';
import { waLink, waMessages } from '@/lib/whatsapp';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Cambios y devoluciones',
  description:
    'Política de cambios y devoluciones de NUDE Cosmética Clean. Devoluciones y cambios dentro de los 10 días corridos, sellos intactos y procedimiento por WhatsApp o email.',
  alternates: { canonical: urls.cambios },
};

export default function CambiosPage() {
  return (
    <article className="container py-12 max-w-prose">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-ink mb-4">
        <Link href={urls.home} className="link-ghost">Inicio</Link>
        <span> · </span>
        <span>Cambios y devoluciones</span>
      </nav>
      <h1 className="font-heading text-3xl md:text-4xl mb-6">Cambios y devoluciones</h1>

      <p className="text-ink/80">
        Nuestra política sigue lo que marca la Ley de Defensa del Consumidor y los usos de los
        productos cosméticos (son productos de uso personal: no aceptamos devoluciones de
        productos abiertos o usados, por higiene).
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Devoluciones</h2>
      <p className="text-ink/80">
        Tenés 10 días corridos desde la compra para pedir una devolución. El producto tiene que
        estar sin uso, en su envase original cerrado y con el sello intacto.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Cambios</h2>
      <p className="text-ink/80">
        Tenés 10 días corridos desde que recibís el pedido para pedir un cambio, en las mismas
        condiciones (sin uso, cerrado, con sello).
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Falla, daño o producto equivocado</h2>
      <p className="text-ink/80">
        Si el producto llegó roto, con falla de fábrica o es distinto del que pediste: avisanos
        dentro de las 48 h con fotos y lo cambiamos sin costo.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Envío del cambio</h2>
      <p className="text-ink/80">
        El envío del cambio lo pagamos nosotros si el error es nuestro; si el cambio es por
        decisión tuya, lo paga quien compra. Si no retirás el producto y pedís reembolso, se
        devuelve lo pagado menos el costo de packaging y preparación.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Reembolso</h2>
      <p className="text-ink/80">
        El reembolso se hace por el mismo medio de pago original.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Cómo pedirlo</h2>
      <p className="text-ink/80">
        Escribinos por{' '}
        <a
          href={waLink(waMessages.generica)}
          target="_blank"
          rel="noopener noreferrer"
          className="link-ghost"
        >
          WhatsApp
        </a>{' '}
        o por mail a{' '}
        <a href={`mailto:${site.contact.email}`} className="link-ghost">
          {site.contact.email}
        </a>{' '}
        con tu número de orden y el motivo. También podés usar el{' '}
        <Link href={urls.arrepentimiento} className="link-ghost">
          botón de arrepentimiento
        </Link>{' '}
        si estás dentro de los 10 días.
      </p>
    </article>
  );
}
