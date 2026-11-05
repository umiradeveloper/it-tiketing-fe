import type { Config } from 'tailwindcss';

/**
 * Token desain IT Helpdesk UMIRA
 * - ink:    teal sangat tua (sidebar, judul)
 * - teal:   warna aksi utama
 * - copper: aksen tembaga — hanya untuk hal yang butuh perhatian (SLA, P2, item aktif)
 * - paper:  latar kerja
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0E3B43', 2: '#164B54', 3: '#1F5D67' },
        teal: { DEFAULT: '#13707A', 600: '#0F5F68', 50: '#E8F3F3', 100: '#CFE6E7' },
        copper: { DEFAULT: '#B5651D', 600: '#9A5416', 50: '#FBF1E7', 100: '#F3DCC5' },
        paper: '#F3F6F6',
        line: { DEFAULT: '#D9E2E3', strong: '#BCCBCD' },
        text: { DEFAULT: '#142326', muted: '#5B6F73', faint: '#8A9A9D' },
        danger: { DEFAULT: '#B42318', 50: '#FEF3F2', 100: '#FEE4E2' },
        ok: { DEFAULT: '#18794E', 50: '#ECFDF3' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        panel: '12px',
      },
      keyframes: {
        burn: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '16px 0' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: {
        burn: 'burn 0.9s linear infinite',
        rise: 'rise 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
