import { Instagram, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 bg-nude-soft border-t border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="text-center md:text-left">
            <span className="font-heading text-3xl text-foreground">nude</span>
            <p className="text-muted-foreground text-sm mt-1">
              Cosmética clean hecha a mano
            </p>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/34600000000"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-background hover:bg-nude-cream transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-5 h-5 text-foreground" />
            </a>
            <a
              href="https://instagram.com/nude.cosmeticaclean"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-background hover:bg-nude-cream transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5 text-foreground" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border/50 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} nude.cosmeticaclean. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
