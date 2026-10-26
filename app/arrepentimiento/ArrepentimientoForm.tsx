'use client';

import { useState } from 'react';

interface Resultado {
  ok: boolean;
  codigo?: string;
  mensaje?: string;
}

export function ArrepentimientoForm() {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/.netlify/functions/arrepentimiento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { codigo?: string };
      setResultado({
        ok: true,
        codigo: json.codigo,
        mensaje:
          'Recibimos tu solicitud. Te vamos a escribir en las próximas horas para coordinar la devolución.',
      });
      form.reset();
    } catch (err) {
      setResultado({
        ok: false,
        mensaje:
          'No pudimos registrar la solicitud en línea. Escribinos por WhatsApp o mail con tu número de orden y la tomamos manualmente.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-describedby="arrepentimiento-ayuda">
      <p id="arrepentimiento-ayuda" className="sr-only">
        Formulario de arrepentimiento sin registro. Dentro de los 10 días corridos de recibido el
        pedido.
      </p>

      <div>
        <label htmlFor="numeroOrden" className="block text-sm mb-1">
          Número de orden
        </label>
        <input
          id="numeroOrden"
          name="numeroOrden"
          type="text"
          required
          autoComplete="off"
          className="w-full rounded border border-border bg-card px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="nombre" className="block text-sm mb-1">
          Tu nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          autoComplete="name"
          className="w-full rounded border border-border bg-card px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm mb-1">
          Email de la compra
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded border border-border bg-card px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="motivo" className="block text-sm mb-1">
          Motivo (opcional)
        </label>
        <textarea
          id="motivo"
          name="motivo"
          rows={3}
          className="w-full rounded border border-border bg-card px-3 py-2"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar solicitud'}
      </button>

      {resultado ? (
        <p
          role="status"
          className={`text-sm mt-3 ${resultado.ok ? 'text-charcoal' : 'text-destructive-foreground'}`}
        >
          {resultado.mensaje}
          {resultado.codigo ? (
            <>
              {' '}
              Guardá este código de trámite: <strong>{resultado.codigo}</strong>.
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
