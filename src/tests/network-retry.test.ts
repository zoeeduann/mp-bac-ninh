// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { fetchRetryingNetworkErrors, networkErrorDetail } from '@/lib/network-retry'

function networkError(code: string, message = 'socket hang up') {
  return new TypeError('fetch failed', { cause: Object.assign(new Error(message), { code }) })
}

describe('fetchRetryingNetworkErrors', () => {
  it('retries once when the connection fails before any response', async () => {
    const attempt = vi.fn()
      .mockRejectedValueOnce(networkError('ECONNRESET'))
      .mockResolvedValueOnce(new Response('ok'))
    const response = await fetchRetryingNetworkErrors(attempt, 0)
    expect(await response.text()).toBe('ok')
    expect(attempt).toHaveBeenCalledTimes(2)
  })

  it('gives up after the single retry and keeps the underlying cause', async () => {
    const attempt = vi.fn().mockRejectedValue(networkError('ENOTFOUND', 'getaddrinfo ENOTFOUND example.com'))
    const error = await fetchRetryingNetworkErrors(attempt, 0).catch((e) => e)
    expect(attempt).toHaveBeenCalledTimes(2)
    expect(networkErrorDetail(error)).toBe('ENOTFOUND getaddrinfo ENOTFOUND example.com')
  })

  it('does not retry HTTP errors or timeouts', async () => {
    const http = vi.fn().mockResolvedValue(new Response('busy', { status: 429 }))
    expect((await fetchRetryingNetworkErrors(http, 0)).status).toBe(429)
    expect(http).toHaveBeenCalledOnce()

    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' })
    const slow = vi.fn().mockRejectedValue(timeout)
    await expect(fetchRetryingNetworkErrors(slow, 0)).rejects.toBe(timeout)
    expect(slow).toHaveBeenCalledOnce()
  })
})

describe('networkErrorDetail', () => {
  it('returns undefined for errors that are not network failures', () => {
    expect(networkErrorDetail(new Error('provider unavailable'))).toBeUndefined()
  })

  it('falls back to a generic label when the cause is missing', () => {
    expect(networkErrorDetail(new TypeError('fetch failed'))).toBe('network error')
  })
})
