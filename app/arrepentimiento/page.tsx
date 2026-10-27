import type { Metadata } from 'next';
import Link from 'next/link';
import { urls } from '@/lib/urls';
import { site } from '@/lib/site';
import { ArrepentimientoForm } from './ArrepentimientoForm';

export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description:
    'Podés arrepentirte de tu compra dentro de los 10 días corridos. Resolución SCI 424/2020 (Argentina).',
  alternates: { canonical: urls.arrepentimiento },
};

export default function ArrepentimientoPage() {
  return (
    <article className="container py-12 max-w-prose">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-ink mb-4">
        <Link href={urls.home} className="link-ghost">Inicio</Link>
        <span> · </span>
        <span>Botón de arrepentimiento</span>
      </nav>
      <h1 className="font-heading text-3xl md:text-4xl mb-4">Botón de arrepentimiento</h1>
      <p className="text-ink/80">
        En Argentina tenés derecho a arrepentirte de una compra online dentro de los 10 días
        corridos de recibida (Res. SCI 424/2020 y Ley de Defensa del Consumidor). No necesitás
        darnos explicaciones ni registrarte. Te devolvemos lo que pagaste por el mismo medio en
        el que lo pagaste.
      </p>
      <p className="mt-3 text-ink/80">
        Si el producto está sin uso, en su envase original cerrado y con el sello intacto, lo
        tomamos y te reintegramos lo pagado.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Hacé tu solicitud</h2>
      <ArrepentimientoForm />

      <p className="mt-6 text-sm text-muted-ink">
        Si preferís, también podés escribirnos a{' '}
        <a href={`mailto:${site.contact.email}`} className="link-ghost">
          {site.contact.email}
        </a>{' '}
        con tu número de orden.
      </p>
    </article>
  );
}
