'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { urls } from '@/lib/urls';
import { formatARS } from '@/lib/format';
import {
  calcularDescuentos,
  calcularLineas,
  PricingError,
  precioConTransferencia,
  type MedioPago,
} from '@/lib/pricing';
import { calcularEnvio, listarOpciones, ShippingError } from '@/lib/shipping';
import type { AjustesEnvios, AjustesTienda, Producto } from '@/lib/types';

const KEY = 'nude.carrito.v1';

interface ProductoResumen {
  slug: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  imagen: string | null;
}

interface Props {
  productos: ProductoResumen[];
  tienda: AjustesTienda;
  envios: AjustesEnvios;
}

interface CartItem {
  slug: string;
  cantidad: number;
  nombre: string;
  precio: number;
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it) =>
        it &&
        typeof it.slug === 'string' &&
        Number.isFinite(it.cantidad) &&
        it.cantidad > 0,
    );
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('nude:cart'));
  } catch {
    /* storage denegado */
  }
}

export function CarritoCliente({ productos, tienda, envios }: Props) {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [medio, setMedio] = useState<MedioPago>('transferencia');
  const opcionesEnvio = useMemo(() => listarOpciones(envios), [envios]);
  const [opcionId, setOpcionId] = useState<string>(opcionesEnvio[0]?.id ?? 'retiro');

  const [comprador, setComprador] = useState({
    nombre: '',
    email: '',
    telefono: '',
    dni: '',
    direccion: '',
    localidad: '',
    provincia: '',
    cp: '',
  });
  const [terminos, setTerminos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [begin, setBegin] = useState(false);

  useEffect(() => {
    setItems(readCart());
  }, []);

  if (items === null) return <p className="text-muted-ink">Cargando…</p>;

  if (items.length === 0) {
    return (
      <div>
        <p className="text-ink/80">Tu carrito está vacío por ahora.</p>
        <Link href={urls.productos} className="btn-primary mt-5">
          Mirá los productos
        </Link>
      </div>
    );
  }

  // Enriquecer con disponibilidad / precio del catálogo (fuente de verdad).
  const productosPorSlug = new Map(productos.map((p) => [p.slug, p]));
  const itemsNormalizados = items.map((it) => {
    const prod = productosPorSlug.get(it.slug);
    return {
      ...it,
      precio: prod?.precio ?? it.precio,
      nombre: prod?.nombre ?? it.nombre,
      disponible: prod?.disponible ?? false,
      imagen: prod?.imagen ?? null,
    };
  });

  const todosDisponibles = itemsNormalizados.every((i) => i.disponible);

  // Cálculo en el navegador (preview); el servidor va a recalcular.
  const esRetiro = opcionId === 'retiro';
  const zonaId = esRetiro ? undefined : opcionId;
  const productosCat: Producto[] = itemsNormalizados.map((i) => ({
    slug: i.slug,
    nombre: i.nombre,
    categoria: 'face',
    precio: i.precio,
    disponible: i.disponible,
    imagenes: [],
    tamano: null,
    h1: '',
    resumen: '',
    activos: [],
    ingredientes: '',
    modoDeUso: '',
    pasoRutina: null,
    beneficios: [],
    faq: [],
    relacionados: [],
    seo: { title: '', description: '' },
  }));

  let subtotal = 0;
  let descuentos: { motivo: string; monto: number }[] = [];
  let costoEnvio = 0;
  let plazoEnvioTexto = '';
  let errorPreview: string | null = null;
  try {
    const lineas = calcularLineas(
      itemsNormalizados.map((i) => ({ slug: i.slug, cantidad: i.cantidad })),
      productosCat,
    );
    const dres = calcularDescuentos(lineas, tienda, medio);
    descuentos = dres.descuentos;
    subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
    const envio = calcularEnvio(
      esRetiro ? { modo: 'retiro' } : { modo: 'envio', zonaId },
      envios,
    );
    costoEnvio = envio.costo;
    plazoEnvioTexto = envio.plazoTexto;
  } catch (err) {
    if (err instanceof PricingError || err instanceof ShippingError) {
      errorPreview = err.message;
    } else {
      errorPreview = (err as Error).message;
    }
  }
  const totalDescuentos = descuentos.reduce((s, d) => s + d.monto, 0);
  const total = subtotal - totalDescuentos + costoEnvio;

  const cambiarCantidad = (slug: string, cantidad: number) => {
    const siguiente = items
      .map((it) => (it.slug === slug ? { ...it, cantidad } : it))
      .filter((it) => it.cantidad > 0);
    setItems(siguiente);
    writeCart(siguiente);
  };

  const quitar = (slug: string) => {
    const siguiente = items.filter((it) => it.slug !== slug);
    setItems(siguiente);
    writeCart(siguiente);
  };

  const empezarCheckout = () => {
    setBegin(true);
    if (typeof window !== 'undefined' && 'gtag' in window) {
      try {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag(
          'event',
          'begin_checkout',
          {
            currency: 'ARS',
            value: total,
            items: itemsNormalizados.map((i) => ({
              item_id: i.slug,
              item_name: i.nombre,
              price: i.precio,
              quantity: i.cantidad,
            })),
          },
        );
      } catch {
        /* opcional */
      }
    }
  };

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const payload = {
      items: itemsNormalizados.map((i) => ({ slug: i.slug, cantidad: i.cantidad })),
      comprador: {
        nombre: comprador.nombre,
        email: comprador.email,
        telefono: comprador.telefono,
        dni: comprador.dni || undefined,
      },
      entrega: esRetiro
        ? { modo: 'retiro' as const }
        : {
            modo: 'envio' as const,
            zonaId: opcionId,
            direccion: comprador.direccion,
            localidad: comprador.localidad,
            provincia: comprador.provincia,
            cp: comprador.cp,
          },
      medioPago: medio,
      terminos,
    };

    try {
      const res = await fetch('/.netlify/functions/crear-pedido', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        id: string;
        estado: string;
        initPoint?: string;
      };
      // Limpiar carrito local y redirigir.
      writeCart([]);
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        window.location.href = `/pedido/?id=${encodeURIComponent(data.id)}`;
      }
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  };

  const precioLineaTransfer = (p: number) => precioConTransferencia(p, tienda);

  return (
    <div className="space-y-8">
      <section>
        <ul className="divide-y divide-border border-y border-border">
          {itemsNormalizados.map((it) => (
            <li key={it.slug} className="py-4 flex items-center gap-4">
              <div className="relative w-16 h-20 bg-soft rounded overflow-hidden flex-shrink-0">
                {it.imagen ? (
                  <Image
                    src={it.imagen}
                    alt={it.nombre}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={urls.producto(it.slug)} className="link-ghost">
                  {it.nombre}
                </Link>
                {!it.disponible ? (
                  <p className="text-xs text-destructive mt-1">Sin stock</p>
                ) : (
                  <p className="text-sm text-muted-ink mt-1">
                    {formatARS(it.precio)} · {formatARS(precioLineaTransfer(it.precio))} con transferencia
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`q-${it.slug}`} className="sr-only">Cantidad</label>
                <input
                  id={`q-${it.slug}`}
                  type="number"
                  min={0}
                  max={20}
                  value={it.cantidad}
                  onChange={(e) =>
                    cambiarCantidad(it.slug, Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-16 rounded border border-border bg-card px-3 py-2 text-center"
                />
                <button
                  type="button"
                  onClick={() => quitar(it.slug)}
                  className="text-sm text-muted-ink hover:text-destructive underline underline-offset-2"
                  aria-label={`Quitar ${it.nombre}`}
                >
                  quitar
                </button>
              </div>
              <p className="w-28 text-right font-medium">
                {formatARS(it.precio * it.cantidad)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-heading text-xl mb-3">Entrega</h2>
        <div className="grid gap-2">
          {opcionesEnvio.map((o) => (
            <label
              key={o.id}
              className={`border rounded p-3 cursor-pointer flex items-start gap-3 ${opcionId === o.id ? 'border-charcoal bg-soft' : 'border-border'}`}
            >
              <input
                type="radio"
                name="envio"
                value={o.id}
                checked={opcionId === o.id}
                onChange={() => setOpcionId(o.id)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium">{o.nombre}</span>
                <span className="block text-sm text-muted-ink">{o.plazoTexto}</span>
              </span>
              <span className="font-medium">
                {o.modo === 'coordinar' || o.modo === 'retiro'
                  ? 'a coordinar'
                  : formatARS(o.costo)}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl mb-3">Pago</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={`border rounded p-3 cursor-pointer flex items-start gap-3 ${medio === 'transferencia' ? 'border-charcoal bg-soft' : 'border-border'}`}>
            <input
              type="radio"
              name="medio"
              value="transferencia"
              checked={medio === 'transferencia'}
              onChange={() => setMedio('transferencia')}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Transferencia (20% off)</span>
              <span className="block text-sm text-muted-ink">
                Te mandamos alias y CBU; tenés {tienda.horasReservaTransferencia} h para transferir.
              </span>
            </span>
          </label>
          <label className={`border rounded p-3 cursor-pointer flex items-start gap-3 ${medio === 'mercadopago' ? 'border-charcoal bg-soft' : 'border-border'}`}>
            <input
              type="radio"
              name="medio"
              value="mercadopago"
              checked={medio === 'mercadopago'}
              onChange={() => setMedio('mercadopago')}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Mercado Pago</span>
              <span className="block text-sm text-muted-ink">{tienda.cuotasTexto}</span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-md bg-soft p-5 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatARS(subtotal)}</span></div>
        {descuentos.map((d) => (
          <div key={d.motivo} className="flex justify-between text-muted-ink">
            <span>{d.motivo}</span>
            <span>-{formatARS(d.monto)}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span>Envío</span>
          <span>{costoEnvio === 0 ? plazoEnvioTexto : formatARS(costoEnvio)}</span>
        </div>
        <div className="flex justify-between font-heading text-lg text-charcoal mt-2 pt-2 border-t border-border">
          <span>Total</span><span>{formatARS(total)}</span>
        </div>
        {errorPreview ? (
          <p className="mt-2 text-destructive">{errorPreview}</p>
        ) : null}
      </section>

      {!begin ? (
        <button
          type="button"
          onClick={empezarCheckout}
          disabled={!todosDisponibles || Boolean(errorPreview)}
          className="btn-primary w-full"
        >
          Siguiente: tus datos
        </button>
      ) : (
        <form onSubmit={confirmar} className="space-y-4">
          <h2 className="font-heading text-xl">Tus datos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm mb-1">Nombre y apellido</span>
              <input
                required
                autoComplete="name"
                value={comprador.nombre}
                onChange={(e) => setComprador({ ...comprador, nombre: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={comprador.email}
                onChange={(e) => setComprador({ ...comprador, email: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">Teléfono (WhatsApp)</span>
              <input
                required
                autoComplete="tel"
                value={comprador.telefono}
                onChange={(e) => setComprador({ ...comprador, telefono: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">DNI (opcional)</span>
              <input
                autoComplete="off"
                value={comprador.dni}
                onChange={(e) => setComprador({ ...comprador, dni: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
          </div>

          {!esRetiro ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="block text-sm mb-1">Dirección (calle y número)</span>
                <input
                  required
                  autoComplete="street-address"
                  value={comprador.direccion}
                  onChange={(e) => setComprador({ ...comprador, direccion: e.target.value })}
                  className="w-full rounded border border-border bg-card px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="block text-sm mb-1">Localidad</span>
                <input
                  required
                  autoComplete="address-level2"
                  value={comprador.localidad}
                  onChange={(e) => setComprador({ ...comprador, localidad: e.target.value })}
                  className="w-full rounded border border-border bg-card px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="block text-sm mb-1">Provincia</span>
                <input
                  required
                  autoComplete="address-level1"
                  value={comprador.provincia}
                  onChange={(e) => setComprador({ ...comprador, provincia: e.target.value })}
                  className="w-full rounded border border-border bg-card px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="block text-sm mb-1">Código postal</span>
                <input
                  required
                  autoComplete="postal-code"
                  value={comprador.cp}
                  onChange={(e) => setComprador({ ...comprador, cp: e.target.value })}
                  className="w-full rounded border border-border bg-card px-3 py-2"
                />
              </label>
            </div>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={terminos}
              onChange={(e) => setTerminos(e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              Acepto los{' '}
              <Link href={urls.terminos} className="link-ghost">términos y condiciones</Link>{' '}
              y la{' '}
              <Link href={urls.privacidad} className="link-ghost">política de privacidad</Link>.
            </span>
          </label>

          {error ? <p role="status" className="text-destructive text-sm">{error}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={enviando || !terminos}>
            {enviando ? 'Confirmando…' : medio === 'transferencia' ? 'Confirmar pedido' : 'Ir a pagar con Mercado Pago'}
          </button>
        </form>
      )}
    </div>
  );
}
