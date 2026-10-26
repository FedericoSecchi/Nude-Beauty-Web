import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getProductos, getProductosPorCategoria } from '@/lib/catalogo';
import { formatARS } from '@/lib/format';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/jsonld';
import { urls } from '@/lib/urls';
import { CategoryFilter } from './CategoryFilter';

export const metadata: Metadata = {
  title: 'Productos de cosmética natural',
  description:
    'Todos los productos de NUDE Cosmética Clean: cosmética facial, corporal, kits y accesorios. Fórmulas con activos nombrados, hechas a mano. 20% off por transferencia y envíos a todo el país.',
  alternates: { canonical: urls.productos },
};

export default function ProductosPage() {
  const productos = getProductos();
  const { face, body, sets, accesorios } = getProductosPorCategoria();

  const grupos = [
    { id: 'face', nombre: 'Cosmética facial', items: face },
    { id: 'body', nombre: 'Cosmética corporal', items: body },
    { id: 'sets', nombre: 'Sets y regalos', items: sets },
    { id: 'accesorios', nombre: 'Accesorios', items: accesorios },
  ];

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
        <h1 className="font-heading text-3xl md:text-4xl">
          Productos de cosmética natural y clean, hechos a mano
        </h1>
        <p className="mt-4 text-ink/80 max-w-prose">
          Catorce fórmulas pensadas en orden: la rutina facial completa (micelar, contorno, serum,
          crema), cuidado corporal, kits para empezar o regalar y los accesorios que acompañan la
          rutina.
        </p>
        <p className="mt-3 text-sm text-muted-ink">
          Precios en pesos argentinos. 20% off pagando con transferencia · 3 cuotas sin interés con
          tarjeta · envíos a todo el país.
        </p>
      </section>

      <CategoryFilter grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre }))} />

      <section className="container pb-24 space-y-14">
        {grupos.map((grupo) => (
          <div key={grupo.id} id={grupo.id} className="scroll-mt-20">
            <h2 className="font-heading text-2xl mb-6">{grupo.nombre}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {grupo.items.map((p) => (
                <li key={p.slug} className="card flex flex-col">
                  <Link
                    href={urls.producto(p.slug)}
                    className="no-underline hover:no-underline flex flex-col gap-3 h-full"
                  >
                    <div className="aspect-[4/5] relative bg-soft overflow-hidden rounded">
                      <Image
                        src={p.imagenes[0]}
                        alt={p.nombre}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-heading text-xl text-charcoal">{p.nombre}</h3>
                    <p className="text-sm text-muted-ink flex-1">{p.resumen}</p>
                    <p className="font-medium text-charcoal">{formatARS(p.precio)}</p>
                    {!p.disponible ? (
                      <p className="text-xs text-muted-ink">Sin stock por ahora</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
