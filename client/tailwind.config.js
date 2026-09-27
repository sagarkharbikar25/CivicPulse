/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#000000',
        obsidian: '#050507',
        dark: {
          bg: '#000000',
          surface: '#09090C',
          card: '#0E0E12',
          muted: '#15151B',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        pulse: {
          cyan: '#00D2FF',
          blue: '#0084FF',
          amber: '#F59E0B',
          rose: '#F43F5E',
          emerald: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'Cambria', 'serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 210, 255, 0.3)',
        'glow-white': '0 0 25px rgba(255, 255, 255, 0.3)',
        'glow-beam': '0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.3)',
        'card-glass': '0 12px 40px 0 rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'spotlight-tr': 'radial-gradient(ellipse 65% 50% at 85% 15%, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 45%, transparent 75%)',
        'spotlight-bl': 'radial-gradient(ellipse 65% 50% at 15% 85%, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.01) 45%, transparent 75%)',
      },
    },
  },
  plugins: [],
}
