/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#020617',
        panel: '#0b1220',
        electric: '#2f8cff',
        edge: '#4ade80',
        watch: '#facc15',
        skip: '#ef4444'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(47,140,255,.25), 0 0 36px rgba(47,140,255,.12)'
      }
    },
  },
  plugins: [],
}
