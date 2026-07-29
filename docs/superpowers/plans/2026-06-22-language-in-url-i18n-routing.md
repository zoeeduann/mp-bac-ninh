# Language-in-URL i18n Routing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move locale from the `jx-lang` cookie into the URL — zh-CN stays unprefixed, English gets an `/en` prefix — so every English page has a distinct, crawlable URL.

**Architecture:** Middleware parses a leading `/en` segment, internally `rewrite`s it away, and injects `x-locale` + a stripped `x-pathname` request header. `getLocale()` reads `x-locale` instead of the cookie. Pure URL helpers (`localePath`/`localizedUrl`/`stripLocale`/`swapLocalePath`) centralize prefix logic for links, canonical/hreflang, sitemap, JSON-LD, and the language switcher. The `[loc]` route tree is unchanged, so `params.loc` and all `getLocationBySlug` calls are untouched.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3, Vitest (happy-dom), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-22-language-in-url-i18n-routing-design.md`

**Ordering principle:** zh-CN behavior must never break at any commit. English becomes fully correct by the end. The intermediate "English-only-degraded" window (after Task 3, before Tasks 4-7) is acceptable on this feature branch — English is not yet live/indexed.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/locale-url.ts` | Pure URL prefix helpers (no React/Next) | Create |
| `src/tests/locale-url.test.ts` | Unit tests for the helpers | Create |
| `src/middleware.ts` | Parse `/en`, rewrite, inject `x-locale`/`x-pathname` | Modify |
| `src/tests/middleware.test.ts` | Unit tests for middleware logic | Create |
| `src/lib/i18n.ts` | `getLocale()` reads `x-locale` header | Modify |
| `src/lib/current-location.ts` | `extractLocationSlug` strips a leading `en` | Modify |
| `src/tests/current-location.test.ts` | Add `/en/...` cases | Modify |
| `src/app/api/locale/route.ts` | (cookie writer — obsolete) | Delete |
| `src/components/layout/Header.tsx` | Strip `/en` before academy derivation; localize links | Modify |
| `src/components/layout/Footer.tsx` | Strip `/en` before academy derivation; localize links | Modify |
| `src/components/layout/LocationChip.tsx` | Localize `href` | Modify |
| `src/components/layout/MobileNav.tsx` | Localize `href` | Modify |
| `src/components/layout/LanguageToggle.tsx` | Real `<a href>` via `swapLocalePath` | Modify |
| `src/components/booking/UpcomingSessionsList.tsx` | Localize `href` | Modify |
| `src/components/activities/ShareButton.tsx` (call sites) | Pass localized url | Modify |
| `src/app/(frontend)/page.tsx` + all `[loc]/**/page.tsx` | Localize links + canonical/hreflang + JSON-LD urls | Modify |
| `src/lib/metadata.ts` | `buildMetadata` adds `x-default`; callers pass localized urls | Modify |
| `src/lib/poster-download.ts` | `buildPosterQrTarget` takes `locale` | Modify |
| `src/tests/poster-download.test.ts` | Update for locale param | Modify |
| `src/app/sitemap.ts` | Emit zh + en entries with `alternates.languages` | Modify |
| `src/app/llms.txt/route.ts` | Add English academy block + `/en` portal | Modify |

---

## Chunk 1: Core mechanism (helpers + middleware + getLocale)

### Task 1: Pure URL helpers

