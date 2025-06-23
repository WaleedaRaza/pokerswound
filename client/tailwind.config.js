/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          green: '#0f5132',
          felt: '#1a5f3c',
          gold: '#ffd700',
          red: '#dc2626',
          black: '#1f2937',
        }
      },
      fontFamily: {
        'card': ['Georgia', 'serif'],
      }
    },
  },
  plugins: [],
} 