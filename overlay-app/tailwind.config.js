/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Balatro-inspired color palette
        'balatro-bg': 'rgba(20, 20, 30, 0.85)',
        'balatro-panel': 'rgba(30, 30, 45, 0.9)',
        'balatro-accent': '#4a9eff',
        'balatro-gold': '#ffd700',
        'balatro-red': '#ff4444',
        'balatro-green': '#44ff44',
        // Suit colors
        'suit-hearts': '#ff6b6b',
        'suit-diamonds': '#4dabf7',
        'suit-clubs': '#69db7c',
        'suit-spades': '#868e96',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
