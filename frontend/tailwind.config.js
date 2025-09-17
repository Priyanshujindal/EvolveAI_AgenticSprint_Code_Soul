module.exports = {
  darkMode: 'class',
  content: ['./public/**/*.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px'
      }
    },
    extend: {
      colors: {
        // Medical theme palette
        // Light: light green + light blue + white
        // Dark: black + dark blue accents
        brand: {
          50: '#eefcf5',   // mint wash
          100: '#d9f7eb',  // light mint
          200: '#b6eedb',  // pale teal
          300: '#89e0c6',  // soft teal
          400: '#5ccfb3',  // teal
          500: '#2ab69b',  // primary green-teal
          600: '#199783',  // darker teal
          700: '#147a6b',  // deep teal
          800: '#0f5e55',  // forest teal
          900: '#0a4741'   // darkest teal
        },
        blue: {
          50: '#eff7ff',
          100: '#d9edff',
          200: '#bfe0ff',
          300: '#94ccff',
          400: '#66b2ff',
          500: '#3a95f5',
          600: '#2476d8',
          700: '#195db3',
          800: '#134a8f',
          900: '#103b73'
        }
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)'
      },
      borderRadius: {
        xl: '0.75rem'
      }
    }
  },
  plugins: []
};


