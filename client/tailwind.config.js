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
        dark: {
          bg: '#0A0A0B',
          surface: '#121215',
          card: '#18181C',
          muted: '#222228',
          border: '#2A2A34',
        },
        pulse: {
          cyan: '#00D2FF',
          blue: '#0084FF',
          darkBlue: '#0051A8',
          amber: '#F59E0B',
          rose: '#F43F5E',
          emerald: '#10B981',
          purple: '#A855F7',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 210, 255, 0.3)',
        'glow-cyan-lg': '0 0 40px -5px rgba(0, 210, 255, 0.45)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'card-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'pulse-radial': 'radial-gradient(circle at 50% 0%, rgba(0, 210, 255, 0.12) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}
