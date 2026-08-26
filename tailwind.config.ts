import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00C853',
          teal: '#00BCD4',
          dark: '#0A0F0A',
          card: '#111827',
        },
      },
    },
  },
  plugins: [],
}
export default config
