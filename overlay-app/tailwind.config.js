/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Balatro-inspired color palette (reference: #1a1a2e, #d4af37, #e74c3c, #4a4a6a)
        'balatro': {
          'bg': 'rgba(26, 26, 46, 0.75)',        // #1a1a2e with 75% opacity
          'panel': 'rgba(30, 30, 52, 0.90)',     // Slightly lighter panel
          'card': 'rgba(38, 38, 60, 0.85)',      // Card elements
          'accent': '#4a9eff',                    // Blue accent (keep)
          'gold': '#d4af37',                      // Muted gold
          'red': '#e74c3c',                       // Balatro red
          'green': '#45e845',                     // Success green
          'purple': '#9c45e8',                    // Purple accent
          'border': '#4a4a6a',                    // Visible borders
          'border-subtle': 'rgba(74, 74, 106, 0.5)', // Subtle borders
        },
        // Suit colors (red suits, light suits for dark background)
        'suit': {
          'hearts': '#e74c3c',                   // Balatro red
          'diamonds': '#e74c3c',                 // Balatro red
          'clubs': '#e0e0e0',                    // Light grey (readable on dark)
          'spades': '#e0e0e0',                   // Light grey (readable on dark)
        },
        // Chip/mult display colors
        'chips': '#4dabf7',
        'mult': '#e74c3c',
        'xmult': '#e8a545',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      width: {
        'sidebar': '280px',
      },
      maxWidth: {
        'sidebar': '280px',
      },
      transitionDuration: {
        '300': '300ms',
      },
      transitionTimingFunction: {
        'out': 'ease-out',
      },
    },
  },
  plugins: [],
}
