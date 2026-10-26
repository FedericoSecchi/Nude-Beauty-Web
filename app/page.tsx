import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getProductos } from '@/lib/catalogo';
import { formatARS } from '@/lib/format';
import { JsonLd } from '@/components/JsonLd';
import { itemListJsonLd } from '@/lib/jsonld';
import { urls } from '@/lib/urls';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: `${site.name} · cosmética clean hecha a mano en Córdoba`,
  description: site.description,
  openGraph: {
    title: `${site.name} · cosmética clean hecha a mano en Córdoba`,
    description: site.description,
  },
};

export default function HomePage() {
  const productos = getProductos();
  const destacados = productos.filter((p) =>
    [
      'serum-multi-active',
      'serum-transformacion',
      'kit-facial-new-skin',
    ].includes(p.slug),
  );

  return (
    <>
      <JsonLd data={itemListJsonLd(destacados)} />

      <section className="container pt-10 pb-14 md:pt-20 md:pb-24">
        <div className="max-w-prose">
          <h1 className="font-body uppercase tracking-widest text-xs leading-normal text-terracotta mb-4">
            Cosmética clean hecha a mano en Córdoba
          </h1>
          <p className="font-heading text-4xl md:text-5xl leading-tight text-charcoal">
            Tu piel no necesita veinte productos: necesita los correctos, en orden.
          </p>
          <p className="mt-5 text-ink/80 text-lg">
            NUDE es cosmética clean de Mendiolaza, Córdoba: cosmética natural hecha a mano, en
            pequeños lotes. Cada activo va con su nombre: niacinamida al 5%, bakuchiol, ácido
            hialurónico, péptidos. Sin parabenos.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={urls.productos} className="btn-primary">
              Mirá la rutina completa
            </Link>
            <Link href={urls.producto('kit-facial-new-skin')} className="btn-outline">
              Kit con los básicos
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-ink">
            20% off pagando con transferencia · 3 cuotas sin interés · envíos a todo el país.
          </p>
        </div>
      </section>

      <section className="container pb-16">
        <div className="max-w-prose">
          <h2 className="font-heading text-2xl mb-4">
            Qué quiere decir cosmética clean
          </h2>
          <p className="text-ink/80">
            Fórmulas sin parabenos y con activos nombrados, no genéricos: dice qué tiene cada
            producto y, cuando corresponde, en qué cantidad. Y una rutina armada en orden: agua
            micelar → contorno de ojos → sérum → crema → protector solar.
          </p>
          <p className="mt-3 text-ink/80">
            Todo se hace a mano, en pequeños lotes, en Mendiolaza (Córdoba), y se envía a todo el
            país.
          </p>
        </div>
      </section>

      <section className="container pb-20">
        <h2 className="font-heading text-2xl mb-6">Por dónde empezar</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destacados.map((p) => (
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
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Link href={urls.productos} className="link-ghost">
            Ver todos los productos →
          </Link>
        </div>
      </section>
    </>
  );
}
