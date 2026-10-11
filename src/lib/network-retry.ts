/** Node's fetch reports every connection-level failure as `TypeError('fetch failed')`. */
function isNetworkError(error: unknown): error is TypeError {
  return error instanceof TypeError && error.message === 'fetch failed'
}

/**
 * The real reason (ECONNRESET, ENOTFOUND, a TLS error…) lives in `error.cause`;
 * without it a stored "fetch failed" cannot be diagnosed afterwards.
 */
export function networkErrorDetail(error: unknown): string | undefined {
  if (!isNetworkError(error)) return undefined
  const cause = error.cause as { code?: unknown; message?: unknown } | undefined
  const detail = [cause?.code, cause?.message]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ')
  return (detail || 'network error').slice(0, 160)
}

/**
 * Retry a request when the connection itself failed, up to `attempts` tries in
 * all. HTTP error responses and timeouts are returned or thrown unchanged, so a
 * slow or refusing provider is never asked twice.
 */
export async function fetchRetryingNetworkErrors(
  attempt: () => Promise<Response>,
  delayMs = 2_000,
  attempts = 2,
): Promise<Response> {
  for (let tried = 1; ; tried++) {
    try {
      return await attempt()
    } catch (error) {
      if (!isNetworkError(error) || tried >= attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}
