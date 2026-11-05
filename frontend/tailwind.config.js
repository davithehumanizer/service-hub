/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const defaultTheme = require("tailwindcss/defaultTheme");
const windmill = require("@windmill/react-ui/config");

module.exports = windmill({
  purge: {
    content: ["src/**/*.{js,jsx,ts,tsx}"],
    options: {
      // Preserve all customgreen utility classes (bg, text, border, ring, etc.)
      // across all shades. Opacity-modifier variants (/20, /30, etc.) are not
      // supported by Tailwind v2 and are defined manually in sidebar-colors.css.
      safelist: [
        /^(bg|text|border|ring|from|to|via|hover:bg|focus:bg|dark:bg|hover:border|focus:border|dark:text|hover:text|dark:border|focus:ring|dark:from|dark:to)-customgreen/,
        /^(bg|text|border|ring|from|to|via|hover:bg|focus:bg|dark:bg|hover:border|focus:border|dark:text|hover:text|dark:border|focus:ring|dark:from|dark:to|group-hover:text|dark:group-hover:text)-(blue|purple|orange|green|teal|pink)-(50|100|200|300|400|500|600|700|800|900)/,
      ],
    },
  },
  corePlugins: { preflight: true },
  // Tailwind 2 generates no `disabled:` class unless asked: these were used
  // and produced no CSS at all.
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
    },
  },
  theme: {
    extend: {
      fontSize: {
        xxs: "10px",
      },
      fontFamily: {
        montserrat: ["Montserrat"],
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        bottom:
          "0 5px 6px -7px rgba(0, 0, 0, 0.6), 0 2px 4px -5px rgba(0, 0, 0, 0.06)",
        top: "0 -10px 15px -3px rgba(0, 0, 0, 0.05), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
      colors: {
        customgreen: "#6e9922",
        "customgreen-50": "#f5fbef",
        "customgreen-100": "#e6f4d7",
        "customgreen-200": "#cce9af",
        "customgreen-300": "#b3df87",
        "customgreen-400": "#99d45f",
        "customgreen-500": "#6e9922",
        "customgreen-600": "#5e821c",
        "customgreen-700": "#4f6c18",
        "customgreen-800": "#3f5513",
        "customgreen-900": "#2f3f0e",
      },
      gradientColorStops: {
        customgreen: {
          light: "#e6f4d7",
          DEFAULT: "#6e9922",
          dark: "#2f3f0e",
        },
      },
    },
  },
});
