/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        karaoke: {
          dark: '#0f0f17',
          card: '#181824',
          accent: '#e11d48',
          purple: '#8b5cf6',
          gold: '#f59e0b',
          neon: '#06b6d4'
        }
      }
    },
  },
  plugins: [],
}

