import Link from 'next/link';
import { site } from '@/lib/site';
import { urls } from '@/lib/urls';
import { waLink, waMessages } from '@/lib/whatsapp';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-soft">
      <div className="container py-12 grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-heading text-2xl text-charcoal">nude</p>
          <p className="mt-3 text-sm text-muted-ink max-w-xs">
            Cosmética natural hecha a mano, en pequeños lotes, en Mendiolaza (Córdoba).
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
              {site.name} · CUIT {site.legal.cuit} · {site.address.locality}, {site.address.region}, Argentina.
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
