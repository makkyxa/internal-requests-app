/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a3ff',
          500: '#5c7aff',
          600: '#475df2',
          700: '#3847db',
          800: '#2e3bb5',
          900: '#2a348f',
          950: '#1b2054',
        }
      }
    },
  },
  plugins: [],
}
