# 静心学堂 · 泰国 v1 实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1 of the Chiang Mai Jingxin Academy bilingual marketing + bookings website, deployed to Vercel and reachable on a `.com` domain.

**Architecture:** Single-codebase Payload CMS v3 (built on Next.js 15 App Router) running the public site and admin together. Postgres on Neon for relational data, Cloudflare R2 for media, Gmail SMTP for transactional email, Cloudflare Turnstile for anti-spam, Sentry for error monitoring.

**Tech Stack:**
- Payload CMS v3 + Next.js 15 (App Router, RSC)
- TypeScript (strict), Tailwind CSS, shadcn-style primitives (hand-rolled, no library)
- Postgres via Payload's `@payloadcms/db-postgres` adapter
- Cloudflare R2 via `@payloadcms/storage-s3`
- Vitest for unit/integration, Playwright for one end-to-end smoke
- `nodemailer` over Gmail SMTP for email (no Resend; spec decision §A.10)
- Anthropic SDK (Claude Haiku) for the translation-helper button

**Spec reference:** `docs/superpowers/specs/2026-05-11-jingxin-academy-site-design.md`

**Pivot note (2026-05-12):** After Chunks 1 and 2 merged, the project pivoted from a single-academy site (清迈静心学堂) to a three-academy network (静心学堂 · 泰国 / Mindfulpeace Academy Thailand: 曼谷如如、清迈心灯、普吉). All subsequent Chunks (2.5 onward) reflect the multi-academy architecture per the updated spec. Chunks 1 and 2 are preserved as-merged; Chunk 2.5 retrofits the Locations collection and data model to support the network.

**Working directory:** `/Users/ziweiduan/jingxin-academy-site` — already a git repo with the prototype (`index.html`, `app.js`, `styles.css`) and the spec committed.

**Execution principles:**
- TDD on logic-heavy code: capacity calculation, concurrency, i18n fallback, time zones, email queue. Skip TDD on UI scaffolding and Payload schema configuration where the framework already enforces correctness.
- One file, one responsibility. Files that change together live together.
- Frequent commits — every passing task is a commit. Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- After every chunk: run all tests, `pnpm typecheck`, `pnpm build`. Don't proceed if any fail.
- Never commit `.env*` files. Use `.env.example` for documented placeholders.

---

## Chunk overview

| # | Name | Goal | Roughly |
|---|---|---|---|
| 1 | Foundation | Scaffold + local DB + admin login works | ~ ½ day |
| 2 | Data model | All collections, globals, roles | ~ 1 day |
| 2.5 | Locations & multi-academy retrofit | Add Locations collection, location field to Activities/Journal/Reservations, re-seed | ~ ½ day |
| 3 | Reservation engine | Capacity, concurrency, Turnstile, email queue | ~ 1 day |
| 4 | Public shell | Layout, nav with **location switcher**, i18n switch, footer with **network column** | ~ ½ day |
| 5 | Content pages | **Portal home + per-location** Home, About, Contact | ~ 1 day |
| 6 | Activities + journal | Calendar, list, detail, journal — **all routes prefixed with `[locationSlug]`** | ~ 1 day |
| 7 | Booking UX | `/[loc]/book`, form with **academy radio in general inquiry**, success/waitlist, shareable links | ~ 1 day |
| 8 | Admin polish | Dashboard cards, translation helper, badge, CSV | ~ 1 day |
| 9 | SEO + deploy | sitemap **across all 3 academies**, og, schema.org, Vercel/Neon/R2/domain (`mindfulpeaceth.com`) | ~ 1 day |

Each chunk produces working, demoable software. Stop at any chunk boundary if priorities shift.

---

## Chunk 1: Foundation

**Goal:** A Payload v3 + Next.js project running locally with admin login working, Tailwind set up with the spec's color tokens, i18n configured, prototype moved aside, and Vitest scaffolded with one green smoke test.

**Files affected:**
- Move: `index.html`, `app.js`, `styles.css` → `_prototype/`
- Create: full Payload + Next.js scaffold (many files; see Step 1.2)
- Create: `tailwind.config.ts`, `src/styles/tokens.css`
- Create: `vitest.config.ts`, `src/tests/smoke.test.ts`
- Create: `.env.example`, `.env.local`
- Create: `README.md`

### Task 1.1 — Move prototype aside

- [ ] **Step 1: Create `_prototype/` and move files**

```bash
mkdir _prototype
git mv index.html app.js styles.css _prototype/
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: archive prototype files into _prototype/"
```

### Task 1.2 — Scaffold Payload v3

- [ ] **Step 1: Initialize Payload (using the official template via npx)**

```bash
npx create-payload-app@latest jingxin-tmp --template blank --db postgres --use-pnpm --no-deps
```

We use the temp name `jingxin-tmp` to avoid collision with the cwd, then move files in.

- [ ] **Step 2: Move scaffolded files into the project root**

```bash
shopt -s dotglob
mv jingxin-tmp/* .
rmdir jingxin-tmp
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 4: Add additional packages**

```bash
pnpm add @payloadcms/storage-s3 @payloadcms/plugin-form-builder \
  nodemailer @types/nodemailer \
  @anthropic-ai/sdk \
  date-fns date-fns-tz \
  zod \
  tailwindcss postcss autoprefixer \
  @sentry/nextjs
pnpm add -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/jest-dom \
  prettier eslint-config-prettier \
  playwright
```

- [ ] **Step 5: Verify project layout**

```bash
ls -la src/
# should show: app/  collections/  globals/  payload.config.ts
```

- [ ] **Step 6: Commit scaffold**

```bash
git add -A
git commit -m "feat: scaffold Payload v3 + Next.js project"
```

### Task 1.3 — Local Postgres

- [ ] **Step 1: Create `docker-compose.yml` for local Postgres**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: jingxin
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: jingxin
    ports: ["5433:5432"]
    volumes:
      - jingxin-pgdata:/var/lib/postgresql/data

volumes:
  jingxin-pgdata:
```

Port 5433 to avoid clash with system Postgres.

- [ ] **Step 2: Start it**

```bash
docker compose up -d
```

- [ ] **Step 3: Create `.env.example` and `.env.local`**

`.env.example`:

```env
# Database
DATABASE_URI=postgres://jingxin:dev@localhost:5433/jingxin

# Payload
PAYLOAD_SECRET=<openssl rand -hex 32>
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Email (Gmail SMTP)
GMAIL_USER=
GMAIL_APP_PASSWORD=
ADMIN_EMAIL=

# Cloudflare R2 (prod only; in dev we use local disk)
S3_BUCKET=
S3_REGION=auto
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Cloudflare Turnstile
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Anthropic (translation helper)
ANTHROPIC_API_KEY=

# Sentry (optional in dev)
SENTRY_DSN=
```

`.env.local` copies `.env.example` with real values filled in.

- [ ] **Step 4: Commit `.env.example` only**

```bash
git add .env.example docker-compose.yml
git commit -m "chore: add local Postgres compose + env example"
```

### Task 1.4 — Verify admin works

- [ ] **Step 1: Open `src/payload.config.ts` and confirm DB adapter**

The scaffold should already have `postgresAdapter` configured against `DATABASE_URI`. If not, ensure it does. Key snippet to verify:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'

export default buildConfig({
  // ...
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI! } }),
})
```

- [ ] **Step 2: Run the app**

```bash
pnpm dev
```

Expected: Next.js starts on port 3000, Payload generates types on first boot, admin reachable at `http://localhost:3000/admin`.

- [ ] **Step 3: Create the first admin user**

Open `http://localhost:3000/admin` — Payload's first-run flow asks you to create an admin user. Use the user's real email; password can be anything memorable (will be reset for production).

- [ ] **Step 4: Verify login → dashboard renders**

After signup, you should land on the admin dashboard with no collections yet. This proves the stack is alive.

- [ ] **Step 5: Stop server, commit nothing (no code changed)**

### Task 1.5 — Vitest scaffold

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/tests/setup.ts'],
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 2: Create `src/tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add npm script**

In `package.json`, under `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Write the smoke test**

`src/tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('smoke', () => {
  it('arithmetic still works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run it**

```bash
pnpm test
```

Expected: 1 passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add vitest with smoke test"
```

### Task 1.6 — Tailwind + theme tokens

- [ ] **Step 1: Initialize Tailwind**

```bash
pnpm dlx tailwindcss init -p
```

- [ ] **Step 2: Configure `tailwind.config.ts`** with the spec's color tokens

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F1ECE0',
        teak: '#3C2E22',
        cocoa: '#2A211A',
        moss: '#5C6A48',
        amber: '#A87544',
        smoke: '#7A6F62',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 3: Create `src/styles/tokens.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { font-family: theme('fontFamily.sans'); color: theme('colors.cocoa'); background: theme('colors.cream'); }
  :lang(zh) { font-family: theme('fontFamily.serif'); }
  body { line-height: 1.65; }
  h1, h2, h3 { font-family: theme('fontFamily.serif'); color: theme('colors.cocoa'); }
}
```

- [ ] **Step 4: Import tokens in root layout**

Open `src/app/(frontend)/layout.tsx` (or whatever the scaffold created for the public root) and add:

```tsx
import '../../styles/tokens.css'
```

- [ ] **Step 5: Add fonts in `<head>`** via Next.js `next/font/google`

```tsx
import { Manrope, Noto_Serif_SC } from 'next/font/google'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' })
const notoSerifSc = Noto_Serif_SC({ subsets: ['chinese-simplified'], weight: ['400','500','700'], variable: '--font-serif' })
```

Apply variables on `<html className={`${manrope.variable} ${notoSerifSc.variable}`}>`.

- [ ] **Step 6: Sanity check** — visit `/`, see cream background.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: tailwind setup with brand tokens and bilingual fonts"
```

### Task 1.7 — i18n in Payload

- [ ] **Step 1: Edit `src/payload.config.ts`** to enable two locales

```ts
export default buildConfig({
  // ...
  localization: {
    locales: [
      { label: '中文', code: 'zh-CN' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'zh-CN',
    fallback: true, // built-in zh-CN fallback per §6.2
  },
})
```

- [ ] **Step 2: Restart `pnpm dev`, log in, verify the locale switcher appears top-right of the admin UI.**

- [ ] **Step 3: Commit**

```bash
git add src/payload.config.ts
git commit -m "feat: enable zh-CN + en locales with zh-CN fallback"
```

### Task 1.8 — README

- [ ] **Step 1: Write a short `README.md`** with:
  - Project name + one-line summary
  - Quickstart: `docker compose up -d && pnpm install && cp .env.example .env.local && pnpm dev`
  - Where the spec and plan live
  - Tech stack list

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README"
```

### Chunk 1 acceptance

Run all the following and they must succeed before moving on:

```bash
pnpm typecheck   # passes
pnpm test        # 1 passing
pnpm build       # passes (no production server required)
pnpm dev         # admin reachable at /admin, login works
```

Tag this milestone:

```bash
git tag -a v0.1.0-foundation -m "Chunk 1: foundation complete"
```

---

## Chunk 2: Data model

**Goal:** All 5 Payload collections and 4 globals from §6 of the spec implemented and accessible from the admin UI, with role-based access enforced. Seed data for first-run.

**Files affected:**
- Create: `src/collections/Users.ts`, `Media.ts`, `Categories.ts`, `Activities.ts`, `Journal.ts`, `Reservations.ts`
- Create: `src/globals/Home.ts`, `About.ts`, `Contact.ts`, `Settings.ts`
- Create: `src/access/index.ts` (shared role predicates)
- Create: `src/lib/slugify.ts`
- Create: `src/seed.ts`
- Modify: `src/payload.config.ts` (register all collections + globals)

### Task 2.1 — Users with roles

- [ ] **Step 1: Create access predicates** at `src/access/index.ts`

```ts
import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
export const isAdminOrStaff: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'
export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
export const denyAll: Access = () => false
```

- [ ] **Step 2: Replace the auto-generated `Users.ts`** with the role-aware version

```ts
// src/collections/Users.ts
import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'role', 'name'] },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: isAdmin,
    update: ({ req, id }) =>
      req.user?.role === 'admin' || req.user?.id === id, // staff can edit self only
    delete: isAdmin,
    admin: ({ req }) => Boolean(req.user), // both roles can see admin
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'staff',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Staff', value: 'staff' },
      ],
      access: { update: ({ req }) => req.user?.role === 'admin' },
    },
  ],
}
```

- [ ] **Step 3: Add Users to `payload.config.ts` collections array**

- [ ] **Step 4: Restart, verify in admin UI: Users → New User shows the role field; staff users can't change their own role.**

- [ ] **Step 5: Test — role predicate unit tests**

`src/tests/access.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isAdmin, isAdminOrStaff, isLoggedIn } from '../access'

const ctx = (user?: any) => ({ req: { user } }) as any

describe('access predicates', () => {
  it('isAdmin requires admin role', () => {
    expect(isAdmin(ctx({ role: 'admin' }))).toBe(true)
    expect(isAdmin(ctx({ role: 'staff' }))).toBe(false)
    expect(isAdmin(ctx())).toBe(false)
  })
  it('isAdminOrStaff accepts both', () => {
    expect(isAdminOrStaff(ctx({ role: 'admin' }))).toBe(true)
    expect(isAdminOrStaff(ctx({ role: 'staff' }))).toBe(true)
    expect(isAdminOrStaff(ctx())).toBe(false)
  })
  it('isLoggedIn checks presence', () => {
    expect(isLoggedIn(ctx({ role: 'staff' }))).toBe(true)
    expect(isLoggedIn(ctx())).toBe(false)
  })
})
```

Run `pnpm test`, expect 3 passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(users): role-based access with admin/staff roles"
```

### Task 2.2 — Media with image-only constraints

- [ ] **Step 1: Create `src/collections/Media.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 240, height: 240, fit: 'cover' },
      { name: 'card', width: 720, fit: 'inside' },
      { name: 'hero', width: 1600, fit: 'inside' },
      { name: 'og', width: 1200, height: 630, fit: 'cover' },
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
    adminThumbnail: 'thumbnail',
  },
  access: {
    read: () => true,
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: isAdminOrStaff,
  },
  fields: [
    { name: 'alt', type: 'text', localized: true, required: true },
    {
      name: 'isPlaceholder',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Mark Unsplash/stock placeholders so they can be reviewed before launch' },
    },
  ],
}
```

Note: file size limit is enforced via Payload's `upload.staticDir` config combined with Next.js body-size limit; we'll configure `bodyParser` cap in `next.config.mjs` later (Chunk 9).

- [ ] **Step 2: Register Media in `payload.config.ts`**

- [ ] **Step 3: Verify in admin: Media → Upload, try an image, see thumbnails generated.**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(media): image-only uploads with multi-size pipeline"
```

### Task 2.3 — Categories with delete protection

- [ ] **Step 1: Create slug helper** at `src/lib/slugify.ts`

```ts
export function slugify(input: string): string {
  return input
    .normalize('NFKD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().trim()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

Test it:

`src/tests/slugify.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slugify } from '../lib/slugify'

