import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        paper: "#f7f8fb",
        card: "#ffffff",
        border: "#e6e8ef",
        muted: "#6b7280",
        brand: {
          50: "#eefcf3",
          100: "#d7f7e3",
          400: "#34c98a",
          500: "#1fae74",
          600: "#12925f",
          700: "#0d7a4f",
        },
        up: "#16a34a",
        down: "#dc2626",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter", "Roboto", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
