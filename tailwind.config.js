/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary Color - Light Blue
        primary: {
          100: "#e0f7fa",  // Light Blue (for lighter backgrounds)
          400: "#38bdf8",  // Light Blue (main primary color)
          500: "#0ea5e9",  // Medium Blue (active elements)
          600: "#0284c7",  // Darker Blue (hover or selected states)
        },

        // Secondary Color - Darker Blue for contrast
        secondary: {
          400: "#0369a1", // Deep Blue (for headers, icons, etc.)
        },

        // Accent Colors - For Success and Warnings
        success: {
          100: "#dcfce7", // Light green (for success backgrounds)
          400: "#059669", // Green text/icons
          600: "#16a34a", // Success green
        },
        warning: {
          100: "#fef3c7", // Light amber (warning background)
          600: "#d97706", // Amber text/icons
        },

        // Neutral Colors - Grays
        neutral: {
          50: "#f8fafc",  // Very light gray (backgrounds)
          900: "#0f172a", // Very dark gray (text, borders)
        },
      },
    },
  },
  plugins: [],
}