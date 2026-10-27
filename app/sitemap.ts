import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { getProductos } from '@/lib/catalogo';
import { absolute, urls } from '@/lib/urls';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const estaticas = [
    { url: absolute(urls.home), priority: 1 },
    { url: absolute(urls.productos), priority: 0.9 },
    { url: absolute(urls.cambios), priority: 0.3 },
    { url: absolute(urls.terminos), priority: 0.3 },
    { url: absolute(urls.privacidad), priority: 0.3 },
    { url: absolute(urls.arrepentimiento), priority: 0.3 },
  ];
  const productos = getProductos().map((p) => ({
    url: absolute(urls.producto(p.slug)),
    priority: 0.8,
  }));
  return [...estaticas, ...productos].map((it) => ({
    url: it.url,
    changeFrequency: 'weekly',
    priority: it.priority,
    lastModified: now,
  }));
}

export const dynamic = 'force-static';
export const metadataBaseFallback = site.url;
