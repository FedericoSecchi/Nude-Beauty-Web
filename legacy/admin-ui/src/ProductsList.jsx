const formatPrice = (value) => `€${value.toFixed(2)}`

export default function ProductsList({
  products,
  selectedId,
  loading,
  error,
  onSelect,
  onCreate
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Productos</h2>
        <button
          onClick={onCreate}
          className="rounded-full bg-[#a6755b] px-4 py-2 text-sm font-medium text-white hover:bg-[#8f5f48]"
        >
          Nuevo producto
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-neutral-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#a6755b]" />
          Cargando productos...
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : products.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          No hay productos disponibles.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {products.map((product, index) => {
            const image = product.images?.[0]
            return (
              <button
                key={product.id || `new-${index}`}
                onClick={() => onSelect(product.id)}
                className={`text-left rounded-xl border p-4 transition ${
                  selectedId === product.id
                    ? 'border-[#a6755b] shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-lg bg-neutral-100">
                    {image ? (
                      <img
                        src={image}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{product.title}</p>
                    <p className="text-xs text-neutral-500">{product.id}</p>
                    <p className="text-sm text-neutral-700">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
