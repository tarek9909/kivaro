/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        ink: {
          50: 'rgb(var(--color-ink-50) / <alpha-value>)',
          100: 'rgb(var(--color-ink-100) / <alpha-value>)',
          200: 'rgb(var(--color-ink-200) / <alpha-value>)',
          300: 'rgb(var(--color-ink-300) / <alpha-value>)',
          400: 'rgb(var(--color-ink-400) / <alpha-value>)',
          500: 'rgb(var(--color-ink-500) / <alpha-value>)',
          600: 'rgb(var(--color-ink-600) / <alpha-value>)',
          700: 'rgb(var(--color-ink-700) / <alpha-value>)',
          800: 'rgb(var(--color-ink-800) / <alpha-value>)',
          900: 'rgb(var(--color-ink-900) / <alpha-value>)',
          950: 'rgb(var(--color-ink-950) / <alpha-value>)'
        },
        brand: {
          50: '#eef0ff',
          100: '#dde2ff',
          200: '#b4beff',
          300: '#8a98ff',
          400: '#6573ff',
          500: '#4a54f0',
          600: '#3b3fd0',
          700: '#3034a8',
          800: '#252884',
          900: '#1c1f6a'
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2'
        }
      },
      boxShadow: {
        glass: '0 10px 30px -10px rgba(15, 23, 42, 0.45), 0 1px 0 rgba(255,255,255,0.04) inset',
        'glass-lg': '0 30px 60px -20px rgba(7, 10, 24, 0.6), 0 1px 0 rgba(255,255,255,0.06) inset',
        ring: '0 0 0 1px rgba(255,255,255,0.06)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px'
      },
      backdropBlur: {
        xs: '2px'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
};
