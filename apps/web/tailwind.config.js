/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#0f172a',
        border: '#1e293b',
        primary: {
          DEFAULT: '#0ea5e9',
          hover: '#0284c7'
        },
        accent: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      }
    },
  },
  plugins: [],
}
