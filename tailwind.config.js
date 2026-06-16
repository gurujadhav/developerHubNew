/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#020818",
          900: "#050D2D",
          800: "#0A1845",
          700: "#0E2260",
          600: "#142B7A",
          500: "#1C3A9E",
        },
        gold: {
          600: "#A07820",
          500: "#D4A855",
          400: "#E8C07A",
          300: "#F5D78E",
          200: "#FAE9B8",
        },
        crimson: {
          700: "#9B1C1C",
          600: "#C0392B",
          500: "#E63946",
          400: "#FF5A67",
          300: "#FF8A92",
        },
        surface: {
          DEFAULT: "#0A1538",
          raised: "#0F1F4A",
          overlay: "#142656",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-navy":
          "linear-gradient(rgba(212,168,85,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,85,0.04) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse at 50% 0%, rgba(212,168,85,0.12) 0%, transparent 60%)",
      },
      backgroundSize: {
        "grid-navy": "40px 40px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        gold: "0 0 20px rgba(212,168,85,0.15)",
        "gold-lg": "0 0 40px rgba(212,168,85,0.2)",
        card: "0 4px 24px rgba(2,8,24,0.6)",
      },
    },
  },
  plugins: [],
};
