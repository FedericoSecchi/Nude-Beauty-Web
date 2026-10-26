import type { Metadata } from 'next';
import { getAjustesEnvios, getAjustesTienda, getProductos } from '@/lib/catalogo';
import { CarritoCliente } from './CarritoCliente';

export const metadata: Metadata = {
  title: 'Carrito',
  description: 'Revisá tu pedido, elegí la entrega y pagá con transferencia o Mercado Pago.',
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
  const tienda = getAjustesTienda();
  const envios = getAjustesEnvios();
  return (
    <section className="container py-12 max-w-3xl">
      <h1 className="font-heading text-3xl mb-6">Tu carrito</h1>
      <CarritoCliente productos={productos} tienda={tienda} envios={envios} />
    </section>
  );
}
