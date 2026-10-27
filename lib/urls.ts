import { site } from './site';

export const urls = {
  home: '/',
  productos: '/productos/',
  producto: (slug: string) => `/productos/${slug}/`,
  carrito: '/carrito/',
  pedido: (id?: string) => (id ? `/pedido/?id=${encodeURIComponent(id)}` : '/pedido/'),
  cambios: '/cambios-y-devoluciones/',
  terminos: '/terminos-y-condiciones/',
  privacidad: '/privacidad/',
  arrepentimiento: '/arrepentimiento/',
  admin: '/admin/',
};

export function absolute(path: string): string {
  const base = site.url.replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