describe('slugify', () => {
  it('lowercases and dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('handles diacritics', () => {
    expect(slugify('Café')).toBe('cafe')
  })
  it('keeps Chinese characters', () => {
    expect(slugify('静心 学堂')).toBe('静心-学堂')
  })
  it('trims dashes', () => {
    expect(slugify('  --hi--  ')).toBe('hi')
  })
})
```

Run `pnpm test` — 4 new passing.

- [ ] **Step 2: Create `src/collections/Categories.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'
import { slugify } from '../lib/slugify'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'order'] },
  access: {
    read: () => true,
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: isAdminOrStaff,
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'slug', type: 'text', required: true, unique: true, index: true,
      hooks: {
        beforeValidate: [
          ({ value, data }) => value || slugify(data?.name ?? ''),
        ],
      },
    },
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
  hooks: {
    beforeDelete: [
      async ({ req, id }) => {
        const inUse = await req.payload.find({
          collection: 'activities',
          where: { category: { equals: id } },
          limit: 1,
        })
        if (inUse.totalDocs > 0) {
          throw new Error(
            '该类别下还有活动,无法删除。请先把使用该类别的活动改成别的类别。',
          )
        }
      },
    ],
  },
}
```

- [ ] **Step 3: Register Categories. Restart admin, create one, try to delete it (works); create an activity using it later, deletion should refuse.**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(categories): localized categories with delete protection"
```

### Task 2.4 — Activities (without occurrences yet)

- [ ] **Step 1: Create `src/collections/Activities.ts`** (occurrences stubbed as empty array)

```ts
import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'
import { slugify } from '../lib/slugify'

export const Activities: CollectionConfig = {
  slug: 'activities',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'category'] },
  access: {
    read: ({ req }) => {
      if (req.user) return true // staff/admin see drafts too
      return { status: { equals: 'published' } }
    },
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: isAdminOrStaff,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug', type: 'text', required: true, unique: true, index: true,
      hooks: {
        beforeValidate: [
          ({ value, data }) => value || slugify(data?.title ?? ''),
        ],
      },
    },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media', required: true },
    { name: 'gallery', type: 'array', fields: [{ name: 'image', type: 'upload', relationTo: 'media' }] },
    { name: 'shortDesc', type: 'textarea', localized: true, required: true, maxLength: 240 },
    { name: 'description', type: 'richText', localized: true },
    { name: 'location', type: 'text', localized: true, defaultValue: { 'zh-CN': '学堂', en: 'At the academy' } },
    { name: 'capacity', type: 'number', required: true, min: 1 },
    { name: 'notes', type: 'richText', localized: true },
    {
      name: 'occurrences', type: 'array', // populated in Task 2.5
      fields: [
        { name: 'startAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'endAt',   type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'capacityOverride', type: 'number', min: 1 },
        {
          name: 'status', type: 'select', required: true, defaultValue: 'open',
          options: [
            { label: 'Open',      value: 'open' },
            { label: 'Full',      value: 'full' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Deleted',   value: 'deleted' },
          ],
        },
        { name: 'internalNotes', type: 'textarea' },
      ],
    },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'draft',
      options: [
        { label: 'Draft',     value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived',  value: 'archived' },
      ],
    },
    { name: 'seoTitle',       type: 'text',     localized: true, admin: { position: 'sidebar' } },
    { name: 'seoDescription', type: 'textarea', localized: true, admin: { position: 'sidebar' } },
  ],
  hooks: {
    beforeValidate: [
      // Publish-time bilingual validator (spec §6.2):
      //   when status=published, title and shortDesc must have BOTH locales filled.
      async ({ data, originalDoc, operation, req }) => {
        const incomingStatus = data?.status ?? originalDoc?.status
        if (incomingStatus !== 'published') return data
        // Fetch each locale's value via Payload's helper if not on data.
        const id = (data as any)?.id ?? originalDoc?.id
        if (!id) return data // first-create draft; will re-run on publish
        const [zh, en] = await Promise.all([
          req.payload.findByID({ collection: 'activities', id, locale: 'zh-CN' }),
          req.payload.findByID({ collection: 'activities', id, locale: 'en' }),
        ])
        const missing: string[] = []
        if (!zh?.title || !en?.title) missing.push('title')
        if (!zh?.shortDesc || !en?.shortDesc) missing.push('shortDesc')
        if (missing.length) {
          throw new Error(
            `发布需要中英文都填:${missing.join(', ')}。请在右上角切换语言后补全。`,
          )
        }
        return data
      },
    ],
    beforeChange: [
      // Occurrence soft-delete enforcement (spec §6.1):
      // If staff removes an occurrence row from the array, we re-insert it
      // with status='deleted' instead of allowing hard deletion.
      async ({ data, originalDoc }) => {
        if (!originalDoc?.occurrences) return data
        const newOccs = data?.occurrences ?? []
        const newIds = new Set(newOccs.map((o: any) => o.id).filter(Boolean))
        const removed = originalDoc.occurrences.filter((o: any) => o.id && !newIds.has(o.id))
        if (removed.length > 0) {
          data.occurrences = [
            ...newOccs,
            ...removed.map((o: any) => ({ ...o, status: 'deleted' })),
          ]
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        const inUse = await req.payload.find({
          collection: 'reservations',
          where: {
            and: [
              { activity: { equals: id } },
              { status: { in: ['pending', 'confirmed', 'waitlist'] } },
            ],
          },
          limit: 1,
        })
        if (inUse.totalDocs > 0) {
          throw new Error('该活动有预约记录,无法删除。请改为归档(status=archived)。')
        }
      },
    ],
  },
}
```

- [ ] **Step 2: Register Activities. Restart, create a draft activity in admin to verify the schema renders. Try to publish with only Chinese title — expect rejection.**

- [ ] **Step 2.5: Test the occurrence soft-delete hook manually** — create an activity with 2 occurrences, save, then remove the second occurrence row, save again. Expected: the second occurrence reappears with `status=deleted` (visible but marked).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(activities): collection with occurrences array and delete protection"
```

### Task 2.5 — Occurrence quick-add UI helpers

Payload supports custom React components on fields. The three quick-add helpers (single / weekly / multi-day) are best implemented as **three sibling buttons above the `occurrences` array** that mutate the form state.

- [ ] **Step 1: Create the component** at `src/admin/components/OccurrenceQuickAdd.tsx`

This is a non-trivial component. Use Payload's `useField` and `useAllFormFields` from `@payloadcms/ui`. Pseudocode-level outline:

```tsx
'use client'
import { Button } from '@payloadcms/ui'
import { useField, useAllFormFields } from '@payloadcms/ui'
import { addDays, eachWeekOfInterval, set } from 'date-fns'

export default function OccurrenceQuickAdd() {
  const { value: occurrences, setValue } = useField<any[]>({ path: 'occurrences' })

  const addSingle = () => { /* prompt for start/end, push to array */ }
  const generateWeekly = () => { /* dialog: days-of-week + time + date range; loop and push */ }
  const addMultiDay   = () => { /* dialog: start/end date; push one occurrence */ }

  return (
    <div className="flex gap-2 mb-4">
      <Button onClick={addSingle}>+ 单次</Button>
      <Button onClick={generateWeekly}>+ 周期生成</Button>
      <Button onClick={addMultiDay}>+ 多日整块</Button>
    </div>
  )
}
```

Full implementation will use a small modal (or inline prompts) for the form inputs. Keep it pragmatic — even three `window.prompt()` calls would work in v1; we can replace with proper modals later.

- [ ] **Step 2: Wire the component into the field config** in `Activities.ts`

```ts
{ name: 'occurrences', type: 'array',
  admin: { components: { RowLabel: undefined, /* Header? */ } },
  // ...
},
```

Payload v3 allows custom components per array field via `admin.components.afterInput` on the wrapping field — exact API depends on Payload v3 version. Check Payload docs (`/payload-cms-docs.txt`) at execution time.

- [ ] **Step 3: Test by hand** — add a single occurrence, then generate 4 weeks of Tuesday 7:00–8:00 sessions, then a multi-day Oct 1–Oct 7 block.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(activities): quick-add helpers for single/weekly/multi-day occurrences"
```

### Task 2.6 — Journal

- [ ] **Step 1: Create `src/collections/Journal.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'
import { slugify } from '../lib/slugify'

export const Journal: CollectionConfig = {
  slug: 'journal',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'date', 'status'] },
  access: {
    read: ({ req }) => req.user ? true : { status: { equals: 'published' } },
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: isAdminOrStaff,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug', type: 'text', required: true, unique: true, index: true,
      hooks: { beforeValidate: [({ value, data }) => value || slugify(data?.title ?? '')] },
    },
    { name: 'date', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'relatedActivity', type: 'relationship', relationTo: 'activities' },
    { name: 'coverImage', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'photos', type: 'array', minRows: 1, required: true,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', localized: true },
      ],
    },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
}
```

- [ ] **Step 2: Register and verify in admin.**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(journal): photo journal collection"
```

### Task 2.7 — Reservations collection (no business logic yet)

The business logic (capacity, concurrency, Turnstile, email) lives in Chunk 3. This task just creates the schema.

- [ ] **Step 1: Create `src/collections/Reservations.ts`**

```ts
import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'

export const Reservations: CollectionConfig = {
  slug: 'reservations',
  // Disable the auto-generated REST + GraphQL endpoints so the only way to
  // create a reservation is via our hardened /api/reservations route.
  // Admins still create via the admin UI (which uses the local API,
  // not the disabled endpoints).
  disableDuplicate: true,
  endpoints: false,
  graphQL: false,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['createdAt', 'name', 'activity', 'status'],
    listSearchableFields: ['name', 'email', 'wechatId', 'phone'],
  },
  access: {
    read: isAdminOrStaff,
    // Allow Local API (server-side) create; deny REST. Our route uses
    // payload.create which bypasses access by default (calls overrideAccess:true).
    // For admin UI manual creation, require logged-in admin/staff.
    create: ({ req }) => Boolean(req.user && (req.user.role === 'admin' || req.user.role === 'staff')) || Boolean(req.context?.internal),
    update: isAdminOrStaff,
    delete: () => false, // hard-delete forbidden; soft-delete via status change
  },
  fields: [
    {
      name: 'source', type: 'select', required: true, defaultValue: 'activity_detail',
      options: [
        'home_cta', 'nav_book', 'book_list',
        'book_general_inquiry', 'activity_detail', 'shared_link',
      ].map(v => ({ label: v, value: v })),
    },
    { name: 'activity',     type: 'relationship', relationTo: 'activities' },
    { name: 'occurrenceId', type: 'text' },
    { name: 'name',     type: 'text',  required: true },
    { name: 'email',    type: 'email' },
    { name: 'wechatId', type: 'text' },
    { name: 'phone',    type: 'text',  required: true },
    { name: 'guests',   type: 'number', required: true, defaultValue: 1, min: 1, max: 10 },
    {
      name: 'direction', type: 'select',
      admin: { condition: data => !data?.activity },
      options: ['meditation', 'mindfulness', 'one_on_one', 'visit', 'other']
        .map(v => ({ label: v, value: v })),
    },
    { name: 'notes',    type: 'textarea' },
    {
      name: 'language', type: 'select', required: true, defaultValue: 'zh',
      options: [{ label: '中文', value: 'zh' }, { label: 'English', value: 'en' }],
    },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending',
      options: ['pending', 'confirmed', 'waitlist', 'cancelled', 'deleted']
        .map(v => ({ label: v, value: v })),
    },
    { name: 'emailStatus', type: 'select', defaultValue: 'pending',
      options: ['pending', 'sent', 'failed', 'no_email'].map(v => ({ label: v, value: v })),
    },
    { name: 'confirmedAt', type: 'date', admin: { readOnly: true } },
    { name: 'confirmedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'deletedAt',   type: 'date', admin: { readOnly: true } },
    { name: 'deletedBy',   type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'internalNotes', type: 'textarea' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        if (operation === 'update' && data.status !== originalDoc?.status) {
          if (data.status === 'confirmed' && !originalDoc?.confirmedAt) {
            data.confirmedAt = new Date().toISOString()
            data.confirmedBy = req.user?.id
          }
          if (data.status === 'deleted') {
            data.deletedAt = new Date().toISOString()
            data.deletedBy = req.user?.id
          }
        }
        return data
      },
    ],
  },
}
```

- [ ] **Step 2: Register; verify admin renders the schema.**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(reservations): collection schema (logic in chunk 3)"
```

### Task 2.8 — Globals

- [ ] **Step 1: Create the 4 globals**

`src/globals/Home.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { isAdmin, isAdminOrStaff } from '../access'

export const Home: GlobalConfig = {
  slug: 'home',
  access: { read: () => true, update: isAdminOrStaff },
  fields: [
    { name: 'heroImage', type: 'upload', relationTo: 'media', required: true },
    { name: 'heroTitle',    type: 'text', localized: true, required: true },
    { name: 'heroSubtitle', type: 'textarea', localized: true },
    { name: 'ctaPrimary',   type: 'group', fields: [
      { name: 'label', type: 'text', localized: true },
      { name: 'href',  type: 'text', defaultValue: '/book' },
    ]},
    { name: 'ctaSecondary', type: 'group', fields: [
      { name: 'label', type: 'text', localized: true },
      { name: 'href',  type: 'text', defaultValue: '/about' },
    ]},
    { name: 'middleParagraph', type: 'richText', localized: true },
  ],
}
```

`src/globals/About.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { isAdmin, isAdminOrStaff } from '../access'

export const About: GlobalConfig = {
  slug: 'about',
  access: { read: () => true, update: isAdminOrStaff },
  fields: [
    { name: 'story', type: 'richText', localized: true },
    {
      name: 'team', type: 'array',
      fields: [
        { name: 'name',  type: 'text', localized: true, required: true },
        { name: 'photo', type: 'upload', relationTo: 'media' },
        { name: 'bio',   type: 'textarea', localized: true },
      ],
    },
    { name: 'address',  type: 'textarea', localized: true },
    { name: 'mapEmbedUrl', type: 'text', admin: { description: 'Google Maps embed URL' } },
    { name: 'transport', type: 'richText', localized: true },
    { name: 'mindfulpeaceOrgUrl', type: 'text', defaultValue: 'https://mindfulpeace.org/' },
  ],
}
```

`src/globals/Contact.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { isAdminOrStaff } from '../access'

export const Contact: GlobalConfig = {
  slug: 'contact',
  access: { read: () => true, update: isAdminOrStaff },
  fields: [
    { name: 'wechatQr', type: 'upload', relationTo: 'media' },
    { name: 'email',    type: 'email' },
    { name: 'phone',    type: 'text' },
    {
      name: 'social', type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url',   type: 'text' },
      ],
    },
    {
      name: 'faq', type: 'array',
      fields: [
        { name: 'q', type: 'text', localized: true, required: true },
        { name: 'a', type: 'richText', localized: true, required: true },
      ],
    },
  ],
}
```

