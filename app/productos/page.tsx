import type { Metadata } from 'next';
import Link from 'next/link';
import { getProductos, getProductosPorCategoria } from '@/lib/catalogo';
import { JsonLd } from '@/components/JsonLd';
import { ProductCard } from '@/components/ProductCard';
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/jsonld';
import { urls } from '@/lib/urls';
import { CategoryFilter } from './CategoryFilter';

// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';
// Sin medio de pago la tienda toma pedidos por WhatsApp (lib/modo-venta.mjs).
const modoWhatsapp = process.env.NEXT_PUBLIC_MODO_VENTA === 'whatsapp';

export const metadata: Metadata = {
  title: 'Productos de cosmética natural',
  description:
    'Todos los productos de NUDE Cosmética Clean: cosmética facial, corporal, kits y accesorios. Fórmulas con activos nombrados, hechas a mano. 20% off por transferencia y envíos a todo el país.',
  alternates: { canonical: urls.productos },
};

export default function ProductosPage() {
  const productos = getProductos();
  const { face, body, sets, accesorios, otros } = getProductosPorCategoria();

  const grupos = [
    { id: 'face', nombre: 'Cosmética facial', items: face },
    { id: 'body', nombre: 'Cosmética corporal', items: body },
    { id: 'sets', nombre: 'Sets y regalos', items: sets },
    { id: 'accesorios', nombre: 'Accesorios', items: accesorios },
    { id: 'otros', nombre: 'Más productos', items: otros },
  ].filter((g) => g.items.length);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Inicio', url: urls.home },
            { name: 'Productos', url: urls.productos },
          ]),
          itemListJsonLd(productos),
        ]}
      />

      <section className="container pt-10 pb-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-ink mb-4">
          <Link href={urls.home} className="link-ghost">Inicio</Link>
          <span> · </span>
          <span>Productos</span>
        </nav>
        <h1 className="font-heading text-3xl md:text-5xl">
          Productos de cosmética natural y clean, hechos a mano
        </h1>
        <p className="mt-4 text-ink/80 max-w-prose">
          Todo el skincare natural de NUDE, en catorce productos: la rutina facial en orden —agua
          micelar, contorno, sérum, crema—, cuidado corporal, kits y accesorios.{' '}
          {modoWhatsapp
            ? 'Elegís, nos mandás el pedido por WhatsApp y te lo enviamos a cualquier punto del país.'
            : `Elegís, pagás con transferencia${mpHabilitado ? ' o Mercado Pago' : ''} y te lo enviamos a cualquier punto del país.`}
        </p>
        <p className="mt-3 text-sm text-muted-ink">
          Precios en pesos argentinos. 20% off pagando con transferencia ·{' '}
          {mpHabilitado ? '3 cuotas sin interés con Mercado Pago · ' : ''}envíos a todo el país.
        </p>
        <p className="mt-3 text-ink/80 max-w-prose text-sm">
          <strong>Qué es skincare clean para NUDE:</strong> fórmulas sin parabenos y con activos
          nombrados — niacinamida, bakuchiol, ácido hialurónico, péptidos.
        </p>
      </section>

      <section className="container pb-10">
        <div className="rounded-lg bg-soft p-6 shadow-card md:p-8 max-w-3xl">
        <h2 className="font-heading text-2xl mb-4">La rutina clean, en orden</h2>
        <ol className="list-decimal list-inside space-y-1 text-ink/80 max-w-prose">
          <li><Link href={urls.producto('agua-micelar-bifasica')} className="link-ghost">Agua Micelar Bifásica</Link> · limpia y desmaquilla.</li>
          <li><Link href={urls.producto('contorno-de-ojos-gleaming-eyes')} className="link-ghost">Contorno de ojos Gleaming Eyes</Link> · ojeras y bolsas.</li>
          <li>Sérum: <Link href={urls.producto('serum-multi-active')} className="link-ghost">Multi Active</Link> de día y de noche · <Link href={urls.producto('serum-transformacion')} className="link-ghost">Transformación</Link> solo de noche.</li>
          <li><Link href={urls.producto('crema-facial-porcelain')} className="link-ghost">Crema Facial Porcelain</Link> · humecta y repara.</li>
          <li>Durante el día, siempre protector solar (no está en NUDE: compralo donde quieras).</li>
        </ol>
        </div>
      </section>

      <CategoryFilter grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre }))} />

      <section className="container pb-24 space-y-14">
        {grupos.map((grupo) => (
          <div key={grupo.id} id={grupo.id} className="scroll-mt-20">
            <h2 className="font-heading text-3xl mb-6">{grupo.nombre}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {grupo.items.map((p) => (
                <ProductCard key={p.slug} producto={p} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
