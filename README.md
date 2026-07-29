# 越南北宁善明小院 / Mindfulpeace Bac Ninh

Bilingual (中文 / English) independent website, activities calendar, booking
flow, and Payload CMS for 越南北宁善明小院.

Production: **https://mindfulpeacebacninh.com**

## Architecture

This repository is deployed as a dedicated single-location site:

```env
NEXT_PUBLIC_SERVER_URL=https://mindfulpeacebacninh.com
NEXT_PUBLIC_SITE_LOCATION_SLUG=bac-ninh
```

The public frontend exposes Bac Ninh at `/`, `/activities`, `/journal`,
`/about`, `/book`, and `/contact`. The internal App Router continues to use the
`/[loc]` route so this repository can share the existing Payload collections.

The deployment shares the production Postgres database, R2 media bucket,
Payload secret, email sender, and administrator accounts with the established
Mindfulpeace platform. Public navigation, SEO metadata, sitemap entries,
IndexNow notifications, and staff access are scoped to Bac Ninh.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. Payload admin is at
`http://localhost:3000/admin`.

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Production environment

Create the Vercel project from
`zoeeduann/mp-bac-ninh`, then copy the shared production values
from the existing Thailand project and override these two variables:

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_SERVER_URL` | `https://mindfulpeacebacninh.com` |
| `NEXT_PUBLIC_SITE_LOCATION_SLUG` | `bac-ninh` |

Shared required variables:

- `DATABASE_URI`
- `PAYLOAD_SECRET`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `ADMIN_EMAIL`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_HOSTNAME`

Optional integrations:

- `ANTHROPIC_API_KEY`
- `INDEXNOW_KEY`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Domain

Add both domains to the dedicated Vercel project:

- `mindfulpeacebacninh.com` — primary
- `www.mindfulpeacebacninh.com` — redirect to the primary domain

Use the DNS records Vercel provides. Vercel handles TLS after DNS validation.

## Admin access

Administrators can manage all shared content. A `staff` user assigned to the
Bac Ninh location can only view and edit that location, its activities,
journal entries, and reservations. Structural fields and network-wide settings
remain administrator-only.

## Stack

Payload CMS v3 · Next.js 15 · TypeScript · Tailwind CSS · Postgres (Neon) ·
Cloudflare R2 · Vercel
