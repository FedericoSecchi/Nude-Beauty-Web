export const site = {
  name: 'NUDE Cosmética Clean',
  shortName: 'NUDE',
  tagline: 'Cosmética natural hecha a mano en Mendiolaza, Córdoba',
  description:
    'Cosmética natural y clean hecha a mano por Soledad en Mendiolaza (Córdoba). Fórmulas con activos nombrados: niacinamida al 5%, bakuchiol, ácido hialurónico, péptidos. 20% off por transferencia, 3 cuotas sin interés con tarjeta y envíos a todo el país.',
  url: 'https://nudecosmetica.com',
  locale: 'es-AR',
  ogLocale: 'es_AR',
  currency: 'ARS',
  country: 'AR',

  owner: {
    firstName: 'Soledad',
  },

  contact: {
    whatsapp: '+5493517033348',
    email: 'nudecosmeticaclean@gmail.com',
    instagram: 'nude.cosmeticaclean',
    instagramUrl: 'https://instagram.com/nude.cosmeticaclean',
  },

  address: {
    locality: 'Mendiolaza',
    region: 'Córdoba',
    regionCode: 'CBA',
    country: 'AR',
    streetAddress: '[CONFIRMAR: dirección exacta]',
  },

  legal: {
    razonSocial: '[CONFIRMAR: razón social]',
    cuit: '23265636934',
    condicionIVA: '[CONFIRMAR]',
    // URL vigente al 2026-10-26: argentina.gob.ar redirige a autogestion.produccion.gob.ar.
    // La Res. SCI 424/2020 exige "visibilidad y acceso directo"; usamos el link final.
    defensaConsumidorUrl: 'https://autogestion.produccion.gob.ar/consumidores',
  },
} as const;

export type Site = typeof site;
