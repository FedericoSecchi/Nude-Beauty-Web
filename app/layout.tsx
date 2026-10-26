import type { Metadata } from 'next';
import { BUILD_ID } from '@/lib/build-id';
import { site } from '@/lib/site';
import { organizationJsonLd } from '@/lib/jsonld';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import './globals.css';

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
    <html lang={site.locale}>
      <head>
        <meta name="build-id" content={BUILD_ID} />
        <JsonLd data={organizationJsonLd()} id="org-ld" />
      </head>
      <body>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
