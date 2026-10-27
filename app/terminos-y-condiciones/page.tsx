import type { Metadata } from 'next';
import Link from 'next/link';
import { urls } from '@/lib/urls';
import { site } from '@/lib/site';
import { getAjustesEnvios, getAjustesTienda } from '@/lib/catalogo';
import { formatARS } from '@/lib/format';

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

const pct = (p: number) => `${Math.round(p * 100)}%`;

export default function TerminosPage() {
  const tienda = getAjustesTienda();
  const envios = getAjustesEnvios();
  const dq = tienda.descuentoCantidad;
  const zonasFijas = envios.zonas.filter((z) => z.modo === 'fijo');
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
      <p className="text-ink/80 mt-3">
        Comprando {dq.minUnidades} o más unidades tenés {pct(dq.porcentaje)} off sobre el precio de lista.
        Pagando con transferencia tenés {pct(tienda.descuentoTransferencia)} off
        {tienda.descuentosAcumulables
          ? `: si además aplica el ${pct(dq.porcentaje)}, el ${pct(tienda.descuentoTransferencia)} se calcula sobre el precio ya descontado.`
          : ` (no se suma al ${pct(dq.porcentaje)} por cantidad).`}
        {mpHabilitado ? ` Con Mercado Pago aplica solo el ${pct(dq.porcentaje)} por cantidad.` : ''}
      </p>

      <h2 className="font-heading text-2xl mt-8 mb-3">Medios de pago</h2>
      <ul className="list-disc list-inside space-y-1 text-ink/80">
        {mpHabilitado ? (
          <li>Mercado Pago (tarjeta de crédito o débito y otros medios habilitados).</li>
        ) : null}
        {modoWhatsapp ? (
          <li>
            Por ahora los pedidos se hacen por WhatsApp: armás el carrito en la web y nos lo mandás
            con el botón «Enviar pedido por WhatsApp». Te respondemos para confirmar el pedido, lo
            pagás por transferencia bancaria (con {pct(tienda.descuentoTransferencia)} off) y
            coordinamos la entrega. El pedido queda confirmado cuando recibimos el pago.
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
        Hacemos envíos a todo el país.
        {zonasFijas.map((z) => ` ${z.nombre}: ${formatARS(z.costo)}.`).join('')} Al resto de Córdoba
        y del país, el costo depende del tamaño del paquete y del destino: te lo pasamos por WhatsApp
        antes de que pagues.
        {envios.retiro.habilitado
          ? ` ${envios.retiro.direccionTexto}: la dirección exacta te la pasamos cuando confirmás el pedido.`
          : ''}
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
