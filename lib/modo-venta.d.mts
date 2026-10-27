export type ModoVenta = 'checkout' | 'whatsapp';

export function hayMedioDePago(
  tienda: { alias?: string | null; cbu?: string | null } | null | undefined,
  mp: string | boolean | null | undefined,
): boolean;
export function modoVenta(
  tienda: { alias?: string | null; cbu?: string | null } | null | undefined,
  mp: string | boolean | null | undefined,
): ModoVenta;
