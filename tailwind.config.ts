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
        gold: "#FFD700",
        "gold-hover": "#FFA500",
        surface: {
          base: "rgba(255,255,255,0.02)",
          elevated: "rgba(255,255,255,0.04)",
          featured: "rgba(255,255,255,0.06)",
          hero: "rgba(255,255,255,0.08)",
        },
      },
      boxShadow: {
        "glow-gk": "0 0 20px rgba(16,185,129,0.12), 0 0 40px rgba(16,185,129,0.06)",
        "glow-def": "0 0 20px rgba(245,158,11,0.12), 0 0 40px rgba(245,158,11,0.06)",
        "glow-mid": "0 0 20px rgba(14,165,233,0.12), 0 0 40px rgba(14,165,233,0.06)",
        "glow-att": "0 0 20px rgba(244,63,94,0.12), 0 0 40px rgba(244,63,94,0.06)",
        "glow-gold": "0 0 20px rgba(255,215,0,0.15), 0 0 40px rgba(255,215,0,0.08)",
        "glow-live": "0 0 20px rgba(34,197,94,0.15), 0 0 40px rgba(34,197,94,0.08)",
        "card-sm": "0 2px 8px rgba(0,0,0,0.3)",
        "card-md": "0 4px 16px rgba(0,0,0,0.4)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.5)",
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
