# 活动社媒图生成工具 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Payload-admin tool that turns any published activity into downloadable, VI-compliant social-media poster PNGs (4:5 + 1:1, Chinese + English).

**Architecture:** A pure `PosterCanvas` React component is the single source of truth for the poster design (renders at exact pixel size from props). A Payload admin custom view fetches activities via the Local API, lets the operator pick one + options, renders `PosterCanvas`, and exports it to PNG **client-side** via `modern-screenshot`. Photos are served same-origin through Next's image optimizer to avoid canvas tainting. Two new optional CMS fields supply a dedicated social photo (`activities.socialImage`) and a white logo lockup (`locations.posterLogoWhite`).

**Tech Stack:** Next.js 15 / React 19, Payload CMS 3 (postgres, `push:true`), TypeScript, Tailwind tokens, `modern-screenshot`, Vitest + happy-dom.

**Spec:** [docs/superpowers/specs/2026-05-27-activity-social-poster-design.md](../specs/2026-05-27-activity-social-poster-design.md)

**Design reference:** VI 规范 A-13-1 活动海报模板 — full-bleed photo + translucent bodhi-leaf watermark + white academy logo (top-left) + right-edge brand-accent bar with vertical (竖排) activity theme + lower-left copy + prominent date. No QR.

**Brand tokens (from `tailwind.config.ts`):** sky `#82C1EB`, blue-deep/靓蓝 `#1C76A6`, sand/沉香 `#928178`, clay/茶色 `#DA9E83`, ink `#2A2A33`, paper `#FFFFFF`.

---

## File Structure

**Created:**
- `src/lib/poster/types.ts` — shared types (`PosterSize`, `ThemeFont`, `BrandAccent`, `PosterContent`).
- `src/lib/poster/brandAccent.ts` — pure: nearest brand accent for an RGB color (perceptual). + `dominantColorFromImage` (browser-only).
- `src/lib/poster/brandAccent.test.ts`
- `src/lib/poster/content.ts` — pure: map activity (zh+en) + location → `PosterContent` (theme, copy, dateLine, venueLine, photoUrl, academy lockup). Includes local `nextOccurrence` / `formatSessionLine` helpers + `optimizedImageUrl`.
- `src/lib/poster/content.test.ts`
- `src/lib/poster/capture.ts` — browser: `capturePng(node, size)` via modern-screenshot, awaits fonts.
- `src/components/poster/PosterCanvas.tsx` — pure render-from-props poster.
- `src/components/poster/PosterCanvas.test.tsx`
- `src/components/poster/poster-fonts.css` — `@font-face` for self-hosted fonts used by the canvas.
- `src/admin/poster-studio/PosterStudioView.tsx` — Payload custom view server entry (Local API fetch).
- `src/admin/poster-studio/PosterStudioClient.tsx` — `'use client'` UI: picker + options + preview + download.
- `public/fonts/` — self-hosted woff2 (Noto Serif SC, Noto Sans SC, calligraphy) — asset step.

**Modified:**
- `src/collections/Activities.ts` — add `socialImage` upload field.
- `src/collections/Locations.ts` — add `posterLogoWhite` upload field.
- `src/payload.config.ts` — register `admin.components.views.posterStudio` + nav link.
- `src/app/(payload)/admin/importMap.js` — regenerated (not hand-edited).
- `package.json` / lockfile — add `modern-screenshot`.

---

## Chunk 1: Data model + pure logic

### Task 1: Add CMS fields (`socialImage`, `posterLogoWhite`)

**Files:**
- Modify: `src/collections/Activities.ts` (after the `gallery` field, ~line 86)
- Modify: `src/collections/Locations.ts` (after the `logo` field, ~line 76)

- [ ] **Step 1: Add `socialImage` to Activities**

In `src/collections/Activities.ts`, insert after the `gallery` field block:

```ts
    {
      name: 'socialImage',
      type: 'upload',
      label: { zh: '社媒海报图', en: 'Social poster image' },
      relationTo: 'media',
      admin: {
        description:
          '可选。社媒海报工具优先使用此图;留空则用主图 heroImage。建议竖版、画面安静、主体居中。',
      },
    },
```

- [ ] **Step 2: Add `posterLogoWhite` to Locations**

In `src/collections/Locations.ts`, insert after the `logo` field block:

```ts
    {
      name: 'posterLogoWhite',
      type: 'upload',
      label: { zh: '海报用白色 Logo', en: 'White logo (posters)' },
      relationTo: 'media',
      admin: {
        description:
          '可选。用于照片上的社媒海报(反白稿,带地方学堂名)。建议透明背景 PNG/SVG,横版。留空则用菩提叶+学堂名文字回退。',
      },
    },
```

- [ ] **Step 3: Regenerate Payload types**

