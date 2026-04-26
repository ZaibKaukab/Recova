/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FDFCFA',
          100: '#FAF7F2',
          200: '#F0EBE1',
          300: '#E5DDD0',
          400: '#D5C8B5',
        },
        navy: {
          50: '#EBF0F7',
          100: '#BDCFE5',
          200: '#7FA3C5',
          300: '#4A7AAD',
          400: '#2D5280',
          500: '#1E3A5F',
          600: '#162B47',
          700: '#0E1E31',
        },
        sage: {
          50: '#EFF4F0',
          100: '#C8DAC9',
          200: '#A0C0A3',
          300: '#7DA882',
          400: '#6B8F71',
          500: '#527558',
          600: '#3A5B3F',
          700: '#244027',
        },
        warning: {
          light: '#FDF3E3',
          DEFAULT: '#E8A550',
          dark: '#C07A20',
        },
        danger: {
          light: '#FCE8E7',
          DEFAULT: '#C0524A',
          dark: '#8B2E28',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 2px 20px rgba(30, 58, 95, 0.06)',
        card: '0 4px 32px rgba(30, 58, 95, 0.10)',
        'glow-sage': '0 0 24px rgba(107, 143, 113, 0.25)',
      },
    },
  },
  plugins: [],
}
