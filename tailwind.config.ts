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
        bg: {
          DEFAULT: "#0A0A0F",
          surface: "#12121A",
          raised: "#1A1A25",
        },
        border: {
          DEFAULT: "#2A2A3A",
        },
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#5B52F0",
          muted: "#4F46E520",
        },
        text: {
          primary: "#E8E8ED",
          secondary: "#9898A6",
          muted: "#5A5A6E",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
