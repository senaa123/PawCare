/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1F3A2E',
          dark:    '#162B22',
          light:   '#284B3C',
          hover:   'rgba(255,255,255,0.08)',
        },
        cream:    '#FBF6ED',
        oat: {
          DEFAULT: '#F0E6D2',
          light:   '#F8F3E8',
          dark:    '#E4D4B5',
        },
        marmalade: {
          DEFAULT: '#E8813A',
          hover:   '#D67029',
          light:   '#FDF2E9',
        },
        ink: {
          DEFAULT: '#22201B',
          muted:   '#6B665E',
          light:   '#9C9589',
        },
        border:   '#E8DFC8',
        surface:  '#FFFFFF',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        display:  ['Fraunces', 'serif'],
        body:     ['Inter', 'sans-serif'],
        sans:     ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '10px': '10px',
        '12px': '12px',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:      '0 2px 12px 0 rgba(34,32,27,0.04)',
        cardHover: '0 8px 24px 0 rgba(31,58,46,0.08)',
        soft:      '0 2px 8px 0 rgba(232,129,58,0.15)',
      },
      animation: {
        'fade-in':    'fadeIn 0.32s ease-out forwards',
        'slide-up':   'slideUp 0.32s ease-out forwards',
        'pulse-dot':  'pulseDot 1.6s ease-in-out infinite',
        'sway':       'sway 4s ease-in-out infinite',
        'ring-once':  'ringOnce 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:  { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%, 100%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(1.15)', opacity: 0.8 } },
        sway:     { '0%, 100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(-3deg)' }, '75%': { transform: 'rotate(3deg)' } },
        ringOnce: { '0%, 100%': { transform: 'rotate(0)' }, '20%': { transform: 'rotate(-12deg)' }, '40%': { transform: 'rotate(12deg)' }, '60%': { transform: 'rotate(-6deg)' }, '80%': { transform: 'rotate(6deg)' } },
      },
    },
  },
  plugins: [],
}
