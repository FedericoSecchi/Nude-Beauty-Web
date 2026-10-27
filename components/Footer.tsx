import Link from 'next/link';
import { site } from '@/lib/site';
import { urls } from '@/lib/urls';
import { waLink, waMessages } from '@/lib/whatsapp';

export function Footer() {
  return (
    <footer className="relative isolate mt-24 overflow-hidden border-t border-border bg-soft">
      {/* Rama de hojas recortada de la foto del hero (legacy/img-old/hero-bg.jpg): detalle de marca.
          multiply + máscara radial funden su fondo crema con el del pie. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/marca/hojas-260.webp"
        alt=""
        aria-hidden="true"
        width={260}
        height={493}
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute -bottom-4 right-0 -z-10 hidden md:block w-24 opacity-60 mix-blend-multiply [transform:scaleX(-1)] [mask-image:radial-gradient(closest-side,black_55%,transparent)] xl:w-28"
      />
      <div className="container py-12 grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-heading text-2xl text-charcoal">nude</p>
          <p className="mt-3 text-sm text-muted-ink max-w-xs">
            Cosmética natural hecha a mano por Soledad, en pequeños lotes, en Mendiolaza (Córdoba).
          </p>
        </div>

        <div>
          <h3 className="font-heading text-lg mb-3">Tienda</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href={urls.productos} className="link-ghost">Todos los productos</Link></li>
            <li><Link href={urls.cambios} className="link-ghost">Cambios y devoluciones</Link></li>
            <li><Link href={urls.terminos} className="link-ghost">Términos y condiciones</Link></li>
            <li><Link href={urls.privacidad} className="link-ghost">Política de privacidad</Link></li>
            <li>
              <Link href={urls.arrepentimiento} className="link-ghost">
                Botón de arrepentimiento
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-lg mb-3">Hablamos por acá</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href={waLink(waMessages.generica)}
                target="_blank"
                rel="noopener noreferrer"
                className="link-ghost"
              >
                WhatsApp: {site.contact.whatsapp}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.contact.email}`} className="link-ghost">
                {site.contact.email}
              </a>
            </li>
            <li>
              <a
                href={site.contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-ghost"
              >
                @{site.contact.instagram}
              </a>
            </li>
            <li className="pt-3 text-xs text-muted-ink">
              {/* Igual que el pie de su tienda (Soledad, 27-10-2026). Sin condición frente al IVA. */}
              {site.name} · CUIT {site.legal.cuit} · {site.address.locality}, {site.address.region}
            </li>
            <li className="text-xs text-muted-ink">
              <a
                href={site.legal.defensaConsumidorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-ghost"
              >
                Defensa de las y los consumidores
              </a>{' '}
              · {' '}
              <Link href={urls.arrepentimiento} className="link-ghost">
                Botón de arrepentimiento
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4">
        <p className="container text-xs text-muted-ink">
          © {new Date().getFullYear()} {site.name}. Hecho con cariño en Córdoba.
        </p>
      </div>
    </footer>
  );
}
