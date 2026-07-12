import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#c45f17",
          "orange-light": "#fef6f0",
          "orange-dark": "#9a4a12",
          black: "#1a1816",
          navy: "#1e293b",
          "navy-deep": "#0f172a",
          cream: "#f6f4f1",
          white: "#ffffff",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 4px 20px rgba(26, 24, 22, 0.06)",
        "card-hover": "0 12px 40px rgba(26, 24, 22, 0.1)",
        nav: "0 1px 0 rgba(232, 228, 222, 0.9), 0 4px 24px rgba(26, 24, 22, 0.04)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;