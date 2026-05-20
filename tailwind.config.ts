import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: { base: "#FAF7F2", land: "#F3EEE4", border: "#CFC6B3", label: "#4A4238" },
        chrome: { surface: "rgba(250, 247, 242, 0.92)", text: "#4A4238", textMuted: "#7A7062" },
        coral: { DEFAULT: "#C76F4A", soft: "rgba(199, 111, 74, 0.55)" },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