`src/globals/Settings.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

export const Settings: GlobalConfig = {
  slug: 'settings',
  access: { read: () => true, update: isAdmin }, // admin only
  fields: [
    { name: 'siteName',   type: 'text', localized: true, required: true },
    { name: 'ogDefault',  type: 'upload', relationTo: 'media' },
    { name: 'footerText', type: 'text', localized: true },
    { name: 'adminEmail', type: 'email', required: true, admin: { description: '新预约提醒邮箱' } },
    { name: 'mindfulpeaceOrgUrl', type: 'text', defaultValue: 'https://mindfulpeace.org/' },
  ],
}
```

- [ ] **Step 2: Register all 4 globals in `payload.config.ts`**

```ts
import { Home, About, Contact, Settings } from './globals'
// ...
globals: [Home, About, Contact, Settings]
```

- [ ] **Step 3: Verify in admin: Globals nav shows the 4 entries.**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(globals): Home, About, Contact, Settings globals"
```

### Task 2.9 — Seed script

- [ ] **Step 1: Create `src/seed.ts`** that seeds:
- 1 admin user (if none exists)
- 7 categories (per spec §14)
- 3 example activities, each with 2 occurrences
- 1 journal entry
- Default content for 4 globals
- 5 FAQ items

```ts
// src/seed.ts
import payload from 'payload'
import configPromise from './payload.config'
import { addDays, set } from 'date-fns'

const categories = [
  { zh: '禅修课', en: 'Meditation Class' },
  { zh: '工作坊', en: 'Workshop' },
  { zh: '一对一', en: 'One-on-One' },
  { zh: '共修',   en: 'Community Practice' },
  { zh: '住山',   en: 'Residential' },
  { zh: '正念活动', en: 'Mindful Activity' },
  { zh: '茶会',   en: 'Tea Gathering' },
]

async function seed() {
  await payload.init({ config: configPromise })

  // categories
  const catIds: Record<string, string> = {}
  for (const [i, c] of categories.entries()) {
    const created = await payload.create({
      collection: 'categories',
      data: {
        slug: c.en.toLowerCase().replace(/\s+/g, '-'),
        order: i,
      },
      locale: 'zh-CN',
    })
    await payload.update({ collection: 'categories', id: created.id, data: { name: c.zh }, locale: 'zh-CN' })
    await payload.update({ collection: 'categories', id: created.id, data: { name: c.en }, locale: 'en' })
    catIds[c.en] = created.id
  }

  // TODO: seed activities, journal, globals — fill in similarly

  console.log('Seed complete')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Add script `pnpm seed`** to `package.json`:

```json
"seed": "tsx src/seed.ts"
```

Install tsx if not present: `pnpm add -D tsx`

- [ ] **Step 3: Run** `pnpm seed`, verify in admin the categories are created.

- [ ] **Step 4: Fill in the rest of the seed** (activities, journal, globals). This is mechanical — copy the shape from earlier seeds. Use placeholder Unsplash URLs for images (upload via `payload.create({ collection: 'media', filePath: ... })`).

- [ ] **Step 5: Test re-running** — the seed should be idempotent (check existence before creating). Add `if (await find …)` guards.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(seed): initial seed script for dev"
```

### Chunk 2 acceptance

```bash
pnpm test         # all unit tests pass
pnpm typecheck    # passes
pnpm seed         # idempotent, no errors
pnpm dev          # admin shows: 5 collections, 4 globals
```

Spot checks in admin:
- Create staff user, log in as staff: can edit activities, cannot create users, cannot update Settings
- Create category, link to activity, try to delete category → refused
- Create activity, add 4 weekly occurrences via quick-add → 4 rows appear

Tag:

```bash
git tag -a v0.2.0-data-model -m "Chunk 2: data model complete"
```

---

## Chunk 2.5: Locations & multi-academy retrofit

**Goal:** Retrofit the existing data model to support three academies (Bangkok 如如, Chiang Mai 心灯, Phuket TBD). Add a `Locations` collection, add required `location` relation field to Activities/Journal/Reservations, remove the now-redundant About and Contact globals (their per-academy data moves to Locations rows), and update the seed to populate all three locations + reassign existing seed activities/journal to chiangmai.

**Files affected:**
- Create: `src/collections/Locations.ts`
- Modify: `src/collections/Activities.ts` (add `location` field, rename old free-text `location` → `venueNote`)
- Modify: `src/collections/Journal.ts` (add `location` field)
- Modify: `src/collections/Reservations.ts` (add `location` field, update beforeChange hook)
- Delete: `src/globals/About.ts`, `src/globals/Contact.ts`
- Modify: `src/globals/Home.ts` → rename slug to `portalHome`, repurpose for the network portal hero
- Modify: `src/globals/Settings.ts` (add `defaultLocation` relation)
- Modify: `src/globals/index.ts` (drop About/Contact exports)
- Modify: `src/payload.config.ts` (register Locations, drop About+Contact globals)
- Modify: `src/seed.ts` (seed 3 locations first; activities/journal/reservation assignments go to chiangmai)
- Modify: `src/tests/hooks.test.ts` (update tests for new field requirements)

### Task 2.5.1 — Locations collection

- [ ] **Step 1: Create `src/collections/Locations.ts`** with the full schema from spec §6.1 (slug, name/city/tagline localized, heroImage required, story/transport richText localized, address textarea localized, mapEmbedUrl, team array, email/phone, wechatQr, social array, faq array, order). Access: read public; create/update/delete = isAdmin (NOT isAdminOrStaff — only admin can change structural location data).

- [ ] **Step 2: Register Locations** in `src/payload.config.ts` collections array.

- [ ] **Step 3: Test** — Vitest unit test verifying the access predicates: staff cannot create/update locations.

- [ ] **Step 4: Commit** `feat(locations): collection scoped to admin-only writes`

### Task 2.5.2 — Activities: add location field, rename old location → venueNote

- [ ] **Step 1: Edit `src/collections/Activities.ts`**:
  - Rename existing `location` field (free text "学堂") to `venueNote`. Same field options (text localized, default value via function).
  - **Add new `location` field** above `heroImage`: relationship to `locations`, required, indexed.

- [ ] **Step 2: Update the publish-time bilingual validator** (in `Activities.hooks.ts`):
  - The validator should NOT yet require location to be filled in zh-CN-only-on-publish; location is just a relation, not bilingual. Confirm the existing logic is OK.

- [ ] **Step 3: Test** — Vitest: creating an activity without location must fail validation.

- [ ] **Step 4: Commit** `feat(activities): require location relation; rename venue text to venueNote`

### Task 2.5.3 — Journal: add location field

- [ ] **Step 1: Edit `src/collections/Journal.ts`** — add `location` relationship (required, indexed) right after the title/slug block.

- [ ] **Step 2: Commit** `feat(journal): require location relation`

### Task 2.5.4 — Reservations: add location field + derivation logic

- [ ] **Step 1: Edit `src/collections/Reservations.ts`** — add `location` relationship (required, indexed) above `activity`.

- [ ] **Step 2: Edit `src/collections/Reservations.hooks.ts`** — add a hook step that, when activity is set but location is missing, populates location from `activity.location`. For general inquiries (no activity), location is set by the route handler (validated as required at the API layer).

- [ ] **Step 3: Test** — Vitest unit test for the derivation: create reservation with activity → location auto-populates.

- [ ] **Step 4: Commit** `feat(reservations): require location, auto-derive from activity`

### Task 2.5.5 — Remove About + Contact globals; repurpose Home

- [ ] **Step 1: Delete files**:
  - `src/globals/About.ts`
  - `src/globals/Contact.ts`

- [ ] **Step 2: Update `src/globals/index.ts`** — remove About + Contact exports.

- [ ] **Step 3: Rename `src/globals/Home.ts`** internally — change the `slug: 'home'` to `slug: 'portal-home'`. The fields stay the same (heroImage, heroTitle, heroSubtitle, ctaPrimary, ctaSecondary, middleParagraph). Add a comment explaining this is the network-level hero (not per-academy).

- [ ] **Step 4: Update `src/payload.config.ts`** to remove About + Contact, register the renamed portalHome.

- [ ] **Step 5: Commit** `refactor(globals): remove About/Contact globals (now per-Location); rename home → portal-home`

### Task 2.5.6 — Settings: add defaultLocation

- [ ] **Step 1: Edit `src/globals/Settings.ts`** — add `defaultLocation` field (relationship to locations, optional). Used as fallback when a URL is malformed.

- [ ] **Step 2: Commit** `feat(settings): add defaultLocation pointer`

### Task 2.5.7 — Seed update: 3 locations + reassign existing data

- [ ] **Step 1: Edit `src/seed.ts`**:
  - **Insert location seeding BEFORE categories**:
    - bangkok: name 曼谷如如学堂 / Bangkok Ruru Academy, city 曼谷 / Bangkok, tagline EN "In the heart of the city, a quieter pulse" / ZH "城市中心的一处静处", placeholder heroImage from Unsplash (Bangkok-themed), placeholder story richText (bilingual), generic email like `bangkok@mindfulpeaceth.com`, address placeholder, order 1
    - chiangmai: name 清迈心灯学堂 / Chiang Mai Xindeng Academy, city 清迈 / Chiang Mai, tagline EN "Where the hills hold the morning mist", placeholder hero, story bilingual placeholder, `chiangmai@mindfulpeaceth.com`, "Chiang Mai" address, order 2
    - phuket: name 普吉学堂(名字待定)/ Phuket Academy (name TBD), city 普吉 / Phuket, tagline placeholder, hero placeholder, story marked as "TBD", `phuket@mindfulpeaceth.com`, address placeholder, order 3
  - **Activities/journal seed**: existing 3 activities + 1 journal must now include `location: chiangmaiLocationId`. Update the create() calls.
  - **portalHome global seed**: heroTitle "静心学堂 · 泰国" / "Mindfulpeace Academy Thailand", subtitle "A network of Mindfulpeace academies across Thailand", middleParagraph network-level text.
  - **Settings seed**: set `defaultLocation: chiangmaiLocationId`.
  - **Remove About + Contact global seeding** (those globals no longer exist).

- [ ] **Step 2: Run** `pnpm seed` against a fresh local DB:
  ```bash
  /opt/homebrew/opt/postgresql@16/bin/psql -d postgres -c "DROP DATABASE IF EXISTS jingxin; CREATE DATABASE jingxin OWNER jingxin;"
  pnpm seed
  ```
  Expect: 3 locations + 7 categories + 15 media + 3 activities (all chiangmai) + 1 journal (chiangmai) + portalHome + Settings, idempotent re-run shows [SKIP] everywhere.

- [ ] **Step 3: Verify** by curl:
  ```bash
  curl http://localhost:3000/api/locations?limit=10
  ```
  Expect 3 docs.

- [ ] **Step 4: Commit** `chore(seed): seed 3 locations and reassign existing chiangmai data`

### Task 2.5.8 — Update hook tests

- [ ] **Step 1: Edit `src/tests/hooks.test.ts`** to reflect new schema (activity/journal/reservation tests now include a `location` field in fixtures).

- [ ] **Step 2: Run** `pnpm test` — all 21+ tests still pass.

- [ ] **Step 3: Commit** `test(hooks): update fixtures for required location field`

### Chunk 2.5 acceptance

- `pnpm test` — all passing (≥ 21)
- `pnpm typecheck` — exit 0
- `pnpm build` — exit 0
- `pnpm seed` — idempotent, no errors
- Admin: Locations collection visible with 3 rows; Activities/Journal show location dropdown required; About/Contact globals no longer appear in admin nav

Tag: `v0.2.5-locations`

---

## Chunk 3: Reservation engine

**Goal:** A `/api/reservations` endpoint that accepts a POST with the booking payload, verifies Turnstile, rate limits, transactionally checks capacity (Postgres row lock), writes the reservation, and enqueues emails. Email sending is decoupled — failure does not roll back the reservation.

**Files affected:**
- Create: `src/lib/capacity.ts`
- Create: `src/lib/time.ts` (timezone helpers)
- Create: `src/lib/turnstile.ts`
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/email.ts`
- Create: `src/lib/email-jobs.ts`
- Create: `src/app/api/reservations/route.ts`
- Create: `src/tests/capacity.test.ts`, `time.test.ts`, `reservations.test.ts`

### Task 3.1 — Capacity calculator (TDD)

- [ ] **Step 1: Write failing test** at `src/tests/capacity.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { computeOccupancy, canBook, type ReservationLike } from '../lib/capacity'

const r = (status: ReservationLike['status'], guests: number, occurrenceId = 'occ1'): ReservationLike =>
  ({ status, guests, occurrenceId })

describe('capacity', () => {
  describe('computeOccupancy', () => {
    it('counts pending + confirmed', () => {
      expect(computeOccupancy([r('pending', 2), r('confirmed', 3)], 'occ1')).toBe(5)
    })
    it('excludes waitlist, cancelled, deleted', () => {
      expect(computeOccupancy(
        [r('pending', 1), r('waitlist', 5), r('cancelled', 2), r('deleted', 3)],
        'occ1',
      )).toBe(1)
    })
    it('filters by occurrence', () => {
      expect(computeOccupancy(
        [r('confirmed', 2, 'occ1'), r('confirmed', 4, 'occ2')],
        'occ1',
      )).toBe(2)
    })
  })

  describe('canBook', () => {
    it('allows when capacity sufficient', () => {
      expect(canBook({ capacity: 10, occupied: 7, guests: 2 })).toEqual({ ok: true })
    })
    it('blocks at the edge', () => {
      expect(canBook({ capacity: 10, occupied: 9, guests: 2 })).toEqual({ ok: false, reason: 'capacity_full' })
    })
    it('respects override', () => {
      expect(canBook({ capacity: 10, override: 5, occupied: 4, guests: 2 })).toEqual({ ok: false, reason: 'capacity_full' })
    })
  })
})
```

- [ ] **Step 2: Run, verify failure** — `pnpm test src/tests/capacity.test.ts` → fails (no module).

- [ ] **Step 3: Implement** at `src/lib/capacity.ts`

```ts
export type ReservationLike = {
  status: 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'deleted'
  guests: number
  occurrenceId: string
}

const COUNTED = new Set(['pending', 'confirmed'])

export function computeOccupancy(reservations: ReservationLike[], occurrenceId: string): number {
  return reservations
    .filter(r => r.occurrenceId === occurrenceId && COUNTED.has(r.status))
    .reduce((sum, r) => sum + r.guests, 0)
}

export function canBook(args: {
  capacity: number
  override?: number | null
  occupied: number
  guests: number
}): { ok: true } | { ok: false; reason: 'capacity_full' } {
  const limit = args.override ?? args.capacity
  return args.occupied + args.guests <= limit
    ? { ok: true }
    : { ok: false, reason: 'capacity_full' }
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(capacity): pure capacity calculator with tests"
```

### Task 3.2 — Time zone helpers (TDD)

- [ ] **Step 1: Write failing test** at `src/tests/time.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { formatICT, toUtcISO, formatDateLong } from '../lib/time'

describe('time helpers', () => {
  it('formats UTC ISO in ICT', () => {
    expect(formatICT(new Date('2026-09-20T02:30:00Z'))).toMatch(/9:30/) // 02:30 UTC = 09:30 ICT
  })
  it('round-trips local Bangkok time to UTC ISO', () => {
    // 2026-09-20 09:30 ICT == 02:30 UTC
    expect(toUtcISO('2026-09-20T09:30', 'Asia/Bangkok')).toBe('2026-09-20T02:30:00.000Z')
  })
  it('formats long date in Chinese', () => {
    expect(formatDateLong(new Date('2026-09-20T02:30:00Z'), 'zh-CN'))
      .toContain('9月20日')
  })
})
```

- [ ] **Step 2: Verify failure.**

- [ ] **Step 3: Implement** at `src/lib/time.ts`

```ts
import { format } from 'date-fns'
import { format as formatTz, fromZonedTime, toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Bangkok'

export function formatICT(date: Date): string {
  return formatTz(toZonedTime(date, TZ), 'HH:mm', { timeZone: TZ })
}

export function toUtcISO(localISO: string, tz: string = TZ): string {
  return fromZonedTime(localISO, tz).toISOString()
}

export function formatDateLong(date: Date, locale: 'zh-CN' | 'en'): string {
  const zoned = toZonedTime(date, TZ)
  if (locale === 'zh-CN') {
    return formatTz(zoned, 'yyyy年M月d日 HH:mm', { timeZone: TZ }) + ' ICT'
  }
  return formatTz(zoned, "MMM d, yyyy 'at' HH:mm", { timeZone: TZ }) + ' ICT'
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(time): Bangkok timezone helpers"
```

### Task 3.3 — Turnstile verification

- [ ] **Step 1: Test** at `src/tests/turnstile.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from '../lib/turnstile'

describe('verifyTurnstile', () => {
  it('passes on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as any
    process.env.TURNSTILE_SECRET_KEY = 'test'
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(true)
  })

  it('fails on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid'] }),
    }) as any
    expect(await verifyTurnstile('bad', '1.2.3.4')).toBe(false)
  })
})
```

- [ ] **Step 2: Implement** at `src/lib/turnstile.ts`

```ts
const URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV !== 'production') return true // bypass in dev
    return false
  }
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  })
  const res = await fetch(URL, { method: 'POST', body })
  const data = (await res.json()) as { success: boolean }
  return data.success === true
}
```

- [ ] **Step 3: Verify tests pass.**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(turnstile): server-side verification helper"
```

### Task 3.4 — IP rate limiter

For v1 we use an in-memory token bucket (acceptable for a single Vercel deployment with low traffic). If concurrent edge instances become an issue later, swap to Postgres-backed.

- [ ] **Step 1: Test** at `src/tests/rate-limit.test.ts`

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { rateLimit, _resetForTest } from '../lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => _resetForTest())
  it('allows up to limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('1.1.1.1', 10, 60_000).ok).toBe(true)
    }
  })
  it('blocks at limit+1', () => {
    for (let i = 0; i < 10; i++) rateLimit('1.1.1.1', 10, 60_000)
    expect(rateLimit('1.1.1.1', 10, 60_000).ok).toBe(false)
  })
  it('isolates per IP', () => {
    for (let i = 0; i < 10; i++) rateLimit('1.1.1.1', 10, 60_000)
    expect(rateLimit('2.2.2.2', 10, 60_000).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Implement** at `src/lib/rate-limit.ts`

```ts
type Bucket = { tokens: number; windowStart: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(ip: string, max: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now - b.windowStart > windowMs) {
    buckets.set(ip, { tokens: 1, windowStart: now })
    return { ok: true, remaining: max - 1 }
  }
  if (b.tokens >= max) return { ok: false, remaining: 0 }
  b.tokens++
  return { ok: true, remaining: max - b.tokens }
}

export function _resetForTest() { buckets.clear() }
```

- [ ] **Step 3: Pass tests, commit**

```bash
git add -A
git commit -m "feat(rate-limit): in-memory token bucket"
```

### Task 3.5 — Email transport + jobs queue

We don't run a full job queue — too much for v1. Instead: write each "send email" intent as a row in an `email_jobs` collection, then process inline with a best-effort retry, marking the original reservation's `emailStatus`.

- [ ] **Step 1: Create `src/collections/EmailJobs.ts`** (internal-only collection)

```ts
import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const EmailJobs: CollectionConfig = {
  slug: 'email-jobs',
  admin: { hidden: ({ user }) => user?.role !== 'admin' },
  access: { read: isAdmin, create: () => true, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'to', type: 'email', required: true },
    { name: 'subject', type: 'text', required: true },
    { name: 'body', type: 'textarea', required: true },
    { name: 'relatedReservation', type: 'relationship', relationTo: 'reservations' },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'lastError', type: 'text' },
    {
      name: 'status', type: 'select', defaultValue: 'pending',
      options: ['pending','sent','failed'].map(v => ({ label: v, value: v })),
    },
  ],
}
```

Register in `payload.config.ts`.

- [ ] **Step 2: Implement transport** at `src/lib/email.ts`

```ts
import nodemailer from 'nodemailer'

