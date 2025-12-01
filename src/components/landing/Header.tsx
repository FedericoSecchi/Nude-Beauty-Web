import { useCartContext } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export function Header() {
  const { setIsOpen, itemCount } = useCartContext();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="font-heading text-2xl text-foreground">
            nude
          </a>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#nosotros" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Nosotros
            </a>
            <a 
              href="#productos" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Productos
            </a>
          </nav>

          {/* Cart button */}
          <Button 
            variant="nude-ghost" 
            size="icon"
            onClick={() => setIsOpen(true)}
            className="relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-nude-terracotta text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
