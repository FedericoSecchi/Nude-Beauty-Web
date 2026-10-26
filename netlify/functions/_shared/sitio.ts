// URL base para back_urls y notification_url de Mercado Pago.
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
