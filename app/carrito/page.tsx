import type { Metadata } from 'next';
import { getAjustesEnvios, getAjustesTienda, getProductos } from '@/lib/catalogo';
import { CarritoCliente } from './CarritoCliente';

// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';
// Sin medio de pago la tienda toma pedidos por WhatsApp (lib/modo-venta.mjs).
const modoWhatsapp = process.env.NEXT_PUBLIC_MODO_VENTA === 'whatsapp';

export const metadata: Metadata = {
  title: 'Carrito',
  description: modoWhatsapp
    ? 'Revisá tu pedido, elegí la entrega y mandalo por WhatsApp.'
    : mpHabilitado
      ? 'Revisá tu pedido, elegí la entrega y pagá con transferencia o Mercado Pago.'
      : 'Revisá tu pedido, elegí la entrega y pagá con transferencia.',
  robots: { index: false, follow: false },
};

export default function CarritoPage() {
  const productos = getProductos().map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    precio: p.precio,
    disponible: p.disponible,
    imagen: p.imagenes[0] ?? null,
  }));
  // Con Mercado Pago apagado el texto de cuotas no viaja al navegador (ni el nombre del campo).
  const { cuotasTexto, ...tienda } = getAjustesTienda();
  const envios = getAjustesEnvios();
  return (
    <section className="container py-12 max-w-3xl">
      <h1 className="font-heading text-3xl mb-6">Tu carrito</h1>
      <CarritoCliente
        productos={productos}
        tienda={tienda}
        envios={envios}
        textoMp={mpHabilitado ? cuotasTexto : undefined}
      />
    </section>
  );
}
