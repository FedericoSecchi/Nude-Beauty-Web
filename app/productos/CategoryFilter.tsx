'use client';

interface Props {
  grupos: { id: string; nombre: string }[];
}

export function CategoryFilter({ grupos }: Props) {
  return (
    <nav
      aria-label="Filtro por categoría"
      className="container flex flex-wrap gap-2 pb-8 border-b border-border"
    >
      {grupos.map((g) => (
        <a
          key={g.id}
          href={`#${g.id}`}
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm text-charcoal no-underline hover:bg-charcoal hover:text-cream hover:border-charcoal"
        >
          {g.nombre}
        </a>
      ))}
    </nav>
  );
}
