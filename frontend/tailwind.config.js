/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F5F2E9',
        charcoal: '#202322',
        forest: '#315B48',
        amber: '#D6A442',
        sage: '#D9DED5',
      },
      fontFamily: {
        display: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['"Public Sans"', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(32,35,34,0.06), 0 4px 14px rgba(32,35,34,0.05)' },
    },
  },
  plugins: [],
};
