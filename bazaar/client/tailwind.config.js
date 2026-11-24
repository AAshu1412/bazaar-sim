/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bazaar: {
          bg: "#0B0E14",
          surface: "#121722",
          card: "#182030",
          border: "#232F48",
          gold: "#F59E0B",
          neonGreen: "#10B981",
          neonBlue: "#3B82F6",
          accent: "#8B5CF6",
          danger: "#EF4444"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace', 'ui-monospace'],
      }
    },
  },
  plugins: [],
}
