import Link from 'next/link';
import { formatARS } from '@/lib/format';
import { urls } from '@/lib/urls';
import type { Producto } from '@/lib/types';

interface Props {
  producto: Producto;
  // Sin resumen: tarjeta compacta ("También te puede gustar").
  conResumen?: boolean;
  sizes?: string;
}

// Miniaturas de 480 y 768 px que genera scripts/miniaturas.mjs en el build.
function miniatura(src: string, ancho: 480 | 768): string {
  return src.replace(/\.(webp|jpe?g|png)$/i, `-${ancho}w.webp`);
}

// Tarjeta de producto con la foto real, radio y sombra suave como las tarjetas del sitio viejo
// (legacy/styles.css: --shadow-card, y --shadow-soft al pasar el mouse).
export function ProductCard({
  producto: p,
  conResumen = true,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}: Props) {
  return (
    <li className="group flex flex-col overflow-hidden rounded-lg bg-card shadow-card transition-shadow hover:shadow-soft">
      <Link
        href={urls.producto(p.slug)}
        className="no-underline hover:no-underline flex flex-col h-full"
      >
        <div className="aspect-[4/5] relative bg-soft overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={miniatura(p.imagenes[0], 480)}
            srcSet={`${miniatura(p.imagenes[0], 480)} 480w, ${miniatura(p.imagenes[0], 768)} 768w, ${p.imagenes[0]} 1024w`}
            sizes={sizes}
            alt={p.nombre}
            width={480}
            height={600}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-col gap-2 p-5 flex-1">
          <h3 className="font-heading text-xl text-charcoal">{p.nombre}</h3>
          {conResumen ? <p className="text-sm text-muted-ink flex-1">{p.resumen}</p> : null}
          <p className="font-medium text-charcoal">{formatARS(p.precio)}</p>
          {!p.disponible ? <p className="text-xs text-muted-ink">Sin stock por ahora</p> : null}
        </div>
      </Link>
    </li>
  );
}
