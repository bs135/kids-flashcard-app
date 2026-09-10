/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        kids: ['Fredoka', 'Quicksand', 'sans-serif'],
      },
      colors: {
        bubble: {
          pink: '#FF80BF',
          blue: '#5CE1E6',
          yellow: '#FFDE59',
          green: '#7ED957',
          orange: '#FF914D',
          purple: '#C9A0DC',
        }
      },
      boxShadow: {
        'bouncy': '0 8px 0 0 rgba(0, 0, 0, 0.15)',
        'bouncy-active': '0 2px 0 0 rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
