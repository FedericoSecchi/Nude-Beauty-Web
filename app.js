// Cart state management
const Cart = {
  items: [],
  isOpen: false,

  init() {
    // Load from localStorage
    const stored = localStorage.getItem('nude-cart');
    if (stored) {
      this.items = JSON.parse(stored);
    }
    this.updateUI();
  },

  save() {
    localStorage.setItem('nude-cart', JSON.stringify(this.items));
    this.updateUI();
  },

  addItem(product) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({ ...product, quantity: 1 });
    }
    this.save();
    this.showToast(`${product.name} añadido al carrito`);
  },

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  },

  updateQuantity(id, quantity) {
    if (quantity <= 0) {
      this.removeItem(id);
      return;
    }
    const item = this.items.find(item => item.id === id);
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
  },

  close() {
    this.isOpen = false;
    this.updateCartSidebar();
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
                <h3 class="font-heading text-foreground truncate">${item.name}</h3>
                <p class="text-muted-foreground text-sm">€${item.price.toFixed(2)}</p>
                <div class="flex items-center gap-2 mt-2">
                  <button
                    onclick="Cart.updateQuantity(${item.id}, ${item.quantity - 1})"
                    class="w-7 h-7 flex items-center justify-center rounded-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span class="w-8 text-center text-sm">${item.quantity}</span>
                  <button
                    onclick="Cart.updateQuantity(${item.id}, ${item.quantity + 1})"
                    class="w-7 h-7 flex items-center justify-center rounded-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onclick="Cart.removeItem(${item.id})"
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
const Products = {
  products: [],
  loading: true,

  async load() {
    try {
      const response = await fetch('products.json');
      this.products = await response.json();
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      this.loading = false;
      this.render();
    }
  },

  render() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (this.loading) {
      grid.innerHTML = `
        <div class="col-span-full text-center">
          <div class="w-8 h-8 mx-auto border-2 border-nude-terracotta border-t-transparent rounded-full animate-spin"></div>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.products.map((product, index) => `
      <article 
        class="group bg-card rounded-sm overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 animate-slide-up"
        style="animation-delay: ${0.1 + index * 0.05}s"
      >
        <div class="aspect-square bg-nude-sand/30 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center text-muted-foreground/50">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div class="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300"></div>
        </div>
        <div class="p-5">
          <h3 class="font-heading text-xl text-foreground mb-1">${product.name}</h3>
          <p class="text-muted-foreground text-sm mb-4 line-clamp-2">${product.description}</p>
          <div class="flex items-center justify-between">
            <span class="font-heading text-2xl text-foreground">€${product.price.toFixed(2)}</span>
            <button 
              onclick="Cart.addItem({id: ${product.id}, name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price}})"
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
    `).join('');
  }
};

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

  // WhatsApp checkout
  const whatsappCheckout = document.getElementById('whatsapp-checkout');
  if (whatsappCheckout) {
    whatsappCheckout.addEventListener('click', () => {
      const message = Cart.buildWhatsAppMessage();
      window.open(`https://wa.me/34600000000?text=${message}`, '_blank');
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

// Make Cart methods available globally for onclick handlers
window.Cart = Cart;

