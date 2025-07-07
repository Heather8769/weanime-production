const { fontFamily } = require('tailwindcss/defaultTheme');
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      colors: {
        ash: {
          900: '#0d0d0d',
          800: '#181818',
          100: '#f4f4f4',
        },
      },
      backdropBlur: {
        glass: '14px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
