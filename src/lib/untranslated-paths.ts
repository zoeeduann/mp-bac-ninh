import { hasUsableLocalizedTitle } from './public-locale'
import { locationPublicPath } from './site-config'

type DetailDoc = { slug?: unknown; title?: unknown; location?: unknown }

/** Public (unprefixed) detail paths whose English version does not exist. */
export function zhOnlyPaths(section: 'activities' | 'journal', docs: DetailDoc[]): string[] {
  return docs.flatMap((doc) => {
    const locSlug =
      doc.location && typeof doc.location === 'object'
        ? (doc.location as { slug?: unknown }).slug
        : null
    if (typeof locSlug !== 'string' || typeof doc.slug !== 'string' || !doc.slug.trim()) return []
    if (hasUsableLocalizedTitle(doc.title, 'en')) return []
    return [locationPublicPath(locSlug, `/${section}/${doc.slug}`)]
  })
}

/**
 * Chinese detail pages without an English translation. The language toggle
 * uses this to avoid linking to /en URLs that would only redirect.
 */
export async function getZhOnlyDetailPaths(): Promise<string[]> {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const query = {
    where: { status: { equals: 'published' } },
    limit: 1000,
    depth: 1,
    locale: 'en',
    fallbackLocale: false,
    overrideAccess: true,
  } as const
  const [activities, journal] = await Promise.all([
    payload.find({ collection: 'activities', ...query }),
    payload.find({ collection: 'journal', ...query }),
  ])
  return [
    ...zhOnlyPaths('activities', activities.docs as DetailDoc[]),
    ...zhOnlyPaths('journal', journal.docs as DetailDoc[]),
  ]
}
