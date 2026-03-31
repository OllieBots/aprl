/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0c10',
        bg2: '#111318',
        bg3: '#1a1d25',
        bg4: '#22262f',
        border: 'rgba(255,255,255,0.07)',
        border2: 'rgba(255,255,255,0.12)',
        text: '#f0f2f5',
        text2: '#8b909a',
        text3: '#555a65',
        accent: '#e8302a',
        accent2: '#ff5c57',
        gold: '#f0b323',
        green: '#22c55e',
        blue: '#3b82f6',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
