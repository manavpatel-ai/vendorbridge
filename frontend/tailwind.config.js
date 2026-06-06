/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0B0F0E',
        darksurface: '#121A17',
        darkborder: '#223027',
        textprimary: '#E8EDEA',
        textsecondary: '#8A958F',
        accentgreen: '#22C55E',
        accentgreenhover: '#16A34A',
        dangerred: '#EF4444',
        warningamber: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
