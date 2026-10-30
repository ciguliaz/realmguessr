/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skyrim: {
          dark: '#0f141c',
          card: '#161d27',
          border: '#2c394b',
          accent: '#d4af37',
          gold: '#e6c86e',
          ice: '#7bd5f5',
        },
      },
    },
  },
  plugins: [],
}
