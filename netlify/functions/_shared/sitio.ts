// URL base para las URLs de retorno de la order de Mercado Pago (config.online.*_url).
// Producción: URL (dominio principal, nudecosmetica.com). Previews / branch deploys / dev:
// DEPLOY_PRIME_URL. Así la clienta vuelve al mismo dominio donde dejó el carrito.
const DOMINIO = 'https://nudecosmetica.com';

export function baseUrlSitio(opts: {
  produccion: boolean;
  URL?: string;
  DEPLOY_PRIME_URL?: string;
  origen?: string;
}): string {
  const elegida = opts.produccion
    ? opts.URL || DOMINIO
    : opts.DEPLOY_PRIME_URL || opts.origen || opts.URL || DOMINIO;
  return elegida.replace(/\/+$/, '');
}
