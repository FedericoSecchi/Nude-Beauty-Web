import type { Metadata } from 'next';
import Link from 'next/link';
import { getProductos } from '@/lib/catalogo';
import { JsonLd } from '@/components/JsonLd';
import { ProductCard } from '@/components/ProductCard';
import { itemListJsonLd } from '@/lib/jsonld';
import { urls } from '@/lib/urls';
import { site } from '@/lib/site';
import { waLink, waMessages } from '@/lib/whatsapp';

// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';

export const metadata: Metadata = {
  title: `${site.name} · cosmética clean hecha a mano en Córdoba`,
  description: site.description,
  openGraph: {
    title: `${site.name} · cosmética clean hecha a mano en Córdoba`,
    description: site.description,
  },
};

// "¿Por qué cosmética clean?": solo afirmaciones con fuente (seo/00-contexto.md, líneas 35, 36 y 38).
// No va "cruelty-free y vegano": está marcado [CONFIRMAR] en el contexto.
const porQueClean = [
  {
    titulo: 'Sin parabenos',
    texto: 'Fórmulas sin parabenos.',
    icono: (
      // Frasco de laboratorio (mismo ícono que el sitio viejo)
      <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    ),
  },
  {
    titulo: 'Cada activo con su nombre',
    texto:
      'Activos nombrados, no genéricos: dice qué tiene cada producto y, cuando corresponde, en qué cantidad.',
    icono: (
      // Etiqueta
      <>
        <path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path d="M6 6h.008v.008H6V6Z" />
      </>
    ),
  },
  {
    titulo: 'Hecho a mano, en pequeños lotes',
    texto: 'Todo se hace a mano, en pequeños lotes, en Mendiolaza (Córdoba), y se envía a todo el país.',
    icono: (
      // Mano
      <path d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
    ),
  },
];

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

      {/* Hero a pantalla completa con la foto del sitio viejo (es el LCP: sin lazy-load y con prioridad
          alta). En mobile va un recorte vertical de la izquierda para que se vean las hojas. */}
      <section className="relative isolate flex min-h-[calc(100svh-4.125rem)] items-end justify-center overflow-hidden md:items-center">
        <picture>
          <source
            media="(max-width: 767px)"
            type="image/webp"
            srcSet="/img/marca/hero-mobile-480.webp 480w, /img/marca/hero-mobile-640.webp 640w"
            sizes="100vw"
            width={760}
            height={1080}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/marca/hero-1440.webp"
            srcSet="/img/marca/hero-960.webp 960w, /img/marca/hero-1440.webp 1440w, /img/marca/hero-1920.webp 1920w"
            sizes="100vw"
            width={1920}
            height={1080}
            alt=""
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-left md:object-center"
          />
        </picture>
        {/* Velo crema para que el texto se lea. En mobile es un degradé desde abajo: el texto va abajo
            y las hojas quedan limpias arriba. En desktop, velo parejo como el sitio viejo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-bg/95 via-bg/80 via-55% to-bg/0 md:bg-none md:bg-bg/40"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-bg to-transparent"
        />

        <div className="container pb-8 pt-40 text-center md:py-10">
          <p className="font-heading text-7xl leading-none tracking-tight text-charcoal sm:text-8xl md:text-9xl">
            nude
          </p>
          <h1 className="mt-4 font-heading text-2xl leading-tight text-charcoal md:text-4xl">
            Cosmética clean hecha a mano en Córdoba
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-ink/80 md:max-w-xl md:text-lg">
            Tu piel no necesita veinte productos: necesita los correctos, en orden.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href={urls.productos} className="btn-primary w-full max-w-[17rem] sm:w-auto sm:min-w-[13rem]">
              Ver productos
            </Link>
            <a
              href={waLink(waMessages.generica)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full max-w-[17rem] bg-bg/40 sm:w-auto sm:min-w-[13rem]"
            >
              Escribinos por WhatsApp
            </a>
          </div>
          <p className="mx-auto mt-5 max-w-xs text-sm text-ink/75 sm:max-w-none">
            20% off pagando con transferencia · {mpHabilitado ? '3 cuotas sin interés · ' : ''}envíos a
            todo el país.
          </p>
        </div>
      </section>

      <section className="bg-bg py-16 md:py-24">
        <div className="container max-w-3xl text-center">
          <p className="font-heading text-2xl leading-snug text-charcoal md:text-3xl">
            NUDE es cosmética clean de Mendiolaza, Córdoba: cosmética natural hecha a mano, en
            pequeños lotes. Cada activo va con su nombre: niacinamida al 5%, bakuchiol, ácido
            hialurónico, péptidos. Sin parabenos.
          </p>
        </div>
      </section>

      <section className="bg-soft py-16 md:py-24">
        <div className="container">
          <h2 className="text-center text-3xl md:text-5xl mb-10 md:mb-14">¿Por qué cosmética clean?</h2>
          <ul className="grid gap-6 md:grid-cols-3 lg:gap-10">
            {porQueClean.map((item) => (
              <li key={item.titulo} className="rounded-lg bg-bg/60 p-8 text-center shadow-card">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream">
                  <svg
                    aria-hidden="true"
                    className="h-7 w-7 text-terracotta"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.icono}
                  </svg>
                </div>
                <h3 className="text-2xl mb-3">{item.titulo}</h3>
                <p className="text-sm leading-relaxed text-muted-ink">{item.texto}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-10 max-w-prose text-center text-ink/80">
            Una rutina armada en orden: agua micelar → contorno de ojos → sérum → crema →
            protector solar.
          </p>
        </div>
      </section>

      <section className="bg-bg py-16 md:py-24">
        <div className="container">
          <h2 className="text-center text-3xl md:text-5xl mb-10 md:mb-14">Por dónde empezar</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {destacados.map((p) => (
              <ProductCard key={p.slug} producto={p} />
            ))}
          </ul>
          <div className="mt-12 text-center">
            <Link href={urls.productos} className="btn-outline">
              Ver todos los productos →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
