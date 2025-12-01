import { Button } from "@/components/ui/button";
import { useCartContext } from "@/context/CartContext";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { addItem } = useCartContext();

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
    });
    toast.success(`${product.name} añadido al carrito`);
  };

  return (
    <article 
      className="group bg-card rounded-sm overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
    >
      {/* Image placeholder */}
      <div className="aspect-square bg-nude-sand/30 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground/50">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-heading text-xl text-foreground mb-1">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="font-heading text-2xl text-foreground">
            €{product.price.toFixed(2)}
          </span>
          <Button 
            variant="nude" 
            size="sm"
            onClick={handleAddToCart}
          >
            <ShoppingBag className="w-4 h-4" />
            Agregar
          </Button>
        </div>
      </div>
    </article>
  );
}
