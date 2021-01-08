module.exports = {
  purge: ['./src/**/*.tsx', '/src/**/*.ts', './src/**/*.js'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      backgroundColor: ['active'],
    },
  },
  plugins: [ require('@tailwindcss/typography') ],
}
