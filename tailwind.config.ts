import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm, approachable medical palette - NOT sterile blue
        sage: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7d0c7',
          300: '#a3b1a3',
          400: '#7d8f7d',
          500: '#617361',
          600: '#4d5c4d',
          700: '#404b40',
          800: '#363e36',
          900: '#2f352f',
          950: '#181c18',
        },
        coral: {
          50: '#fef4f2',
          100: '#fee6e2',
          200: '#fed1ca',
          300: '#fcb1a5',
          400: '#f88671',
          500: '#ee5f45',
          600: '#db4327',
          700: '#b8351d',
          800: '#982f1c',
          900: '#7e2c1d',
          950: '#45130a',
        },
        cream: {
          50: '#fdfcfa',
          100: '#faf8f3',
          200: '#f5f1e8',
          300: '#ede6d6',
          400: '#e2d5bc',
          500: '#d4c19f',
          600: '#c3a77d',
          700: '#ae8d62',
          800: '#8f7452',
          900: '#756045',
          950: '#3e3124',
        },
        midnight: {
          50: '#f4f6f7',
          100: '#e3e8ea',
          200: '#c9d3d8',
          300: '#a4b4bc',
          400: '#788d99',
          500: '#5d727e',
          600: '#4f606b',
          700: '#44515a',
          800: '#3d464d',
          900: '#363d43',
          950: '#1e2327',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanLine 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
