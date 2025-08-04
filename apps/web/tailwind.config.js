/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
        poker: ['Georgia', 'serif'],
      },
      animation: {
        'deal': 'deal 0.5s ease-out',
        'chip-bounce': 'chip-bounce 0.6s ease-out',
        'card-flip': 'card-flip 0.3s ease-in-out',
      },
      keyframes: {
        deal: {
          '0%': { transform: 'translateY(-100px) rotate(180deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        'chip-bounce': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.1)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
    },
  },
  plugins: [],
} 