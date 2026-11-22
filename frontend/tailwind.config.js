/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        canvas: '#ffffff',
        'canvas-soft': '#efefef',
        'canvas-softer': '#f3f3f4',
        surface: '#f9f9f9',
        'surface-variant': '#e2e2e2',
        ink: '#000000',
        body: '#5e5e5e',
        mute: '#afafaf',
        eco: {
          DEFAULT: '#16a34a',
          soft: '#ecfdf5',
          border: '#bbf7d0',
          dark: '#065f46',
        },
      },
    },
  },
  plugins: [],
};
