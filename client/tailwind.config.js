export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        secondary: {
          DEFAULT: '#3B82F6',
        },
        neutral: {
          dark: '#0F172A',
          muted: '#64748B',
          bg: '#F8FAFC',
        },
        surface: {
          DEFAULT: '#F7F9FB',
          dim: '#D8DADC',
          white: '#FFFFFF',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        border: {
          subtle: '#E2E8F0',
          input: '#CBD5E1',
        },
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