let transport: nodemailer.Transporter | null = null

export function getTransport() {
  if (transport) return transport
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail SMTP not configured')
  }
  transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
  return transport
}

export async function sendMail(opts: { to: string; subject: string; body: string }) {
  const t = getTransport()
  await t.sendMail({
    from: `"静心学堂 · 泰国" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  })
}
```

- [ ] **Step 3: Implement enqueue + best-effort processor** at `src/lib/email-jobs.ts`

```ts
import type { Payload } from 'payload'
import { sendMail } from './email'

export async function enqueueEmail(payload: Payload, args: {
  to: string; subject: string; body: string; relatedReservation?: string
}) {
  const job = await payload.create({ collection: 'email-jobs', data: { ...args, status: 'pending' } })
  // Fire-and-forget (don't await) so reservation API returns fast
  void processEmailJob(payload, job.id)
  return job
}

async function processEmailJob(payload: Payload, id: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const job = await payload.findByID({ collection: 'email-jobs', id })
      await sendMail({ to: job.to, subject: job.subject, body: job.body })
      await payload.update({ collection: 'email-jobs', id, data: { status: 'sent', attempts: attempt } })
      if (job.relatedReservation) {
        await payload.update({
          collection: 'reservations',
          id: job.relatedReservation as string,
          data: { emailStatus: 'sent' },
        })
      }
      return
    } catch (err: any) {
      if (attempt === 3) {
        await payload.update({
          collection: 'email-jobs',
          id,
          data: { status: 'failed', attempts: attempt, lastError: String(err?.message ?? err) },
        })
        const job = await payload.findByID({ collection: 'email-jobs', id })
        if (job.relatedReservation) {
          await payload.update({
            collection: 'reservations',
            id: job.relatedReservation as string,
            data: { emailStatus: 'failed' },
          })
        }
      } else {
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)) // 2s, 4s
      }
    }
  }
}
```

- [ ] **Step 4: Test that enqueue creates a job** (mock `sendMail`)

`src/tests/email-jobs.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { enqueueEmail } from '../lib/email-jobs'

vi.mock('../lib/email', () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }))

describe('enqueueEmail', () => {
  it('creates a job row', async () => {
    const created: any[] = []
    const payload: any = {
      create: vi.fn(async ({ data }) => { const job = { id: 'j1', ...data }; created.push(job); return job }),
      findByID: vi.fn(async ({ id }) => created.find(c => c.id === id)),
      update: vi.fn(async () => ({})),
    }
    const job = await enqueueEmail(payload, { to: 'a@b.com', subject: 'x', body: 'y' })
    expect(job.id).toBe('j1')
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'email-jobs',
      data: expect.objectContaining({ status: 'pending' }),
    }))
  })
})
```

- [ ] **Step 5: Pass tests, commit**

```bash
git add -A
git commit -m "feat(email): Gmail SMTP transport + email-jobs queue collection"
```

### Task 3.6 — Reservations API route

The heart of Chunk 3. Combines all the pieces.

- [ ] **Step 1: Write integration test** at `src/tests/reservations-api.test.ts`

Sketch (integration tests are heavier — full version below):

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '../app/api/reservations/route'
import { _resetForTest } from '../lib/rate-limit'

vi.mock('../lib/turnstile', () => ({ verifyTurnstile: vi.fn().mockResolvedValue(true) }))
vi.mock('../lib/email-jobs', () => ({ enqueueEmail: vi.fn().mockResolvedValue({ id: 'j1' }) }))

const mockPayload = {
  find: vi.fn(),
  findByID: vi.fn(),
  create: vi.fn(),
  db: { drizzle: { transaction: vi.fn(async (fn: any) => fn({})) } },
}

vi.mock('payload', () => ({ getPayload: vi.fn(async () => mockPayload) }))

const makeReq = (body: any, ip = '1.1.1.1') =>
  new Request('http://test/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })

beforeEach(() => { _resetForTest(); vi.clearAllMocks() })

describe('POST /api/reservations', () => {
  it('rejects with 400 if missing required fields', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })
  it('writes pending for valid general inquiry (no activity)', async () => {
    mockPayload.create.mockResolvedValueOnce({ id: 'r1' })
    const res = await POST(makeReq({
      name: 'A', phone: '1', email: 'a@b.com',
      turnstileToken: 't', honeypot: '',
      direction: 'visit', source: 'book_general_inquiry',
    }))
    expect(res.status).toBe(200)
    expect(mockPayload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'reservations',
      data: expect.objectContaining({ status: 'pending' }),
    }))
  })
  it('blocks honeypot', async () => {
    const res = await POST(makeReq({
      name: 'A', phone: '1', email: 'a@b.com',
      turnstileToken: 't', honeypot: 'spam',
    }))
    expect(res.status).toBe(400)
  })
  it('returns 409 capacity_full when over capacity', async () => {
    // Setup: activity has cap 5, occupied 5
    mockPayload.find.mockImplementation(async ({ collection }: any) => {
      if (collection === 'reservations') return { docs: [{ guests: 5, status: 'confirmed', occurrenceId: 'o1' }] }
      return { docs: [] }
    })
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'a1', capacity: 5,
      occurrences: [{ id: 'o1', capacityOverride: null, status: 'open' }],
    })
    const res = await POST(makeReq({
      name: 'A', phone: '1', email: 'a@b.com',
      turnstileToken: 't', honeypot: '',
      activity: 'a1', occurrenceId: 'o1', guests: 1,
    }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('capacity_full')
  })
})
```

- [ ] **Step 2: Implement** at `src/app/api/reservations/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'
import configPromise from '../../../payload.config'
import { verifyTurnstile } from '../../../lib/turnstile'
import { rateLimit } from '../../../lib/rate-limit'
import { computeOccupancy, canBook } from '../../../lib/capacity'
import { enqueueEmail } from '../../../lib/email-jobs'

const Body = z.object({
  source: z.enum(['home_cta','nav_book','book_list','book_general_inquiry','activity_detail','shared_link']).default('activity_detail'),
  activity: z.string().optional(),
  occurrenceId: z.string().optional(),
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal('')),
  wechatId: z.string().max(80).optional().or(z.literal('')),
  phone: z.string().min(3).max(40),
  guests: z.number().int().min(1).max(10).default(1),
  direction: z.enum(['meditation','mindfulness','one_on_one','visit','other']).optional(),
  notes: z.string().max(2000).optional(),
  language: z.enum(['zh','en']).default('zh'),
  turnstileToken: z.string(),
  honeypot: z.string().optional(), // must be empty
  acceptWaitlist: z.boolean().default(false),
}).refine(d => d.email || d.wechatId, { message: 'email_or_wechat_required' })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  // rate limit
  const rl = rateLimit(ip, 10, 5 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  // parse + validate
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch (e) {
    return NextResponse.json({ error: 'invalid_payload', details: String(e) }, { status: 400 })
  }

  // honeypot
  if (body.honeypot) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  // turnstile
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: 'turnstile_failed' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  // GENERAL INQUIRY — no activity, no capacity check
  if (!body.activity) {
    const r = await payload.create({
      collection: 'reservations',
      data: {
        ...stripWaitlistInput(body),
        status: 'pending',
        emailStatus: body.email ? 'pending' : 'no_email',
      },
    })
    await sendNotifications(payload, r.id, body, /* activityTitle */ null)
    return NextResponse.json({ ok: true, id: r.id }, { status: 200 })
  }

  // ACTIVITY BOOKING — capacity check
  if (!body.occurrenceId) {
    return NextResponse.json({ error: 'occurrence_required' }, { status: 400 })
  }

  // Use Postgres advisory lock via payload.db.drizzle to serialize bookings per activity
  const activity = await payload.findByID({ collection: 'activities', id: body.activity })
  if (!activity) return NextResponse.json({ error: 'activity_not_found' }, { status: 404 })

  const occ = (activity.occurrences ?? []).find((o: any) => o.id === body.occurrenceId)
  if (!occ || occ.status === 'deleted' || occ.status === 'cancelled') {
    return NextResponse.json({ error: 'occurrence_invalid' }, { status: 400 })
  }

  // Concurrency model:
  // Use a session-level Postgres advisory lock keyed on the activity id.
  // Advisory locks are held until pg_advisory_unlock or the session closes,
  // serializing all booking attempts for the same activity across requests
  // regardless of which connection in the pool serves each.
  // We acquire the lock BEFORE the find+create, release after.
  //
  // We use payload.db.drizzle (raw client) for the lock; the subsequent
  // payload.find and payload.create do not need to be on the same connection
  // because no other code path can write to reservations for this activity
  // while we hold the lock.
  const lockKey = await hashToBigInt(String(body.activity))
  const drizzle = (payload.db as any).drizzle

  await drizzle.execute(`SELECT pg_advisory_lock(${lockKey}::bigint)`)
  try {
    const reservations = await payload.find({
      collection: 'reservations',
      where: {
        and: [
          { activity: { equals: body.activity } },
          { occurrenceId: { equals: body.occurrenceId } },
          { status: { in: ['pending', 'confirmed'] } },
        ],
      },
      limit: 1000,
      depth: 0,
    })

    const occupied = computeOccupancy(
      reservations.docs.map((r: any) => ({
        status: r.status, guests: r.guests, occurrenceId: r.occurrenceId,
      })),
      body.occurrenceId!,
    )

    const verdict = canBook({
      capacity: activity.capacity,
      override: occ.capacityOverride,
      occupied,
      guests: body.guests,
    })

    let result: { kind: 'created' | 'waitlisted' | 'full'; id?: string }
    if (verdict.ok) {
      const created = await payload.create({
        collection: 'reservations',
        data: {
          ...stripWaitlistInput(body),
          status: 'pending',
          emailStatus: body.email ? 'pending' : 'no_email',
        },
        context: { internal: true }, // satisfies create access predicate
      })
      result = { kind: 'created', id: created.id }
    } else if (body.acceptWaitlist) {
      const created = await payload.create({
        collection: 'reservations',
        data: {
          ...stripWaitlistInput(body),
          status: 'waitlist',
          emailStatus: body.email ? 'pending' : 'no_email',
        },
        context: { internal: true },
      })
      result = { kind: 'waitlisted', id: created.id }
    } else {
      result = { kind: 'full' }
    }

    if (result.kind === 'full') {
      return NextResponse.json({ error: 'capacity_full' }, { status: 409 })
    }

    await sendNotifications(payload, result.id!, body, activity.title)
    return NextResponse.json({ ok: true, id: result.id, kind: result.kind })
  } finally {
    await drizzle.execute(`SELECT pg_advisory_unlock(${lockKey}::bigint)`)
  }
}

