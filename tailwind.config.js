/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        crimson: {
          DEFAULT: '#EE0000',
          50:  '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc6c6',
          300: '#ff9999',
          400: '#ff5c5c',
          500: '#EE0000',
          600: '#cc0000',
          700: '#aa0000',
          800: '#880000',
          900: '#660000',
        },
        // Deep navy canvas
        navy: {
          950: '#050B14',
          900: '#070F1C',
          800: '#0A1628',
          700: '#0D1F36',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'glow-crimson': 'radial-gradient(ellipse at center, rgba(238,0,0,0.15) 0%, transparent 70%)',
        'glow-blue': 'radial-gradient(ellipse at center, rgba(59,130,246,0.1) 0%, transparent 70%)',
        'hero-mesh': `
          radial-gradient(at 20% 50%, rgba(238,0,0,0.08) 0px, transparent 50%),
          radial-gradient(at 80% 20%, rgba(59,130,246,0.06) 0px, transparent 50%),
          radial-gradient(at 60% 80%, rgba(99,102,241,0.05) 0px, transparent 50%)
        `,
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(238, 0, 0, 0.4), 0 0 40px rgba(238, 0, 0, 0.2)',
        'glow-red-sm': '0 0 10px rgba(238, 0, 0, 0.5)',
        'glow-amber':  '0 0 20px rgba(245, 158, 11, 0.4)',
        'glass':       '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg':    '0 16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'slide-up':     'slideUp 0.5s ease-out forwards',
        'fade-in':      'fadeIn 0.4s ease-out forwards',
        'scan-line':    'scanLine 2s linear infinite',
        'countdown':    'countdown 1s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(238,0,0,0.4)' },
          '50%':      { boxShadow: '0 0 25px rgba(238,0,0,0.8), 0 0 50px rgba(238,0,0,0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      dropShadow: {
        'glow-red':   ['0 0 8px rgba(238,0,0,0.8)', '0 0 20px rgba(238,0,0,0.4)'],
        'glow-white': ['0 0 8px rgba(255,255,255,0.6)'],
        'glow-amber': ['0 0 8px rgba(245,158,11,0.8)'],
      },
    },
  },
  plugins: [],
}
