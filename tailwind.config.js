/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#121212',
        'brand-text': '#E0E0E0',
        'brand-accent': '#3B82F6',
        'brand-secondary': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'gradient-pan': 'gradient-pan 3s ease infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 6s ease-in-out infinite',
        'draw-line': 'draw-line 1s ease-out forwards',
        'glitch': 'glitch 1.5s linear infinite',
        'reveal-text': 'reveal-text 1s cubic-bezier(0.77, 0, 0.175, 1) forwards',
        'scroll-indicator': 'scroll-indicator 2.2s ease-out infinite',
        'float': 'float 10s ease-in-out infinite',
      },
      keyframes: {
        'gradient-pan': {
          '0%': { backgroundPosition: '0%' },
          '50%': { backgroundPosition: '100%' },
          '100%': { backgroundPosition: '0%' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'draw-line': {
          'from': { width: '0%' },
          'to': { width: '100%' }
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'reveal-text': {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' }
        },
        'scroll-indicator': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '50%': { transform: 'translateY(0px)', opacity: '1' },
          '100%': { transform: 'translateY(8px)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translate(0, 0)', opacity: '0.3' },
          '25%': { transform: 'translate(10px, -10px)', opacity: '0.5' },
          '50%': { transform: 'translate(-10px, -20px)', opacity: '0.8' },
          '75%': { transform: 'translate(-15px, 10px)', opacity: '0.5' },
        }
      }
    }
  },
  plugins: [],
}
