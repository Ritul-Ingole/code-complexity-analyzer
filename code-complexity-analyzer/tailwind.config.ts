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
          "text-deep": "var(--ui-text-deep)", "border-strong": "var(--ui-border-strong)",
          sand: "var(--ui-sand)", "sand-strong": "var(--ui-sand-strong)", "sand-warm": "var(--ui-sand-warm)",
          "amber-bright": "var(--ui-amber-bright)", clay: "var(--ui-clay)", "clay-deep": "var(--ui-clay-deep)",
          "rust-deep": "var(--ui-rust-deep)", "rust-soft": "var(--ui-rust-soft)",
          "moss-bright": "var(--ui-moss-bright)", "moss-soft": "var(--ui-moss-soft)",
          "surface-raised": "var(--ui-surface-raised)", "taupe-faint": "var(--ui-taupe-faint)",
          "taupe-soft": "var(--ui-taupe-soft)",
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