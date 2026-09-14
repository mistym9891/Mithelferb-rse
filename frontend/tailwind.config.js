/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: { xs: '400px' },
      colors: {
        mr: {
          green: '#4a7c2f',
          dark: '#2f5a1c',
          light: '#6ca048',
        },
      },
    },
  },
  plugins: [],
};
