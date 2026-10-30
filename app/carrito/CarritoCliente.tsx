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
import { armarPedidoWhatsapp, type PedidoWhatsapp } from '@/lib/pedido-whatsapp';
import { waLink } from '@/lib/whatsapp';

// Flag de build de Mercado Pago (next.config.mjs). Va en cada archivo, no importado: así el
// minificador borra del bundle los textos de MP cuando está apagado.
const mpHabilitado = process.env.NEXT_PUBLIC_MP_HABILITADO === '1';
// Sin ningún medio de pago (lib/modo-venta.mjs) el carrito no hace checkout: arma el pedido y lo
// manda por WhatsApp. Mismo criterio que el flag de MP: constante local para que el minificador
// saque el checkout del bundle (y viceversa).
const modoWhatsapp = process.env.NEXT_PUBLIC_MODO_VENTA === 'whatsapp';

const KEY = 'nude.carrito.v1';
// El DNI no es obligatorio (Soledad, 27-10-2026): solo lo piden algunos envíos.
const TEXTO_DNI = 'DNI (opcional, a veces lo pide el correo)';

interface ProductoResumen {
  slug: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  imagen: string | null;
  variantes: string[];
}

interface Props {
  productos: ProductoResumen[];
  tienda: Omit<AjustesTienda, 'cuotasTexto'>;
  envios: AjustesEnvios;
  textoMp?: string;
}

interface CartItem {
  slug: string;
  cantidad: number;
  nombre: string;
  precio: number;
  variante?: string;
}

// Una línea por producto y tono: el mismo gloss en dos tonos son dos líneas.
const claveItem = (it: { slug: string; variante?: string }) => `${it.slug}|${it.variante ?? ''}`;

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Cantidad por línea: entero entre 1 y 20 (el servidor rechaza lo demás).
    return parsed
      .filter(
        (it) =>
          it &&
          typeof it.slug === 'string' &&
          Number.isFinite(it.cantidad) &&
          it.cantidad >= 1,
      )
      .map((it) => ({ ...it, cantidad: Math.min(20, Math.floor(it.cantidad)) }));
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

