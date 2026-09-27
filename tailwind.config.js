/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#c4f000',
          hover: '#b2dd00',
          soft: '#eaffb0',
          mint: '#f6ffdb',
        },
        ink: {
          DEFAULT: '#0d0f12',
          soft: '#16191f',
        },
        muted: '#6b7280',
        surface: '#f6f7f4',
        line: '#ececeb',
        success: '#16a34a',
        promo: '#dc2626',
      },
      boxShadow: {
        soft: '0 24px 70px -28px rgba(13, 15, 18, 0.35)',
        card: '0 1px 2px rgba(13, 15, 18, 0.04), 0 18px 40px -24px rgba(13, 15, 18, 0.2)',
        brand: '0 14px 30px -12px rgba(196, 240, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
