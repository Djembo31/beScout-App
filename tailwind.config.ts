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
        "vivid-green": "#00E676",
        "vivid-red": "#FF3B69",
        surface: {
          base: "rgba(255,255,255,0.05)",
          elevated: "rgba(255,255,255,0.08)",
          featured: "rgba(255,255,255,0.14)",
          hero: "rgba(255,255,255,0.20)",
        },
      },
      boxShadow: {
        "glow-gk": "0 0 24px rgba(16,185,129,0.25), 0 0 48px rgba(16,185,129,0.12)",
        "glow-def": "0 0 24px rgba(245,158,11,0.25), 0 0 48px rgba(245,158,11,0.12)",
        "glow-mid": "0 0 24px rgba(14,165,233,0.25), 0 0 48px rgba(14,165,233,0.12)",
        "glow-att": "0 0 24px rgba(244,63,94,0.25), 0 0 48px rgba(244,63,94,0.12)",
        "glow-gold": "0 0 24px rgba(255,215,0,0.35), 0 0 48px rgba(255,215,0,0.15)",
        "glow-live": "0 0 24px rgba(0,230,118,0.30), 0 0 48px rgba(0,230,118,0.12)",
        "card-sm": "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-md": "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
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
