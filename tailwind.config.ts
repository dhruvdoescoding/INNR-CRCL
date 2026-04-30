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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // INNR-CRCL design tokens
        base:    "#0D0D1A",
        brand:   "#7C3AED",
        accent:  "#A78BFA",
        surface: "rgba(255,255,255,0.04)",
        "text-primary": "#F1F0FF",
        "text-muted":   "#6B7280",
        success: "#10B981",
        danger:  "#EF4444",
      },
      backdropBlur: {
        xs: "4px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        glow:  "0 0 20px rgba(124,58,237,0.4)",
        "glow-lg": "0 0 35px rgba(124,58,237,0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
