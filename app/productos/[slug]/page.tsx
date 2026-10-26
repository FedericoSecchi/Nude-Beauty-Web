import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAjustesTienda, getProducto, getProductos, slugsIndexables } from '@/lib/catalogo';
import { formatARS } from '@/lib/format';
import { precioConTransferencia } from '@/lib/pricing';
import { JsonLd } from '@/components/JsonLd';
import { ProductCard } from '@/components/ProductCard';
import { breadcrumbJsonLd, faqJsonLd, productJsonLd } from '@/lib/jsonld';
import { urls } from '@/lib/urls';
import { waLink, waMessages } from '@/lib/whatsapp';
import { AddToCart } from './AddToCart';

// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return slugsIndexables().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProducto(slug);
  if (!p) return {};
  return {
    title: p.seo.title,
    description: p.seo.description,
    alternates: { canonical: urls.producto(p.slug) },
    openGraph: {
      title: p.seo.title,
      description: p.seo.description,
      images: p.imagenes[0] ? [{ url: p.imagenes[0] }] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const p = getProducto(slug);
  if (!p) notFound();

  const tienda = getAjustesTienda();
  const todos = getProductos();
  const relacionados = p.relacionados
    .map((s) => todos.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const incluidos = (p.incluye ?? [])
    .map((s) => todos.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const precioTransfer = precioConTransferencia(p.precio, tienda);
  // El H1 es "Nombre · qué es": en mobile el descriptor va más chico para que entre la compra sin scroll.
  const [nombreH1, ...restoH1] = p.h1.split(' · ');
  const descriptorH1 = restoH1.join(' · ');

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Inicio', url: urls.home },
            { name: 'Productos', url: urls.productos },
            { name: p.nombre, url: urls.producto(p.slug) },
          ]),
          productJsonLd(p, tienda),
          ...(p.faq.length ? [faqJsonLd(p.faq)] : []),
        ]}
      />

      <article className="container pt-4 pb-24 md:pt-10 md:pb-20">
        <nav aria-label="Breadcrumb" className="hidden md:block text-sm text-muted-ink mb-4">
          <Link href={urls.home} className="link-ghost">Inicio</Link>
          <span> · </span>
          <Link href={urls.productos} className="link-ghost">Productos</Link>
          <span> · </span>
          <span>{p.nombre}</span>
        </nav>

        {/* Mobile (360×740): H1 → foto acotada → precio + CTA + WhatsApp → resumen, todo lo de compra
            sin scroll. Desktop: foto a la izquierda y la columna de texto a la derecha, como siempre. */}
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 md:grid-rows-[auto_auto_auto_1fr]">
          <h1 className="order-1 md:order-none md:col-start-2 md:row-start-1 text-2xl md:text-4xl">
            <span className="block md:inline">{nombreH1}</span>
            {descriptorH1 ? (
              <>
                <span className="hidden md:inline"> · </span>
                <span className="block mt-1 font-body text-base text-muted-ink md:inline md:mt-0 md:font-heading md:text-4xl md:text-charcoal">
                  {descriptorH1}
                </span>
              </>
            ) : null}
          </h1>

          <div className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-4 md:self-start mt-3 md:mt-0 relative h-[30vh] md:h-auto md:aspect-[4/5] bg-soft rounded-lg overflow-hidden md:shadow-soft">
            <Image
              src={p.imagenes[0]}
              alt={p.nombre}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain md:object-cover"
              priority
            />
          </div>

          <p className="order-4 md:order-none md:col-start-2 md:row-start-2 mt-6 md:mt-3 text-ink/80">
            {p.resumen}
          </p>

          <div className="order-3 md:order-none md:col-start-2 md:row-start-3">
            <div data-testid="precio" className="mt-4 md:mt-6 flex items-baseline gap-3">
              <span className="font-heading text-3xl text-charcoal">
                {formatARS(p.precio)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-ink">
              {formatARS(precioTransfer)} con transferencia (20% off) ·{' '}
              {mpHabilitado ? `${tienda.cuotasTexto} · ` : ''}envíos a todo el país.
            </p>

            {p.disponible ? (
              <div className="mt-3 md:mt-6">
                <AddToCart slug={p.slug} nombre={p.nombre} precio={p.precio} />
                <p className="mt-2 text-xs text-muted-ink">
                  Elegís la entrega en el paso siguiente.
                </p>
                <p className="mt-2 md:mt-3 text-sm">
                  <a
                    data-testid="wa-ficha"
                    href={waLink(waMessages.producto(p.nombre))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-ghost"
                  >
                    ¿Dudas? Escribinos por WhatsApp
                  </a>
                </p>
              </div>
            ) : (
              <div className="mt-3 md:mt-6">
                <p data-testid="sin-stock" className="font-medium text-charcoal">Sin stock por ahora.</p>
                <a
                  data-testid="wa-ficha"
                  href={waLink(waMessages.sinStock(p.nombre))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline mt-3"
                >
                  Avisame cuando vuelva
                </a>
              </div>
            )}
          </div>

          {incluidos.length ? (
            <div className="order-5 md:order-none md:col-start-2 md:row-start-4 mt-8">
              <h2 className="font-heading text-xl mb-2">Qué incluye</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {incluidos.map((it) => (
                  <li key={it.slug}>
                    <Link href={urls.producto(it.slug)} className="link-ghost">
                      {it.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Detalle del producto en una tarjeta, como las del sitio viejo. Mismo orden de bloques. */}
        <div className="mt-14 rounded-lg bg-card p-6 shadow-card md:p-10 [&>*:first-child]:mt-0">
        {p.activos.length ? (
          <section className="mt-14 max-w-prose">
            <h2 className="font-heading text-2xl mb-4">Activos principales</h2>
            <ul className="space-y-3">
              {p.activos.map((a) => (
                <li key={a.nombre}>
                  <p className="font-medium text-charcoal">{a.nombre}</p>
                  <p className="text-sm text-ink/80">{a.queHace}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10 max-w-prose">
          <h2 className="font-heading text-2xl mb-3">Cómo se usa</h2>
          <p className="text-ink/80">{p.modoDeUso}</p>
        </section>

        <section className="mt-10 max-w-prose">
          <h2 className="font-heading text-2xl mb-3">Ingredientes</h2>
          <p className="text-sm text-ink/80 whitespace-pre-line">{p.ingredientes}</p>
          {p.tamano ? (
            <p className="mt-3 text-sm text-muted-ink">Tamaño: {p.tamano}</p>
          ) : null}
        </section>

        {p.faq.length ? (
          <section className="mt-10 max-w-prose">
            <h2 className="font-heading text-2xl mb-4">Preguntas frecuentes</h2>
            <dl className="space-y-5">
              {p.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-medium text-charcoal">{f.q}</dt>
                  <dd className="text-sm text-ink/80 mt-1">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {p.avisoPatch ? (
          <aside className="mt-10 max-w-prose rounded-md bg-soft p-5 shadow-card">
            <p className="text-sm text-ink/80">
              <strong className="text-charcoal">Prueba de parche:</strong> antes de usarlo por
              primera vez, probá una pequeña cantidad: incluso los ingredientes naturales pueden
              dar reacción. Es solo un pequeño paso para asegurarte de que tu piel esté feliz.
            </p>
          </aside>
        ) : null}
        </div>

        {relacionados.length ? (
          <section className="mt-14">
            <h2 className="font-heading text-3xl mb-6">También te puede gustar</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {relacionados.map((r) => (
                <ProductCard key={r.slug} producto={r} conResumen={false} />
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </>
  );
}
