import { useCartContext } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { X, Minus, Plus, Trash2, MessageCircle } from "lucide-react";

export function CartSidebar() {
  const { 
    items, 
    isOpen, 
    setIsOpen, 
    removeItem, 
    updateQuantity, 
    total, 
    buildWhatsAppMessage 
  } = useCartContext();

  const handleWhatsAppCheckout = () => {
    const message = buildWhatsAppMessage();
    window.open(`https://wa.me/34600000000?text=${message}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-soft z-50 animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-heading text-2xl text-foreground">Tu carrito</h2>
            <Button 
              variant="nude-ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </header>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tu carrito está vacío</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li 
                    key={item.id} 
                    className="flex gap-4 p-4 bg-card rounded-sm"
                  >
                    {/* Image placeholder */}
                    <div className="w-16 h-16 bg-nude-sand/30 rounded-sm flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-foreground truncate">
                        {item.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        €{item.price.toFixed(2)}
                      </p>
                      
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-sm bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-sm bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-auto p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <footer className="p-6 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-heading text-2xl text-foreground">
                  €{total.toFixed(2)}
                </span>
              </div>
              <Button 
                variant="nude" 
                size="lg" 
                className="w-full"
                onClick={handleWhatsAppCheckout}
              >
                <MessageCircle className="w-5 h-5" />
                Finalizar por WhatsApp
              </Button>
            </footer>
          )}
        </div>
      </aside>
    </>
  );
}
