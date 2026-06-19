/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10131F",
        muted: "#626878",
        aqua: "#00BFFF",
        coral: "#FF7F50",
        mint: "#58D68D",
        lemon: "#F4EA52",
        cloud: "#F5FBFF",
        blush: "#FFF3ED"
      },
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(16, 19, 31, 0.14)",
        lift: "0 12px 34px rgba(16, 19, 31, 0.18)"
      }
    }
  },
  plugins: []
};
