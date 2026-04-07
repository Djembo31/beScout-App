import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#FFD700",
        "gold-hover": "#FFA500",
        "vivid-green": "#00E676",
        "vivid-red": "#FF3B69",
        "bg-main": "#0a0a0a",
        surface: {
          minimal: "rgba(255,255,255,0.02)",
          subtle: "rgba(255,255,255,0.03)",
          base: "rgba(255,255,255,0.05)",
          elevated: "rgba(255,255,255,0.08)",
          featured: "rgba(255,255,255,0.14)",
          hero: "rgba(255,255,255,0.20)",
          popover: "#1a1a1a",
          modal: "#0d0d0f",
        },
        divider: "rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "hero-stadium": "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.02) 35%, transparent 65%)",
        "hero-vignette": "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)",
        "card-glow-gold": "radial-gradient(ellipse at 50% -20%, rgba(255,215,0,0.08) 0%, transparent 70%)",
        "card-glow-green": "radial-gradient(ellipse at 50% -20%, rgba(34,197,94,0.08) 0%, transparent 70%)",
        "card-glow-purple": "radial-gradient(ellipse at 50% -20%, rgba(168,85,247,0.08) 0%, transparent 70%)",
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
        "card-elevated": "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "hero-stat": "0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Outfit", "sans-serif"],
        mono: ["var(--font-space-mono)", "Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