// Stable 63-bit signed integer hash for advisory locks
async function hashToBigInt(input: string): Promise<bigint> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const view = new DataView(buf)
  // Take top 8 bytes, clear high bit to stay in signed-bigint range
  return view.getBigUint64(0) & 0x7fffffffffffffffn
}

function stripWaitlistInput(body: z.infer<typeof Body>) {
  const { turnstileToken, honeypot, acceptWaitlist, ...rest } = body
  return rest
}

async function sendNotifications(payload: any, reservationId: string, body: z.infer<typeof Body>, activityTitle: any) {
  const settings = await payload.findGlobal({ slug: 'settings' })
  const adminEmail = settings?.adminEmail
  const subjLine = activityTitle ? `预约通知: ${typeof activityTitle === 'string' ? activityTitle : activityTitle['zh-CN']}` : `自由咨询: ${body.name}`
  // admin
  if (adminEmail) {
    await enqueueEmail(payload, {
      to: adminEmail,
      subject: subjLine,
      body: `姓名: ${body.name}\n电话: ${body.phone}\n邮箱: ${body.email ?? '-'}\n微信: ${body.wechatId ?? '-'}\n人数: ${body.guests}\n备注: ${body.notes ?? '-'}\n\n请到后台查看: /admin/collections/reservations/${reservationId}`,
      relatedReservation: reservationId,
    })
  }
  // user receipt
  if (body.email) {
    await enqueueEmail(payload, {
      to: body.email,
      subject: body.language === 'zh' ? '静心学堂 · 泰国 · 已收到你的预约' : 'Mindfulpeace Academy Thailand · We received your reservation',
      body: body.language === 'zh'
        ? `你好 ${body.name},\n\n我们已收到你的预约,会在 24 小时内通过微信或邮件跟你确认。\n\n静心学堂 · 泰国`
        : `Hi ${body.name},\n\nWe received your reservation and will confirm within 24 hours via email or WeChat.\n\nMindfulpeace Academy Thailand`,
      relatedReservation: reservationId,
    })
  }
}
```

- [ ] **Step 3: Run tests — fix any failures** until all pass.

- [ ] **Step 4: Manual smoke test** with curl:

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "content-type: application/json" \
  -d '{"name":"测试","phone":"123","email":"a@b.com","turnstileToken":"t","direction":"visit","source":"book_general_inquiry","language":"zh"}'
```

Expected: `{"ok":true,"id":"..."}`. Check admin → Reservations → new row.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(reservations): POST /api/reservations with capacity, turnstile, rate-limit, emails"
```

### Task 3.7 — Status-change email hook

When status changes from `pending` → `confirmed`, send confirmation email.

- [ ] **Step 1: Extend reservation's `beforeChange` hook** (or add `afterChange`)

```ts
hooks: {
  // ...
  afterChange: [
    async ({ doc, previousDoc, req }) => {
      if (doc.status === 'confirmed' && previousDoc?.status !== 'confirmed' && doc.email) {
        await enqueueEmail(req.payload, {
          to: doc.email,
          subject: doc.language === 'zh' ? '静心学堂 · 泰国 · 预约已确认' : 'Mindfulpeace Academy Thailand · Booking confirmed',
          body: doc.language === 'zh'
            ? `你好 ${doc.name},\n\n你的预约已确认。期待相见。\n\n静心学堂 · 泰国`
            : `Hi ${doc.name},\n\nYour booking is confirmed. We look forward to seeing you.\n\nMindfulpeace Academy Thailand`,
          relatedReservation: doc.id,
        })
      }
    },
  ],
},
```

- [ ] **Step 2: Manual test** — in admin, change a reservation's status to `confirmed`. Check email-jobs collection: a new row should appear with status `sent`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(reservations): send confirmation email on status->confirmed"
```

### Chunk 3 acceptance

```bash
pnpm test       # all reservation/capacity/turnstile/email tests pass
pnpm typecheck  # passes
pnpm dev        # /api/reservations responds end-to-end
```

Manual:
- Submit a booking with capacity available → `200 ok`, row in reservations, 2 email jobs queued
- Submit when full → `409 capacity_full`
- Submit with `acceptWaitlist:true` when full → row with status=waitlist
- Submit honeypot non-empty → `400`
- Change reservation status `pending` → `confirmed` → confirmation email queued

Tag:

```bash
git tag -a v0.3.0-reservations -m "Chunk 3: reservation engine complete"
```

---

## Chunk 4: Public site shell

**Goal:** Site layout, header + location switcher + language switcher + Book CTA, footer with mindfulpeace.org link and network column, mobile drawer menu. All bilingual. No content pages yet — just navigable empty pages with placeholders.

**Files affected:**
- Create: `src/app/(frontend)/layout.tsx`
- Create: `src/components/layout/Header.tsx`, `Footer.tsx`, `LanguageSwitcher.tsx`, `MobileNav.tsx`
- Create: `src/lib/i18n.ts` — locale cookie + `t()` helper
- Create: `src/middleware.ts` — sets locale from cookie

### Task 4.1 — Locale cookie + helper

- [ ] **Step 1: Create `src/lib/i18n.ts`**

```ts
import { cookies } from 'next/headers'

export type Locale = 'zh-CN' | 'en'
export const LOCALES: Locale[] = ['zh-CN', 'en']
export const DEFAULT_LOCALE: Locale = 'zh-CN'
const COOKIE = 'jx-lang'

export async function getLocale(): Promise<Locale> {
  const c = await cookies()
  const v = c.get(COOKIE)?.value as Locale | undefined
  return LOCALES.includes(v as Locale) ? (v as Locale) : DEFAULT_LOCALE
}

export const DICT = {
  'zh-CN': {
    nav: { home: '首页', activities: '活动', journal: '现场', about: '关于', contact: '联系', book: '我要预约', network: '网络首页' },
    book: { cta: '我要预约', secondary: '了解学堂' },
    footer: {
      blurb: '静心学堂 · 泰国——三个城市,一个修学网络。',
      contact: '联系',
      explore: '导览',
      links: '相关',
      copyright: '© 2026 静心学堂 · 泰国 / Mindfulpeace Academy Thailand',
    },
  },
  en: {
    nav: { home: 'Home', activities: 'Activities', journal: 'Journal', about: 'About', contact: 'Contact', book: 'Book', network: 'Network home' },
    book: { cta: 'Book your visit', secondary: 'About the academy' },
    footer: {
      blurb: 'Mindfulpeace Academy Thailand — three cities, one mindful network.',
      contact: 'Contact',
      explore: 'Navigate',
      links: 'Related',
      copyright: '© 2026 Mindfulpeace Academy Thailand',
    },
  },
} as const

export function t(locale: Locale, key: string): string {
  const parts = key.split('.')
  let cur: any = DICT[locale]
  for (const p of parts) cur = cur?.[p]
  return cur ?? key
}
```

- [ ] **Step 2: API route to set locale** at `src/app/api/locale/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { locale } = await req.json()
  if (locale !== 'zh-CN' && locale !== 'en') return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('jx-lang', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return res
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(i18n): locale cookie + dict + setter route"
```

### Task 4.2 — Header

The `Header` component now accepts a `location` prop (type: `{ slug: string; name: string } | null`). When `null` (portal `/`), no location chip is rendered and nav links are portal-level. When populated (all `/{loc}/*` pages), render the location chip dropdown and scope nav links under `/{loc}/`.

- [ ] **Step 1: Create `src/components/layout/Header.tsx`**

```tsx
import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'
import LanguageSwitcher from './LanguageSwitcher'
import LocationSwitcher from './LocationSwitcher'

type LocationProps = { slug: string; name: string } | null

export default async function Header({ location }: { location: LocationProps }) {
  const locale = await getLocale()
  const loc = location?.slug ?? ''
  const nav = location ? [
    { href: `/${loc}`,             label: t(locale, 'nav.home') },
    { href: `/${loc}/activities`,  label: t(locale, 'nav.activities') },
    { href: `/${loc}/journal`,     label: t(locale, 'nav.journal') },
    { href: `/${loc}/about`,       label: t(locale, 'nav.about') },
    { href: `/${loc}/contact`,     label: t(locale, 'nav.contact') },
  ] : [
    { href: '/', label: t(locale, 'nav.network') },
  ]
  return (
    <header className="border-b border-teak/10 bg-cream/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <Link href="/" className="font-serif text-lg text-cocoa">静心学堂</Link>
        {location && <LocationSwitcher current={location} />}
        <nav className="hidden md:flex gap-5 text-sm">
          {nav.map(n => (
            <Link key={n.href} href={n.href} className="text-cocoa/80 hover:text-cocoa">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher current={locale} />
          {location && (
            <Link
              href={`/${loc}/book`}
              className="bg-amber text-cream px-4 py-2 rounded-full text-sm font-medium hover:bg-amber/90"
            >
              {t(locale, 'nav.book')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create `LanguageSwitcher.tsx`** — client component that POSTs to `/api/locale` and reloads.

### Task 4.2.1 — Location switcher chip + dropdown menu

The location switcher chip displays the current academy name and drops down to show all 3 locations. Switching navigates to the same path under the new location slug (e.g., `/chiangmai/activities` → `/bangkok/activities`).

- [ ] **Step 1: Create `src/components/layout/LocationSwitcher.tsx`** — client component

```tsx
'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type Location = { slug: string; name: string }

