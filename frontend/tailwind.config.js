/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#101B2D',
          dark: '#0B1320',
          light: '#182740',
        },
        graphite: '#263445',
        accent: {
          DEFAULT: '#0066CC',
          hover: '#0057AD',
          pressed: '#004A94',
          tint: '#E6F0FA',
        },
        surface: '#FFFFFF',
        background: '#F5F7FA',
        muted: '#64748B',
        border: '#E2E8F0',
        success: {
          DEFAULT: '#16A34A',
          tint: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#D97706',
          tint: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          tint: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
