// tailwind.config.cjs
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9",
        secondary: "#64748b",
        accent: "#f43f5e"
      }
    }
  },
  plugins: []
};
