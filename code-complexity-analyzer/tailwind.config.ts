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
        ui: {
          canvas: "var(--ui-canvas)", surface: "var(--ui-surface)", raised: "var(--ui-raised)",
          border: "var(--ui-border)", control: "var(--ui-control-border)",
          text: "var(--ui-text)", secondary: "var(--ui-text-secondary)", muted: "var(--ui-text-muted)",
          accent: "var(--ui-accent)", "accent-hover": "var(--ui-accent-hover)", "accent-ink": "var(--ui-accent-ink)",
          success: "var(--ui-success)", warning: "var(--ui-warning)", danger: "var(--ui-danger)",
        },
      },
      borderRadius: {
        control: "var(--ui-radius-control)",
        panel: "var(--ui-radius-panel)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;