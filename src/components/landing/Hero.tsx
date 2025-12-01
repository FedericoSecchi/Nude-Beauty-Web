import { Button } from "@/components/ui/button";
import { MessageCircle, ShoppingBag } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export function Hero() {
  const scrollToProducts = () => {
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-background/40" />
      
      {/* Content */}
      <div className="container relative z-10 text-center px-6">
        <div className="animate-fade-in">
          <h1 className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight text-foreground mb-4">
            nude
          </h1>
          <p className="font-body text-lg sm:text-xl md:text-2xl text-muted-foreground tracking-widest uppercase mb-12">
            Cosmética clean hecha a mano
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="nude" 
              size="lg" 
              onClick={scrollToProducts}
              className="min-w-[200px]"
            >
              <ShoppingBag className="w-5 h-5" />
              Ver productos
            </Button>
            <Button 
              variant="nude-outline" 
              size="lg" 
              asChild
              className="min-w-[200px]"
            >
              <a 
                href="https://wa.me/34600000000?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20sus%20productos" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-5 h-5" />
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
