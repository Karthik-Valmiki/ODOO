/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2F65F6",
          blueHover: "#2555D8",
          dark: "#111827",
        },
        custom: {
          green: "#5FA770",
          orange: "#EE964B",
          purple: "#9F7AEA",
          slate: "#1E293B",
          darkTooltip: "#242933",
          pillBg: "#EDF0F3",
          canvas: "#F8F9FA",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}
