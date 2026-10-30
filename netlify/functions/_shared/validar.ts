// Validación del payload de crear-pedido (antes de recalcular precios en el servidor).
export const CANTIDAD_MAX = 20;
export const NOTAS_MAX = 500;

function assertString(v: unknown, field: string, max = 200): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new Error(`${field} requerido`);
  }
  const trimmed = v.trim();
  if (trimmed.length > max) throw new Error(`${field} supera ${max} caracteres`);
  return trimmed;
}

function assertEmail(v: unknown): string {
  const s = assertString(v, 'email', 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('email inválido');
  return s;
}

/** Tira Error con un mensaje para la clienta si algo no cierra. */
export function validarPayload(payload: any): void {
  if (!payload || typeof payload !== 'object') throw new Error('payload inválido');
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('items vacío');
  }
  if (payload.items.length > 50) throw new Error('demasiados items');
  for (const it of payload.items) {
    if (!it || typeof it.slug !== 'string') throw new Error('item sin slug válido');
    if (!Number.isInteger(it.cantidad) || it.cantidad < 1 || it.cantidad > CANTIDAD_MAX) {
      throw new Error(`cantidad inválida para ${it.slug}: entre 1 y ${CANTIDAD_MAX}`);
    }
    if (it.variante !== undefined && (typeof it.variante !== 'string' || it.variante.length > 60)) {
      throw new Error(`tono inválido para ${it.slug}`);
    }
  }
  assertString(payload.comprador?.nombre, 'nombre', 120);
  assertEmail(payload.comprador?.email);
  assertString(payload.comprador?.telefono, 'telefono', 40);
  if (payload.comprador?.dni !== undefined && payload.comprador.dni !== '') {
    assertString(payload.comprador.dni, 'dni', 20);
  }
  if (!payload.terminos) throw new Error('tenés que aceptar los términos');
  if (!payload.entrega || !payload.entrega.modo) throw new Error('entrega requerida');
  if (payload.entrega.modo === 'envio') {
    assertString(payload.entrega.zonaId, 'zona de envío', 40);
    assertString(payload.entrega.direccion, 'dirección', 200);
    assertString(payload.entrega.localidad, 'localidad', 120);
    assertString(payload.entrega.provincia, 'provincia', 120);
    assertString(payload.entrega.cp, 'código postal', 20);
  } else if (payload.entrega.modo !== 'retiro') {
    throw new Error('entrega.modo inválido');
  }
  if (payload.medioPago !== 'mercadopago' && payload.medioPago !== 'transferencia') {
    throw new Error('medio de pago inválido');
  }
  if (payload.notas !== undefined && payload.notas !== null) {
    if (typeof payload.notas !== 'string') throw new Error('notas inválidas');
    if (payload.notas.length > NOTAS_MAX) throw new Error(`notas supera ${NOTAS_MAX} caracteres`);
  }
}