// All known locations — fetched at build/request time and passed down
export default function LocationSwitcher({
  current,
  all,
}: {
  current: Location
  all: Location[]
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const switchTo = (slug: string) => {
    // Replace the current location slug in the path with the new one
    const newPath = pathname.replace(/^\/(bangkok|chiangmai|phuket)/, `/${slug}`)
    setOpen(false)
    router.push(newPath)
  }

  return (
    <div className="relative">
      <button
        className="location-chip flex items-center gap-1 text-sm bg-cream border border-teak/20 rounded-full px-3 py-1"
        data-open={open}
        onClick={() => setOpen(o => !o)}
      >
        {current.name}
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <ul className="absolute top-full left-0 mt-1 bg-cream border border-teak/20 rounded-lg shadow-lg py-1 min-w-[180px] z-50">
          {all.map(loc => (
            <li key={loc.slug}>
              <button
                onClick={() => switchTo(loc.slug)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-moss/10 ${loc.slug === current.slug ? 'font-medium text-moss' : 'text-cocoa'}`}
              >
                {loc.slug === current.slug ? `✓ ${loc.name}` : loc.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Pass `all` locations into `Header`** from the layout (fetched once per request via `getPayloadClient()`, cached). The portal layout passes `location={null}` so the chip is hidden.

- [ ] **Step 3: Test by hand** — on `/chiangmai/activities`, open the chip, select Bangkok, verify navigation to `/bangkok/activities`.

```tsx
'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function LanguageSwitcher({ current }: { current: 'zh-CN' | 'en' }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const switchTo = (loc: 'zh-CN' | 'en') => start(async () => {
    await fetch('/api/locale', { method: 'POST', body: JSON.stringify({ locale: loc }) })
    router.refresh()
  })
  return (
    <button
      onClick={() => switchTo(current === 'zh-CN' ? 'en' : 'zh-CN')}
      disabled={pending}
      className="text-xs text-cocoa/70 hover:text-cocoa"
    >
      {current === 'zh-CN' ? 'EN' : '中文'} · {current === 'zh-CN' ? '中' : 'EN'}
    </button>
  )
}
```

- [ ] **Step 3: Mobile nav** — for v1 keep it simple: a `<details><summary>` based drawer that doesn't need JS. Or a tiny client component. Implement a basic burger that toggles a CSS class.

- [ ] **Step 4: Footer** at `src/components/layout/Footer.tsx`

The footer gains a 5th column: **"网络 · Network"** listing all 3 academies, with the current location marked ✓. On the portal `/`, show all 3 academies without any check mark. The `location` prop (same `{ slug; name } | null` shape as Header) controls the current-mark logic.

```tsx
import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'
import { getPayloadClient } from '@/lib/payload'

export default async function Footer({ location }: { location: { slug: string; name: string } | null }) {
  const locale = await getLocale()
  const payload = await getPayloadClient()
  const { docs: allLocations } = await payload.find({
    collection: 'locations', limit: 10, sort: 'order', locale, fallbackLocale: 'zh-CN',
  })
  const loc = location?.slug ?? ''
  return (
    <footer className="bg-teak text-cream/80 mt-24">
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-5 gap-8 text-sm">
        <div>
          <h3 className="font-serif text-cream text-lg mb-2">静心学堂 · 泰国</h3>
          <p>{t(locale, 'footer.blurb')}</p>
        </div>
        {location && (
          <div>
            <h4 className="text-cream mb-2">{t(locale, 'footer.explore')}</h4>
            <ul className="space-y-1">
              <li><Link href={`/${loc}/activities`}>{t(locale, 'nav.activities')}</Link></li>
              <li><Link href={`/${loc}/journal`}>{t(locale, 'nav.journal')}</Link></li>
              <li><Link href={`/${loc}/about`}>{t(locale, 'nav.about')}</Link></li>
              <li><Link href={`/${loc}/contact`}>{t(locale, 'nav.contact')}</Link></li>
            </ul>
          </div>
        )}
        <div>
          <h4 className="text-cream mb-2">网络 · Network</h4>
          <ul className="space-y-1">
            {allLocations.map((l: any) => (
              <li key={l.slug}>
                <Link href={`/${l.slug}`} className={l.slug === loc ? 'text-cream' : ''}>
                  {l.slug === loc ? `✓ ${l.name}` : l.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-cream mb-2">{t(locale, 'footer.links')}</h4>
          <ul className="space-y-1">
            <li><a href="https://mindfulpeace.org/" rel="noreferrer">国际静心协会 / Mindfulpeace</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-cream mb-2">{t(locale, 'footer.contact')}</h4>
          {location ? <p>{location.name}</p> : <p>mindfulpeaceth.com</p>}
        </div>
      </div>
      <div className="border-t border-cream/10 py-4 text-center text-xs">
        {t(locale, 'footer.copyright')}
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Root layout** at `src/app/(frontend)/layout.tsx`

```tsx
import '@/styles/tokens.css'
import { Manrope, Noto_Serif_SC } from 'next/font/google'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getLocale } from '@/lib/i18n'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' })
const notoSerifSc = Noto_Serif_SC({ subsets: ['chinese-simplified'], weight: ['400','500','700'], variable: '--font-serif' })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale === 'zh-CN' ? 'zh-CN' : 'en'} className={`${manrope.variable} ${notoSerifSc.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Placeholder pages** — portal `/` + per-location routes so nav links don't 404:

```bash
# Portal
# src/app/(frontend)/page.tsx — portal home stub

# Per-location layout with [loc] segment
mkdir -p "src/app/(frontend)/[loc]"
# src/app/(frontend)/[loc]/layout.tsx — subsite shell (fetches location, passes to Header/Footer)
# src/app/(frontend)/[loc]/page.tsx — stub
mkdir -p "src/app/(frontend)/[loc]/{activities,book,journal,about,contact}"
```

Create one-line stubs at each route — `export default function Page() { return <div className="p-12">TODO</div> }`.

The `[loc]/layout.tsx` is the key: it fetches the current location from the `locations` collection using `params.loc`, then passes it down to `<Header location={...} />` and `<Footer location={...} />`. If the slug is not found (e.g., `/unknown`), call `notFound()`.

- [ ] **Step 7: Visual check** — `pnpm dev`, visit `/chiangmai`, see header with location chip + Book CTA. Visit `/`, see header without chip.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(shell): bilingual header/footer + location switcher + placeholder pages"
```

### Task 4.6 — Locale + location URL middleware

- [ ] **Step 1: Edit `src/middleware.ts`** (or create if not existing). The middleware inspects the URL path. If it starts with one of the known location slugs (`/bangkok`, `/chiangmai`, `/phuket`), it writes a `x-location-slug` request header that page Server Components can read via `headers()`. The portal path `/` does not set this header.

```ts
import { NextRequest, NextResponse } from 'next/server'

const LOCATION_SLUGS = ['bangkok', 'chiangmai', 'phuket']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const slug = LOCATION_SLUGS.find(s => pathname === `/${s}` || pathname.startsWith(`/${s}/`))
  const res = NextResponse.next()
  if (slug) res.headers.set('x-location-slug', slug)
  return res
}

export const config = {
  matcher: ['/((?!_next|api|admin|favicon.ico).*)'],
}
```

Note: In practice the `[loc]` dynamic segment in Next.js App Router already provides `params.loc` to layouts and pages, so the middleware header is primarily useful for components deep in the tree that need the location without prop-drilling. Both approaches are valid; prefer `params.loc` from layout where possible.

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): set x-location-slug header for per-location routes"
```

### Chunk 4 acceptance

- Portal `/` renders without location chip; no Book CTA in header
- `/chiangmai` renders with location chip showing "清迈心灯学堂"; Book CTA links to `/chiangmai/book`
- Location chip dropdown: switching from `/chiangmai/activities` to Bangkok navigates to `/bangkok/activities`
- Language switcher toggles between zh-CN and en on all pages, dictionary swaps, font swaps
- Footer shows "网络 · Network" column with all 3 academies listed, current one marked ✓
- Footer shows mindfulpeace.org external link
- Lighthouse mobile preview ≥ 90 SEO and Accessibility (no real content yet, so performance won't be meaningful)

Tag: `git tag -a v0.4.0-shell -m "Chunk 4: shell complete"`

---

## Chunk 5: Content pages (Portal Home, Per-location Home / About / Contact)

**Goal:** Four types of pages:
1. **Portal home** (`/`) — renders `portalHome` global + 3 academy cards (heroImage + tagline + next session each).
2. **Per-location home** (`/[loc]`) — hero, featured activities (scoped to location), journal preview (scoped to location).
3. **Per-location about** (`/[loc]/about`) — reads from the `locations` collection row (story, team, map, transport). No About global.
4. **Per-location contact** (`/[loc]/contact`) — reads from the `locations` collection row (email/phone/wechatQr/social/FAQ). No Contact global.

**Files affected:**
- Create: `src/app/(frontend)/page.tsx` (portal home)
- Create: `src/app/(frontend)/[loc]/page.tsx` (per-location home)
- Create: `src/app/(frontend)/[loc]/about/page.tsx`
- Create: `src/app/(frontend)/[loc]/contact/page.tsx`
- Create: `src/lib/payload.ts` (helper to get a cached payload client)
- Create: `src/components/portal/AcademyCard.tsx`
- Create: `src/components/home/Hero.tsx`, `FeaturedActivities.tsx`, `JournalPreview.tsx`
- Create: `src/components/about/Team.tsx`, `MapEmbed.tsx`
- Create: `src/components/contact/FAQAccordion.tsx`

### Task 5.1 — Payload client helper

- [ ] **Step 1: `src/lib/payload.ts`**

```ts
import { getPayload } from 'payload'
import configPromise from '../payload.config'

let _payload: any = null
export async function getPayloadClient() {
  if (_payload) return _payload
  _payload = await getPayload({ config: configPromise })
  return _payload
}
```

- [ ] **Step 2: Commit**

### Task 5.2 — Per-location home page

- [ ] **Step 1: Implement** `src/app/(frontend)/[loc]/page.tsx`

Data fetching: activities and journal are filtered by `location.slug === params.loc`.

```tsx
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { getLocale, t } from '@/lib/i18n'
import Hero from '@/components/home/Hero'
import FeaturedActivities from '@/components/home/FeaturedActivities'
import JournalPreview from '@/components/home/JournalPreview'

export default async function LocationHome({ params }: { params: { loc: string } }) {
  const locale = await getLocale()
  const payload = await getPayloadClient()

  // Fetch the location row (validated in layout, but need the data here)
  const locResult = await payload.find({
    collection: 'locations',
    where: { slug: { equals: params.loc } },
    limit: 1, locale, fallbackLocale: 'zh-CN',
  })
  const location = locResult.docs[0]
  if (!location) notFound()

  const [activities, journal] = await Promise.all([
    payload.find({
      collection: 'activities',
      where: {
        and: [
          { status: { equals: 'published' } },
          { 'location.slug': { equals: params.loc } },
          { 'occurrences.startAt': { greater_than: new Date().toISOString() } },
        ],
      },
      limit: 3, sort: 'occurrences.startAt',
      locale, fallbackLocale: 'zh-CN',
    }),
    payload.find({
      collection: 'journal',
      where: {
        and: [
          { status: { equals: 'published' } },
          { 'location.slug': { equals: params.loc } },
        ],
      },
      limit: 3, sort: '-date',
      locale, fallbackLocale: 'zh-CN',
    }),
  ])

  // Hero data comes from the location row (heroImage + tagline as heroSubtitle)
  return (
    <>
      <Hero data={location} locale={locale} loc={params.loc} />
      <FeaturedActivities activities={activities.docs} locale={locale} loc={params.loc} />
      <JournalPreview entries={journal.docs} locale={locale} loc={params.loc} />
    </>
  )
}
```

- [ ] **Step 2: Build `Hero`** — full-bleed image (`location.heroImage`), tagline as subtitle, two CTAs (`/{loc}/book` + `/{loc}/about`). Use `next/image`. Tailwind classes only.

- [ ] **Step 3: Build `FeaturedActivities`** — 3 cards. Each card links to `/{loc}/activities/[slug]`.

- [ ] **Step 4: Build `JournalPreview`** — 3 images linking to `/{loc}/journal/[slug]`.

- [ ] **Step 5: Visual check** — `pnpm dev`, visit `/chiangmai`, see seeded activities.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(home): per-location home with hero from location row, scoped activities"
```

### Task 5.3 — Per-location About page

The About page reads from the `locations` collection row, **not from any global**. Data fetching: `payload.find({ collection: 'locations', where: { slug: { equals: params.loc } } })`.

- [ ] **Step 1: Implement** `src/app/(frontend)/[loc]/about/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { getLocale } from '@/lib/i18n'
import Team from '@/components/about/Team'
import MapEmbed from '@/components/about/MapEmbed'

export default async function AboutPage({ params }: { params: { loc: string } }) {
  const locale = await getLocale()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'locations',
    where: { slug: { equals: params.loc } },
    limit: 1, locale, fallbackLocale: 'zh-CN', depth: 2,
  })
  const location = result.docs[0]
  if (!location) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      {/* story richText */}
      <Team members={location.team ?? []} />
      <div>
        <p>{location.address}</p>
        {location.mapEmbedUrl && <MapEmbed url={location.mapEmbedUrl} />}
      </div>
      {/* transport richText */}
      <a href="https://mindfulpeace.org/" rel="noreferrer">mindfulpeace.org ↗</a>
    </div>
  )
}
```

- [ ] **Step 2: Map embed** — `<iframe src={location.mapEmbedUrl} ... />` wrapped in a styled container; show only if URL is set.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(about): per-location About reading from locations collection"
```

### Task 5.4 — Per-location Contact page

The Contact page reads from the `locations` collection row, **not from any global**. Data fetching pattern same as About.

- [ ] **Step 1: Implement** `src/app/(frontend)/[loc]/contact/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { getLocale } from '@/lib/i18n'
import FAQAccordion from '@/components/contact/FAQAccordion'
import Image from 'next/image'

export default async function ContactPage({ params }: { params: { loc: string } }) {
  const locale = await getLocale()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'locations',
    where: { slug: { equals: params.loc } },
    limit: 1, locale, fallbackLocale: 'zh-CN', depth: 2,
  })
  const location = result.docs[0]
  if (!location) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
      <section className="space-y-3 text-cocoa">
        {location.email && <p>📧 {location.email}</p>}
        {location.phone && <p>📞 {location.phone}</p>}
        {location.wechatQr && (
          <div>
            <p className="mb-2">微信 / WeChat</p>
            <Image src={location.wechatQr.url} width={180} height={180} alt="WeChat QR" />
          </div>
        )}
        {(location.social ?? []).map((s: any) => (
          <p key={s.url}><a href={s.url} rel="noreferrer">{s.label}</a></p>
        ))}
      </section>
      <section>
        <h2 className="font-serif text-2xl mb-4">FAQ</h2>
        <FAQAccordion items={location.faq ?? []} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: FAQAccordion** — native `<details><summary>` for zero JS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(contact): per-location Contact reading from locations collection"
```

### Task 5.5 — Portal home page

The portal home (`/`) renders the `portalHome` global **plus** a grid of all 3 academy cards. Each card shows `heroImage`, `name`, `tagline`, city, and computes "next upcoming session at this academy" (one query per location, or a single query grouped by location).

- [ ] **Step 1: Implement** `src/app/(frontend)/page.tsx`

```tsx
import { getPayloadClient } from '@/lib/payload'
import { getLocale } from '@/lib/i18n'
import AcademyCard from '@/components/portal/AcademyCard'

export default async function PortalHome() {
  const locale = await getLocale()
  const payload = await getPayloadClient()

  const [portalHome, locations] = await Promise.all([
    payload.findGlobal({ slug: 'portal-home', locale, fallbackLocale: 'zh-CN' }),
    payload.find({ collection: 'locations', limit: 10, sort: 'order', locale, fallbackLocale: 'zh-CN', depth: 1 }),
  ])

  // For each location, find the next upcoming activity
  const nextSessions = await Promise.all(
    locations.docs.map(async (loc: any) => {
      const res = await payload.find({
        collection: 'activities',
        where: {
          and: [
            { status: { equals: 'published' } },
            { 'location.slug': { equals: loc.slug } },
            { 'occurrences.startAt': { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1, sort: 'occurrences.startAt',
        locale, fallbackLocale: 'zh-CN',
      })
      return { locSlug: loc.slug, activity: res.docs[0] ?? null }
    })
  )

  return (
    <>
      {/* Portal hero from portalHome global */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-4xl mb-4">{portalHome.heroTitle}</h1>
        <p className="text-smoke text-lg">{portalHome.heroSubtitle}</p>
      </section>
      {/* 3 equal-weight academy cards */}
      <section className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-8">
        {locations.docs.map((loc: any) => {
          const next = nextSessions.find(s => s.locSlug === loc.slug)?.activity ?? null
          return <AcademyCard key={loc.slug} location={loc} nextActivity={next} locale={locale} />
        })}
      </section>
    </>
  )
}
```

- [ ] **Step 2: Build `AcademyCard`** — heroImage (fill), name, city, tagline, "next session" label if activity found, "进入 / Enter →" link to `/{loc}`.

- [ ] **Step 3: Visual check** — `pnpm dev`, visit `/`, see 3 academy cards equal-size.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(portal): portal home with 3 equal academy cards"
```

### Chunk 5 acceptance

- `/` renders portal home with 3 academy cards from seed data
- `/chiangmai` renders per-location home with scoped activities and journal
- `/chiangmai/about` renders story/team/map from the `chiangmai` locations row (not a global)
- `/chiangmai/contact` renders email/phone/wechatQr/social/FAQ from the `chiangmai` locations row (not a global)
- Language switch correctly swaps text on all pages; falls back to zh-CN where en missing
- Mobile Lighthouse ≥ 90 on `/` for SEO and Accessibility

Tag: `v0.5.0-content-pages`

---

## Chunk 6: Activities + journal

**Goal:** `/[loc]/activities` (calendar + list with filter), `/[loc]/activities/[slug]`, `/[loc]/journal`, `/[loc]/journal/[slug]` all working. All routes are scoped to the location from the URL; cross-location data is never rendered.

**Files affected:**
- Create: `src/app/(frontend)/[loc]/activities/page.tsx`, `[slug]/page.tsx`
- Create: `src/app/(frontend)/[loc]/journal/page.tsx`, `[slug]/page.tsx`
- Create: `src/components/activities/CalendarGrid.tsx`, `ActivityCard.tsx`, `CategoryFilter.tsx`, `OccurrenceList.tsx`
- Create: `src/components/journal/JournalGrid.tsx`, `JournalDetail.tsx`
- Create: `src/lib/occurrences.ts` (flatten + filter helpers)

### Task 6.1 — Occurrence flattening helper (TDD)

- [ ] **Step 1: Test** at `src/tests/occurrences.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { flattenUpcoming } from '../lib/occurrences'

const act = (id: string, occs: any[], locSlug = 'chiangmai') => ({ id, title: `A-${id}`, slug: `a-${id}`, occurrences: occs, location: { slug: locSlug } })

describe('flattenUpcoming', () => {
  it('returns sorted future occurrences across activities', () => {
    const now = new Date('2026-09-20T00:00:00Z')
    const activities = [
      act('1', [{ id: 'o1', startAt: '2026-09-21T00:00:00Z', status: 'open' }]),
      act('2', [{ id: 'o2', startAt: '2026-09-19T00:00:00Z', status: 'open' }]), // past
      act('3', [{ id: 'o3', startAt: '2026-09-22T00:00:00Z', status: 'open' }]),
    ]
    const out = flattenUpcoming(activities as any, now)
    expect(out.map(o => o.occurrenceId)).toEqual(['o1', 'o3'])
  })
  it('skips deleted/cancelled', () => {
    const now = new Date('2026-09-20T00:00:00Z')
    const activities = [
      act('1', [
        { id: 'a', startAt: '2026-09-21T00:00:00Z', status: 'cancelled' },
        { id: 'b', startAt: '2026-09-22T00:00:00Z', status: 'open' },
        { id: 'c', startAt: '2026-09-23T00:00:00Z', status: 'deleted' },
      ]),
    ]
    const out = flattenUpcoming(activities as any, now)
    expect(out.map(o => o.occurrenceId)).toEqual(['b'])
  })
  it('filters by location slug when provided', () => {
    const now = new Date('2026-09-20T00:00:00Z')
    const activities = [
      act('1', [{ id: 'o1', startAt: '2026-09-21T00:00:00Z', status: 'open' }], 'chiangmai'),
      act('2', [{ id: 'o2', startAt: '2026-09-21T00:00:00Z', status: 'open' }], 'bangkok'),
    ]
    const out = flattenUpcoming(activities as any, now, 'chiangmai')
    expect(out.map(o => o.occurrenceId)).toEqual(['o1'])
  })
})
```

- [ ] **Step 2: Implement** `src/lib/occurrences.ts`

```ts
export type FlatOcc = {
  activityId: string
  activityTitle: string | { 'zh-CN'?: string; en?: string }
  activitySlug: string
  activityLocationSlug: string
  occurrenceId: string
  startAt: string
  endAt: string
  status: string
  capacityOverride?: number | null
}

export function flattenUpcoming(activities: any[], now: Date = new Date(), locationSlug?: string): FlatOcc[] {
  const result: FlatOcc[] = []
  for (const a of activities) {
    if (locationSlug && a.location?.slug !== locationSlug) continue
    for (const o of a.occurrences ?? []) {
      if (o.status === 'deleted' || o.status === 'cancelled') continue
      if (new Date(o.startAt) < now) continue
      result.push({
        activityId: a.id,
        activityTitle: a.title,
        activitySlug: a.slug,
        activityLocationSlug: a.location?.slug ?? '',
        occurrenceId: o.id,
        startAt: o.startAt,
        endAt: o.endAt,
        status: o.status,
        capacityOverride: o.capacityOverride,
      })
    }
  }
  return result.sort((a, b) => a.startAt.localeCompare(b.startAt))
}
```

- [ ] **Step 3: Pass tests, commit**

```bash
git add -A
git commit -m "feat(occurrences): flatten + filter helper with location-scoped tests"
```

### Task 6.2 — Activities list page

All activities fetched are filtered by `location.slug === params.loc` (spec: "仅此学堂"). Category filter shows categories that have at least one published activity **at this location**.

- [ ] **Step 1: `src/app/(frontend)/[loc]/activities/page.tsx`** — read `params.loc` (from `[loc]` segment) and query param `?cat=<slug>`. Fetch published activities filtered by `location.slug` equals `params.loc`, additionally by category if given. Render:
  - Top: `CalendarGrid` (compact month view; for v1 a static list of upcoming occurrences grouped by month is acceptable)
  - Middle: `CategoryFilter` chips
  - Bottom: grid of `ActivityCard`

- [ ] **Step 2: `CalendarGrid`** — for v1, render the next 30 days, each row a day with occurrences underneath. Real month-grid calendar is v1.1.

- [ ] **Step 3: `CategoryFilter`** — fetch categories that have at least one published activity at this location (`location.slug = params.loc`); render as link chips with `?cat=`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(activities): location-scoped list + filter + upcoming view"
```

### Task 6.3 — Activity detail

The detail page validates that the activity's `location.slug` matches `params.loc` to prevent cross-location URL access (e.g., `/bangkok/activities/chiangmai-event` should 404).

- [ ] **Step 1: `src/app/(frontend)/[loc]/activities/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { getLocale } from '@/lib/i18n'
import { formatDateLong } from '@/lib/time'
import OccurrenceList from '@/components/activities/OccurrenceList'

export default async function ActivityDetail({ params }: { params: { loc: string; slug: string } }) {
  const locale = await getLocale()
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'activities',
    where: { slug: { equals: params.slug }, status: { equals: 'published' } },
    limit: 1, locale, fallbackLocale: 'zh-CN', depth: 2,
  })
  const activity = found.docs[0]
  // Validate that activity belongs to this location (prevent cross-location URLs)
  if (!activity || activity.location?.slug !== params.loc) notFound()

  return (
    <article className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <h1 className="font-serif text-3xl">{activity.title}</h1>
      <p className="text-smoke">{activity.shortDesc}</p>
      {/* render richText description */}
      <OccurrenceList
        occurrences={activity.occurrences ?? []}
        activityId={activity.id}
        activitySlug={params.slug}
        loc={params.loc}
        capacity={activity.capacity}
        locale={locale}
      />
    </article>
  )
}
```

- [ ] **Step 2: `OccurrenceList`** — for each future, non-deleted, non-cancelled occurrence: show `formatDateLong(startAt, locale)`, capacity remaining (from API or computed at request time), and a "立即报名 / Book this session" button linking to `/{loc}/book?occ=<id>&activity=<slug>&src=activity_detail`.

- [ ] **Step 2.5: Shareable-link entry point on the activity detail page**

Spec §7.3 says the shareable URL is `/[locationSlug]/activities/[slug]?occ=<occurrenceId>&src=shared` and "auto-scrolls to the booking area, prefilling the matching session". Implement this on the activity detail page:

- When `?occ=<id>` is present:
  - Find the matching occurrence in `OccurrenceList`
  - Add an anchor `<div id="book-{occurrenceId}">` around its row
  - Render a small client component `<ScrollToBooking targetId="book-{id}" />` that on mount calls `document.getElementById(...).scrollIntoView({ behavior: 'smooth' })` and adds a temporary highlight class
- The "Book this session" link on the matching occurrence carries `src=shared` instead of `src=activity_detail` when arriving via `?src=shared`

- [ ] **Step 3: Render `description` and `notes` rich text** using Payload's rich-text serializer.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(activities): detail page with occurrences and CTAs"
```

### Task 6.4 — Journal list + detail

Journal pages are also location-scoped. The journal list fetches entries filtered by `location.slug === params.loc`, and the detail page validates the same cross-location guard as Activity detail.

- [ ] **Step 1: `[loc]/journal/page.tsx`** — masonry-ish grid of published entries at this location (`location.slug = params.loc`), sorted by date desc, cover image + title + date overlay.

- [ ] **Step 2: `[loc]/journal/[slug]/page.tsx`** — fetch journal entry, validate `entry.location.slug === params.loc` (else 404). Render gallery (photos array), body richText, related activity link if set (link to `/{loc}/activities/[activitySlug]`).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(journal): location-scoped list and detail pages"
```

### Chunk 6 acceptance

- `/chiangmai/activities` lists only Chiang Mai activities (not Bangkok or Phuket)
- `/chiangmai/activities/[slug]` shows full detail; visiting `/bangkok/activities/[chiangmai-slug]` returns 404
- `/chiangmai/journal` and `/chiangmai/journal/[slug]` render seed entries
- Language switch works on all of the above

Tag: `v0.6.0-activities-journal`

---

## Chunk 7: Booking UX

**Goal:** `/[loc]/book` page with two halves (recent activities at this location + general inquiry with academy radio); booking form (modal-style or full-page) with Turnstile; success/waitlist/error UX; shareable links (`?occ=xxx`) prefill the form.

**Files affected:**
- Create: `src/app/(frontend)/[loc]/book/page.tsx`
- Create: `src/components/booking/BookingForm.tsx`
- Create: `src/components/booking/SuccessPanel.tsx`
- Create: `src/components/booking/Turnstile.tsx`

### Task 7.1 — `/[loc]/book` page

- [ ] **Step 1: Server component** at `src/app/(frontend)/[loc]/book/page.tsx`

Reads `params.loc` and URL params `?occ=<id>&activity=<slug>&src=<source>` to know if we're booking a specific session. Fetches upcoming occurrences for this location only for the "recent activities" list. Renders:

- Top: list of next 5 upcoming occurrences at this location (`location.slug = params.loc`), each with "立即报名" button linking to `/{loc}/book?occ=...&activity=...&src=book_list`
- Bottom: form (`BookingForm` component with `location={params.loc}` prop)

### Task 7.2 — Booking form (client component)

The form receives a `location` prop (the current URL's location slug, passed from the server component). For activity bookings, `location` is auto-derived from the activity. For general inquiries, a **radio group** lets the user pick the target academy, defaulting to the current URL's location.

- [ ] **Step 1: `BookingForm.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Turnstile from './Turnstile'

type LocationOption = { slug: string; name: string }

export default function BookingForm({
  locale,
  location,       // current URL's location slug
  allLocations,   // all 3 locations for the academy radio
}: {
  locale: 'zh-CN' | 'en'
  location: string
  allLocations: LocationOption[]
}) {
  const params = useSearchParams()
  const activity = params.get('activity')
  const occ = params.get('occ')
  const src = (params.get('src') as any) || (activity ? 'activity_detail' : 'book_general_inquiry')

  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'waitlist' | 'full' | 'error'>('idle')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  // For general inquiries, track which academy the user selects (default = current URL's location)
  const [selectedLocation, setSelectedLocation] = useState(location)

  const submit = async (form: HTMLFormElement, acceptWaitlist = false) => {
    setState('submitting'); setError(null)
    const data = Object.fromEntries(new FormData(form).entries())
    // For activity bookings, location is derived server-side from the activity.
    // For general inquiries, location is the radio selection.
    const reservationLocation = activity ? undefined : selectedLocation
    const payload = {
      ...data,
      activity: activity || undefined,
      occurrenceId: occ || undefined,
      location: reservationLocation,
      source: src,
      language: locale === 'zh-CN' ? 'zh' : 'en',
      guests: Number(data.guests) || 1,
      turnstileToken: token,
      honeypot: data.website ?? '',
      acceptWaitlist,
    }
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) setState(body.kind === 'waitlisted' ? 'waitlist' : 'success')
    else if (res.status === 409 && body.error === 'capacity_full') setState('full')
    else { setState('error'); setError(body.error ?? 'unknown') }
  }

  if (state === 'success') return <p>{locale === 'zh-CN' ? '已收到!我们会在 24 小时内联系你。' : 'Received! We will reach out within 24 hours.'}</p>
  if (state === 'waitlist') return <p>{locale === 'zh-CN' ? '已加入候补。' : 'Added to waitlist.'}</p>
  if (state === 'full') {
    return (
      <div>
        <p>{locale === 'zh-CN' ? '本场已满,要进候补吗?' : 'This session is full. Join the waitlist?'}</p>
        <button onClick={() => {
          const form = document.querySelector<HTMLFormElement>('#booking-form')
          if (form) submit(form, true)
        }}>{locale === 'zh-CN' ? '加入候补' : 'Join waitlist'}</button>
        <button onClick={() => setState('idle')}>{locale === 'zh-CN' ? '返回' : 'Back'}</button>
      </div>
    )
  }

  return (
    <form id="booking-form" onSubmit={e => { e.preventDefault(); submit(e.currentTarget) }} className="space-y-4">
      {/* General inquiry only: academy radio group */}
      {!activity && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{locale === 'zh-CN' ? '想咨询哪一家? / Which academy?' : 'Which academy?'}</legend>
          {allLocations.map(loc => (
            <label key={loc.slug} className="flex items-center gap-2">
              <input
                type="radio"
                name="locationRadio"
                value={loc.slug}
                checked={selectedLocation === loc.slug}
                onChange={() => setSelectedLocation(loc.slug)}
              />
              {loc.name}
            </label>
          ))}
        </fieldset>
      )}
      <label>姓名 / Name <input name="name" required /></label>
      <label>邮箱 / Email <input name="email" type="email" /></label>
      <label>微信 / WeChat <input name="wechatId" /></label>
      <label>电话 / Phone <input name="phone" required /></label>
      <label>人数 / Guests <input name="guests" type="number" min={1} max={10} defaultValue={1} /></label>
      {!activity && (
        <label>方向 / Direction
          <select name="direction">
            <option value="meditation">禅修 / Meditation</option>
            <option value="mindfulness">正念 / Mindfulness</option>
            <option value="one_on_one">一对一 / One-on-one</option>
            <option value="visit">参观 / Visit</option>
            <option value="other">其他 / Other</option>
          </select>
        </label>
      )}
      <label>备注 / Notes <textarea name="notes" /></label>
      {/* Honeypot — visually hidden */}
      <label className="sr-only">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      <Turnstile onToken={setToken} />
      <button disabled={!token || state === 'submitting'}>{locale === 'zh-CN' ? '提交' : 'Submit'}</button>
      {error && <p className="text-red-700">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 2: `Turnstile.tsx`** — load Cloudflare's Turnstile script and render the widget. Returns a token via callback.

```tsx
'use client'
import { useEffect, useRef } from 'react'

declare global { interface Window { turnstile?: any } }

export default function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!window.turnstile) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true; s.defer = true
      document.head.appendChild(s)
      s.onload = () => render()
    } else render()

    function render() {
      window.turnstile.render(ref.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        callback: (t: string) => onToken(t),
      })
    }
  }, [onToken])
  return <div ref={ref} />
}
```

- [ ] **Step 3: Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY`** to `.env.example` and `.env.local`.

- [ ] **Step 4: Manual smoke test** — open `/chiangmai/book`, fill form, submit; check admin for new reservation (location field should show "chiangmai").

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(booking): /[loc]/book page with location-scoped form, academy radio, Turnstile, success/waitlist UX"
```

### Chunk 7 acceptance

- `/chiangmai/book?occ=<id>&activity=<slug>&src=shared` prefills the form correctly
- General inquiry form shows academy radio group; submitting with "Bangkok" selected writes `location=bangkok` to the reservation
- Activity booking auto-derives location from the activity (no radio shown)
- Submit succeeds → success message + admin row + emails queued
- Capacity-full triggers waitlist prompt
- Submitting with honeypot non-empty quietly fails (no row created)
- Shareable link path `/[loc]/activities/[slug]?occ=<id>&src=shared` auto-scrolls to booking area

Tag: `v0.7.0-booking`

---

## Chunk 8: Admin polish

**Goal:** Custom dashboard, translation helper, new-reservation badge, CSV export.

**Files affected:**
- Create: `src/admin/views/Dashboard.tsx`
- Create: `src/admin/fields/TranslateButton.tsx`
- Create: `src/app/api/translate/route.ts`
- Create: `src/app/api/reservations/export/route.ts`
- Modify: `payload.config.ts` admin component overrides

### Task 8.1 — Custom Dashboard

- [ ] **Step 1: Implement** `src/admin/views/Dashboard.tsx` — server component that fetches:
  - count of `status=pending` reservations
  - next 7 days of occurrences (and per-occurrence occupancy)
  - most recent published journal entry (with "去写日志" link if none in last 14 days)
  - current-month stats: # reservations, % confirmed/total, # new journal entries

Render 4 cards as Tailwind divs.

- [ ] **Step 2: Wire into Payload admin** via `admin.components.views.Dashboard` config in `payload.config.ts`.

- [ ] **Step 3: Visual check** — log into `/admin`, see the dashboard.

- [ ] **Step 4: Commit**

### Task 8.2 — Translation helper button

- [ ] **Step 1: API route** `src/app/api/translate/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getPayload } from 'payload'
import configPromise from '../../../payload.config'

export async function POST(req: NextRequest) {
  // Auth: require logged-in user
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { text, sourceLang, targetLang } = await req.json()
  if (!text || !targetLang) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Translate the following from ${sourceLang} to ${targetLang}. Keep formatting. Output ONLY the translation, no preface.\n\n---\n${text}`,
    }],
  })
  const out = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return NextResponse.json({ translation: out })
}
```

- [ ] **Step 2: Custom field component** `src/admin/fields/TranslateButton.tsx` — uses `useField` for the *other* locale's value, fetches `/api/translate`, calls `setValue`.

- [ ] **Step 3: Attach to `title`, `shortDesc`, `description`, `body`** fields via `admin.components.afterInput`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(admin): translation-helper button using Claude Haiku"
```

### Task 8.3 — New-reservation badge

- [ ] **Step 1: Client component** `src/admin/components/PendingBadge.tsx` polls `/api/reservations/pending-count` every 30s, renders a red dot + number in the admin navigation.

- [ ] **Step 2: API route** at `src/app/api/reservations/pending-count/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '../../../payload.config'

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ count: 0 })
  const { totalDocs } = await payload.find({
    collection: 'reservations',
    where: { status: { equals: 'pending' } },
    limit: 0,
  })
  return NextResponse.json({ count: totalDocs })
}
```

- [ ] **Step 3: Mount the badge** via `admin.components.Nav` override.

- [ ] **Step 4: Commit**

### Task 8.4 — CSV export

- [ ] **Step 1: API route** `src/app/api/reservations/export/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '../../../payload.config'

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined

  const { docs } = await payload.find({
    collection: 'reservations',
    where: status ? { status: { equals: status } } : {},
    limit: 10000,
    depth: 1,
  })

  const rows = [
    ['createdAt','name','phone','email','wechatId','guests','activity','status','language','source'],
    ...docs.map((d: any) => [
      d.createdAt, d.name, d.phone, d.email ?? '', d.wechatId ?? '', d.guests,
      d.activity?.title?.['zh-CN'] ?? d.activity ?? '',
      d.status, d.language, d.source,
    ]),
  ]
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="reservations-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
```

- [ ] **Step 2: Add an "Export CSV" link** in the reservations list view header (via Payload admin custom component).

- [ ] **Step 3: Commit**

### Chunk 8 acceptance

- Login to `/admin`, see custom 4-card dashboard
- Edit an activity, click "翻译到 EN" on the title, English version populates
- Submit a new public reservation, watch the badge increment within 30s
- Click "Export CSV" on the reservations list, file downloads

Tag: `v0.8.0-admin-polish`

---

## Chunk 9: SEO + deployment

**Goal:** Production-ready. sitemap.xml, hreflang, og images, schema.org Event, Sentry, Vercel + Neon + R2 deployed, domain wired, backups verified.

**Files affected:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Modify: layouts to emit hreflang + canonical
- Modify: activity detail to include JSON-LD `Event`
- Create: `next.config.mjs` updates for Sentry
- Create: Vercel project + env, Neon prod DB, R2 bucket + IAM
- Create: `scripts/backup-r2.sh` (or GitHub Action)

### Task 9.1 — sitemap + robots

The sitemap enumerates the portal `/` plus all per-location pages across all 3 academies.

- [ ] **Step 1: `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  const [locations, activities, journal] = await Promise.all([
    payload.find({ collection: 'locations', limit: 10, sort: 'order' }),
    payload.find({ collection: 'activities', where: { status: { equals: 'published' } }, limit: 1000, depth: 1 }),
    payload.find({ collection: 'journal',    where: { status: { equals: 'published' } }, limit: 1000, depth: 1 }),
  ])

  const locSlugs: string[] = locations.docs.map((l: any) => l.slug)

  // Static per-location pages
  const staticPerLoc = locSlugs.flatMap(loc => [
    { url: `${base}/${loc}`,            changeFrequency: 'weekly'  as const, priority: 0.9 },
    { url: `${base}/${loc}/activities`, changeFrequency: 'daily'   as const, priority: 0.9 },
    { url: `${base}/${loc}/journal`,    changeFrequency: 'weekly'  as const, priority: 0.7 },
    { url: `${base}/${loc}/about`,      changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/${loc}/contact`,    changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/${loc}/book`,       changeFrequency: 'weekly'  as const, priority: 0.8 },
  ])

  // Dynamic pages (activities and journal include their location slug in the path)
  const activityPages = activities.docs.map((a: any) => ({
    url: `${base}/${a.location?.slug ?? 'chiangmai'}/activities/${a.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  const journalPages = journal.docs.map((j: any) => ({
    url: `${base}/${j.location?.slug ?? 'chiangmai'}/journal/${j.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1.0 },
    ...staticPerLoc,
    ...activityPages,
    ...journalPages,
  ]
}
```

- [ ] **Step 2: `src/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Commit**

### Task 9.2 — hreflang + canonical per page

- [ ] **Step 1: In each page's `generateMetadata`** emit `alternates`:

```ts
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  // ...check whether en version is "complete" per §6.2
  const hasEn = !!doc.title?.en && !!doc.shortDesc?.en
  return {
    title: doc.title?.[locale === 'zh-CN' ? 'zh-CN' : 'en'] ?? doc.title?.['zh-CN'],
    alternates: {
      canonical: `${BASE}/${currentPath}`,
      languages: hasEn ? {
        'zh-CN': `${BASE}/${path}`,
        'en':    `${BASE}/${path}`,
      } : undefined,
    },
  }
}
```

(Note: we don't separate URLs per locale — locale is cookie-based — so `hreflang` is informational only; we still emit it.)

- [ ] **Step 2: Commit**

### Task 9.3 — og:image + schema.org Event

- [ ] **Step 1: Each page's `generateMetadata` includes `openGraph.images`** — for activities, use `heroImage.sizes.og.url`.

- [ ] **Step 2: Activity detail page renders JSON-LD `Event`** for each upcoming occurrence. The `location` field in schema.org uses `activity.location.address` from the Locations collection (not the old free-text field):

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: activity.title,
  startDate: occurrence.startAt,
  endDate: occurrence.endAt,
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: activity.location?.name ?? '',
    address: activity.location?.address ?? '',
  },
  image: activity.heroImage?.sizes?.og?.url,
  organizer: {
    '@type': 'Organization',
    name: activity.location?.name ?? 'Mindfulpeace Academy Thailand',
    url: `https://mindfulpeaceth.com/${activity.location?.slug ?? ''}`,
  },
}) }} />
```

- [ ] **Step 3: Commit**

### Task 9.4 — Sentry

- [ ] **Step 1: `pnpm dlx @sentry/wizard@latest -i nextjs`** — wizard sets up the configs.

- [ ] **Step 2: Verify `SENTRY_DSN` in env, trigger a test error in dev, confirm it shows in Sentry dashboard.**

- [ ] **Step 3: Commit** (wizard creates files; commit those)

### Task 9.5 — Vercel deployment

GitHub account: **`zoeeduann`** (already known). Suggested repo name: `jingxin-academy-site`. Resulting URL: `https://github.com/zoeeduann/jingxin-academy-site`. Production domain: **`mindfulpeaceth.com`** (confirmed purchased 2026-05-12; ready to wire).

