import { Leaf, Heart, FlaskConical } from "lucide-react";

const features = [
  {
    icon: FlaskConical,
    title: "Sin parabenos",
    description: "Fórmulas limpias sin conservantes sintéticos que puedan dañar tu piel",
  },
  {
    icon: Heart,
    title: "Sin crueldad animal",
    description: "Nunca testamos en animales. 100% cruelty-free y vegano",
  },
  {
    icon: Leaf,
    title: "Hecho en pequeños lotes",
    description: "Producción artesanal que garantiza frescura y calidad en cada producto",
  },
];

export function WhyClean() {
  return (
    <section className="py-24 bg-nude-soft">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mb-4">
            ¿Por qué cosmética clean?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tu piel merece lo mejor. Descubre los beneficios de elegir productos naturales y conscientes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="text-center p-8 rounded-sm bg-background/50 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-nude-cream flex items-center justify-center">
                <feature.icon className="w-7 h-7 text-nude-terracotta" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-2xl text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
