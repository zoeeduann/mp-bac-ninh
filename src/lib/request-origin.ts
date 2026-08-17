interface SameOriginRequestOptions {
  requestUrl: string
  origin: string | null
  isProduction: boolean
}

/**
 * Browsers include an Origin header on same-origin JSON POST requests. When a
 * deployment does not use a CAPTCHA, reject browser submissions originating
 * from another site before any database work is performed.
 */
export function isAllowedSameOriginRequest({
  requestUrl,
  origin,
  isProduction,
}: SameOriginRequestOptions): boolean {
  if (!isProduction) return true
  if (!origin) return false

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}
