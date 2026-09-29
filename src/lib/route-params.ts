/**
 * Next.js hands dynamic segments over still percent-encoded, so a Chinese slug
 * arrives as `%E7%A6%85...` and never matches the stored value.
 */
export async function getRouteParams<T extends { slug: string }>(params: Promise<T>): Promise<T> {
  const p = await params
  try {
    return { ...p, slug: decodeURIComponent(p.slug) }
  } catch {
    return p // malformed percent-encoding: leave as-is and let the lookup 404
  }
}
