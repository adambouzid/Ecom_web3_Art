/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      colors: {
        background: "#050505",
        surface: "#0f1115",
        accent: {
          DEFAULT: "#00f5a0",
          muted: "#26ffd3",
        },
        slate: {
          100: "#f3f5f9",
          200: "#e5e7eb",
          400: "#94a3b8",
          600: "#475569",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(0, 245, 160, 0.35)",
      },
    },
  },
  plugins: [],
};

