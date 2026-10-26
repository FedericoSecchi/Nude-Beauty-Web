import type { Metadata } from 'next';
import Link from 'next/link';
import { urls } from '@/lib/urls';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Cómo tratamos tus datos personales en NUDE Cosmética Clean. Ley 25.326 de Protección de los Datos Personales (Argentina).',
  alternates: { canonical: urls.privacidad },
};

export default function PrivacidadPage() {
  return (
    <article className="container py-12 max-w-prose">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-ink mb-4">
        <Link href={urls.home} className="link-ghost">Inicio</Link>
        <span> · </span>
        <span>Privacidad</span>
      </nav>
      <h1 className="font-heading text-3xl md:text-4xl mb-6">Política de privacidad</h1>

      <p className="text-sm text-muted-ink">
        [REVISAR LEGAL] Este texto es un borrador. Antes de publicarlo tiene que leerlo quien se
        ocupa de legales del negocio.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Qué datos recolectamos</h2>
      <ul className="list-disc list-inside space-y-1 text-ink/80">
        <li>Datos de contacto que nos das al comprar: nombre, email, teléfono, dirección.</li>
        <li>Información del pedido y del pago (manejada por Mercado Pago o por transferencia bancaria).</li>
        <li>Datos técnicos (navegador, dispositivo) para que el sitio funcione.</li>
      </ul>

      <h2 className="font-heading text-2xl mt-8 mb-3">Para qué los usamos</h2>
      <ul className="list-disc list-inside space-y-1 text-ink/80">
        <li>Procesar y entregar tu pedido.</li>
        <li>Avisarte sobre el estado del pedido y responder dudas.</li>
        <li>Cumplir obligaciones legales e impositivas.</li>
      </ul>

      <h2 className="font-heading text-2xl mt-8 mb-3">Con quién compartimos tus datos</h2>
      <p className="text-ink/80">
        Compartimos tus datos solo con quienes hacen falta para que el pedido llegue a tu casa:
        Mercado Pago (procesamiento de pago), la empresa de envíos y, si corresponde, la
        autoridad fiscal. No vendemos tus datos a terceros.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Tus derechos</h2>
      <p className="text-ink/80">
        Podés acceder, rectificar o pedir la supresión de tus datos escribiéndonos a{' '}
        <a href={`mailto:${site.contact.email}`} className="link-ghost">
          {site.contact.email}
        </a>
        . Tu información personal se guarda en servidores privados (no en el código del sitio).
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Base legal</h2>
      <p className="text-ink/80">
        Esta política se rige por la Ley 25.326 de Protección de los Datos Personales de la
        República Argentina.
      </p>
    </article>
  );
}
