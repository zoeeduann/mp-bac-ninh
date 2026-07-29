import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { zh } from '@payloadcms/translations/languages/zh'
import { en } from '@payloadcms/translations/languages/en'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Locations } from './collections/Locations'
import { Activities } from './collections/Activities'
import { Journal } from './collections/Journal'
import { Reservations } from './collections/Reservations'
import { EmailJobs } from './collections/EmailJobs'
import { PortalHome, Settings } from './globals'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required environment variable: ${name}`)
  return v
}

function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return
  // Skip during `next build` — the build phase sets NEXT_PHASE and does not
  // have runtime credentials available. Validation fires at server startup.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const required = [
    'DATABASE_URI',
    'PAYLOAD_SECRET',
    'NEXT_PUBLIC_SERVER_URL',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'TURNSTILE_SECRET_KEY',
    'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'S3_ENDPOINT',
    'ADMIN_EMAIL',
  ]
  const missing = required.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(
      `[production] Missing required environment variables: ${missing.join(', ')}\n` +
        `Set these in Vercel → Project Settings → Environment Variables.`,
    )
  }
}

validateProductionEnv()

const PAYLOAD_SECRET = requireEnv('PAYLOAD_SECRET')
const DATABASE_URI = requireEnv('DATABASE_URI')

export default buildConfig({
  // serverURL gives Payload a stable canonical URL for SSR rendering
  // (OG images, internal absolute-URL generation). Without this, Payload's
  // default falls back to http://localhost:3000 in production.
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Force light theme — auto-detecting system colour scheme causes a
    // server/client hydration mismatch (SSR renders data-theme="light",
    // client switches to "dark" if the user's OS is dark mode), and React 19
    // throws away the SSR'd login form on mismatch, leaving an empty body.
    theme: 'light',
    components: {
      // /admin/help — operator-facing usage guide rendered from
      // docs/admin-guide.md
      views: {
        Help: {
          Component: '@/components/admin/HelpView',
          path: '/help',
        },
      },
      // Sidebar link to the help view, below the collection nav
      afterNavLinks: ['@/components/admin/HelpNavLink'],
    },
  },
  i18n: {
    supportedLanguages: { zh, en },
    fallbackLanguage: 'zh',
  },
  collections: [Users, Media, Categories, Locations, Activities, Journal, Reservations, EmailJobs],
  globals: [PortalHome, Settings],
  editor: lexicalEditor(),
  secret: PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: DATABASE_URI,
    },
    // Apply checked-in, additive migrations before Payload serves production
    // queries. Development still uses push mode below.
    prodMigrations: migrations,
    // Keep local development convenient; Payload only runs push mode outside
    // production. Production schema changes belong in `src/migrations`.
    push: true,
  }),
  localization: {
    locales: [
      { label: '中文', code: 'zh-CN' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'zh-CN',
    fallback: true,
  },
  sharp,
  plugins: [
    ...(process.env.S3_BUCKET
      ? [
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
        ]
      : []),
  ],
})
