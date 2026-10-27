import { site } from './site';

function clean(num: string): string {
  return num.replace(/[^\d]/g, '');
}

export function waLink(message?: string): string {
  const n = clean(site.contact.whatsapp);
  const base = n ? `https://wa.me/${n}` : 'https://wa.me/';
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const waMessages = {
  generica: '¡Hola! Tengo una consulta 😊',
  producto: (nombre: string) =>
    `¡Hola! Tengo una consulta sobre el ${nombre} 😊`,
  transferencia: (pedidoId: string) =>
    `¡Hola! Ya hice la transferencia del pedido ${pedidoId}. Te paso el comprobante 💛`,
  sinStock: (nombre: string) =>
    `¡Hola! Me interesa el ${nombre}, ¿cuándo lo vas a volver a tener? 💛`,
};
