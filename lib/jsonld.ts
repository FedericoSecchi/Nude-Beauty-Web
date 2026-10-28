import { site } from './site';
import type { Producto, AjustesTienda, AjustesEnvios } from './types';
import { absolute, urls } from './urls';
import { precioConTransferencia } from './pricing';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.url,
    description: site.description,
    sameAs: [site.contact.instagramUrl],
    // Solo el nombre: quiere aparecer, sin biografía (Soledad, WhatsApp 27-10-2026).
    founder: { '@type': 'Person', name: 'Soledad' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: site.contact.whatsapp,
        email: site.contact.email,
        availableLanguage: ['Spanish'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    taxID: site.legal.cuit,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absolute(it.url),
    })),
  };
}

// Política de cambios publicada en /cambios-y-devoluciones/ (10 días corridos, sellos intactos).
// Google la busca dentro de `offers` (Search Console, 28-10-2026).
const politicaDevolucion = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'AR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 10,
  returnMethod: 'https://schema.org/ReturnByMail',
  // Política de Soledad: el envío del cambio lo paga quien compra si es decisión propia.
  returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
  itemCondition: 'https://schema.org/UnopenedCondition',
};

/**
 * Solo zonas con costo fijo y códigos postales cargados: es lo único que se puede declarar sin
 * mentirle a Google. Las zonas «a coordinar» no tienen precio, así que no van.
 */
export function shippingDetailsJsonLd(envios: AjustesEnvios) {
  return envios.zonas
    .filter((z) => z.modo === 'fijo' && z.costo > 0 && (z.codigosPostales?.length ?? 0) > 0)
    .map((z) => ({
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: z.costo, currency: site.currency },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'AR',
        postalCode: z.codigosPostales,
      },
    }));
}

export function productJsonLd(p: Producto, tienda: AjustesTienda, envios: AjustesEnvios) {
  const shippingDetails = shippingDetailsJsonLd(envios);
  const image = p.imagenes.map((img) =>
    img.startsWith('http') ? img : absolute(img),
  );
  const url = absolute(urls.producto(p.slug));
  const precioTransfer = precioConTransferencia(p.precio, tienda);
  const availability = p.disponible
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nombre,
    description: p.resumen,
    image,
    sku: p.slug,
    brand: { '@type': 'Brand', name: site.name },
    offers: {
      '@type': 'Offer',
      price: p.precio,
      priceCurrency: site.currency,
      availability,
      url,
      seller: { '@type': 'Organization', name: site.name },
      priceSpecification: [
        {
          '@type': 'UnitPriceSpecification',
          price: p.precio,
          priceCurrency: site.currency,
          description: 'Precio de lista',
        },
        {
          '@type': 'UnitPriceSpecification',
          price: precioTransfer,
          priceCurrency: site.currency,
          description: 'Pagando con transferencia (20% off)',
        },
      ],
      ...(shippingDetails.length > 0 ? { shippingDetails } : {}),
      hasMerchantReturnPolicy: politicaDevolucion,
    },
  };
}

export function itemListJsonLd(productos: Producto[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: productos.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absolute(urls.producto(p.slug)),
      name: p.nombre,
    })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}
