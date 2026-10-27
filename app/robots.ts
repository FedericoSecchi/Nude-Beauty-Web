import type { MetadataRoute } from 'next';
import { absolute } from '@/lib/urls';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/carrito/', '/pedido/', '/admin/', '/.netlify/'],
      },
    ],
    sitemap: absolute('/sitemap.xml'),
  };
}

export const dynamic = 'force-static';
