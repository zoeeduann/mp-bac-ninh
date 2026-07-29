import { LOCALES } from './i18n'
import { localizedUrl } from './locale-url'
import { BASE } from './metadata'
import { submitIndexNowUrls, type SubmitIndexNowResult } from './indexnow'
import { locationPublicPath, SITE_LOCATION_SLUG } from './site-config'

type PayloadRequestLike = {
  context?: Record<string, unknown>
  payload?: {
    findByID?: (args: Record<string, unknown>) => Promise<unknown>
    logger?: {
      info?: (...args: unknown[]) => void
      warn?: (...args: unknown[]) => void
      error?: (...args: unknown[]) => void
    }
  }
}

type DocLike = Record<string, unknown> | null | undefined

function localizedUrls(path: string, base = BASE): string[] {
  return LOCALES.map((locale) => localizedUrl(locale, path, base))
}

function relationshipSlug(value: unknown): string | null {
  if (value && typeof value === 'object' && typeof (value as { slug?: unknown }).slug === 'string') {
    return (value as { slug: string }).slug
  }
  return null
}

function relationshipId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return null
}

async function resolveLocationSlug(
  value: unknown,
  req?: PayloadRequestLike,
): Promise<string | null> {
  const directSlug = relationshipSlug(value)
  if (directSlug) return directSlug

  const id = relationshipId(value)
  if (!id || !req?.payload?.findByID) return null

  try {
    const location = await req.payload.findByID({
      collection: 'locations',
      id,
      locale: 'zh-CN',
      overrideAccess: true,
    })
    return relationshipSlug(location)
  } catch {
    return null
  }
}

function shouldNotifyPublished(doc: DocLike, previousDoc: DocLike): boolean {
  return doc?.status === 'published' || previousDoc?.status === 'published'
}

function shouldSkip(req?: PayloadRequestLike): boolean {
  return Boolean(req?.context?.skipIndexNow || req?.context?.skipAutoTranslate)
}

export function indexNowUrlsForLocationSlug(slug: string, base = BASE): string[] {
  if (SITE_LOCATION_SLUG && slug !== SITE_LOCATION_SLUG) return []
  return [
    ...(SITE_LOCATION_SLUG ? [] : localizedUrls('/', base)),
    ...localizedUrls(locationPublicPath(slug), base),
    ...localizedUrls(locationPublicPath(slug, '/activities'), base),
    ...localizedUrls(locationPublicPath(slug, '/journal'), base),
    ...localizedUrls(locationPublicPath(slug, '/about'), base),
    ...localizedUrls(locationPublicPath(slug, '/contact'), base),
    ...localizedUrls(locationPublicPath(slug, '/book'), base),
  ]
}

export async function indexNowUrlsForActivity(
  doc: DocLike,
  previousDoc: DocLike,
  req?: PayloadRequestLike,
  base = BASE,
): Promise<string[]> {
  const slug = typeof doc?.slug === 'string'
    ? doc.slug
    : typeof previousDoc?.slug === 'string'
      ? previousDoc.slug
      : null
  const location = doc?.location ?? previousDoc?.location
  const locationSlug = await resolveLocationSlug(location, req)
  if (!slug || !locationSlug) return []
  if (SITE_LOCATION_SLUG && locationSlug !== SITE_LOCATION_SLUG) return []

  return [
    ...localizedUrls(locationPublicPath(locationSlug, `/activities/${slug}`), base),
    ...localizedUrls(locationPublicPath(locationSlug, '/activities'), base),
    ...localizedUrls(locationPublicPath(locationSlug), base),
  ]
}

export async function indexNowUrlsForJournal(
  doc: DocLike,
  previousDoc: DocLike,
  req?: PayloadRequestLike,
  base = BASE,
): Promise<string[]> {
  const slug = typeof doc?.slug === 'string'
    ? doc.slug
    : typeof previousDoc?.slug === 'string'
      ? previousDoc.slug
      : null
  const location = doc?.location ?? previousDoc?.location
  const locationSlug = await resolveLocationSlug(location, req)
  if (!slug || !locationSlug) return []
  if (SITE_LOCATION_SLUG && locationSlug !== SITE_LOCATION_SLUG) return []

  return [
    ...localizedUrls(locationPublicPath(locationSlug, `/journal/${slug}`), base),
    ...localizedUrls(locationPublicPath(locationSlug, '/journal'), base),
    ...localizedUrls(locationPublicPath(locationSlug), base),
  ]
}

function logResult(
  req: PayloadRequestLike | undefined,
  label: string,
  result: SubmitIndexNowResult,
) {
  const logger = req?.payload?.logger
  if (result.skipped) {
    logger?.info?.(`[indexnow] skipped ${label}: ${result.reason}`)
    return
  }
  if (result.ok) {
    logger?.info?.(`[indexnow] submitted ${label}: ${result.submittedUrls.length} url(s)`)
    return
  }
  logger?.warn?.(
    `[indexnow] failed ${label}: status=${result.status ?? 'n/a'} error=${result.error ?? result.responseText ?? 'unknown'}`,
  )
}

async function submitAndLog(
  req: PayloadRequestLike | undefined,
  label: string,
  urls: string[],
) {
  const result = await submitIndexNowUrls(urls)
  logResult(req, label, result)
}

export async function notifyIndexNowForActivity({
  doc,
  previousDoc,
  req,
}: {
  doc: DocLike
  previousDoc?: DocLike
  req?: PayloadRequestLike
}): Promise<void> {
  if (shouldSkip(req) || !shouldNotifyPublished(doc, previousDoc)) return
  const urls = await indexNowUrlsForActivity(doc, previousDoc, req)
  await submitAndLog(req, 'activity', urls)
}

export async function notifyIndexNowForJournal({
  doc,
  previousDoc,
  req,
}: {
  doc: DocLike
  previousDoc?: DocLike
  req?: PayloadRequestLike
}): Promise<void> {
  if (shouldSkip(req) || !shouldNotifyPublished(doc, previousDoc)) return
  const urls = await indexNowUrlsForJournal(doc, previousDoc, req)
  await submitAndLog(req, 'journal', urls)
}

export async function notifyIndexNowForLocation({
  doc,
  req,
}: {
  doc: DocLike
  req?: PayloadRequestLike
}): Promise<void> {
  if (shouldSkip(req)) return
  const slug = typeof doc?.slug === 'string' ? doc.slug : null
  if (!slug) return
  await submitAndLog(req, 'location', indexNowUrlsForLocationSlug(slug))
}
