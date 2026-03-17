/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        bark: {
          50: '#f6f4f0',
          100: '#e8e2d8',
          200: '#d4c9b8',
          300: '#bdaa90',
          400: '#a88f6e',
          500: '#997a5c',
          600: '#8a664e',
          700: '#735242',
          800: '#5f4539',
          900: '#4f3b32',
          950: '#2b1f1a',
        },
        leaf: {
          50: '#f0fdf2',
          100: '#dcfce4',
          200: '#bbf7cc',
          300: '#86ef9e',
          400: '#4ade68',
          500: '#22c54d',
          600: '#16a33a',
          700: '#15802f',
          800: '#16652a',
          900: '#145325',
          950: '#052e11',
        },
      },
    },
  },
  plugins: [],
}
