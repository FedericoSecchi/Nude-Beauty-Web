import type { Metadata } from 'next';
import { PedidoCliente } from './PedidoCliente';

export const metadata: Metadata = {
  title: 'Tu pedido',
  description: 'Estado de tu pedido en NUDE Cosmética Clean.',
  robots: { index: false, follow: false },
};

export default function PedidoPage() {
  return (
    <section className="container py-12 max-w-prose">
      <PedidoCliente />
    </section>
  );
}
