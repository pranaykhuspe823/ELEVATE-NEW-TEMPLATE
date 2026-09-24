/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAF7F2",
        surface: "#ffffff",
        card: "#ffffff",
        "card-2": "#F4E8DC",
        border: "#E7E5E4",
        "border-strong": "#D8D0C5",
        text: {
          DEFAULT: "#1F2937",
          2: "#6B7280",
          3: "#9CA3AF",
        },
        lime: {
          DEFAULT: "#1E3A6E",
          dim: "#14294F",
          ink: "#C9982D",
        },
        amber: "#a15c00",
        coral: "#d54826",
        teal: "#0d8a6a",
        red: "#d13a3a",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
