export type ModoVenta = 'checkout' | 'whatsapp';

type DatosTransferencia = { alias?: string | null; cbu?: string | null } | null | undefined;
type Flag = string | boolean | null | undefined;

export function hayDatosTransferencia(tienda: DatosTransferencia): boolean;
export function hayMedioDePago(tienda: DatosTransferencia, mp: Flag): boolean;
export function modoVenta(tienda: DatosTransferencia, mp: Flag, webhook: Flag): ModoVenta;
export function motivoModoWhatsapp(tienda: DatosTransferencia, mp: Flag, webhook: Flag): string | null;
