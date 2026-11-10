// Cómo cambia un pedido cuando Mercado Pago informa una order (función pura: la usa mp-webhook
// dentro de una escritura condicional y la prueban los unit tests).
//
// Estados de la order (doc oficial «Estado de la order», Checkout Pro vía Orders API) → pedido:
//   processed / accredited               → pagado (o revisar si monto o moneda no coinciden)
//   processed / partially_refunded       → revisar si todavía no estaba resuelto; si ya estaba pagado, sigue
//   created · processing · action_required → sin cambio (pendiente_mp)
//   failed · canceled · expired          → cancelado (si no estaba pagado/revisar/reembolsado)
//   refunded                             → reembolsado
//   charged_back                         → revisar (contracargo)
//   cualquier otro                       → sin cambio de estado (se guarda el estado de MP)
import type { PedidoGuardado } from './blobs';
import type { MpOrder } from './mp';

/** Diferencia máxima aceptada entre lo cobrado y el total del pedido (redondeos). */
export const TOLERANCIA_MONTO = 1;

const FALLIDAS = new Set(['failed', 'canceled', 'expired']);

/** Devuelve el motivo si lo cobrado no coincide con el pedido, o null si está bien. */
export function motivoRevision(p: PedidoGuardado, order: MpOrder): string | null {
  if (order.currency !== 'ARS') return `moneda ${order.currency ?? 'desconocida'}`;
  const monto = Number(order.total_paid_amount);
  if (order.total_paid_amount == null || !Number.isFinite(monto)) return 'monto desconocido';
  if (Math.abs(monto - p.total) > TOLERANCIA_MONTO) return `monto cobrado ${monto} ≠ total ${p.total}`;
  return null;
}

function aRevisar(p: PedidoGuardado, motivo: string): PedidoGuardado {
  return { ...p, estado: 'revisar', tipo: 'pedido_revisar', motivoRevision: motivo };
}

/**
 * Devuelve el pedido actualizado, o el MISMO objeto `p` si la order no cambia nada (misma
 * notificación repetida): así el webhook no escribe ni vuelve a avisar.
 */
export function aplicarOrder(p: PedidoGuardado, order: MpOrder, ahoraIso: string): PedidoGuardado {
  const pago = order.transactions?.payments?.[0];
  const montoCobrado = order.total_paid_amount == null ? undefined : Number(order.total_paid_amount);
  let nuevo: PedidoGuardado = {
    ...p,
    pago: {
      ...p.pago,
      mpOrderId: order.id,
      mpEstado: order.status,
      mpEstadoDetalle: order.status_detail,
      ...(pago?.id ? { mpPaymentId: pago.id } : {}),
      mpMonto: Number.isFinite(montoCobrado) ? montoCobrado : undefined,
      mpMoneda: order.currency,
    },
  };
  const resuelto = p.estado === 'pagado' || p.estado === 'revisar' || p.estado === 'reembolsado';

  if (order.status === 'processed' && order.status_detail === 'partially_refunded') {
    if (!resuelto) nuevo = aRevisar(nuevo, 'reembolso parcial');
  } else if (order.status === 'processed') {
    if (!resuelto) {
      // Cobrado pero no coincide: no se marca pagado; Soledad lo revisa (aviso `pedido_revisar`).
      const motivo = motivoRevision(p, order);
      nuevo = motivo ? aRevisar(nuevo, motivo) : { ...nuevo, estado: 'pagado', tipo: 'pedido_pagado' };
    }
  } else if (FALLIDAS.has(order.status)) {
    if (!resuelto) nuevo = { ...nuevo, estado: 'cancelado' };
  } else if (order.status === 'refunded') {
    nuevo = { ...nuevo, estado: 'reembolsado' };
  } else if (order.status === 'charged_back') {
    if (p.estado !== 'reembolsado') nuevo = aRevisar(nuevo, 'contracargo');
  }
  // Pendientes (created, processing, action_required) o estados no documentados: el pedido no cambia
  // de estado; lo que dijo MP queda en mpEstado.

  if (sinCambios(p, nuevo)) return p;
  return { ...nuevo, actualizado: ahoraIso };
}

function sinCambios(a: PedidoGuardado, b: PedidoGuardado): boolean {
  return (
    a.estado === b.estado &&
    a.tipo === b.tipo &&
    a.motivoRevision === b.motivoRevision &&
    a.pago.mpOrderId === b.pago.mpOrderId &&
    a.pago.mpEstado === b.pago.mpEstado &&
    a.pago.mpEstadoDetalle === b.pago.mpEstadoDetalle &&
    a.pago.mpPaymentId === b.pago.mpPaymentId &&
    a.pago.mpMonto === b.pago.mpMonto &&
    a.pago.mpMoneda === b.pago.mpMoneda
  );
}