**Files:**
- Create: `src/lib/locale-url.ts`
- Test: `src/tests/locale-url.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/tests/locale-url.test.ts
import { describe, it, expect } from 'vitest'
import { localePath, localizedUrl, stripLocale, swapLocalePath } from '@/lib/locale-url'

describe('localePath', () => {
  it('prefixes /en for English, leaves zh-CN unchanged', () => {
    expect(localePath('en', '/chiangmai/activities')).toBe('/en/chiangmai/activities')
    expect(localePath('zh-CN', '/chiangmai/activities')).toBe('/chiangmai/activities')
  })
  it('handles root', () => {
    expect(localePath('en', '/')).toBe('/en')
    expect(localePath('zh-CN', '/')).toBe('/')
  })
})

describe('localizedUrl', () => {
  it('returns an absolute URL with the locale prefix', () => {
    expect(localizedUrl('en', '/chiangmai', 'https://x.com')).toBe('https://x.com/en/chiangmai')
    expect(localizedUrl('zh-CN', '/chiangmai', 'https://x.com')).toBe('https://x.com/chiangmai')
  })
})

describe('stripLocale', () => {
  it('removes a leading /en segment', () => {
    expect(stripLocale('/en/chiangmai/activities')).toBe('/chiangmai/activities')
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/chiangmai')).toBe('/chiangmai')
    expect(stripLocale('/')).toBe('/')
  })
  it('does not strip a location that merely starts with "en"', () => {
    expect(stripLocale('/enclave')).toBe('/enclave')
  })
})

describe('swapLocalePath', () => {
  it('switches the prefix while preserving the rest', () => {
    expect(swapLocalePath('/chiangmai/activities', 'en')).toBe('/en/chiangmai/activities')
    expect(swapLocalePath('/en/chiangmai/activities', 'zh-CN')).toBe('/chiangmai/activities')
    expect(swapLocalePath('/en', 'zh-CN')).toBe('/')
    expect(swapLocalePath('/', 'en')).toBe('/en')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/locale-url.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/locale-url.ts
import type { Locale } from './i18n'

const EN_PREFIX = '/en'

/** Internal relative href for a locale. zh-CN unprefixed; en gets /en. */
export function localePath(locale: Locale, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (locale !== 'en') return p
  return p === '/' ? EN_PREFIX : `${EN_PREFIX}${p}`
}

/** Absolute URL for canonical / hreflang / sitemap / JSON-LD. */
export function localizedUrl(locale: Locale, path: string, base: string): string {
  return `${base}${localePath(locale, path)}`
}

/** Remove a leading /en segment. Used by client components reading usePathname(). */
export function stripLocale(pathname: string): string {
  if (pathname === EN_PREFIX) return '/'
  if (pathname.startsWith(`${EN_PREFIX}/`)) return pathname.slice(EN_PREFIX.length)
  return pathname
}

/** Swap the locale prefix on a pathname, preserving the remainder. */
export function swapLocalePath(pathname: string, nextLocale: Locale): string {
  return localePath(nextLocale, stripLocale(pathname))
}
```

- [ ] **Step 4: Run to verify pass**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/locale-url.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/locale-url.ts src/tests/locale-url.test.ts
git commit -m "feat(i18n): pure URL locale-prefix helpers"
```

---

### Task 2: Middleware — parse /en, rewrite, inject headers

**Files:**
- Modify: `src/middleware.ts`
- Test: `src/tests/middleware.test.ts`

**Note:** The middleware itself uses `NextRequest`/`NextResponse`; unit-test the *pure decision* by extracting a helper `resolveLocaleRewrite(pathname)` that returns `{ locale, rewritePath, xPathname }`, then have `middleware()` apply it. This keeps logic testable without constructing a full request.

- [ ] **Step 1: Write the failing tests**

```ts
// src/tests/middleware.test.ts
import { describe, it, expect } from 'vitest'
import { resolveLocaleRewrite } from '@/middleware'

