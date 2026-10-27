// Cómo cambia un pedido cuando Mercado Pago informa un pago (función pura: la usa mp-webhook
// dentro de una escritura condicional y la prueban los unit tests).
import type { PedidoGuardado } from './blobs';
import type { MpPayment } from './mp';

/** Diferencia máxima aceptada entre lo cobrado y el total del pedido (redondeos). */
export const TOLERANCIA_MONTO = 1;

/** Devuelve el motivo si lo cobrado no coincide con el pedido, o null si está bien. */
export function motivoRevision(p: PedidoGuardado, pago: MpPayment): string | null {
  if (pago.currency_id !== 'ARS') return `moneda ${pago.currency_id ?? 'desconocida'}`;
  const monto = Number(pago.transaction_amount);
  if (!Number.isFinite(monto)) return 'monto desconocido';
  if (Math.abs(monto - p.total) > TOLERANCIA_MONTO) return `monto cobrado ${monto} ≠ total ${p.total}`;
  return null;
}

export function aplicarPago(p: PedidoGuardado, pago: MpPayment, ahoraIso: string): PedidoGuardado {
  const nuevo: PedidoGuardado = {
    ...p,
    actualizado: ahoraIso,
    pago: {
      ...p.pago,
      mpPaymentId: String(pago.id),
      mpEstado: pago.status,
      mpMonto: pago.transaction_amount,
      mpMoneda: pago.currency_id,
    },
  };
  const yaResuelto = p.estado === 'pagado' || p.estado === 'revisar';

  if (pago.status === 'approved' && !yaResuelto) {
    const motivo = motivoRevision(p, pago);
    if (motivo) {
      // Cobrado pero no coincide: no se marca pagado; Soledad lo revisa (aviso `pedido_revisar`).
      nuevo.estado = 'revisar';
      nuevo.tipo = 'pedido_revisar';
      nuevo.motivoRevision = motivo;
    } else {
      nuevo.estado = 'pagado';
      nuevo.tipo = 'pedido_pagado';
    }
  } else if ((pago.status === 'rejected' || pago.status === 'cancelled') && !yaResuelto) {
    nuevo.estado = 'cancelado';
  }
  return nuevo;
}
