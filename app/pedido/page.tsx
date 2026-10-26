import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedido',
  description: 'Estado del pedido.',
  robots: { index: false, follow: false },
};

export default function PedidoPage() {
  return (
    <section className="container py-12 max-w-prose">
      <h1 className="font-heading text-3xl mb-4">Pedido</h1>
      <p className="text-ink/80">
        En construcción. Después del cierre del checkout, acá va a aparecer el estado y los
        próximos pasos.
      </p>
    </section>
  );
}