Run: `pnpm payload generate:types`
Expected: `src/payload-types.ts` now has `socialImage?` on `Activity` and `posterLogoWhite?` on `Location`. (Postgres `push:true` will add the columns on next boot — additive, safe.)

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/collections/Activities.ts src/collections/Locations.ts src/payload-types.ts
git commit -m "feat(poster): add socialImage + posterLogoWhite CMS fields"
```

---

### Task 2: Poster types + brand-accent mapping (TDD)

**Files:**
- Create: `src/lib/poster/types.ts`
- Create: `src/lib/poster/brandAccent.ts`
- Test: `src/lib/poster/brandAccent.test.ts`

- [ ] **Step 1: Write types**

`src/lib/poster/types.ts`:

```ts
export type PosterSize = '4x5' | '1x1'
export type ThemeFont = 'serif' | 'calligraphy'

/** Brand secondary accents (VI A-13). */
export type BrandAccent = 'blue' | 'sand' | 'clay'

export const ACCENT_HEX: Record<BrandAccent, string> = {
  blue: '#1C76A6', // 靓蓝
  sand: '#928178', // 沉香
  clay: '#DA9E83', // 茶色
}

export interface PosterAcademy {
  /** e.g. "静心学堂 · 心灯" — used in the text-fallback logo. */
  nameLine: string
  /** White logo lockup URL (same-origin/optimized), or null → text fallback. */
  logoWhiteUrl: string | null
}

export interface PosterContent {
  academy: PosterAcademy
  theme: string // 活动主题 (activity title in locale)
  copy: string // 一句话文案 (shortDesc in locale)
  dateLine: string | null // formatted next occurrence, or null
  venueLine: string
  photoUrl: string // same-origin optimized
}

export const SIZE_PX: Record<PosterSize, { w: number; h: number }> = {
  '4x5': { w: 1080, h: 1350 },
  '1x1': { w: 1080, h: 1080 },
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/poster/brandAccent.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nearestBrandAccent } from './brandAccent'

describe('nearestBrandAccent', () => {
  it('maps a cool blue photo tone to 靓蓝 (blue)', () => {
    expect(nearestBrandAccent({ r: 40, g: 110, b: 160 })).toBe('blue')
  })
  it('maps a warm tan tone to 茶色 (clay)', () => {
    expect(nearestBrandAccent({ r: 210, g: 160, b: 130 })).toBe('clay')
  })
  it('maps a muted grey-brown tone to 沉香 (sand)', () => {
    expect(nearestBrandAccent({ r: 140, g: 128, b: 120 })).toBe('sand')
  })
})
```

- [ ] **Step 2b: Run it, verify it fails**

Run: `pnpm exec vitest run src/lib/poster/brandAccent.test.ts`
Expected: FAIL — `nearestBrandAccent` not exported.

- [ ] **Step 3: Implement**

`src/lib/poster/brandAccent.ts`:

```ts
import { ACCENT_HEX, type BrandAccent } from './types'

