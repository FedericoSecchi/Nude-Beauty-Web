// Cómo cambia un pedido cuando Mercado Pago informa un pago (función pura: la usa mp-webhook
// dentro de una escritura condicional y la prueban los unit tests).
import type { PedidoGuardado } from './blobs';
import type { MpPayment } from './mp';

export function aplicarPago(p: PedidoGuardado, pago: MpPayment, ahoraIso: string): PedidoGuardado {
  const nuevo: PedidoGuardado = {
    ...p,
    actualizado: ahoraIso,
    pago: { ...p.pago, mpPaymentId: String(pago.id), mpEstado: pago.status },
  };
  const yaResuelto = p.estado === 'pagado' || p.estado === 'revisar';

  if (pago.status === 'approved' && !yaResuelto) {
    nuevo.estado = 'pagado';
    nuevo.tipo = 'pedido_pagado';
  } else if ((pago.status === 'rejected' || pago.status === 'cancelled') && !yaResuelto) {
    nuevo.estado = 'cancelado';
  }
  return nuevo;
}