- [ ] **Step 0: Push the repo to GitHub** under the user's account

```bash
gh repo create zoeeduann/jingxin-academy-site --private --source=. --remote=origin --push
```

(If `gh` isn't installed, create via the web UI then `git remote add origin git@github.com:zoeeduann/jingxin-academy-site.git && git push -u origin main`.)

- [ ] **Step 1: Create Vercel project** linked to the GitHub repo
- [ ] **Step 2: Create Neon project + prod database**; copy connection string into Vercel env as `DATABASE_URI`
- [ ] **Step 3: Create Cloudflare R2 bucket + R2 API token**; put credentials into Vercel env
- [ ] **Step 4: Wire `@payloadcms/storage-s3` in `payload.config.ts`** — add the plugin guarded by `S3_BUCKET`:

```ts
import { s3Storage } from '@payloadcms/storage-s3'

export default buildConfig({
  // ...
  plugins: [
    ...(process.env.S3_BUCKET ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.S3_BUCKET!,
        config: {
          endpoint: process.env.S3_ENDPOINT!,
          region: process.env.S3_REGION || 'auto',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          },
          forcePathStyle: true,
        },
      }),
    ] : []),
  ],
})
```

In dev, with `S3_BUCKET` unset, Payload falls back to local disk storage automatically.
- [ ] **Step 5: Set all other env vars in Vercel**: `PAYLOAD_SECRET`, `GMAIL_*`, `TURNSTILE_*`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_BASE_URL`
- [ ] **Step 6: Trigger production deploy**; verify the build succeeds
- [ ] **Step 7: Run seed script against prod** (`pnpm seed` with prod `DATABASE_URI` locally, one-off)

### Task 9.6 — Domain

- [ ] **Step 1: Add `mindfulpeaceth.com`** to the Vercel project domains (domain is already purchased); Vercel issues SSL via Let's Encrypt automatically.

- [ ] **Step 2: User updates DNS** at their registrar to point to Vercel (A `76.76.21.21` or CNAME per Vercel instructions).

- [ ] **Step 3: Verify the site loads on `mindfulpeaceth.com`**, including admin login. Verify `mindfulpeaceth.com/chiangmai`, `mindfulpeaceth.com/bangkok`, and `mindfulpeaceth.com/phuket` all resolve correctly.

### Task 9.7 — Backups

- [ ] **Step 1: Verify Neon daily snapshots are on (default).**

- [ ] **Step 2: Configure a weekly GitHub Action** that streams R2 → an independent backup S3 bucket:

```yaml
# .github/workflows/r2-backup.yml
name: R2 weekly backup
on:
  schedule: [ { cron: '0 3 * * 0' } ] # Sundays 03:00 UTC
  workflow_dispatch: {}
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install rclone
        run: curl https://rclone.org/install.sh | sudo bash
      - name: Configure rclone
        run: |
          mkdir -p ~/.config/rclone
          cat > ~/.config/rclone/rclone.conf <<EOF
          [r2]
          type = s3
          provider = Cloudflare
          access_key_id = ${{ secrets.R2_ACCESS_KEY_ID }}
          secret_access_key = ${{ secrets.R2_SECRET_ACCESS_KEY }}
          endpoint = ${{ secrets.R2_ENDPOINT }}

          [bkp]
          type = s3
          provider = AWS
          access_key_id = ${{ secrets.BACKUP_AWS_KEY }}
          secret_access_key = ${{ secrets.BACKUP_AWS_SECRET }}
          region = us-east-1
          EOF
      - name: Sync
        run: rclone sync r2:${{ secrets.R2_BUCKET }} bkp:${{ secrets.BACKUP_BUCKET }} --progress
```

- [ ] **Step 3: Test by manually triggering the workflow once.**

### Task 9.8 — Backup restore drill

Spec §13 requires "执行过一次完整恢复演练" (run one full restore drill) before launch.

- [ ] **Step 1: Create a scratch Neon branch from the latest daily snapshot**

```bash
# Via Neon CLI or dashboard: create branch from 'main' at <yesterday>
```

- [ ] **Step 2: Connect a local Payload instance to the scratch branch DATABASE_URI** and run `pnpm dev`

- [ ] **Step 3: Verify row counts** match prod for the 6 collections (locations, users, media, categories, activities, journal, reservations, email-jobs) + 2 globals (portalHome, Settings) (do a `SELECT count(*) FROM payload.{table}` on both)

- [ ] **Step 4: Restore one R2 backup file** (`rclone copy bkp:bucket/<file> r2-scratch:bucket/`) and verify it renders

- [ ] **Step 5: Tear down scratch branch.** Document the steps in `docs/runbooks/restore.md` for future reference

### Task 9.9 — Lighthouse / PageSpeed Insights measurement

Spec §13 acceptance requires LCP ≤ 2.5s and Lighthouse ≥ 90 on the portal `/`, the Chiang Mai subsite home, an activity detail, and `/chiangmai/book` (mobile, Slow 4G). Testing the Chiang Mai academy is the worst-case localized path (full bilingual content, seeded data, location-scoped queries).

- [ ] **Step 1: Run PageSpeed Insights via the public URL** for all four pages

```bash
# Use the public API for repeatability:
for URL in "/" "/chiangmai" "/chiangmai/activities/<slug>" "/chiangmai/book"; do
  curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://mindfulpeaceth.com${URL}&strategy=mobile" \
    | jq '.lighthouseResult.categories | with_entries(.value = .value.score)'
done
```

- [ ] **Step 2: Record scores** in a `docs/runbooks/lighthouse-baseline.md` file (one row per page: URL / performance / accessibility / best-practices / seo / LCP / CLS)

- [ ] **Step 3: If any page fails any criterion** — pause launch, investigate (most likely culprits: unoptimized hero image, no `priority` on hero `<Image>`, blocking JS, or external Turnstile script loading too eagerly)

- [ ] **Step 4: Commit baseline file**

```bash
git add docs/runbooks/
git commit -m "docs: add lighthouse and restore runbooks"
```

### Chunk 9 acceptance

- Production site loads on custom domain with HTTPS
- sitemap.xml returns all published pages, excludes `/admin`
- og:image previews on FB / Slack share
- Activity detail's JSON-LD passes Google Rich Results Test
- Sentry receives an intentional test error
- R2 backup workflow runs successfully

Tag: `v1.0.0-launch`

---

## Final acceptance checklist (cross-chunk)

Run through §13 of the spec one more time. Specifically the **专项演练**:

- [ ] **并发抢名额**: two parallel requests for the last spot — exactly one wins
- [ ] **时区**: viewing the site from a Chinese IP shows times labelled ICT
- [ ] **邮件失败**: misconfigure Gmail app password, verify reservation still writes and `emailStatus=failed`
- [ ] **类别删除**: try to delete a category with activities — refused
- [ ] **活动删除**: try to delete an activity with reservations — refused; archive works
- [ ] **双语回退**: activity with only zh title shows zh on /en too; `hreflang` not emitted
- [ ] **占位图人工 review**: all `isPlaceholder=true` images checked or replaced
- [ ] **学堂切换器**: 在 `/chiangmai/activities` 切到曼谷,落地 `/bangkok/activities`
- [ ] **跨学堂数据隔离**: `/chiangmai/activities` 不显示曼谷的活动
- [ ] **自由咨询表单**: radio 选学堂正确写入 `reservation.location`
- [ ] **Portal `/`**: 平等展示 3 家学堂(3 张大卡同等尺寸并排)

---

## Handoff

After Chunk 9: **invoke superpowers:subagent-driven-development** to execute this plan, with each task as a dispatched subagent.
