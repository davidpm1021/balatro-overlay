/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Balatro-inspired color palette
        'balatro': {
          'bg': 'rgba(15, 15, 23, 0.92)',
          'panel': 'rgba(25, 25, 40, 0.95)',
          'card': 'rgba(35, 35, 55, 0.9)',
          'accent': '#4a9eff',
          'gold': '#ffd700',
          'red': '#e84545',
          'green': '#45e845',
          'purple': '#9c45e8',
          'border': 'rgba(255, 255, 255, 0.08)',
        },
        // Suit colors (red suits, light gray for dark suits on dark bg)
        'suit': {
          'hearts': '#e84545',
          'diamonds': '#e84545',
          'clubs': '#b8c0cc',
          'spades': '#b8c0cc',
        },
        // Chip/mult display colors
        'chips': '#4dabf7',
        'mult': '#e84545',
        'xmult': '#e8a545',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
