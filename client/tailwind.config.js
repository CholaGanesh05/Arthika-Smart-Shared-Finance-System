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
          DEFAULT: '#0f766e',
          deep: '#134e4a',
          light: '#5eead4',
        },
        'finance-positive': '#166534',
        'finance-negative': '#b42318',
        'accent-light': '#5eead4',
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Trebuchet MS', 'Gill Sans', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'fin-sm': '0 2px 6px rgba(0,0,0,0.06)',
        'fin-md': '0 6px 18px rgba(0,0,0,0.08)',
        'fin-lg': '0 16px 40px rgba(0,0,0,0.10)',
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
