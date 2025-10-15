/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0,0,0,0.25)",
      },
      colors: {
        surface: {
          0: "#0a0a0b",
          1: "#0f1012",
          2: "#141519",
        },
      },
      container: {
        center: true,
        padding: "1rem",
        screens: {
          "2xl": "1160px",
        },
      },
    },
  },
  plugins: [],
};
