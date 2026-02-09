/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '400px',
      },
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
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // Base text color
            color: theme('colors.brand-text'),
            maxWidth: 'none',
            
            // Headings
            'h1, h2, h3, h4, h5, h6': {
              color: theme('colors.brand-text'),
              fontWeight: '700',
              fontFamily: theme('fontFamily.display').join(', '),
            },
            h1: {
              fontSize: '2.25rem',
              lineHeight: '2.5rem',
              marginTop: '0',
              marginBottom: '1rem',
            },
            h2: {
              fontSize: '1.875rem',
              lineHeight: '2.25rem',
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h3: {
              fontSize: '1.5rem',
              lineHeight: '2rem',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
            },
            
            // Paragraphs
            p: {
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
              lineHeight: '1.75',
            },
            
            // Links
            a: {
              color: theme('colors.brand-accent'),
              textDecoration: 'underline',
              textDecorationColor: theme('colors.brand-accent') + '40',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: theme('colors.brand-accent'),
                textDecorationColor: theme('colors.brand-accent'),
                textDecorationThickness: '2px',
              },
            },
            
            // Strong and emphasis
            strong: {
              color: theme('colors.brand-text'),
              fontWeight: '700',
            },
            em: {
              color: theme('colors.brand-text'),
              fontStyle: 'italic',
            },
            
            // Code
            code: {
              color: theme('colors.brand-accent'),
              backgroundColor: theme('colors.brand-secondary') + '30',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
              fontSize: '0.875em',
              fontFamily: theme('fontFamily.mono').join(', '),
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            
            // Code blocks
            pre: {
              backgroundColor: theme('colors.brand-secondary'),
              color: theme('colors.brand-text'),
              padding: '1rem',
              borderRadius: '0.5rem',
              overflowX: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.7',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              color: 'inherit',
              fontSize: 'inherit',
              fontWeight: '400',
            },
            
            // Blockquotes
            blockquote: {
              color: theme('colors.brand-text'),
              borderLeftColor: theme('colors.brand-accent'),
              borderLeftWidth: '4px',
              paddingLeft: '1rem',
              fontStyle: 'italic',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              backgroundColor: theme('colors.brand-secondary') + '20',
              padding: '1rem',
              borderRadius: '0.25rem',
            },
            'blockquote p:first-of-type::before': {
              content: '""',
            },
            'blockquote p:last-of-type::after': {
              content: '""',
            },
            
            // Lists
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.5rem',
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.5rem',
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            li: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              paddingLeft: '0.25rem',
            },
            'ul > li': {
              paddingLeft: '0.25rem',
            },
            'ol > li': {
              paddingLeft: '0.25rem',
            },
            
            // Nested lists
            'ul ul, ul ol, ol ul, ol ol': {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            
            // Tables
            table: {
              width: '100%',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            },
            thead: {
              borderBottomWidth: '2px',
              borderBottomColor: theme('colors.brand-accent'),
            },
            'thead th': {
              color: theme('colors.brand-text'),
              fontWeight: '700',
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              textAlign: 'left',
            },
            'tbody tr': {
              borderBottomWidth: '1px',
              borderBottomColor: theme('colors.brand-secondary'),
            },
            'tbody td': {
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
            },
            
            // Horizontal rules
            hr: {
              borderColor: theme('colors.brand-secondary'),
              borderTopWidth: '1px',
              marginTop: '2rem',
              marginBottom: '2rem',
            },
            
            // Images
            img: {
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              borderRadius: '0.5rem',
            },
            
            // Figure and figcaption
            figure: {
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            figcaption: {
              color: theme('colors.brand-text') + 'CC',
              fontSize: '0.875rem',
              marginTop: '0.75rem',
              textAlign: 'center',
            },
          },
        },
      }),
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
        'shimmer': 'shimmer 2s infinite',
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
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
}
