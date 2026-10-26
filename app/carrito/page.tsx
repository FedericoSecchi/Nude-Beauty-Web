import type { Metadata } from 'next';
import { CarritoCliente } from './CarritoCliente';

export const metadata: Metadata = {
  title: 'Carrito',
  description: 'Revisá tu pedido y elegí envío o retiro.',
  robots: { index: false, follow: false },
};

export default function CarritoPage() {
  return (
    <section className="container py-12 max-w-3xl">
      <h1 className="font-heading text-3xl mb-6">Tu carrito</h1>
      <CarritoCliente />
    </section>
  );
}
