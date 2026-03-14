import { useEffect, useState } from 'react'

const formatPrice = (value) => `€${value.toFixed(2)}`

export default function ProductEditor({ product, onChange, onSave, saving, notice }) {
  const [imagesText, setImagesText] = useState('')

  useEffect(() => {
    if (product) {
      setImagesText((product.images || []).join('\n'))
    }
  }, [product])

  if (!product) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-500">
          Selecciona un producto para editarlo.
        </p>
      </div>
    )
  }

  const handleField = (field, value) => {
    onChange({ ...product, [field]: value })
  }

  const handleImages = (value) => {
    setImagesText(value)
    const images = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    handleField('images', images)
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Editar producto</h2>
          <p className="text-sm text-neutral-500">
            Los cambios se guardan en GitHub.
          </p>
        </div>
        <button
          onClick={() => onSave(product)}
          disabled={saving}
          className="rounded-full bg-[#a6755b] px-5 py-2 text-sm font-medium text-white hover:bg-[#8f5f48] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {notice ? (
        <p className="mt-3 text-sm text-[#8f5f48]">{notice}</p>
      ) : null}

      <div className="mt-6 grid gap-4 text-sm">
        <label className="grid gap-1">
          ID (nombre del archivo)
          <input
            value={product.id}
            onChange={(event) => handleField('id', event.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
            placeholder="serum-facial"
          />
        </label>
        <label className="grid gap-1">
          Título
          <input
            value={product.title}
            onChange={(event) => handleField('title', event.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          Descripción
          <textarea
            rows="4"
            value={product.description}
            onChange={(event) => handleField('description', event.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          Precio
          <input
            type="number"
            step="0.01"
            value={product.price}
            onChange={(event) => handleField('price', Number(event.target.value))}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          Imágenes (una URL por línea)
          <textarea
            rows="4"
            value={imagesText}
            onChange={(event) => handleImages(event.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Vista previa
        </h3>
        <div className="mt-3 rounded-xl border border-neutral-200 p-4">
          <div className="aspect-square overflow-hidden rounded-lg bg-neutral-100">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                Sin imagen
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold">{product.title}</p>
            <p className="text-sm text-neutral-500">{product.description}</p>
            <p className="mt-2 text-lg font-semibold text-[#a6755b]">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
