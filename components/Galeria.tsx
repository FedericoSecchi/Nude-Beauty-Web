'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Props {
  imagenes: string[];
  alt: string;
}

// Miniaturas de 480 px que genera scripts/miniaturas.mjs en el build.
function miniatura(src: string): string {
  return src.replace(/\.(webp|jpe?g|png)$/i, '-480w.webp');
}

// Foto principal + tira de miniaturas. Con una sola foto se ve igual que antes (sin tira).
// La primera foto va con priority: es la imagen LCP de la ficha.
export function Galeria({ imagenes, alt }: Props) {
  const [activa, setActiva] = useState(0);
  const fotos = imagenes.length > 0 ? imagenes : [];
  const actual = fotos[activa] ?? fotos[0];

  return (
    <div className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-4 md:self-start mt-3 md:mt-0">
      <div className="relative h-[30vh] md:h-auto md:aspect-[4/5] bg-soft rounded-lg overflow-hidden md:shadow-soft">
        {actual ? (
          <Image
            key={actual}
            src={actual}
            alt={activa === 0 ? alt : `${alt} · foto ${activa + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain md:object-cover"
            priority={activa === 0}
          />
        ) : null}
      </div>
      {fotos.length > 1 ? (
        <ul className="mt-2 flex gap-2 overflow-x-auto md:mt-3" aria-label="Fotos del producto">
          {fotos.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiva(i)}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                aria-current={i === activa ? 'true' : undefined}
                className={`block h-11 w-11 md:h-16 md:w-16 overflow-hidden rounded border-2 bg-soft ${
                  i === activa ? 'border-charcoal' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miniatura(src)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
