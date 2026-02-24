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
        bg: "#0B0907",
        panel: "#16110D",
        neon: "#D6B36A",
        muted: "#A69A89",
        border: "#433426"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(214,179,106,0.24), 0 12px 36px rgba(22,17,13,0.7)",
        glass: "0 12px 34px rgba(0,0,0,0.5)"
      },
      backgroundImage: {
        "radial-noise":
          "radial-gradient(circle at 16% 12%, rgba(214,179,106,0.16), transparent 38%), radial-gradient(circle at 84% 0%, rgba(121,87,40,0.2), transparent 36%)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 26s linear infinite",
        pulseGlow: "pulseGlow 2.3s ease-in-out infinite"
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
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(214,179,106,0.24), 0 8px 20px rgba(22,17,13,0.45)" },
          "50%": { boxShadow: "0 0 0 1px rgba(214,179,106,0.5), 0 14px 26px rgba(22,17,13,0.65)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
