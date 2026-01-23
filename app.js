// WhatsApp number constant
const WHATSAPP_NUMBER = "5493517033348";

// Carousel state management (per product)
const CarouselState = {
  states: new Map(), // productId -> currentIndex

  getIndex(productId) {
    const key = String(productId);
    return this.states.get(key) || 0;
  },

  setIndex(productId, index) {
    const key = String(productId);
    this.states.set(key, index);
  },

  next(productId, maxIndex) {
    const key = String(productId);
    const current = this.getIndex(key);
    const next = current >= maxIndex ? 0 : current + 1;
    this.setIndex(key, next);
    return next;
  },

  prev(productId, maxIndex) {
    const key = String(productId);
    const current = this.getIndex(key);
    const prev = current <= 0 ? maxIndex : current - 1;
    this.setIndex(key, prev);
    return prev;
  }
};

// Cart state management
const Cart = {
  items: [],
  isOpen: false,

  init() {
    // Load from localStorage
    const stored = localStorage.getItem('nude-cart');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure all IDs are strings for consistency
        this.items = parsed.map(item => ({
          ...item,
          id: String(item.id)
        }));
      } catch (e) {
        console.error('Error parsing cart from localStorage:', e);
        this.items = [];
      }
    }
    this.updateUI();
  },

  save() {
    localStorage.setItem('nude-cart', JSON.stringify(this.items));
    this.updateUI();
  },

  addItem(product) {
    const productId = String(product.id);
    const existing = this.items.find(item => String(item.id) === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({ ...product, id: productId, quantity: 1 });
    }
    this.save();
    this.showToast(`${product.name} añadido al carrito`);
  },

  removeItem(id) {
    const itemId = String(id);
    this.items = this.items.filter(item => String(item.id) !== itemId);
    this.save();
  },

  updateQuantity(id, quantity) {
    if (quantity <= 0) {
      this.removeItem(id);
      return;
    }
    const itemId = String(id);
    const item = this.items.find(item => String(item.id) === itemId);
    if (item) {
      item.quantity = quantity;
      this.save();
    }
  },

  get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  get itemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  buildWhatsAppMessage() {
    let message = '¡Hola! Me gustaría hacer un pedido:\n\n';
    this.items.forEach((item) => {
      message += `• ${item.name} x${item.quantity} - €${(item.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\nTotal: €${this.total.toFixed(2)}`;
    return encodeURIComponent(message);
  },

  open() {
    this.isOpen = true;
    this.updateCartSidebar();
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.isOpen = false;
    this.updateCartSidebar();
    document.body.style.overflow = '';
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  updateUI() {
    // Update cart badge
    const badge = document.getElementById('cart-badge');
    if (badge) {
      if (this.itemCount > 0) {
        badge.textContent = this.itemCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Update cart sidebar
    this.updateCartSidebar();
  },

  updateCartSidebar() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');
    const itemsContainer = document.getElementById('cart-items');
    const footer = document.getElementById('cart-footer');
    const totalElement = document.getElementById('cart-total');

    if (!overlay || !sidebar || !itemsContainer) return;

    if (this.isOpen) {
      overlay.classList.remove('hidden');
      sidebar.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      sidebar.classList.add('hidden');
    }

    // Render cart items
    if (this.items.length === 0) {
      itemsContainer.innerHTML = `
        <div class="text-center py-12 text-muted-foreground">
          <p>Tu carrito está vacío</p>
        </div>
      `;
      if (footer) footer.classList.add('hidden');
    } else {
      itemsContainer.innerHTML = `
        <ul class="space-y-4">
          ${this.items.map(item => `
            <li class="flex gap-4 p-4 bg-card rounded-sm">
              <div class="w-16 h-16 bg-nude-sand/30 rounded-sm flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <h3 class="font-heading text-foreground truncate">${this.escapeHtml(item.name)}</h3>
                <p class="text-muted-foreground text-sm">€${item.price.toFixed(2)}</p>
                <div class="flex items-center gap-2 mt-2">
                  <button
                    data-action="decrease"
                    data-id="${item.id}"
                    class="w-7 h-7 flex items-center justify-center rounded-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span class="w-8 text-center text-sm">${item.quantity}</span>
                  <button
                    data-action="increase"
                    data-id="${item.id}"
                    class="w-7 h-7 flex items-center justify-center rounded-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    data-action="remove"
                    data-id="${item.id}"
                    class="ml-auto p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          `).join('')}
        </ul>
      `;
      if (footer) {
        footer.classList.remove('hidden');
        if (totalElement) {
          totalElement.textContent = `€${this.total.toFixed(2)}`;
        }
      }
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-foreground text-background px-4 py-2 rounded-md shadow-soft z-50 animate-fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Products management
async function loadProducts() {
  const normalizeProduct = (product) => {
    if (!product || !product.id) {
      console.warn('Skipping product without id from index.json:', product);
      return null;
    }

    const title = product.title || product.name || 'Producto';
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
    const mpLink =
      typeof product.mp_link === 'string' && product.mp_link.trim()
        ? product.mp_link.trim()
        : '';

    return {
      id: product.id,
      title,
      description,
      price,
      images,
      mp_link: mpLink
    };
  };

  try {
    const response = await fetch('/products/index.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const products = Array.isArray(data)
      ? data.map((product) => normalizeProduct(product)).filter(Boolean)
      : [];
    window.CMS_PRODUCTS = products;
    return products;
  } catch (error) {
    console.error('Error loading products:', error);
    window.CMS_PRODUCTS = [];
    return [];
  }
}

const Products = {
  products: [],
  loading: true,

  async load() {
    try {
      const data = await loadProducts();
      this.products = data;
    } finally {
      this.loading = false;
      this.render();
    }
  },

  render() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (this.loading) {
      grid.innerHTML = `
        <div class="col-span-full text-center">
          <div class="w-8 h-8 mx-auto border-2 border-nude-terracotta border-t-transparent rounded-full animate-spin"></div>
        </div>
      `;
      return;
    }

    if (this.products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center text-muted-foreground">
          <p>No hay productos disponibles</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.products.map((product, index) => {
      const images = product.images || [];
      const firstImage = images[0] || '/products/placeholder.jpg';
      const hasMultipleImages = images.length > 1;

      return `
        <article 
          class="group bg-card rounded-sm overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 animate-slide-up"
          style="animation-delay: ${0.1 + index * 0.05}s"
        >
          <div class="product-carousel aspect-square bg-nude-sand/30 relative overflow-hidden" data-product-id="${product.id}">
            <img 
              src="${firstImage}" 
              alt="${this.escapeHtml(product.title)}"
              class="carousel-image w-full h-full object-cover transition-opacity duration-300"
              data-product-id="${product.id}"
              onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Crect fill=\'%23f5f0e8\' width=\'400\' height=\'400\'/%3E%3Ctext fill=\'%23998a7a\' font-family=\'sans-serif\' font-size=\'20\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EImagen no disponible%3C/text%3E%3C/svg%3E';"
            />
            ${hasMultipleImages ? `
              <button 
                class="carousel-btn carousel-btn-prev"
                data-product-id="${product.id}"
                data-action="prev"
                aria-label="Imagen anterior"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                class="carousel-btn carousel-btn-next"
                data-product-id="${product.id}"
                data-action="next"
                aria-label="Siguiente imagen"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div class="carousel-dots">
                ${images.map((_, imgIndex) => `
                  <button 
                    class="carousel-dot ${imgIndex === 0 ? 'active' : ''}"
                    data-product-id="${product.id}"
                    data-index="${imgIndex}"
                    aria-label="Ir a imagen ${imgIndex + 1}"
                  ></button>
                `).join('')}
              </div>
            ` : ''}
            <div class="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300 pointer-events-none"></div>
          </div>
          <div class="p-5">
            <h3 class="font-heading text-xl text-foreground mb-1">${this.escapeHtml(product.title)}</h3>
            <p class="text-muted-foreground text-sm mb-4 line-clamp-2">${this.escapeHtml(product.description)}</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span class="font-heading text-2xl text-foreground">€${product.price.toFixed(2)}</span>
              ${
                product.mp_link
                  ? `
                    <a
                      href="${this.escapeHtml(product.mp_link)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn btn-nude btn-sm text-center"
                    >
                      Comprar con Mercado Pago
                    </a>
                  `
                  : `
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
                  `
              }
            </div>
          </div>
        </article>
      `;
    }).join('');

    this.initCarouselState();
  },

  initCarouselState() {
    this.products.forEach(product => {
      if (product.images && product.images.length > 0) {
        CarouselState.setIndex(String(product.id), 0);
      }
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  updateCarouselImage(productId, imageIndex) {
    const product = this.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    const images = product.images || [];
    if (imageIndex < 0 || imageIndex >= images.length) return;

    const img = document.querySelector(`.carousel-image[data-product-id="${productId}"]`);
    if (!img) return;

    // Fade out
    img.style.opacity = '0';
    
    setTimeout(() => {
      img.src = images[imageIndex];
      img.alt = `${product.title} - Imagen ${imageIndex + 1}`;
      // Fade in
      img.style.opacity = '1';
    }, 150);

    // Update dots
    const dots = document.querySelectorAll(`.carousel-dot[data-product-id="${productId}"]`);
    dots.forEach((dot, index) => {
      if (index === imageIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
};

// Event delegation for carousel
function handleCarouselClick(e) {
  const btn = e.target.closest('[data-action="prev"], [data-action="next"], .carousel-dot');
  if (!btn) return;

  const productId = btn.dataset.productId;
  if (!productId) return;

  const product = Products.products.find(p => String(p.id) === String(productId));
  if (!product) return;

  const images = product.images || [];
  if (images.length <= 1) return;

  const maxIndex = images.length - 1;
  let newIndex;

  if (btn.dataset.action === 'prev') {
    newIndex = CarouselState.prev(productId, maxIndex);
  } else if (btn.dataset.action === 'next') {
    newIndex = CarouselState.next(productId, maxIndex);
  } else if (btn.classList.contains('carousel-dot')) {
    newIndex = parseInt(btn.dataset.index, 10);
    CarouselState.setIndex(productId, newIndex);
  } else {
    return;
  }

  Products.updateCarouselImage(productId, newIndex);
}

// Event delegation for cart actions
function handleCartAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn || !btn.dataset.action) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id || btn.dataset.productId;

  if (!id) return;

  const itemId = String(id);

  switch (action) {
    case 'add-to-cart':
      const product = Products.products.find(p => String(p.id) === itemId);
      if (product) {
        Cart.addItem({
          id: product.id,
          name: product.title,
          price: product.price
        });
      }
      break;
    case 'increase':
      const itemInc = Cart.items.find(item => String(item.id) === itemId);
      if (itemInc) {
        Cart.updateQuantity(itemId, itemInc.quantity + 1);
      }
      break;
    case 'decrease':
      const itemDec = Cart.items.find(item => String(item.id) === itemId);
      if (itemDec) {
        Cart.updateQuantity(itemId, itemDec.quantity - 1);
      }
      break;
    case 'remove':
      Cart.removeItem(itemId);
      break;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Initialize cart
  Cart.init();

  // Set current year
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Cart toggle button
  const cartToggle = document.getElementById('cart-toggle');
  if (cartToggle) {
    cartToggle.addEventListener('click', () => Cart.toggle());
  }

  // Cart close button
  const cartClose = document.getElementById('cart-close');
  if (cartClose) {
    cartClose.addEventListener('click', () => Cart.close());
  }

  // Cart overlay click
  const cartOverlay = document.getElementById('cart-overlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', () => Cart.close());
  }

  // Keyboard support: Escape to close cart
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Cart.isOpen) {
      Cart.close();
    }
  });

  // Event delegation for cart actions
  const cartItems = document.getElementById('cart-items');
  if (cartItems) {
    cartItems.addEventListener('click', handleCartAction);
  }

  // Event delegation for product cards (add to cart)
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid) {
    productsGrid.addEventListener('click', handleCartAction);
  }

  // Event delegation for carousel
  if (productsGrid) {
    productsGrid.addEventListener('click', handleCarouselClick);
  }

  // WhatsApp checkout
  const whatsappCheckout = document.getElementById('whatsapp-checkout');
  if (whatsappCheckout) {
    whatsappCheckout.addEventListener('click', () => {
      if (Cart.items.length === 0) {
        Cart.showToast('Tu carrito está vacío');
        return;
      }
      const message = Cart.buildWhatsAppMessage();
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    });
  }

  // Scroll to products
  const scrollToProducts = document.getElementById('scroll-to-products');
  if (scrollToProducts) {
    scrollToProducts.addEventListener('click', () => {
      document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Load products
  Products.load();
});

// Make Cart methods available globally for backwards compatibility
window.Cart = Cart;
