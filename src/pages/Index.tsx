import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { WhyClean } from "@/components/landing/WhyClean";
import { ProductGrid } from "@/components/landing/ProductGrid";
import { CartSidebar } from "@/components/landing/CartSidebar";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Hero />
          <About />
          <WhyClean />
          <ProductGrid />
        </main>
        <Footer />
        <CartSidebar />
      </div>
    </CartProvider>
  );
};

export default Index;
