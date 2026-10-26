'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { urls } from '@/lib/urls';
import { formatARS } from '@/lib/format';
import { waLink, waMessages } from '@/lib/whatsapp';

interface PedidoPublico {
  id: string;
  estado: string;
  medio: 'mercadopago' | 'transferencia';
  items: { slug: string; nombre: string; cantidad: number; precioUnitario: number }[];
  subtotal: number;
  descuentos: { motivo: string; monto: number }[];
  envio: number;
  total: number;
  reservaHoras?: number;
  alias?: string | null;
  cbu?: string | null;
  titular?: string | null;
  entrega: { modo: 'envio' | 'retiro'; zona: string };
  creado: string;
}

const PURCHASE_KEY = 'nude.purchase.v1';

export function PedidoCliente() {
  const [id, setId] = useState<string | null>(null);
  const [estado, setEstado] = useState<PedidoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const paramId = url.searchParams.get('id');
    setId(paramId);
    if (!paramId) {
      setCargando(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/.netlify/functions/estado-pedido?id=${encodeURIComponent(paramId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as PedidoPublico;
        setEstado(data);
        // GA4 purchase: una sola vez por id, cuando queda pagado o esperando transferencia.
        const esFinal = data.estado === 'pagado' || data.estado === 'pendiente_transferencia';
        if (esFinal) {
          const marcado = sessionStorage.getItem(`${PURCHASE_KEY}:${paramId}`);
          if (!marcado && 'gtag' in window) {
            try {
              (window as unknown as { gtag: (...a: unknown[]) => void }).gtag(
                'event',
                'purchase',
                {
                  transaction_id: paramId,
                  value: data.total,
                  currency: 'ARS',
                  items: data.items.map((it) => ({
                    item_id: it.slug,
                    item_name: it.nombre,
                    price: it.precioUnitario,
                    quantity: it.cantidad,
                  })),
                },
              );
              sessionStorage.setItem(`${PURCHASE_KEY}:${paramId}`, '1');
            } catch {
              /* medición opcional */
            }
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (!id) {
    return (
      <div>
        <h1 className="font-heading text-3xl mb-4">Tu pedido</h1>
        <p className="text-ink/80">
          No encontré un número de pedido en la URL. ¿Querés{' '}
          <Link href={urls.productos} className="link-ghost">mirar los productos</Link>?
        </p>
      </div>
    );
  }

  if (cargando) return <p className="text-muted-ink">Cargando…</p>;
  if (error || !estado) {
    return (
      <div>
        <h1 className="font-heading text-3xl mb-4">Tu pedido</h1>
        <p className="text-destructive">{error ?? 'No pudimos ver el estado del pedido.'}</p>
        <p className="mt-3 text-ink/80">
          Si acabás de pagar, probá recargar en unos segundos. Si sigue sin aparecer,{' '}
          <a href={waLink(waMessages.generica)} target="_blank" rel="noopener noreferrer" className="link-ghost">
            escribinos por WhatsApp
          </a>.
        </p>
      </div>
    );
  }

  return (
    <article>
      <h1 className="font-heading text-3xl mb-2">Pedido {estado.id}</h1>
      <p className="text-sm text-muted-ink mb-6">
        Creado el {new Date(estado.creado).toLocaleString('es-AR')} · Entrega:{' '}
        {estado.entrega.modo === 'retiro' ? 'Retiro' : estado.entrega.zona}
      </p>

      {estado.estado === 'pendiente_transferencia' ? (
        <section className="card">
          <h2 className="font-heading text-xl mb-2">¡Casi! Falta la transferencia</h2>
          <p className="text-ink/80">
            Reservamos tu pedido por {estado.reservaHoras ?? 48} h. Transferí a:
          </p>
          <dl className="mt-4 text-sm">
            <div className="grid grid-cols-[8rem_1fr] gap-y-1">
              <dt className="text-muted-ink">Alias</dt>
              <dd>{estado.alias ?? '[CONFIRMAR con Soledad]'}</dd>
              <dt className="text-muted-ink">CBU</dt>
              <dd>{estado.cbu ?? '[CONFIRMAR con Soledad]'}</dd>
              <dt className="text-muted-ink">Titular</dt>
              <dd>{estado.titular ?? '[CONFIRMAR con Soledad]'}</dd>
              <dt className="text-muted-ink">Monto</dt>
              <dd className="font-medium">{formatARS(estado.total)}</dd>
            </div>
          </dl>
          <a
            href={waLink(waMessages.transferencia(estado.id))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-5"
          >
            Ya transferí · avisar por WhatsApp
          </a>
        </section>
      ) : null}

      {estado.estado === 'pagado' ? (
        <section className="card">
          <h2 className="font-heading text-xl mb-2">¡Pedido pagado!</h2>
          <p className="text-ink/80">
            Recibimos el pago. Soledad te va a escribir por WhatsApp para coordinar la entrega.
          </p>
        </section>
      ) : null}

      {estado.estado === 'pendiente_mp' ? (
        <section className="card">
          <h2 className="font-heading text-xl mb-2">Esperando a Mercado Pago</h2>
          <p className="text-ink/80">
            Si cerraste el pago, puede tardar unos segundos en impactar. Recargá la página en un minuto.
          </p>
        </section>
      ) : null}

      {estado.estado === 'cancelado' ? (
        <section className="card">
          <h2 className="font-heading text-xl mb-2">Pedido cancelado</h2>
          <p className="text-ink/80">
            Si creés que fue un error,{' '}
            <a href={waLink(waMessages.generica)} target="_blank" rel="noopener noreferrer" className="link-ghost">
              escribinos por WhatsApp
            </a>.
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-heading text-xl mb-3">Detalle</h2>
        <ul className="divide-y divide-border border-y border-border">
          {estado.items.map((it) => (
            <li key={it.slug} className="py-3 flex items-center justify-between">
              <span>
                {it.nombre} · {it.cantidad}
              </span>
              <span>{formatARS(it.precioUnitario * it.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatARS(estado.subtotal)}</span></div>
          {estado.descuentos.map((d) => (
            <div key={d.motivo} className="flex justify-between text-muted-ink">
              <span>{d.motivo}</span><span>-{formatARS(d.monto)}</span>
            </div>
          ))}
          <div className="flex justify-between"><span>Envío</span><span>{estado.envio === 0 ? 'a coordinar' : formatARS(estado.envio)}</span></div>
          <div className="flex justify-between font-heading text-lg text-charcoal pt-2 border-t border-border">
            <span>Total</span><span>{formatARS(estado.total)}</span>
          </div>
        </div>
      </section>
    </article>
  );
}
