(() => {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const PRODUCTS_URL = '/products/index.json';

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const slugify = (text) =>
    String(text)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

  const normalizeProduct = (product, index) => {
    const name = product.name || product.title || 'Producto';
    const description = product.description || '';
    const priceRaw = product.price ?? 0;
    const parsedPrice = Number.parseFloat(
      String(priceRaw).trim().replace(',', '.')
    );
    const price = Number.isFinite(parsedPrice) ? parsedPrice : 0;
    const images = Array.isArray(product.images)
      ? product.images
      : product.image
      ? [product.image]
      : [];
    const id = product.id || product.slug || slugify(name) || String(index + 1);

    return {
      ...product,
      id,
      name,
      description,
      price,
      images
    };
  };

  const formatPrice = (value) => `€${value.toFixed(2)}`;

  const renderProducts = (products) => {
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center text-muted-foreground">
          <p>No hay productos disponibles</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products
      .map((product, index) => {
        const firstImage =
          product.images && product.images.length > 0
            ? product.images[0]
            : '/products/placeholder.jpg';

        return `
          <article 
            class="group bg-card rounded-sm overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 animate-slide-up"
            style="animation-delay: ${0.1 + index * 0.05}s"
          >
            <div class="aspect-square bg-nude-sand/30 relative overflow-hidden">
              <img 
                src="${firstImage}" 
                alt="${escapeHtml(product.name)}"
                class="w-full h-full object-cover transition-opacity duration-300"
                onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'400\\'%3E%3Crect fill=\\'%23f5f0e8\\' width=\\'400\\' height=\\'400\\'/%3E%3Ctext fill=\\'%23998a7a\\' font-family=\\'sans-serif\\' font-size=\\'20\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'%3EImagen no disponible%3C/text%3E%3C/svg%3E';"
              />
              <div class="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300 pointer-events-none"></div>
            </div>
            <div class="p-5">
              <h3 class="font-heading text-xl text-foreground mb-1">${escapeHtml(product.name)}</h3>
              <p class="text-muted-foreground text-sm mb-4 line-clamp-2">${escapeHtml(product.description)}</p>
              <div class="flex items-center justify-between">
                <span class="font-heading text-2xl text-foreground">${formatPrice(product.price)}</span>
                <button 
                  data-action="add-to-cart"
                  data-product-id="${product.id}"
                  class="btn btn-nude btn-sm"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Agregar
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  };

  grid.innerHTML = `
    <div class="col-span-full text-center">
      <div class="w-8 h-8 mx-auto border-2 border-nude-terracotta border-t-transparent rounded-full animate-spin"></div>
    </div>
  `;

  fetch(PRODUCTS_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const products = Array.isArray(data)
        ? data.map((product, index) => normalizeProduct(product, index))
        : [];

      window.CMS_PRODUCTS = products;
      window.CMS_PRODUCTS_RENDERED = true;
      renderProducts(products);
    })
    .catch((error) => {
      console.error('Error loading products:', error);
      grid.innerHTML = `
        <div class="col-span-full text-center text-muted-foreground">
          <p>No se pudieron cargar los productos</p>
        </div>
      `;
    });
})();
