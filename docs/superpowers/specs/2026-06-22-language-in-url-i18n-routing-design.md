# Language-in-URL i18n routing

Move locale selection from a cookie (`jx-lang`) into the URL so the English
version of every page lives at a distinct, crawlable address. zh-CN stays
unprefixed (existing URLs unchanged); English gets an `/en` path prefix.

## Problem

Today locale is decided by the `jx-lang` cookie (`src/lib/i18n.ts` →
`getLocale()` reads the cookie). The route segment `[loc]` is the **academy**
(bangkok / chiangmai / phuket), not the language. Consequences:

1. A crawler with no cookie always renders the default (zh-CN). The **entire
   English site is uncrawlable and unindexable** — there is no distinct URL
   for it.
2. Every page's `alternateLanguages` declares both `zh-CN` and `en` pointing
   at the **same** URL (e.g. `[loc]/activities/[slug]/page.tsx:73-77`), which
   is an invalid / self-contradictory hreflang annotation.
3. The language switcher (`LanguageToggle`) is a `<button>` that POSTs a
   cookie — there is **no `<a href>` in the DOM** pointing at the English
   version, so even Googlebot (via sitemap/hreflang) discovers it weakly, and
   LLM answer-engine crawlers (GPTBot / ClaudeBot / PerplexityBot) — which
   don't click buttons, don't reliably read hreflang, and often don't parse
   sitemap alternates — never see English content at all. This defeats the
   site's GEO goal.

