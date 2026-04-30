/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--primary)',
          deep: '#1e40af',
          light: 'var(--primary-light)',
        },
        'finance-positive': 'var(--success)',
        'finance-negative': 'var(--danger)',
        'accent-light': 'var(--accent-light)',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
        cabinet: ['JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'fin-sm': '0 10px 24px rgba(0,0,0,0.25)',
        'fin-md': '0 18px 38px rgba(0,0,0,0.32)',
        'fin-lg': '0 28px 60px rgba(0,0,0,0.4)',
      },
      transitionProperty: {
        'fin': 'all',
      },
      transitionDuration: {
        'fin': '200ms',
      },
    },
  },
  plugins: [],
}
