import { BASE } from './metadata'

export const DEFAULT_INDEXNOW_KEY =
  'e32d16a067cca699415242efd714fdff259790c4c5aa40ae27793be4004984ab'

export const DEFAULT_INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_MAX_URLS = 10_000
const INDEXNOW_TIMEOUT_MS = 4_000
const INDEXNOW_KEY_RE = /^[A-Za-z0-9-]{8,128}$/

type Env = Record<string, string | undefined>
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface SubmitIndexNowOptions {
  base?: string
  endpoint?: string
  env?: Env
  fetchImpl?: FetchLike
  key?: string | null
  timeoutMs?: number
}

export interface SubmitIndexNowResult {
  ok: boolean
  skipped: boolean
  reason?: string
  status?: number
  submittedUrls: string[]
  responseText?: string
  error?: string
}

export function isValidIndexNowKey(key: string): boolean {
  return INDEXNOW_KEY_RE.test(key)
}

export function getIndexNowKey(env: Env = process.env): string | null {
  if (env.INDEXNOW_DISABLED === 'true') return null
  const key = (env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY).trim()
  return isValidIndexNowKey(key) ? key : null
}

export function indexNowKeyLocation(key: string, base = BASE): string {
  const root = new URL(base)
  return `${root.origin}/${key}.txt`
}

export function normalizeIndexNowUrl(rawUrl: string, base = BASE): string | null {
  try {
    const root = new URL(base)
    const url = new URL(rawUrl, root)
    if (url.host !== root.host) return null
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function uniqueIndexNowUrls(rawUrls: string[], base = BASE): string[] {
  const seen = new Set<string>()
  const urls: string[] = []

  for (const rawUrl of rawUrls) {
    const url = normalizeIndexNowUrl(rawUrl, base)
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
    if (urls.length >= INDEXNOW_MAX_URLS) break
  }

  return urls
}

export function shouldSubmitIndexNowForBase(
  base = BASE,
  env: Env = process.env,
): boolean {
  try {
    const host = new URL(base).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return env.INDEXNOW_ALLOW_LOCALHOST === 'true'
    }
    return true
  } catch {
    return false
  }
}

export async function submitIndexNowUrls(
  rawUrls: string[],
  opts: SubmitIndexNowOptions = {},
): Promise<SubmitIndexNowResult> {
  const env = opts.env ?? process.env
  const base = opts.base ?? BASE
  const key = opts.key === undefined ? getIndexNowKey(env) : opts.key
  const submittedUrls = uniqueIndexNowUrls(rawUrls, base)

  if (!key) {
    return { ok: true, skipped: true, reason: 'missing-or-disabled-key', submittedUrls }
  }
  if (!isValidIndexNowKey(key)) {
    return { ok: false, skipped: true, reason: 'invalid-key', submittedUrls }
  }
  if (!shouldSubmitIndexNowForBase(base, env)) {
    return { ok: true, skipped: true, reason: 'local-or-invalid-base', submittedUrls }
  }
  if (submittedUrls.length === 0) {
    return { ok: true, skipped: true, reason: 'no-valid-urls', submittedUrls }
  }

  const root = new URL(base)
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? INDEXNOW_TIMEOUT_MS,
  )

  try {
    const fetchImpl = opts.fetchImpl ?? fetch
    const response = await fetchImpl(opts.endpoint ?? DEFAULT_INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: root.host,
        key,
        keyLocation: indexNowKeyLocation(key, base),
        urlList: submittedUrls,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })

    const responseText = await response.text().catch(() => '')
    return {
      ok: response.status === 200 || response.status === 202,
      skipped: false,
      status: response.status,
      submittedUrls,
      responseText,
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      submittedUrls,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}