describe('resolveLocaleRewrite', () => {
  it('zh-CN default: no rewrite, pathname unchanged', () => {
    expect(resolveLocaleRewrite('/chiangmai/activities')).toEqual({
      locale: 'zh-CN', rewritePath: null, xPathname: '/chiangmai/activities',
    })
  })
  it('root stays zh-CN', () => {
    expect(resolveLocaleRewrite('/')).toEqual({
      locale: 'zh-CN', rewritePath: null, xPathname: '/',
    })
  })
  it('en: rewrites away /en, xPathname is stripped', () => {
    expect(resolveLocaleRewrite('/en/chiangmai/activities')).toEqual({
      locale: 'en', rewritePath: '/chiangmai/activities', xPathname: '/chiangmai/activities',
    })
  })
  it('bare /en rewrites to /', () => {
    expect(resolveLocaleRewrite('/en')).toEqual({
      locale: 'en', rewritePath: '/', xPathname: '/',
    })
  })
  it('en opengraph-image maps back', () => {
    expect(resolveLocaleRewrite('/en/opengraph-image')).toEqual({
      locale: 'en', rewritePath: '/opengraph-image', xPathname: '/opengraph-image',
    })
  })
  it('does not treat a path merely starting with "en" as English', () => {
    expect(resolveLocaleRewrite('/enclave')).toEqual({
      locale: 'zh-CN', rewritePath: null, xPathname: '/enclave',
    })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/middleware.test.ts`
Expected: FAIL — `resolveLocaleRewrite` not exported.

- [ ] **Step 3: Implement**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripLocale } from '@/lib/locale-url'
import type { Locale } from '@/lib/i18n'

export function resolveLocaleRewrite(pathname: string): {
  locale: Locale
  rewritePath: string | null
  xPathname: string
} {
  const isEn = pathname === '/en' || pathname.startsWith('/en/')
  if (isEn) {
    const stripped = stripLocale(pathname)
    return { locale: 'en', rewritePath: stripped, xPathname: stripped }
  }
  return { locale: 'zh-CN', rewritePath: null, xPathname: pathname }
}

export function middleware(req: NextRequest) {
  const { locale, rewritePath, xPathname } = resolveLocaleRewrite(req.nextUrl.pathname)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-locale', locale)
  requestHeaders.set('x-pathname', xPathname)

  if (rewritePath) {
    const url = req.nextUrl.clone()
    url.pathname = rewritePath // query string is preserved by clone()
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!api|_next|admin|favicon.ico|fonts|.*\\..*).*)'],
}
```

- [ ] **Step 4: Run to verify pass**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/middleware.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/tests/middleware.test.ts
git commit -m "feat(i18n): middleware rewrites /en and injects x-locale"
```

---

### Task 3: getLocale() reads header; remove cookie + /api/locale; harden extractLocationSlug

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/current-location.ts`
- Modify: `src/tests/current-location.test.ts`
- Delete: `src/app/api/locale/route.ts`

- [ ] **Step 1: Add the failing extractLocationSlug test**

Append to `src/tests/current-location.test.ts`:

```ts
it('strips a leading /en before resolving the location', () => {
  expect(extractLocationSlug('/en/chiangmai')).toBe('chiangmai')
  expect(extractLocationSlug('/en')).toBeNull()
})
```

- [ ] **Step 2: Run to verify failure**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/current-location.test.ts`
Expected: FAIL — `extractLocationSlug('/en/chiangmai')` returns `null`.

- [ ] **Step 3: Implement**

In `src/lib/current-location.ts`, import and apply `stripLocale`:

```ts
import { stripLocale } from './locale-url'
// ...
export function extractLocationSlug(pathname: string): LocationSlug | null {
  const first = stripLocale(pathname).split('/').filter(Boolean)[0]
  return LOCATION_SLUGS.includes(first as LocationSlug) ? (first as LocationSlug) : null
}
```

In `src/lib/i18n.ts`, replace the cookie read in `getLocale()`:

```ts
export async function getLocale(): Promise<Locale> {
  const { headers } = await import('next/headers')
  const h = await headers()
  const v = h.get('x-locale') as Locale | undefined
  return LOCALES.includes(v as Locale) ? (v as Locale) : DEFAULT_LOCALE
}
```

Remove the now-unused `COOKIE` constant. Then delete the cookie API route:

```bash
git rm src/app/api/locale/route.ts
```

- [ ] **Step 4: Run to verify pass**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/current-location.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (catches any lingering jx-lang / route references)**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npm run typecheck`
Expected: no errors. If `grep -rn "jx-lang\|/api/locale" src/` returns anything other than the deleted file, fix it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(i18n): getLocale reads x-locale header; drop jx-lang cookie + /api/locale"
```

---

## Chunk 2: Client correctness (derivation + links + switcher)

### Task 4: Strip /en in Header & Footer academy derivation

**Files:**
- Modify: `src/components/layout/Header.tsx:56-59`
- Modify: `src/components/layout/Footer.tsx:35-38`

- [ ] **Step 1: Implement** — in both files, import `stripLocale` and apply before taking the first segment:

```ts
import { stripLocale } from '@/lib/locale-url'
// ...
const firstSegment = stripLocale(pathname).split('/').filter(Boolean)[0]
const currentLocation = allLocations.find((loc) => loc.slug === firstSegment) ?? null
```

- [ ] **Step 2: Verify** — `HTTPS_PROXY="" HTTP_PROXY="" npm run typecheck` passes. (Behavioral check happens in the Task 11 build/runtime pass.)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Footer.tsx
git commit -m "fix(i18n): strip /en before deriving current academy in Header/Footer"
```

---

### Task 5: Localize internal links across layout components

**Files (each already receives a `locale` prop):**
- `src/components/layout/Header.tsx` — **`buildNavItems` (lines 38-49)** constructs the nav `href`s (`/`, `/${loc}`, `/${loc}/activities`, `/${loc}/journal`, `/${loc}/about`) consumed by BOTH the desktop nav (`:123`) and `MobileNav`; plus direct JSX hrefs at `:69,84,139`
- `src/components/layout/Footer.tsx` — **`exploreLinks` array (lines ~45-49)** builds nav hrefs (same object-literal pattern as Header's `buildNavItems`); plus direct JSX hrefs at `:166,188,202`
- `src/components/layout/LocationChip.tsx:106,125`
- `src/components/layout/MobileNav.tsx:92` (any href NOT sourced from `buildNavItems`)

- [ ] **Step 1: Implement** — import `localePath` in each component. **Critically: wrap the `href` values inside `buildNavItems` (Header.tsx:38-49)** with `localePath(locale, …)` — this is the source of the desktop + mobile nav links; the JSX-site lines (`69/84/139`) are separate direct links. Then wrap every remaining internal `href={\`/...\`}` as `href={localePath(locale, \`/...\`)}`. Use each component's existing `locale` prop. Leave anchor (`#…`), `mailto:`, `tel:`, and external hrefs untouched.

- [ ] **Step 2: Verify** — `npm run typecheck` passes; this grep (catches BOTH JSX `href={`/...}` and object-literal `href: `/...`` forms) returns no un-wrapped internal links:

```bash
grep -nE "href: \`/|href=\{\`/" src/components/layout/*.tsx
```

Expected: every match is already inside a `localePath(...)` call (none bare).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/*.tsx
git commit -m "feat(i18n): locale-aware internal links in layout components"
```

---

### Task 6: Localize internal links in page files + booking/share

**Files:**
- `src/app/(frontend)/page.tsx:168,345,469` (`:345` is the journal link's truthy branch)
- `src/app/(frontend)/[loc]/page.tsx:183,189,221,272,347,391`
- `src/app/(frontend)/[loc]/activities/page.tsx:290,350,686,698`
- `src/app/(frontend)/[loc]/activities/[slug]/page.tsx:341,345,414,575`
- `src/app/(frontend)/[loc]/activities/[slug]/poster/page.tsx:307`
- `src/app/(frontend)/[loc]/journal/page.tsx:136`
- `src/app/(frontend)/[loc]/journal/[slug]/page.tsx:190,265`
- `src/components/booking/UpcomingSessionsList.tsx:146`
- ShareButton call sites: `activities/[slug]/page.tsx:423`, `activities/page.tsx:368`, `poster/page.tsx:218`

- [ ] **Step 1: Implement** — each page already resolves `locale`. Import `localePath`; wrap every internal `href` / `Link href` / `router.push` target and each ShareButton `url` prop in `localePath(locale, …)`. `UpcomingSessionsList` already accepts `locale` (`:36`, passed at `book/page.tsx:138`) — just wrap its href (`:146`). `ViewToggle`/`CalendarDayLink` append query to `usePathname()` and need NO change (prefix auto-preserved).

- [ ] **Step 2: Verify** — `npm run typecheck` passes; for EACH file above the grep must show no bare internal link (every match already inside `localePath(...)`):

```bash
grep -rnE "href=\{?\`/|push\(\`/|url=\{\`/" \
  "src/app/(frontend)/page.tsx" \
  "src/app/(frontend)/[loc]" \
  src/components/booking/UpcomingSessionsList.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(i18n): locale-aware links in pages, booking, and share targets"
```

---

### Task 7: Language switcher becomes a real <a href>

**Files:**
- Modify: `src/components/layout/LanguageToggle.tsx`

**Critical:** `useSearchParams()` in a component rendered inside the root layout
(`LanguageToggle` lives in `Header`) forces a Suspense boundary or `next build`
fails with "useSearchParams() should be wrapped in a suspense boundary." To keep
the fix self-contained (so no render site — Header/MobileNav — needs editing),
LanguageToggle **wraps its own `useSearchParams` reader in `<Suspense>`**.

- [ ] **Step 1: Implement** — the default export wraps an inner reader in Suspense:

```tsx
'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { swapLocalePath } from '@/lib/locale-url'

const TOGGLE_CLASS =
  'font-sans text-[11px] font-semibold tracking-[0.1em] text-ink-soft hover:text-ink cursor-pointer select-none transition-colors duration-150 bg-transparent border-none inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mx-2'

function ToggleLink({ current }: { current: Locale }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const next: Locale = current === 'zh-CN' ? 'en' : 'zh-CN'
  const qs = searchParams.toString()
  const href = swapLocalePath(pathname, next) + (qs ? `?${qs}` : '')

  return (
    <Link
      href={href}
      hrefLang={next === 'zh-CN' ? 'zh-CN' : 'en'}
      aria-label={current === 'zh-CN' ? 'Switch to English' : '切换到中文'}
      className={TOGGLE_CLASS}
    >
      {current === 'zh-CN' ? 'EN' : '中'}
    </Link>
  )
}

export default function LanguageToggle({ current }: { current: Locale }) {
  // Fallback renders the label statically so layout doesn't shift while
  // useSearchParams suspends; it has no href (rare, brief).
  return (
    <Suspense fallback={<span className={TOGGLE_CLASS}>{current === 'zh-CN' ? 'EN' : '中'}</span>}>
      <ToggleLink current={current} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify** — `npm run typecheck` passes; confirm `LanguageToggle` no longer references `/api/locale`. The real test is the `next build` in Task 11 (the Suspense error only surfaces there) — note this dependency.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/LanguageToggle.tsx
git commit -m "feat(i18n): language switcher is a crawlable <a href> preserving path+query"
```

---

## Chunk 3: SEO surfaces

### Task 8: Canonical + hreflang per-locale in all metadata

**Files:**
- Modify: `src/lib/metadata.ts`
- Modify: all 10 `generateMetadata` (portal, [loc] home, journal list/detail, book, contact, about, activities list/detail, poster)

- [ ] **Step 1: Implement metadata.ts** — add `x-default` support and keep absolute URLs. The callers will pass already-localized `url` and an `alternateLanguages` map. Update `buildMetadata` so `alternates.languages` always includes `x-default`:

```ts
// in buildMetadata, alternates block:
alternates: {
  canonical: opts.url,
  ...(opts.alternateLanguages
    ? { languages: { ...opts.alternateLanguages, 'x-default': opts.alternateLanguages['zh-CN'] } }
    : {}),
},
```

- [ ] **Step 2: Implement each generateMetadata** — replace the self-referential block. Pattern (using the page's `path`, e.g. `/${p.loc}/activities/${p.slug}`):

```ts
import { localizedUrl } from '@/lib/locale-url'
// ...
const path = `/${p.loc}/activities/${p.slug}` // page-specific
return buildMetadata({
  title, description,
  url: localizedUrl(locale, path, BASE),
  imageUrl,
  locale,
  alternateLanguages: {
    'zh-CN': localizedUrl('zh-CN', path, BASE),
    en: localizedUrl('en', path, BASE),
  },
})
```

Apply to all 10 files. The portal page uses `path = '/'`.

- [ ] **Step 3: Verify** — `npm run typecheck` passes; `grep -rn "alternateLanguages" src/app` shows every block now uses `localizedUrl` for both languages (no two identical strings).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(seo): per-locale canonical + hreflang + x-default in all metadata"
```

---

### Task 9: Localize JSON-LD URLs

**Files:**
- Modify: `src/app/(frontend)/[loc]/activities/[slug]/page.tsx` (Event + Breadcrumb URLs)
- Modify: `src/app/(frontend)/[loc]/journal/[slug]/page.tsx` (Breadcrumb URLs)
- Modify: `src/app/(frontend)/[loc]/page.tsx` (LocalBusiness `url`)

- [ ] **Step 1: Implement** — wrap every JSON-LD `url` / `item` / `organizer.url` / `offers.url` that points at this site in `localizedUrl(locale, path, BASE)`. Build each from a path then localize, e.g. `const activityUrl = localizedUrl(locale, \`/${locSlug}/activities/${activity.slug}\`, BASE)`. Breadcrumb crumbs (Network `/`, academy `/${locSlug}`, list, detail) each localized. `inLanguage` is already correct — leave it.

- [ ] **Step 2: Verify** — `npm run typecheck` passes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(seo): locale-aware URLs inside Event/Breadcrumb/LocalBusiness JSON-LD"
```

---

### Task 10: Sitemap dual-locale entries + llms.txt /en

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/llms.txt/route.ts`

- [ ] **Step 1: Implement sitemap** — for every path currently emitted, produce both a zh and an en entry, each carrying the same `alternates.languages` map. Add a helper inside the file:

```ts
import { localizedUrl } from '@/lib/locale-url'
// ...
function bothLocales(path: string, rest: Omit<MetadataRoute.Sitemap[number], 'url'>) {
  const languages = {
    'zh-CN': localizedUrl('zh-CN', path, BASE),
    en: localizedUrl('en', path, BASE),
  }
  return [
    { url: languages['zh-CN'], alternates: { languages }, ...rest },
    { url: languages.en, alternates: { languages }, ...rest },
  ]
}
```

Replace each `staticUrls.push({...})` with `staticUrls.push(...bothLocales(path, { lastModified, changeFrequency, priority }))`, where `path` is the unprefixed path (e.g. `/`, `/${slug}`, `/${locSlug}/activities/${act.slug}`).

- [ ] **Step 2: Implement llms.txt** — add an English academy block (links `/en/{slug}` paths) after the Chinese blocks, and list the `/en` portal under Key pages. Keep the Chinese content as-is.

- [ ] **Step 3: Verify** — `npm run typecheck` passes. (Output is validated in Task 11's build.)

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts src/app/llms.txt/route.ts
git commit -m "feat(seo): dual-locale sitemap with hreflang alternates; /en in llms.txt"
```

---

### Task 11: Poster QR locale + full regression

**Files:**
- Modify: `src/lib/poster-download.ts`
- Modify: `src/tests/poster-download.test.ts`
- Modify: poster page call site (`[loc]/activities/[slug]/poster/page.tsx:181`)

- [ ] **Step 1: Write the failing test** — add to `src/tests/poster-download.test.ts`:

```ts
it('encodes /en prefix for English posters', () => {
  expect(buildPosterQrTarget({
    base: 'https://x.com', locSlug: 'chiangmai', activitySlug: 'tea',
    occurrenceId: '5', locale: 'en',
  })).toBe('https://x.com/en/chiangmai/book?activity=tea&occ=5&src=poster')
})
it('leaves zh-CN posters unprefixed', () => {
  expect(buildPosterQrTarget({
    base: 'https://x.com', locSlug: 'chiangmai', activitySlug: 'tea',
    occurrenceId: null, locale: 'zh-CN',
  })).toBe('https://x.com/chiangmai/activities/tea')
})
```

- [ ] **Step 2: Run to verify failure**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/poster-download.test.ts`
Expected: FAIL — `locale` not accepted / no prefix.

- [ ] **Step 3: Implement** — add `locale: Locale` to the opts and build the path via `localePath`:

```ts
import { localePath } from './locale-url'
import type { Locale } from './i18n'
// opts gains `locale: Locale`
const prefix = (p: string) => `${base}${localePath(locale, p)}`
if (occurrenceId) {
  const params = new URLSearchParams({ activity: activitySlug, occ: occurrenceId, src: 'poster' })
  return `${prefix(`/${locSlug}/book`)}?${params.toString()}`
}
return prefix(`/${locSlug}/activities/${activitySlug}`)
```

Update the poster page call site to pass `locale`.

- [ ] **Step 4: Run to verify pass**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run src/tests/poster-download.test.ts`
Expected: PASS.

- [ ] **Step 5: Full regression**

Run: `HTTPS_PROXY="" HTTP_PROXY="" npx vitest run` → all pass.
Run: `HTTPS_PROXY="" HTTP_PROXY="" npm run typecheck` → clean.
Run: `HTTPS_PROXY="" HTTP_PROXY="" npm run build` → succeeds; confirm `/llms.txt` and sitemap build, no hydration warnings.

- [ ] **Step 6: Runtime smoke (pre-launch checklist)**

Start dev (`npm run dev`) and verify:
1. `/chiangmai` renders Chinese with full academy header/footer (unchanged).
2. `/en/chiangmai` renders English with full academy header/footer (NOT portal-degraded).
3. Language switcher is an `<a>`; clicking EN on `/chiangmai/activities` → `/en/chiangmai/activities` with query preserved; clicking 中 returns.
4. `/en/chiangmai/book?activity=x&occ=y&src=poster` → booking modal auto-opens (query survived rewrite).
5. View HTML source of `/en/chiangmai`: canonical = `/en/chiangmai`, hreflang has distinct zh/en/x-default, JSON-LD URLs carry `/en`.
6. A legacy unprefixed QR target `/chiangmai/book?...` still resolves 200.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(i18n): locale-aware poster QR; full i18n routing regression green"
```

---

## Done criteria

- All unit tests green; `typecheck` clean; `next build` succeeds.
- zh-CN URLs byte-identical to before (no 404 on any legacy link).
- English reachable at `/en/...` with correct header/footer, self-canonical, valid bidirectional hreflang, localized JSON-LD, and a crawlable `<a>` switcher.
- `jx-lang` cookie and `/api/locale` fully removed.
