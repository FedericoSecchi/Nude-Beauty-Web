import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import productsData from "@/data/products.json";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching from JSON (in a real app, this could be an API call)
    const loadProducts = async () => {
      try {
        // Using imported JSON data
        setProducts(productsData);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) {
    return (
      <section id="productos" className="py-24 bg-background">
        <div className="container">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto border-2 border-nude-terracotta border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="productos" className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-4">
            Nuestros productos
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Descubre nuestra colección de productos artesanales, creados con ingredientes naturales y mucho cariño.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
