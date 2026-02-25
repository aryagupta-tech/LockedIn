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
        bg: "#060916",
        surface: "#0c1020",
        panel: "#111628",
        neon: "#D6B36A",
        "neon-light": "#f0d7a4",
        muted: "#8b8fa6",
        border: "#1e2340"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(214,179,106,0.2), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(214,179,106,0.08)",
        "neon-lg": "0 0 0 1px rgba(214,179,106,0.25), 0 16px 48px rgba(0,0,0,0.5), 0 4px 12px rgba(214,179,106,0.1)",
        glass: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        glow: "0 0 20px rgba(214,179,106,0.15), 0 0 60px rgba(214,179,106,0.05)",
        "card-hover": "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(214,179,106,0.12)"
      },
      backgroundImage: {
        "radial-noise":
          "radial-gradient(ellipse at 16% 12%, rgba(100,120,255,0.1), transparent 40%), radial-gradient(ellipse at 84% 0%, rgba(214,179,106,0.08), transparent 40%)",
        "card-gradient": "linear-gradient(180deg, rgba(16,20,36,0.8), rgba(10,14,28,0.9))",
        "card-gradient-warm": "linear-gradient(180deg, rgba(24,22,18,0.6), rgba(14,14,20,0.8))"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 10s ease-in-out infinite",
        marquee: "marquee 26s linear infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-up-delay": "fadeUp 0.6s ease-out 0.15s forwards",
        "scale-in": "scaleIn 0.5s ease-out forwards"
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
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 0 1px rgba(214,179,106,0.18), 0 6px 20px rgba(0,0,0,0.3)"
          },
          "50%": {
            boxShadow: "0 0 0 1px rgba(214,179,106,0.4), 0 12px 32px rgba(0,0,0,0.4), 0 0 24px rgba(214,179,106,0.1)"
          }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
