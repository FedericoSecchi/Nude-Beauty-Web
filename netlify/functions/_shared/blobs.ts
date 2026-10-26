import { getStore } from '@netlify/blobs';

export function storePedidos(e2e = false) {
  return getStore({
    name: e2e ? 'pedidos-e2e' : 'pedidos',
    consistency: 'strong',
  });
}

export interface PedidoGuardado {
  id: string;
  tipo: 'pedido_pagado' | 'pedido_transferencia' | 'arrepentimiento';
  estado: 'pendiente_mp' | 'pagado' | 'pendiente_transferencia' | 'cancelado' | 'arrepentido';
  creado: string;
  actualizado: string;
  source?: 'web' | 'e2e';
  comprador: {
    nombre: string;
    email: string;
    telefono: string;
    dni?: string;
  };
  entrega: {
    modo: 'envio' | 'retiro';
    zona: string;
    direccion?: string;
    localidad?: string;
    provincia?: string;
    cp?: string;
  };
  items: {
    slug: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  subtotal: number;
  descuentos: { motivo: string; monto: number }[];
  envio: number;
  total: number;
  pago: {
    medio: 'mercadopago' | 'transferencia';
    mpPaymentId?: string;
    mpEstado?: string;
    mpPreferenceId?: string;
    mpInitPoint?: string;
    reservaHoras?: number;
    alias?: string | null;
    cbu?: string | null;
    titular?: string | null;
  };
  notas?: string;
  avisoEnviado?: boolean;
}

export async function leer(id: string, e2e = false): Promise<PedidoGuardado | null> {
  const store = storePedidos(e2e);
  const raw = (await store.get(id, { type: 'json' })) as PedidoGuardado | null;
  return raw ?? null;
}

export async function guardar(p: PedidoGuardado): Promise<void> {
  const store = storePedidos(p.source === 'e2e');
  await store.setJSON(p.id, p);
}

export async function borrar(id: string, e2e = false): Promise<void> {
  const store = storePedidos(e2e);
  await store.delete(id);
}