This is the single structural SEO/GEO defect blocking English indexing. It was
deferred from the structured-data PR (#2) because it is an architectural change.

## Decisions taken during brainstorming

| # | Decision |
|---|----------|
| D1 | **URL scheme: zh-CN unprefixed + `/en` prefix.** `/chiangmai` stays Chinese (preserves all existing shared poster/email links and canonical); English is `/en/chiangmai`. zh-CN remains the default + self-canonical primary. |
| D2 | **Implementation: middleware rewrite + request header**, NOT a `[lang]` route segment. Middleware strips `/en` internally and injects `x-locale`; the route tree (`[loc]`) is **not** restructured, so `params.loc` and all `getLocationBySlug` calls are untouched. |
| D3 | **No Accept-Language auto-redirect.** `/` is always the Chinese portal, `/en` always English. Language changes only via the switcher (Google discourages auto-redirect; it also risks crawler mis-detection). |
| D4 | **Remove `jx-lang` cookie and `/api/locale`.** URL is the single source of truth. (Verified safe: Payload admin uses its own i18n and is excluded by the middleware matcher.) |
| D5 | **Language switcher becomes a real `<a href>`** to the locale-swapped path (preserving path + query), not a JS-only button — required for crawler/LLM discovery of English. |
| D6 | Rejected alternatives: `[lang]/[loc]/...` real segment (larger diff — every page gains `params.lang`, still needs middleware for the unprefixed default) and Next built-in `i18n` config (Pages-Router only, ignored under App Router). |

## Architecture

```
Request /en/chiangmai/activities?occ=5&src=poster
        │
        ▼
  middleware.ts
   • firstSegment === 'en' → locale = 'en'
   • NextResponse.rewrite( /chiangmai/activities?occ=5&src=poster )   (internal; address bar unchanged)
   • request headers:  x-locale = 'en'
                       x-pathname = '/chiangmai/activities'           (STRIPPED — server-side derivation)
        │
        ▼
  (frontend)/[loc]/activities/[slug]/page.tsx   ← params.loc === 'chiangmai' (unchanged)
   • getLocale() reads x-locale header → 'en'
   • generateMetadata: canonical + hreflang via localizedUrl(locale, path)
   • internal links via localePath(locale, href)
        │
        ▼
  Client components (Header/Footer/LocationChip/MobileNav)
   • usePathname() returns EXTERNAL '/en/chiangmai/activities' (with /en)
   • strip /en BEFORE deriving the academy slug
```

### Core mechanism (D2)

`NextResponse.rewrite(url, { request: { headers } })` is the official Next 15
App Router i18n pattern. The rewrite is internal — the browser address bar
keeps `/en/...`. Server components read the injected `x-locale` via
`headers()`. Because pages already read a dynamic API (`cookies()` today), they
are already `ƒ (Dynamic)` in the build output; switching to `headers()` keeps
them dynamic with **no new rendering regression** (no `generateStaticParams`,
no PPR in this project).

## Components

### 1. `src/middleware.ts` (extend existing)

Existing middleware only sets `x-pathname`. New behavior:

- Parse `pathname`. If the first segment is `en`:
  - `locale = 'en'`; compute `stripped` = pathname with `/en` removed
    (`/en` → `/`, `/en/chiangmai` → `/chiangmai`, `/en/opengraph-image`
    → `/opengraph-image`).
  - `NextResponse.rewrite` to `stripped` **preserving the query string**.
  - Set request headers `x-locale: 'en'` and `x-pathname: <stripped>`.
- Else: `locale = 'zh-CN'`; `x-locale: 'zh-CN'`, `x-pathname: <pathname>`
  (current behavior), no rewrite.
- **`x-pathname` always holds the STRIPPED (no-`/en`) path** so server-side
  `extractLocationSlug` works identically for both locales (D2 / review S6).
- **matcher**: extend the actual existing pattern
  `'/((?!api|_next|admin|favicon.ico|fonts|.*\\..*).*)'` (no `static` literal —
  it excludes `favicon.ico`, `fonts`, and any dotted path). Convention routes
  that lack a file extension still hit the matcher — `opengraph-image` has no
  dot, so the strip logic must map `/en/opengraph-image` → `/opengraph-image`
  (it does, via blind first-segment strip). `sitemap.xml` / `robots.txt` /
  `llms.txt` contain a dot (`.*\\..*`) and stay excluded; they emit both-locale
  URLs themselves (see §6).

### 2. `src/lib/i18n.ts` — `getLocale()`

Change from reading the `jx-lang` cookie to reading the `x-locale` header
(fallback `DEFAULT_LOCALE`). All 21 `await getLocale()` invocations across 12
files keep their call site unchanged. Remove the cookie constant.

### 3. `src/lib/i18n.ts` (or a small new module) — URL helpers

- `localePath(locale, path)` — relative internal hrefs: `en` → `/en` + path,
  `zh-CN` → path unchanged. Handles `path === '/'` → `/en`.
- `localizedUrl(locale, path)` — absolute (`BASE` + `localePath`) for
  canonical / hreflang / sitemap / JSON-LD.
- `stripLocale(pathname)` — remove a leading `/en` segment; used by client
  components reading `usePathname()`.
- `swapLocalePath(pathname, nextLocale)` — for the switcher: strip then
  re-apply the target prefix, preserving the rest.

Centralizing here prevents the 10-file `alternateLanguages` drift from
recurring.

### 4. Internal links → locale-aware (review S2)

All internal `Link href` / `router.push` / `redirect` / share URLs wrapped in
`localePath(locale, …)`. Inventory (~25+ sites) to treat as a checklist:

- Layout: `Header.tsx:69,84,139`; `Footer.tsx:166,188,202`;
  `LocationChip.tsx:106,125`; `MobileNav.tsx:92`
- Portal/home: `(frontend)/page.tsx:168,469`
- Academy home: `[loc]/page.tsx:183,189,221,272,347,391`
- Activities list: `[loc]/activities/page.tsx:290,350,686,698`
- Activity detail: `[loc]/activities/[slug]/page.tsx:341,345,414,575`
- Poster: `[loc]/activities/[slug]/poster/page.tsx:307`
- Journal: `[loc]/journal/page.tsx:136`; `[loc]/journal/[slug]/page.tsx:190,265`
- Booking: `components/booking/UpcomingSessionsList.tsx:146`
- ShareButton call sites: `activities/[slug]/page.tsx:423`,
  `activities/page.tsx:368`, `poster/page.tsx:218`

`ViewToggle` / `CalendarDayLink` append query to the **current** `usePathname()`
(prefix auto-preserved) — verified safe, no change.

### 5. Client academy derivation → strip `/en` first (review B1/S1 — top risk)

`usePathname()` returns the external path **with** `/en`. Before taking the
first segment to find the academy, strip the prefix:

- `Header.tsx:56-59`, `Footer.tsx:35-38` — use `stripLocale(pathname)` then
  `.split('/')[1]`. (`LocationChip` receives `current` as a prop from Header
  and does not call `usePathname()` itself — fixing Header covers it; it only
  needs the §4 `href` change.)
- `src/lib/current-location.ts` `extractLocationSlug` — strip a leading `en`
  segment (server-side it receives the already-stripped `x-pathname`, but
  harden it and add a `/en/...` unit test).

If skipped, every English page's header/footer degrades to portal state and
SSR/CSR disagree → hydration mismatch. This is the single most-likely-missed
fix.

### 6. SEO surfaces

- **`buildMetadata` / all 10 `generateMetadata`** (portal, [loc] home, journal
  list, journal detail, book, contact, about, activities list, activities
  detail, **poster**): `url` (canonical) =
  `localizedUrl(locale, path)` (self-canonical per language);
  `alternateLanguages` = `{ 'zh-CN': localizedUrl('zh-CN', path),
  en: localizedUrl('en', path) }`; add `x-default` → zh version (portal `/`
  x-default may point to the neutral portal). `openGraph.url` matches canonical.
- **JSON-LD** (`activities/[slug]/page.tsx` Event/Breadcrumb,
  `jsonld.ts` LocalBusiness/Breadcrumb call sites): all `url` /
  `organizer.url` / `offers.url` / breadcrumb `item` use
  `localizedUrl(locale, …)`. `inLanguage` already correct.
- **`sitemap.ts`**: every page emits a zh entry and an `/en` entry; **both**
  carry the same `alternates.languages` (`zh-CN`, `en`). Language codes
  match the app exactly (`en`, `zh-CN`) — no `en-US`. Absolute URLs only.
- **`llms.txt/route.ts`**: add an English academy block linking `/en/{slug}`
  and list the `/en` portal under Key pages.
- **`opengraph-image.tsx`**: intentionally locale-neutral (Latin-only brand
  fallback, no URLs) — no change needed; it serves both locales.

### 7. Language switcher (D4/D5)

`LanguageToggle` rewritten:

- Render a real `<a href={swapLocalePath(usePathname(), next)}>` (preserving
  `useSearchParams()` query), not a button + fetch.
- Remove the `fetch('/api/locale')` + `router.refresh()` path.
- Delete `src/app/api/locale/route.ts` and all `jx-lang` references.

## Error handling / edge cases

- `/en` (bare) → portal English (`/`). Guard the empty-after-strip case.
- Unknown first segment that isn't `en` and isn't a location slug → falls
  through to existing `[loc]` 404 handling (`notFound()` on
  `!LOCATION_SLUGS.includes`).
- Query preservation through rewrite: `/en/chiangmai/book?activity=x&occ=y&src=poster`
  → `searchParams` must arrive intact (autoOpen modal depends on it,
  `book/page.tsx:139-143`).
- Poster QR (`buildPosterQrTarget` in `src/lib/poster-download.ts`): add a
  `locale` param so English posters encode `/en/...`. Chinese posters
  unchanged. Old printed QRs (unprefixed) still resolve 200 (zh route kept).

## Testing

- `current-location.test.ts`: add `extractLocationSlug('/en/chiangmai')`
  → `chiangmai` cases.
- New `middleware.test.ts`: en/zh/root/`/en`/`/en/opengraph-image`/static-exclusion/
  query-passthrough → correct rewrite target + `x-locale` + `x-pathname`.
- New unit tests for `localePath` / `localizedUrl` / `stripLocale` /
  `swapLocalePath`.
- `poster-download.test.ts`: update if QR builder gains a locale arg.
- Regression: full `vitest run` + `next build` (confirm `/en/...` routes,
  sitemap dual entries, no hydration warnings).
- The default-template e2e specs (`tests/e2e/*`) already fail pre-change
  (assert "Payload Blank Template") — out of scope, note only.

## Backward compatibility ✅

zh-CN keeps unprefixed URLs, so **all existing shared links (poster QR codes,
`/admin` paths in emails) stay valid (no 404)**. ICS files and email bodies
contain no public site URLs (only `mailto:` / `/admin`), so they are
unaffected regardless of locale. Payload admin selects language via its own
i18n and is excluded by the matcher — removing `jx-lang` does not affect it.

## Pre-launch checklist

1. Client academy derivation strips `/en` (Header/Footer/LocationChip/
   `extractLocationSlug`) — else English header/footer break + hydration
   mismatch.
2. Every internal link from the §4 inventory wrapped in `localePath`
   (incl. ShareButton call sites, poster QR, book-jump query links).
3. `LanguageToggle` rewritten to a real `<a>` preserving path + query; no
   `/api/locale`.
4. `getLocale()` reads `x-locale`; verify every RSC page/layout locale matches
   the URL prefix.
5. `x-pathname` holds the stripped path; `extractLocationSlug` `/en` unit test
   added.
6. All 10 `generateMetadata` (incl. poster) canonical + hreflang per-locale via
   `localizedUrl` (+ x-default); JSON-LD URLs localized.
7. `buildPosterQrTarget` takes locale; old unprefixed QR still 200.
8. Verify one real legacy QR (`/chiangmai/book?...`) resolves unchanged.
9. Query passthrough: `/en/chiangmai/book?activity=x&occ=y&src=poster`
   `searchParams` intact after rewrite.
10. Middleware matcher still excludes `api|_next|admin|static`; `/en/opengraph-image`
    maps correctly.
11. `sitemap.ts` emits `/en` entries with `alternates.languages`;
    `llms.txt` lists `/en`.
```
