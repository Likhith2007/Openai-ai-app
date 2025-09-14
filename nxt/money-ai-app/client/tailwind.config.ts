import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensures TSX files are scanned
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config