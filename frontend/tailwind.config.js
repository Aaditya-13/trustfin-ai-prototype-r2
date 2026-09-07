/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gov-blue': '#0056b3',
        'gov-red': '#dc3545',
        'gov-green': '#28a745',
        'gov-gray': '#f8f9fa'
      },
      borderRadius: {
        'sm': '0.125rem', // sharp enterprise corners
      }
    },
  },
  plugins: [],
}

