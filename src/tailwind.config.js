module.exports = {
  purge: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        interlayYellow: {
          light: '#ff9900', // MEMO: bitcoin color
          DEFAULT: '#f7931a'
        },
        interlayPink: {
          DEFAULT: '#e6007a' // MEMO: polkadot's branding pink
        },
        interlayBlue: {
          DEFAULT: '#1c86ee'
        },
        interlayOrange: {
          DEFAULT: '#f95738'
        },
        interlayGreen: {
          DEFAULT: '#4ac948'
        },
        interlayRed: {
          light: '#ed3855',
          DEFAULT: '#f32013'
        },
        // TODO: could use `Gray` shades from https://tailwindcss.com/docs/customizing-colors
        interlayGrey: {
          light: '#e9ecef', // TODO: could be gray-200 in the default theme
          DEFAULT: '#a9a9a9'
        }
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
