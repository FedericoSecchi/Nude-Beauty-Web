import type { Metadata } from 'next';
import { BUILD_ID } from '@/lib/build-id';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://nudecosmetica.com'),
  title: {
    default: 'NUDE Cosmética Clean — cosmética natural hecha a mano en Córdoba',
    template: '%s · NUDE Cosmética Clean',
  },
  description:
    'Cosmética natural hecha a mano en Mendiolaza, Córdoba. Fórmulas con activos nombrados (niacinamida, bakuchiol, ácido hialurónico), 20% off por transferencia y envíos a todo el país.',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'NUDE Cosmética Clean',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <meta name="build-id" content={BUILD_ID} />
      </head>
      <body>{children}</body>
    </html>
  );
}
