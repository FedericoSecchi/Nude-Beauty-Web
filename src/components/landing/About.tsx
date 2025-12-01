import { useEffect, useState } from "react";

export function About() {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <section id="nosotros" className="py-24 bg-background">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text content */}
          <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-6">
              Belleza natural, hecha con amor
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                En <span className="text-foreground font-medium">nude</span>, creemos que la verdadera belleza viene de lo natural. 
                Cada producto está elaborado a mano en pequeños lotes, utilizando únicamente ingredientes de origen vegetal 
                y orgánico que nutren tu piel sin comprometer tu salud ni el medio ambiente.
              </p>
              <p>
                Nos dedicamos a crear fórmulas simples pero efectivas, libres de químicos agresivos, 
                parabenos y fragancias sintéticas. Solo lo esencial, nada más.
              </p>
            </div>
          </div>

          {/* Image placeholder */}
          <div 
            className="relative aspect-[4/5] rounded-sm overflow-hidden bg-nude-sand/30 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground/60">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-nude-sand/50 flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm">Imagen del taller</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
