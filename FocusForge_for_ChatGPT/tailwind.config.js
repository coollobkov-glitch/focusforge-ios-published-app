/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FocusForge brand colors sampled from the approved anvil/lightning logo.
        forge: {
          50: '#edffff',
          100: '#d6fbff',
          200: '#aaf4fb',
          300: '#82d7e4',
          400: '#48bdd3',
          500: '#35a7c7',
          600: '#287fc4',
          700: '#1c5b9c',
          800: '#154878',
          900: '#10365b',
          950: '#081e35',
        },
        // Deep navy rather than neutral gray so the entire app feels like one brand.
        dark: {
          50: '#f5fbff',
          100: '#e9f5fb',
          200: '#d5e8f2',
          300: '#b7cfdd',
          400: '#a0b8c9',
          500: '#7895a9',
          600: '#496a82',
          700: '#15344d',
          800: '#0c2238',
          900: '#08182a',
          950: '#030914',
        },
        success: '#44bda4',
        warning: '#f6b94d',
        danger: '#ff5f70',
        accent: '#3692cf',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'SF Pro Text', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        forge: '0 16px 50px rgba(37, 152, 244, 0.16)',
        'forge-soft': '0 12px 35px rgba(46, 190, 231, 0.10)',
      },
    },
  },
  plugins: [],
}
