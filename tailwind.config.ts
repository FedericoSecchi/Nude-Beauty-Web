import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { sm: '640px', md: '768px', lg: '960px', xl: '1120px' },
    },
    extend: {
      colors: {
        bg: 'hsl(var(--background) / <alpha-value>)',
        ink: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-ink': 'hsl(var(--muted-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-ink': 'hsl(var(--primary-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-ink': 'hsl(var(--accent-foreground) / <alpha-value>)',
        cream: 'hsl(var(--nude-cream) / <alpha-value>)',
        sand: 'hsl(var(--nude-sand) / <alpha-value>)',
        terracotta: 'hsl(var(--nude-terracotta) / <alpha-value>)',
        charcoal: 'hsl(var(--nude-charcoal) / <alpha-value>)',
        soft: 'hsl(var(--nude-soft) / <alpha-value>)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 2px)',
        DEFAULT: 'var(--radius)',
        md: 'calc(var(--radius) + 2px)',
        lg: 'calc(var(--radius) + 6px)',
      },
      boxShadow: {
        soft: '0 4px 20px -4px hsl(25 20% 22% / 0.08)',
        card: '0 2px 12px -2px hsl(25 20% 22% / 0.06)',
      },
      maxWidth: {
        prose: '42rem',
      },
    },
  },
  plugins: [],
};
export default config;