export interface RGB {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// sRGB → CIE Lab (D65). Small, dependency-free, good enough for nearest-color.
function rgbToLab({ r, g, b }: RGB): [number, number, number] {
  let [rr, gg, bb] = [r, g, b].map((v) => {
    v /= 255
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  })
  const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047
  const y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
  const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function deltaE(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

const ACCENT_LABS: Record<BrandAccent, [number, number, number]> = {
  blue: rgbToLab(hexToRgb(ACCENT_HEX.blue)),
  sand: rgbToLab(hexToRgb(ACCENT_HEX.sand)),
  clay: rgbToLab(hexToRgb(ACCENT_HEX.clay)),
}

/** Nearest brand accent to an arbitrary RGB color, in Lab space. */
export function nearestBrandAccent(rgb: RGB): BrandAccent {
  const lab = rgbToLab(rgb)
  let best: BrandAccent = 'blue'
  let bestD = Infinity
  for (const key of Object.keys(ACCENT_LABS) as BrandAccent[]) {
    const d = deltaE(lab, ACCENT_LABS[key])
    if (d < bestD) {
      bestD = d
      best = key
    }
  }
  return best
}

/**
 * Browser-only: average color of an already-loaded same-origin image,
 * downscaled to a tiny canvas. Returns null if sampling fails (e.g. taint).
 */
export function dominantColorFromImage(img: HTMLImageElement): RGB | null {
  try {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 16
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, 16, 16)
    const { data } = ctx.getImageData(0, 0, 16, 16)
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
    return { r: r / n, g: g / n, b: b / n }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm exec vitest run src/lib/poster/brandAccent.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/poster/types.ts src/lib/poster/brandAccent.ts src/lib/poster/brandAccent.test.ts
git commit -m "feat(poster): brand-accent color mapping + types"
```

---

### Task 3: Poster content mapper (TDD)

**Files:**
- Create: `src/lib/poster/content.ts`
- Test: `src/lib/poster/content.test.ts`

Note: reuses `academyName` from `@/lib/short-name`. Date formatting mirrors the existing poster page (`Asia/Bangkok`, `M月d日 周X · HH:mm–HH:mm` for zh).

**Media-URL caveat (read before Task 6 gate):** `/_next/image` only optimizes sources allowlisted in `next.config.ts`. In **production**, media are absolute R2 URLs → matched by `images.remotePatterns`. In **local dev**, Payload serves media at the root-relative path `/api/media/file/<filename>` → matched by `images.localPatterns` (`/api/media/file/**`). So `optimizedImageUrl` must pass the URL through **as-is** (absolute remote OR root-relative local) — do NOT force an absolute `http://localhost` URL in dev, or the optimizer returns 400 and the photo captures blank. The mapper takes whatever `media.url` Payload returns; just confirm it matches an allowlisted pattern.

- [ ] **Step 1: Write the failing test**

`src/lib/poster/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toPosterContent, optimizedImageUrl } from './content'

const location: any = {
  city: '清迈',
  name: '清迈心灯学堂',
  posterLogoWhite: null,
}

const activityZh: any = {
  title: '正念茶禅 · 周末共修',
  shortDesc: '在一盏茶的专注里，安住当下。',
  venueNote: '清迈心灯学堂 · 清迈',
  heroImage: { url: 'https://cdn.example.com/tea.jpg' },
  socialImage: null,
  occurrences: [
    { startAt: '2099-06-07T08:00:00.000Z', endAt: '2099-06-07T10:00:00.000Z', status: 'open' },
  ],
}
const activityEn: any = { ...activityZh, title: 'Mindful Tea & Meditation', shortDesc: 'Rest in the present.' }

describe('optimizedImageUrl', () => {
  it('wraps a remote url through the same-origin Next optimizer', () => {
    const u = optimizedImageUrl('https://cdn.example.com/tea.jpg', 1080)
    expect(u.startsWith('/_next/image?url=')).toBe(true)
    expect(u).toContain(encodeURIComponent('https://cdn.example.com/tea.jpg'))
    expect(u).toContain('w=1080')
  })
})

describe('toPosterContent', () => {
  it('builds zh content with theme, copy, academy line, optimized photo', () => {
    const c = toPosterContent({ activityZh, activityEn, location, locale: 'zh-CN' })
    expect(c.theme).toBe('正念茶禅 · 周末共修')
    expect(c.copy).toBe('在一盏茶的专注里，安住当下。')
    expect(c.academy.nameLine).toBe('静心学堂 · 心灯')
    expect(c.photoUrl.startsWith('/_next/image?url=')).toBe(true)
    expect(c.dateLine).toMatch(/6月7日/)
  })

  it('uses English title for en locale', () => {
    const c = toPosterContent({ activityZh, activityEn, location, locale: 'en' })
    expect(c.theme).toBe('Mindful Tea & Meditation')
  })

  it('prefers socialImage over heroImage when present', () => {
    const withSocial = { ...activityZh, socialImage: { url: 'https://cdn.example.com/social.jpg' } }
    const c = toPosterContent({ activityZh: withSocial, activityEn, location, locale: 'zh-CN' })
    expect(c.photoUrl).toContain(encodeURIComponent('https://cdn.example.com/social.jpg'))
  })

  it('returns null dateLine when there is no future occurrence', () => {
    const past = { ...activityZh, occurrences: [{ startAt: '2000-01-01T00:00:00.000Z', endAt: '2000-01-01T01:00:00.000Z', status: 'open' }] }
    const c = toPosterContent({ activityZh: past, activityEn, location, locale: 'zh-CN' })
    expect(c.dateLine).toBeNull()
  })
})
```

- [ ] **Step 1b: Run it, verify it fails**

Run: `pnpm exec vitest run src/lib/poster/content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement**

`src/lib/poster/content.ts`:

```ts
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { academyName, shortName } from '@/lib/short-name'
import type { PosterContent } from './types'

const TZ = 'Asia/Bangkok'
const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

function mediaUrl(img: any): string | null {
  if (!img || typeof img === 'number') return null
  return img.url ?? null
}

/** Same-origin optimized URL so the capture canvas is not tainted. */
export function optimizedImageUrl(url: string, w: number, q = 90): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`
}

function formatSessionLine(startAt: string, endAt: string, isZh: boolean): string {
  const z = toZonedTime(new Date(startAt), TZ)
  const end = toZonedTime(new Date(endAt), TZ)
  const time = `${fmtTz(z, 'HH:mm', { timeZone: TZ })}–${fmtTz(end, 'HH:mm', { timeZone: TZ })}`
  if (isZh) return `${fmtTz(z, 'M月d日', { timeZone: TZ })} 周${WEEKDAY_ZH[z.getDay()]} · ${time}`
  return `${fmtTz(z, 'EEE, MMM d', { timeZone: TZ })} · ${time}`
}

function nextOccurrence(activity: any) {
  const now = Date.now()
  return (
    (activity.occurrences ?? [])
      .filter((o: any) => o.startAt && o.status !== 'cancelled' && o.status !== 'deleted' && new Date(o.startAt).getTime() > now)
      .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
  )
}

export function toPosterContent(args: {
  activityZh: any
  activityEn: any
  location: any
  locale: 'zh-CN' | 'en'
}): PosterContent {
  const { activityZh, activityEn, location, locale } = args
  const isZh = locale === 'zh-CN'
  const activity = isZh ? activityZh : activityEn

  const rawPhoto = mediaUrl(activity.socialImage) ?? mediaUrl(activity.heroImage) ?? mediaUrl(activityZh.heroImage)
  const photoUrl = rawPhoto ? optimizedImageUrl(rawPhoto, 1080) : ''

  const occ = nextOccurrence(activity) ?? nextOccurrence(activityZh)
  const dateLine = occ?.startAt && occ?.endAt ? formatSessionLine(occ.startAt, occ.endAt, isZh) : null

  const nameLine = isZh
    ? `静心学堂 · ${shortName(location.city, location.name)}`
    : `Mindful Peace Academy · ${academyName(location.city, location.name)}`

  const rawLogo = mediaUrl(location.posterLogoWhite)

  return {
    academy: { nameLine, logoWhiteUrl: rawLogo ? optimizedImageUrl(rawLogo, 600) : null },
    theme: activity.title ?? activityZh.title,
    copy: activity.shortDesc ?? '',
    dateLine,
    venueLine: activity.venueNote || `${academyName(location.city, location.name)} · ${location.city}`,
    photoUrl,
  }
}
```

- [ ] **Step 3: Run tests, verify pass**

Run: `pnpm exec vitest run src/lib/poster/content.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/poster/content.ts src/lib/poster/content.test.ts
git commit -m "feat(poster): activity → poster content mapper"
```

---

## Chunk 2: Capture pipeline + PosterCanvas (walking skeleton — GATING)

> Per spec §4.4/§7: the same-origin capture + CJK-font embedding path is the highest risk. Task 6 is a **gating manual browser test** — prove a real PNG exports correctly before building the full studio UI.

### Task 4: Add `modern-screenshot` + capture util

**Files:**
- Modify: `package.json`
- Create: `src/lib/poster/capture.ts`

- [ ] **Step 1: Install dependency**

Run: `pnpm add modern-screenshot`
Expected: added to `package.json` dependencies; lockfile updated.

- [ ] **Step 2: Implement capture util**

`src/lib/poster/capture.ts`:

```ts
import { domToBlob } from 'modern-screenshot'
import { SIZE_PX, type PosterSize } from './types'

/**
 * Capture a DOM node to a PNG Blob at exact poster pixel dimensions.
 * `node` is rendered at its CSS size; we scale so output width = 1080.
 */
export async function capturePng(node: HTMLElement, size: PosterSize): Promise<Blob> {
  const { w, h } = SIZE_PX[size]
  // Ensure fonts (incl. CJK + calligraphy) are ready before snapshot.
  if (document.fonts?.ready) await document.fonts.ready
  const rendered = node.getBoundingClientRect()
  const scale = w / rendered.width
  return domToBlob(node, {
    width: w,
    height: h,
    scale,
    backgroundColor: '#000000',
    type: 'image/png',
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/poster/capture.ts
git commit -m "feat(poster): add modern-screenshot capture util"
```

---

### Task 5: PosterCanvas component (TDD structure)

**Files:**
- Create: `src/components/poster/PosterCanvas.tsx`
- Create: `src/components/poster/poster-fonts.css`
- Test: `src/components/poster/PosterCanvas.test.tsx`

Design = VI A-13-1 (see header). The component renders at an **exact CSS pixel size** (`SIZE_PX[size]`) so capture is deterministic.

> DRY note: the `Leaf` and `BodhiWatermark` SVGs share the same path `d`. Extract it to a single `const BODHI_PATH = '...'` module constant and reference it in both, to keep the file lean.

- [ ] **Step 1: Write the failing test**

`src/components/poster/PosterCanvas.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PosterCanvas } from './PosterCanvas'
import type { PosterContent } from '@/lib/poster/types'

const content: PosterContent = {
  academy: { nameLine: '静心学堂 · 心灯', logoWhiteUrl: null },
  theme: '正念茶禅 · 周末共修',
  copy: '在一盏茶的专注里，安住当下。',
  dateLine: '6月7日 周六 · 15:00–17:00',
  venueLine: '清迈心灯学堂 · 清迈',
  photoUrl: '/_next/image?url=x&w=1080',
}

describe('PosterCanvas', () => {
  it('renders theme, date, venue and academy line', () => {
    const { getByText, container } = render(
      <PosterCanvas content={content} size="4x5" locale="zh-CN" themeFont="serif" accent="blue" />,
    )
    expect(getByText('正念茶禅 · 周末共修')).toBeTruthy()
    expect(getByText(/6月7日/)).toBeTruthy()
    expect(getByText(/清迈心灯学堂/)).toBeTruthy()
    // exact pixel canvas
    const root = container.firstChild as HTMLElement
    expect(root.style.width).toBe('1080px')
    expect(root.style.height).toBe('1350px')
  })

  it('applies the accent color to the side bar', () => {
    const { container } = render(
      <PosterCanvas content={content} size="1x1" locale="zh-CN" themeFont="serif" accent="clay" />,
    )
    const bar = container.querySelector('[data-poster-bar]') as HTMLElement
    expect(bar.style.backgroundColor).toBe('rgb(218, 158, 131)') // #DA9E83
  })

  it('falls back to text logo when logoWhiteUrl is null', () => {
    const { getByText } = render(
      <PosterCanvas content={content} size="4x5" locale="zh-CN" themeFont="serif" accent="blue" />,
    )
    expect(getByText('静心学堂 · 心灯')).toBeTruthy()
  })
})
```

- [ ] **Step 1b: Confirm test deps**

`@testing-library/react` is required. If missing: `pnpm add -D @testing-library/react`. Confirm `src/tests/setup.ts` registers `@testing-library/jest-dom` (or use plain truthiness as above). Run the test and verify it FAILS (component not found).

Run: `pnpm exec vitest run src/components/poster/PosterCanvas.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Write fonts CSS**

`src/components/poster/poster-fonts.css` (self-hosted woff2 — see Task 6 asset step; calligraphy optional until file present):

```css
@font-face {
  font-family: 'Poster Serif';
  src: local('Noto Serif SC'), url('/fonts/NotoSerifSC.woff2') format('woff2');
  font-weight: 400 700;
  font-display: block;
}
@font-face {
  font-family: 'Poster Sans';
  src: local('Noto Sans SC'), url('/fonts/NotoSansSC.woff2') format('woff2');
  font-weight: 400 700;
  font-display: block;
}
@font-face {
  font-family: 'Poster Brush';
  src: url('/fonts/YanshiFoxi.woff2') format('woff2');
  font-weight: 400;
  font-display: block;
}
```

- [ ] **Step 3: Implement PosterCanvas**

`src/components/poster/PosterCanvas.tsx`:

```tsx
import './poster-fonts.css'
import { ACCENT_HEX, SIZE_PX, type BrandAccent, type PosterContent, type PosterSize, type ThemeFont } from '@/lib/poster/types'

const SERIF = "'Poster Serif', 'Noto Serif SC', serif"
const SANS = "'Poster Sans', 'Noto Sans SC', sans-serif"
const BRUSH = "'Poster Brush', 'Poster Serif', serif"

export interface PosterCanvasProps {
  content: PosterContent
  size: PosterSize
  locale: 'zh-CN' | 'en'
  themeFont: ThemeFont
  accent: BrandAccent
}

export function PosterCanvas({ content, size, themeFont, accent }: PosterCanvasProps) {
  const { w, h } = SIZE_PX[size]
  const themeFamily = themeFont === 'calligraphy' ? BRUSH : SERIF
  const barW = Math.round(w * 0.13)
  const pad = Math.round(w * 0.065)

  return (
    <div
      data-poster-root
      style={{
        position: 'relative', width: `${w}px`, height: `${h}px`,
        overflow: 'hidden', background: '#0e1620', color: '#fff', fontFamily: SANS,
      }}
    >
      {/* Photo */}
      {content.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.photoUrl} alt="" crossOrigin="anonymous"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {/* Scrim: left + bottom, for white text legibility */}
      <div style={{ position: 'absolute', inset: 0, background:
        'linear-gradient(115deg, rgba(20,30,42,.50) 0%, rgba(20,30,42,.10) 38%, rgba(20,30,42,0) 60%), ' +
        'linear-gradient(0deg, rgba(13,20,30,.78) 0%, rgba(13,20,30,.10) 34%, rgba(13,20,30,0) 56%)' }} />

      {/* Bodhi watermark, right edge */}
      <BodhiWatermark w={w} />

      {/* Top-left logo */}
      <div style={{ position: 'absolute', top: pad, left: pad, display: 'flex', alignItems: 'center', gap: 14 }}>
        {content.academy.logoWhiteUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.academy.logoWhiteUrl} alt="" crossOrigin="anonymous" style={{ height: Math.round(h * 0.07) }} />
        ) : (
          <>
            <Leaf size={Math.round(h * 0.06)} color="#fff" />
            <span style={{ fontFamily: SERIF, fontSize: Math.round(w * 0.04) }}>{content.academy.nameLine}</span>
          </>
        )}
      </div>

      {/* Right accent bar with vertical theme */}
      <div data-poster-bar
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${barW}px`,
          backgroundColor: ACCENT_HEX[accent], display: 'flex', justifyContent: 'center', paddingTop: pad }}>
        <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', fontFamily: themeFamily,
          fontSize: Math.round(w * 0.058), letterSpacing: '0.14em', color: '#fff', lineHeight: 1.05 }}>
          {content.theme}
        </span>
      </div>

      {/* Lower-left copy + date */}
      <div style={{ position: 'absolute', left: pad, right: barW + pad, bottom: pad }}>
        {content.copy && (
          <p style={{ fontFamily: SERIF, fontSize: Math.round(w * 0.042), lineHeight: 1.6, margin: `0 0 ${pad}px` }}>
            {content.copy}
          </p>
        )}
        <div style={{ fontFamily: SANS, fontSize: Math.round(w * 0.022), letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.78 }}>
          活动时间 · TIME
        </div>
        {content.dateLine && (
          <p style={{ fontFamily: SANS, fontSize: Math.round(w * 0.046), fontWeight: 700, margin: '4px 0 8px' }}>
            {content.dateLine}
          </p>
        )}
        <p style={{ fontFamily: SANS, fontSize: Math.round(w * 0.03), opacity: 0.85, margin: 0 }}>
          {content.venueLine}
        </p>
      </div>
    </div>
  )
}

function Leaf({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 428 462" fill="none" aria-hidden>
      <path d="M222 47c-1 1-1 5-1 9 0 15-5 33-13 49-9 17-17 28-43 57-24 28-30 36-41 53-24 37-36 78-36 124 0 17 2 28 6 39 14 36 51 51 98 39 36-9 82-35 101-56 20-22 26-45 16-65-6-12-21-22-34-24-13-2-27 2-37 11l-5 4-6-5c-14-11-30-14-45-8-7 3-13 6-19 12-15 16-16 39-3 59 8 12 22 26 35 35l4 2 9-3c5-2 10-4 12-5l3-2-10-7c-18-12-30-23-36-36-7-13-3-28 9-34 15-8 33 1 36 18l1 5h21l1-5c2-12 12-21 25-21 13 0 23 11 23 24 0 8-4 16-11 25-18 22-63 47-101 56-11 3-28 2-37 0-8-3-18-9-22-14-4-6-8-15-10-25-1-7-1-12-1-26 1-34 7-60 21-88 10-20 22-37 50-68 27-30 37-44 46-62 3-5 5-9 5-9s3 5 6 11c8 17 20 32 48 63 25 28 38 47 49 68 10 21 16 41 19 67 5 48-5 73-32 81-13 4-29 4-47-1l-9-3-11 6c-6 3-11 6-11 6-6 0 14 8 30 12 25 6 46 5 65-4 7-3 10-6 16-12 16-17 22-35 21-69-1-36-8-62-22-92-12-24-24-41-54-76-32-37-43-52-50-73-4-10-7-26-7-35 0-11 0-11-11-11-8 0-9 0-10 2"
        stroke={color} strokeWidth={14} />
    </svg>
  )
}

function BodhiWatermark({ w }: { w: number }) {
  return (
    <svg viewBox="0 0 428 462" fill="none" aria-hidden
      style={{ position: 'absolute', right: `${-w * 0.06}px`, top: '8%', width: `${w * 0.46}px`, opacity: 0.16 }}>
      <path d="M222 47c-1 1-1 5-1 9 0 15-5 33-13 49-9 17-17 28-43 57-24 28-30 36-41 53-24 37-36 78-36 124 0 17 2 28 6 39 14 36 51 51 98 39 36-9 82-35 101-56 20-22 26-45 16-65-6-12-21-22-34-24-13-2-27 2-37 11l-5 4-6-5c-14-11-30-14-45-8-7 3-13 6-19 12-15 16-16 39-3 59 8 12 22 26 35 35l4 2 9-3c5-2 10-4 12-5l3-2-10-7c-18-12-30-23-36-36-7-13-3-28 9-34 15-8 33 1 36 18l1 5h21l1-5c2-12 12-21 25-21 13 0 23 11 23 24 0 8-4 16-11 25-18 22-63 47-101 56-11 3-28 2-37 0-8-3-18-9-22-14-4-6-8-15-10-25-1-7-1-12-1-26 1-34 7-60 21-88 10-20 22-37 50-68 27-30 37-44 46-62 3-5 5-9 5-9s3 5 6 11c8 17 20 32 48 63 25 28 38 47 49 68 10 21 16 41 19 67 5 48-5 73-32 81-13 4-29 4-47-1l-9-3-11 6c-6 3-11 6-11 6-6 0 14 8 30 12 25 6 46 5 65-4 7-3 10-6 16-12 16-17 22-35 21-69-1-36-8-62-22-92-12-24-24-41-54-76-32-37-43-52-50-73-4-10-7-26-7-35 0-11 0-11-11-11-8 0-9 0-10 2"
        stroke="#fff" strokeWidth={10} />
    </svg>
  )
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm exec vitest run src/components/poster/PosterCanvas.test.tsx`
Expected: PASS (3 tests). Fix selectors/styles if assertions differ (e.g. happy-dom may serialize colors as `rgb(...)`).

- [ ] **Step 5: Commit**

```bash
git add src/components/poster/ package.json pnpm-lock.yaml
git commit -m "feat(poster): PosterCanvas component (VI A-13-1)"
```

---

### Task 6: GATING — prove end-to-end capture in the admin

**Goal:** Before building the full UI, prove the riskiest path: a `PosterCanvas` with **CJK text + a same-origin photo** captures to a correct 1080px PNG inside the Payload admin. This validates fonts embedding and no canvas taint.

**Files:**
- Create (temporary scaffold): `src/admin/poster-studio/PosterStudioView.tsx`, `src/admin/poster-studio/PosterStudioClient.tsx`
- Modify: `src/payload.config.ts`
- Asset: `public/fonts/*.woff2`

- [ ] **Step 1: Add font assets**

Download and place self-hosted woff2 in `public/fonts/`:
- `NotoSerifSC.woff2`, `NotoSansSC.woff2` (full or broad-subset; from Google Fonts / fontsource).
- `YanshiFoxi.woff2` (演示佛系体 — confirmed free for commercial use; convert ttf→woff2). If not yet available, the `calligraphy` option falls back to serif — proceed without it.

- [ ] **Step 2: Minimal client view**

`src/admin/poster-studio/PosterStudioClient.tsx`:

```tsx
'use client'
import { useRef, useState } from 'react'
import { PosterCanvas } from '@/components/poster/PosterCanvas'
import { capturePng, downloadBlob } from '@/lib/poster/capture'
import type { PosterContent } from '@/lib/poster/types'

const DEMO: PosterContent = {
  academy: { nameLine: '静心学堂 · 心灯', logoWhiteUrl: null },
  theme: '正念茶禅 · 周末共修',
  copy: '在一盏茶的专注里，安住当下，照见自心。',
  dateLine: '6月7日 周六 · 15:00–17:00',
  venueLine: '清迈心灯学堂 · 清迈',
  // a same-origin optimized URL pointing at any allowlisted media image:
  photoUrl: '/_next/image?url=' + encodeURIComponent('REPLACE_WITH_REAL_MEDIA_URL') + '&w=1080&q=90',
}

export default function PosterStudioClient() {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ padding: 24 }}>
      <h2>海报工具(验证)</h2>
      <div style={{ transform: 'scale(0.32)', transformOrigin: 'top left', width: 1080, height: 1350 }}>
        <div ref={ref}><PosterCanvas content={DEMO} size="4x5" locale="zh-CN" themeFont="serif" accent="blue" /></div>
      </div>
      <button disabled={busy} onClick={async () => {
        if (!ref.current) return
        setBusy(true)
        try {
          const blob = await capturePng(ref.current.firstChild as HTMLElement, '4x5')
          downloadBlob(blob, 'poster-demo.png')
        } finally { setBusy(false) }
      }}>下载 PNG</button>
    </div>
  )
}
```

> Note: capture must run on the **unscaled** node. Render the canvas at full size off-screen for capture, and a scaled copy for preview — Task 9 handles this cleanly. For this spike, temporarily remove the `scale(0.32)` wrapper when clicking download, or capture `ref.current.firstChild` which is the full-size canvas (the transform is on the parent, not the captured node).

`src/admin/poster-studio/PosterStudioView.tsx`:

```tsx
import PosterStudioClient from './PosterStudioClient'

export default function PosterStudioView() {
  return <PosterStudioClient />
}
```

- [ ] **Step 3: Register the custom admin view**

In `src/payload.config.ts`, add to `admin`:

```ts
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    theme: 'light',
    components: {
      views: {
        posterStudio: {
          Component: '/admin/poster-studio/PosterStudioView#default',
          path: '/poster-studio',
        },
      },
      afterNavLinks: ['/admin/poster-studio/NavLink#default'],
    },
  },
```

(Defer `NavLink` to Task 11 — omit `afterNavLinks` for now, navigate directly to `/admin/poster-studio`.)

- [ ] **Step 4: Regenerate importMap**

Run: `pnpm payload generate:importmap`
Expected: `src/app/(payload)/admin/importMap.js` now references the view. **Do not hand-edit it.**

- [ ] **Step 5: GATING manual browser test**

1. Run `pnpm dev`, log into `/admin`, navigate to `/admin/poster-studio`.
2. Set `REPLACE_WITH_REAL_MEDIA_URL` to a real uploaded media URL (copy from any activity's hero in the admin).
3. Click 下载 PNG.
4. **Verify the downloaded PNG:** 1080×1350; the photo is present (not blank — proves no canvas taint); Chinese text + vertical theme render in the correct fonts (proves font embedding); accent bar + watermark visible.

**If the photo is blank / capture throws a SecurityError (taint):** the same-origin optimizer URL is not being used or the media domain isn't allowlisted in `next.config.ts` `images.remotePatterns`. Fix before proceeding — this is the gate.
**If Chinese text renders in a fallback font:** the woff2 files aren't loading; check `public/fonts` paths and `document.fonts.ready`.

- [ ] **Step 6: Commit (skeleton)**

```bash
git add src/admin/poster-studio src/payload.config.ts "src/app/(payload)/admin/importMap.js" public/fonts
git commit -m "feat(poster): admin custom view + gating capture spike"
```

---

## Chunk 3: Full studio UI

### Task 7: Server view — fetch academies + activities (Local API)

**Files:**
- Modify: `src/admin/poster-studio/PosterStudioView.tsx`

- [ ] **Step 1: Fetch data server-side**

```tsx
import { getPayload } from 'payload'
import config from '@payload-config'
import PosterStudioClient from './PosterStudioClient'

export default async function PosterStudioView() {
  const payload = await getPayload({ config })
  const [locations, zh, en] = await Promise.all([
    payload.find({ collection: 'locations', limit: 50, sort: 'order', overrideAccess: true }),
    payload.find({ collection: 'activities', where: { status: { equals: 'published' } }, locale: 'zh-CN', depth: 2, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'activities', where: { status: { equals: 'published' } }, locale: 'en', depth: 2, limit: 200, overrideAccess: true }),
  ])
  // Pair zh+en by id; pass minimal serializable data to the client.
  const enById = new Map(en.docs.map((d: any) => [d.id, d]))
  const activities = zh.docs.map((z: any) => ({ zh: z, en: enById.get(z.id) ?? z }))
  return <PosterStudioClient locations={locations.docs as any} activities={activities as any} />
}
```

- [ ] **Step 2: Manual check** — view loads activity list data (verify via console/UI after Task 8).
- [ ] **Step 3: Commit** — `git commit -am "feat(poster): studio server view fetches activities via Local API"`

### Task 8: Client — academy filter + activity picker

**Files:** Modify `src/admin/poster-studio/PosterStudioClient.tsx`

- [ ] **Step 1:** Accept `{ locations, activities }` props. Add state: `academyFilter` (location id | 'all'), `selectedId`. Render a `<select>` for academy filter + a list/grid of activities (filtered by `activity.zh.location` id), each clickable to set `selectedId`.
- [ ] **Step 2:** Derive `selected = activities.find(a => a.zh.id === selectedId)` and the matching `location`.
- [ ] **Step 3:** Manual browser check — filtering + selection work.
- [ ] **Step 4:** Commit — `feat(poster): academy filter + activity picker`

### Task 9: Client — preview + options + auto-accent

**Files:** Modify `src/admin/poster-studio/PosterStudioClient.tsx`

- [ ] **Step 1:** Build `content` from selection: `toPosterContent({ activityZh: selected.zh, activityEn: selected.en, location, locale })`.
- [ ] **Step 2:** Options state: `size` ('4x5'|'1x1'), `locale` ('zh-CN'|'en'), `themeFont` ('serif'|'calligraphy'), `accentMode` ('auto'|BrandAccent).
- [ ] **Step 3:** Render an **off-screen full-size** `PosterCanvas` (the capture target, `position:absolute; left:-99999px`) AND a scaled preview (CSS `transform: scale(...)`) — or one node inside a scaled wrapper and capture `firstChild` (unscaled) as in the spike. Prefer the off-screen full-size capture node + visible scaled preview for clarity.
- [ ] **Step 4:** Auto-accent: when `accentMode==='auto'`, on the capture node's `<img>` `onLoad`, call `dominantColorFromImage(img)` → `nearestBrandAccent(...)` → set resolved accent; manual dropdown overrides. Always pass a concrete `accent` to `PosterCanvas`.
- [ ] **Step 5:** Manual browser check — preview updates with each option; accent auto-picks and can be overridden.
- [ ] **Step 6:** Commit — `feat(poster): poster preview + options + auto accent`

### Task 10: Client — download (per size × language)

**Files:** Modify `src/admin/poster-studio/PosterStudioClient.tsx`

- [ ] **Step 1:** A "下载当前" button captures the current capture node via `capturePng(node, size)` and `downloadBlob` with a filename like `${slug}-${locale}-${size}.png`.
- [ ] **Step 2:** A "下载全部 4 张" button loops over `['zh-CN','en'] × ['4x5','1x1']`: for each, set state, wait a tick for re-render + `document.fonts.ready` + image load, capture, download. (Render the capture node per-variant; await image `decode()` before capture to avoid blank photos.)
- [ ] **Step 3:** GATING re-check — download all 4; verify each PNG is correct (size, photo present, fonts, accent, no QR).
- [ ] **Step 4:** Commit — `feat(poster): download poster PNGs (4:5/1:1 × zh/en)`

### Task 11: Nav link + polish + docs

**Files:** Create `src/admin/poster-studio/NavLink.tsx`; modify `src/payload.config.ts`; regenerate importMap.

- [ ] **Step 1:** Create a small `NavLink` client component linking to `/admin/poster-studio` (label 「海报工具 / Posters」). Wire `admin.components.afterNavLinks`. Run `pnpm payload generate:importmap`.
- [ ] **Step 2:** Remove the temporary `DEMO`/`REPLACE_WITH_REAL_MEDIA_URL` scaffolding from `PosterStudioClient` (fully replaced by real data path).
- [ ] **Step 3:** Final full verification (see below).
- [ ] **Step 4:** Commit — `feat(poster): admin nav link + cleanup`

---

## Final Verification

- [ ] `pnpm exec tsc --noEmit` — no type errors.
- [ ] `pnpm test` — all poster unit tests pass (`brandAccent`, `content`, `PosterCanvas`).
- [ ] `pnpm exec eslint src/lib/poster src/components/poster src/admin/poster-studio` — clean.
- [ ] **Manual (the real acceptance):** In `/admin/poster-studio`, pick a published activity, confirm preview matches VI A-13-1, download 4:5 + 1:1 in zh + en. Each PNG: 1080px wide, photo present, correct fonts, accent bar + vertical theme, watermark, prominent date, **no QR**.
- [ ] `socialImage` empty → falls back to `heroImage`; set `socialImage` → uses it.
- [ ] `posterLogoWhite` empty → text-fallback logo; set it → image logo shown.

---

## Notes / assets (non-blocking for code, blocking for polish)

- **Per-academy white logo lockups** (Bangkok 如如 / Chiangmai 心灯 / Phuket 和光): upload to each Location's `posterLogoWhite`. Until then the text-fallback logo renders.
- **演示佛系体 woff2** for the `calligraphy` theme option (confirmed free for commercial use). Until present, `calligraphy` falls back to serif.
- **YAGNI (not in this plan):** zip batch download, server-side image API, other poster types, QR, freeform editor, sizes beyond 4:5/1:1.
