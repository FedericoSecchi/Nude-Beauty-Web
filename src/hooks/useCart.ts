import { useState, useEffect } from 'react';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('nude-cart');
    if (stored) {
      setItems(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nude-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: { id: number; name: string; price: number }) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const buildWhatsAppMessage = () => {
    let message = '¡Hola! Me gustaría hacer un pedido:\n\n';
    items.forEach((item) => {
      message += `• ${item.name} x${item.quantity} - €${(item.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\nTotal: €${total.toFixed(2)}`;
    return encodeURIComponent(message);
  };

  const clearCart = () => setItems([]);

  return {
    items,
    isOpen,
    setIsOpen,
    addItem,
    removeItem,
    updateQuantity,
    total,
    itemCount,
    buildWhatsAppMessage,
    clearCart,
  };
}
