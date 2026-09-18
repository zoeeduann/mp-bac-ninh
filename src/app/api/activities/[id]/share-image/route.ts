import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayloadClient } from '@/lib/payload'
import { activityImageUrl } from '@/lib/activity-image'
import { renderActivityShare } from '@/lib/render-activity-share'
import { fetchInlineImage } from '@/lib/poster-image'
import { shareBrandName, shareDomain } from '@/lib/activity-share'
import { SITE_LOCATION_SLUG } from '@/lib/site-config'

export const runtime = 'nodejs'
export const maxDuration = 30
let fontPromise: Promise<ArrayBuffer> | undefined
function shareFont() {
  return fontPromise ??= readFile(path.join(process.cwd(), 'assets/fonts/ShareSans.ttf'))
    .then(buffer => new Uint8Array(buffer).buffer)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  const locale = new URL(request.url).searchParams.get('locale') || 'zh-CN'
  if (!Number.isSafeInteger(id) || id < 1 || !['zh-CN', 'en'].includes(locale)) return new Response('Not found', { status: 404 })
  const lang = locale as 'zh-CN' | 'en'
  const payload = await getPayloadClient()
  // Same fallback as the public activity pages, so the preview matches the page.
  const { docs } = await payload.find({ collection: 'activities',
    where: { and: [{ id: { equals: id } }, { status: { equals: 'published' } }] },
    locale: lang, fallbackLocale: 'zh-CN', depth: 2, limit: 1, overrideAccess: true })
  const activity = docs[0]
  if (!activity || typeof activity.title !== 'string' || !activity.title.trim()) return new Response('Not found', { status: 404 })
  const location = activity.location && typeof activity.location === 'object' ? activity.location : null
  // The database is shared with other academies; only brand this site's own events.
  if (SITE_LOCATION_SLUG && location?.slug !== SITE_LOCATION_SLUG) return new Response('Not found', { status: 404 })
  const cover = activityImageUrl(activity.heroImage, 'hero')
  if (!cover) return new Response('Artwork unavailable', { status: 404 })
  const image = await fetchInlineImage(cover, 756, 90, 'png')
  if (!image) return new Response('Artwork temporarily unavailable', { status: 503 })
  const response = renderActivityShare({ title: activity.title,
    academy: shareBrandName(location?.name, lang), domain: shareDomain(),
    image, font: await shareFont() })
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=3600')
  return response
}
