import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — see VI manual A-13 (虚空蓝/靓蓝/沉香/茶色)
        paper: '#FFFFFF',
        'sky-pale': '#D3EDFB',
        'sky-mid': '#9ACFF0',
        sky: '#82C1EB',          // 虚空蓝 — primary brand color
        'blue-deep': '#1C76A6',  // 靓蓝 — CTA, strong accent
        sand: '#928178',         // 沉香 — warm neutral
        clay: '#DA9E83',         // 茶色 — warm accent
        ink: '#2A2A33',          // primary text (charcoal, per VI mockup backgrounds)
        'ink-soft': '#6B6B72',   // secondary text
        hairline: 'rgba(42, 42, 51, 0.10)',
      },
      fontFamily: {
        // VI A-15: 宋雅 (Source Han Serif = Noto Serif SC) for formal headings.
        serif: ['var(--font-serif)', '"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        // VI A-15: 端庄 (HarmonyOS Sans SC) for body/formal sans. Prefer the
        // brand-spec face if locally installed, fall back to Noto Sans SC
        // (loaded via next/font), then OS Chinese sans, then system-ui.
        sans: [
          'var(--font-sans)',
          '"HarmonyOS Sans SC"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}

export default config
