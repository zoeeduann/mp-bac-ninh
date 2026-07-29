import { submitIndexNowUrls } from '../src/lib/indexnow'

const base = process.env.NEXT_PUBLIC_SERVER_URL

if (!base) {
  console.error('NEXT_PUBLIC_SERVER_URL is required, for example https://mindfulpeaceth.com')
  process.exit(1)
}

const sitemapUrl = new URL('/sitemap.xml', base).toString()

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function main() {
  const response = await fetch(sitemapUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sitemapUrl}: ${response.status}`)
  }

  const xml = await response.text()
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) =>
    decodeXml(match[1].trim()),
  )

  const result = await submitIndexNowUrls(urls, { base })
  if (!result.ok) {
    console.error('[indexnow] submission failed', result)
    process.exit(1)
  }

  console.log(
    `[indexnow] ${result.skipped ? 'skipped' : 'submitted'} ${result.submittedUrls.length} URL(s) from ${sitemapUrl}${result.reason ? ` (${result.reason})` : ''}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
