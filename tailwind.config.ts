import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#000",
        surface: "#111",
        panel: "#1a1a1a",
        "panel-light": "#222",
        neon: "#D6B36A",
        "neon-light": "#f0d7a4",
        muted: "#737373",
        border: "#262626",
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(214,179,106,0.2), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(214,179,106,0.08)",
        "neon-lg": "0 0 0 1px rgba(214,179,106,0.25), 0 16px 48px rgba(0,0,0,0.5), 0 4px 12px rgba(214,179,106,0.1)",
        glass: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "card-gradient": "linear-gradient(180deg, #111, #0a0a0a)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 10s ease-in-out infinite",
        marquee: "marquee 26s linear infinite",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-up-delay": "fadeUp 0.6s ease-out 0.15s forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
      }
    }
  },
  plugins: []
};

export default config;