export function CarritoCliente({ productos, tienda, envios, textoMp }: Props) {
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
    variantes: productosPorSlug.get(i.slug)?.variantes ?? [],
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
  let errorPreview: string | null = null;
  try {
    const lineas = calcularLineas(
      itemsNormalizados.map((i) => ({ slug: i.slug, cantidad: i.cantidad, variante: i.variante })),
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
  } catch (err) {
    if (err instanceof PricingError || err instanceof ShippingError) {
      errorPreview = err.message;
    } else {
      errorPreview = (err as Error).message;
    }
  }
  const totalDescuentos = descuentos.reduce((s, d) => s + d.monto, 0);
  const total = subtotal - totalDescuentos + costoEnvio;

  // Modo WhatsApp: el mensaje sale del mismo cálculo (lib/pricing) que el checkout.
  let pedidoWa: PedidoWhatsapp | null = null;
  const opcionElegida = opcionesEnvio.find((o) => o.id === opcionId);
  if (modoWhatsapp && !errorPreview && opcionElegida && todosDisponibles) {
    try {
      pedidoWa = armarPedidoWhatsapp(
        itemsNormalizados.map((i) => ({ slug: i.slug, cantidad: i.cantidad, variante: i.variante })),
        productosCat,
        tienda,
        { nombre: opcionElegida.nombre, costo: costoEnvio, retiro: esRetiro },
        { nombre: comprador.nombre, telefono: comprador.telefono, email: comprador.email, dni: comprador.dni },
      );
    } catch {
      pedidoWa = null;
    }
  }

  const enviarWhatsapp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!pedidoWa) {
      e.preventDefault();
      return;
    }
    if (!comprador.nombre.trim() || !comprador.telefono.trim()) {
      e.preventDefault();
      setError('Completá tu nombre y tu teléfono para mandar el pedido.');
      return;
    }
    setError(null);
    if (typeof window !== 'undefined' && 'gtag' in window) {
      try {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag('event', 'click_whatsapp', {
          currency: 'ARS',
          value: pedidoWa.totalTransferencia,
          items: itemsNormalizados.map((i) => ({
            item_id: i.slug,
            item_name: i.nombre,
            ...(i.variante ? { item_variant: i.variante } : {}),
            price: i.precio,
            quantity: i.cantidad,
          })),
        });
      } catch {
        /* opcional */
      }
    }
    if (esRetiro) {
      // La dirección exacta del retiro no está en el sitio: el mensaje con la dirección lo arma la
      // function pedido-whatsapp. Si no responde, sale el mismo mensaje sin la dirección y Soledad
      // la pasa por el chat. La pestaña se abre ya (dentro del clic) para que no la bloqueen.
      e.preventDefault();
      const respaldo = waLink(pedidoWa.texto);
      const ventana = window.open('', '_blank');
      void (async () => {
        let destino = respaldo;
        try {
          const res = await fetch('/.netlify/functions/pedido-whatsapp', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              items: itemsNormalizados.map((i) => ({ slug: i.slug, cantidad: i.cantidad, variante: i.variante })),
              comprador: {
                nombre: comprador.nombre,
                telefono: comprador.telefono,
                email: comprador.email || undefined,
                dni: comprador.dni || undefined,
              },
              entrega: { modo: 'retiro' },
            }),
          });
          const data = res.ok ? ((await res.json()) as { url?: unknown }) : null;
          if (typeof data?.url === 'string' && data.url.startsWith('https://wa.me/')) destino = data.url;
        } catch {
          /* sin function (o caída): mensaje sin dirección */
        }
        if (ventana) {
          ventana.opener = null;
          ventana.location.href = destino;
        } else {
          window.location.href = destino;
        }
      })();
    }
  };

  const cambiarCantidad = (clave: string, cantidad: number) => {
    const siguiente = items
      .map((it) => (claveItem(it) === clave ? { ...it, cantidad } : it))
      .filter((it) => it.cantidad > 0);
    setItems(siguiente);
    writeCart(siguiente);
  };

  const quitar = (clave: string) => {
    const siguiente = items.filter((it) => claveItem(it) !== clave);
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
      items: itemsNormalizados.map((i) => ({ slug: i.slug, cantidad: i.cantidad, variante: i.variante })),
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
      // Con MP apagado el único medio es transferencia (crear-pedido rechaza mercadopago).
      medioPago: mpHabilitado ? medio : ('transferencia' as const),
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
            <li key={claveItem(it)} className="py-4 flex items-center gap-4">
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
                {it.variante ? <p className="text-sm text-ink/80">Tono: {it.variante}</p> : null}
                {!it.disponible ? (
                  <p className="text-xs text-destructive mt-1">Sin stock</p>
                ) : (
                  <p className="text-sm text-muted-ink mt-1">
                    {formatARS(it.precio)} · {formatARS(precioLineaTransfer(it.precio))} con transferencia
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`q-${claveItem(it)}`} className="sr-only">Cantidad</label>
                <input
                  id={`q-${claveItem(it)}`}
                  type="number"
                  min={0}
                  max={20}
                  value={it.cantidad}
                  onChange={(e) =>
                    cambiarCantidad(claveItem(it), Math.min(20, Math.max(0, Math.floor(Number(e.target.value)) || 0)))
                  }
                  className="w-16 rounded border border-border bg-card px-3 py-2 text-center"
                />
                <button
                  type="button"
                  onClick={() => quitar(claveItem(it))}
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
                {o.plazoTexto ? <span className="block text-sm text-muted-ink">{o.plazoTexto}</span> : null}
                {o.aclaracion ? <span className="block text-xs text-muted-ink mt-1">{o.aclaracion}</span> : null}
              </span>
              <span className="font-medium">
                {o.modo === 'coordinar' ? 'a coordinar' : o.costo === 0 ? 'Gratis' : formatARS(o.costo)}
              </span>
            </label>
          ))}
        </div>
      </section>

      {modoWhatsapp ? null : (
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
                Al confirmar el pedido te mostramos los datos para transferir.
              </span>
            </span>
          </label>
          {mpHabilitado ? (
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
                <span className="block text-sm text-muted-ink">{textoMp}</span>
              </span>
            </label>
          ) : null}
        </div>
      </section>
      )}

      <section className="rounded-md bg-soft p-5 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatARS(subtotal)}</span></div>
        {descuentos.map((d) => (
          <div key={d.motivo} className="flex justify-between text-muted-ink">
            <span>{d.motivo}</span>
            <span>-{formatARS(d.monto)}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span>{esRetiro ? 'Retiro' : 'Envío'}</span>
          <span>{costoEnvio > 0 ? formatARS(costoEnvio) : esRetiro ? 'Gratis' : 'a coordinar'}</span>
        </div>
        <div className="flex justify-between font-heading text-lg text-charcoal mt-2 pt-2 border-t border-border">
          <span>{modoWhatsapp ? 'Total con transferencia' : 'Total'}</span>
          <span data-testid="total-carrito">{formatARS(total)}</span>
        </div>
        {errorPreview ? (
          <p className="mt-2 text-destructive">{errorPreview}</p>
        ) : null}
      </section>

      {modoWhatsapp ? (
        <section className="space-y-4">
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
              <span className="block text-sm mb-1">Teléfono (WhatsApp)</span>
              <input
                required
                type="tel"
                autoComplete="tel"
                value={comprador.telefono}
                onChange={(e) => setComprador({ ...comprador, telefono: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">Email (opcional)</span>
              <input
                type="email"
                autoComplete="email"
                value={comprador.email}
                onChange={(e) => setComprador({ ...comprador, email: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">{TEXTO_DNI}</span>
              <input
                autoComplete="off"
                inputMode="numeric"
                value={comprador.dni}
                onChange={(e) => setComprador({ ...comprador, dni: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-2"
              />
            </label>
          </div>

          {error ? <p role="status" className="text-destructive text-sm">{error}</p> : null}

          <a
            href={pedidoWa ? waLink(pedidoWa.texto) : undefined}
            onClick={enviarWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!pedidoWa}
            className={`btn-primary w-full ${pedidoWa ? '' : 'pointer-events-none opacity-50'}`}
          >
            Enviar pedido por WhatsApp
          </a>
          <p className="text-sm text-muted-ink text-center">
            Soledad te responde por WhatsApp con los datos para pagar y el envío.
          </p>
        </section>
      ) : !begin ? (
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
              <span className="block text-sm mb-1">{TEXTO_DNI}</span>
              <input
                autoComplete="off"
                inputMode="numeric"
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
            {enviando
              ? 'Confirmando…'
              : mpHabilitado && medio === 'mercadopago'
                ? 'Ir a pagar con Mercado Pago'
                : 'Confirmar pedido'}
          </button>
        </form>
      )}
    </div>
  );
}
