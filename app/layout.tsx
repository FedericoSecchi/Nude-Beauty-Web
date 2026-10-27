import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { BUILD_ID } from '@/lib/build-id';
import { site } from '@/lib/site';
import { organizationJsonLd } from '@/lib/jsonld';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { GA4 } from '@/components/GA4';
import { IdentityRedirect } from '@/components/IdentityRedirect';
import './globals.css';

// Cormorant solo en 400: es el único peso que usan los encabezados y la marca. Un peso estático pesa
// menos que el archivo variable y la fuente se precarga junto con la foto del hero (LCP).
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-cormorant',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    locale: site.ogLocale,
    siteName: site.name,
    url: site.url,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: site.url },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.locale} className={`${cormorant.variable} ${dmSans.variable}`}>
      <head>
        <meta name="build-id" content={BUILD_ID} />
        <JsonLd data={organizationJsonLd()} id="org-ld" />
      </head>
      <body>
        <GA4 />
        <IdentityRedirect />
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
