import { randomBytes } from 'node:crypto';

export function generarIdPedido(now = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const rand = randomBytes(4).toString('hex').slice(0, 6);
  return `NUDE-${yyyy}${mm}${dd}-${rand}`;
}
