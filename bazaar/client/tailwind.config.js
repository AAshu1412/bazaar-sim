/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // "market stall" palette, taken from the building art (ink is the art's outline colour)
      colors: {
        ink: "#2a1c15",
        soft: "#6b5442",
        paper: "#f6ead0",
        parchment: "#ecd9b0",
        wood: "#6b3f26",
        gold: "#ffc94a",
        leaf: "#256b42",
        berry: "#a8372a",
        sky: "#2f5f9a",
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
        display: ["Fredoka", "system-ui", "sans-serif"],
      },
      boxShadow: {
        board: "0 6px 0 rgba(20,12,8,.35), 0 14px 30px rgba(0,0,0,.35)",
        key: "0 3px 0 #2a1c15",
      },
      keyframes: {
        pop: { from: { opacity: "0", transform: "translateY(8px) scale(.97)" }, to: { opacity: "1", transform: "none" } },
        drain: { from: { transform: "scaleX(1)" }, to: { transform: "scaleX(0)" } },
      },
      animation: { pop: "pop .18s ease-out both" },
    },
  },
  plugins: [],
};
