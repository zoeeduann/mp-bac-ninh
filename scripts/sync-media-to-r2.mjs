// One-off: upload local ./media/* to R2 bucket.
// Usage: node --env-file .env.production.local scripts/sync-media-to-r2.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { S3Client, PutObjectCommand } = require('./aws-sdk-shim.cjs')
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = process.env
if (!S3_BUCKET) throw new Error('Missing S3_* env vars')

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION || 'auto',
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
})

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' }

const files = readdirSync('media').filter((f) => statSync(join('media', f)).isFile())
console.log(`Found ${files.length} files in ./media to upload to ${S3_BUCKET}`)

let ok = 0, fail = 0
for (const f of files) {
  const ext = extname(f).toLowerCase()
  try {
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: f,
      Body: readFileSync(join('media', f)),
      ContentType: MIME[ext] || 'application/octet-stream',
    }))
    ok++
    if (ok % 50 === 0) console.log(`  ${ok}/${files.length}`)
  } catch (e) {
    fail++
    console.error(`  FAIL ${f}: ${e.message}`)
  }
}
console.log(`Done. ${ok} uploaded, ${fail} failed.`)
