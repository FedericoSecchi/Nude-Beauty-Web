import type { Metadata } from 'next';
import Link from 'next/link';
import { urls } from '@/lib/urls';
import { site } from '@/lib/site';

// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';
// Sin medio de pago la tienda toma pedidos por WhatsApp (lib/modo-venta.mjs).
const modoWhatsapp = process.env.NEXT_PUBLIC_MODO_VENTA === 'whatsapp';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    'Términos y condiciones de uso de la tienda online de NUDE Cosmética Clean.',
  alternates: { canonical: urls.terminos },
};

export default function TerminosPage() {
  return (
    <article className="container py-12 max-w-prose">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-ink mb-4">
        <Link href={urls.home} className="link-ghost">Inicio</Link>
        <span> · </span>
        <span>Términos y condiciones</span>
      </nav>
      <h1 className="font-heading text-3xl md:text-4xl mb-6">Términos y condiciones</h1>

      <h2 className="font-heading text-2xl mt-8 mb-3">Quiénes somos</h2>
      <p className="text-ink/80">
        {site.name}, CUIT {site.legal.cuit}, con domicilio en{' '}
        {site.address.locality}, {site.address.region}, Argentina. Contacto:{' '}
        <a href={`mailto:${site.contact.email}`} className="link-ghost">
          {site.contact.email}
        </a>.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Compras y precios</h2>
      <p className="text-ink/80">
        Los precios están en pesos argentinos (ARS). Los precios, los descuentos y la
        disponibilidad se confirman en el momento de la compra, a partir del catálogo del sitio,
        con independencia de lo que muestre tu navegador.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Medios de pago</h2>
      <ul className="list-disc list-inside space-y-1 text-ink/80">
        {mpHabilitado ? (
          <li>Mercado Pago (tarjeta de crédito o débito y otros medios habilitados).</li>
        ) : null}
        {modoWhatsapp ? (
          <li>
            Por ahora los pedidos se hacen por WhatsApp: armás el carrito en la web y nos lo mandás
            con el botón «Enviar pedido por WhatsApp». Te respondemos con los datos para pagar por
            transferencia bancaria (20% off sobre el precio de lista) y coordinamos la entrega. El
            pedido queda confirmado cuando recibimos el pago.
          </li>
        ) : (
          <li>
            Transferencia bancaria con 20% off: al confirmar el pedido te mostramos los datos para
            transferir.
          </li>
        )}
      </ul>

      <h2 className="font-heading text-2xl mt-8 mb-3">Envíos</h2>
      <p className="text-ink/80">
        Hacemos envíos a todo el país. El costo y el plazo dependen de la zona y los
        coordinamos por WhatsApp una vez confirmado el pedido.
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Cambios y devoluciones</h2>
      <p className="text-ink/80">
        Ver{' '}
        <Link href={urls.cambios} className="link-ghost">
          Cambios y devoluciones
        </Link>{' '}
        y el{' '}
        <Link href={urls.arrepentimiento} className="link-ghost">
          botón de arrepentimiento
        </Link>
        .
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Privacidad y datos personales</h2>
      <p className="text-ink/80">
        Tratamos tus datos según la Ley 25.326 de Protección de los Datos Personales. Más detalle
        en nuestra{' '}
        <Link href={urls.privacidad} className="link-ghost">
          política de privacidad
        </Link>
        .
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Autoridad de aplicación</h2>
      <p className="text-ink/80">
        Como consumidora o consumidor podés hacer tus reclamos ante la autoridad competente en
        Argentina:{' '}
        <a
          href={site.legal.defensaConsumidorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-ghost"
        >
          Defensa de las y los consumidores
        </a>
        .
      </p>
    </article>
  );
}
