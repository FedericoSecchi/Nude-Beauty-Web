// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';

export const site = {
  name: 'NUDE Cosmética Clean',
  shortName: 'NUDE',
  tagline: 'Cosmética natural hecha a mano en Mendiolaza, Córdoba',
  description:
    'Cosmética natural y clean hecha a mano en pequeños lotes en Mendiolaza (Córdoba). Fórmulas con activos nombrados: niacinamida al 5%, bakuchiol, ácido hialurónico, péptidos. ' +
    (mpHabilitado
      ? '20% off por transferencia, 3 cuotas sin interés con tarjeta y envíos a todo el país.'
      : '20% off por transferencia y envíos a todo el país.'),
  url: 'https://nudecosmetica.com',
  locale: 'es-AR',
  ogLocale: 'es_AR',
  currency: 'ARS',
  country: 'AR',

  contact: {
    // Sale del panel (content/ajustes/tienda.json, vía next.config.mjs).
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || '+5493517033348',
    email: 'nudecosmeticaclean@gmail.com',
    instagram: 'nude.cosmeticaclean',
    instagramUrl: 'https://instagram.com/nude.cosmeticaclean',
  },

  address: {
    locality: 'Mendiolaza',
    region: 'Córdoba',
    regionCode: 'CBA',
    country: 'AR',
    // Dirección exacta: pendiente (seo/00-contexto.md, Datos del negocio). No se publica.
  },

  legal: {
    // Razón social y condición frente al IVA: pendientes (seo/00-contexto.md y seo/auditoria-hechos.md).
    // Mientras tanto el pie y los términos muestran site.name + CUIT (fuente: CT pie de la tienda).
    cuit: '23265636934',
    // URL vigente al 2026-10-26: argentina.gob.ar redirige a autogestion.produccion.gob.ar.
    // La Res. SCI 424/2020 exige "visibilidad y acceso directo"; usamos el link final.
    defensaConsumidorUrl: 'https://autogestion.produccion.gob.ar/consumidores',
  },
} as const;

export type Site = typeof site;
