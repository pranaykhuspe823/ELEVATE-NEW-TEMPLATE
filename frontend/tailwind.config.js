/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Same token names as before -- every existing `bg-bg`, `text-lime`,
        // `border-border-strong`, etc. across the app picks up the new
        // landing-page palette automatically, no per-file edits needed.
        bg: "#FBFAFF",
        surface: "#ffffff",
        card: "#ffffff",
        "card-2": "#E9E1FF",
        border: "#17205C",
        "border-strong": "#17205C",
        text: {
          DEFAULT: "#17205C",
          2: "#4A5282",
          3: "#7C83AB",
        },
        lime: {
          DEFAULT: "#3547FF",
          dim: "#2434D6",
          ink: "#7C5CFF",
        },
        amber: "#B55D12",
        coral: "#C0392B",
        teal: "#17A468",
        red: "#C0392B",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
      borderWidth: {
        DEFAULT: "2px",
      },
      boxShadow: {
        sm: "2px 2px 0 #17205C",
        DEFAULT: "4px 4px 0 #17205C",
        md: "4px 4px 0 #17205C",
        lg: "7px 7px 0 #17205C",
        xl: "7px 7px 0 #17205C",
        none: "none",
      },
    },
  },
  plugins: [],
};
