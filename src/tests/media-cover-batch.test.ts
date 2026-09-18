// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/lib/media-cover-jobs', () => ({ newCoverJob: vi.fn(), processMediaCover: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockReturnValue({ ok: true }) }))
import { getPayload } from 'payload'
import { newCoverJob, processMediaCover } from '@/lib/media-cover-jobs'
import { POST } from '@/app/api/media/generate-covers/route'

const job = { token: 'batch-job', sourceFilename: 'poster.webp', status: 'queued' as const, requestedAt: new Date().toISOString() }
const payload = { auth: vi.fn(), find: vi.fn(), findByID: vi.fn(), db: { drizzle: { execute: vi.fn() } } }
function request(ids: unknown = [1], origin = 'https://example.com') {
  return new Request('https://example.com/api/media/generate-covers', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
}
afterEach(() => vi.unstubAllEnvs())
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('ARK_API_KEY', 'test-key')
  vi.mocked(getPayload).mockResolvedValue(payload as never)
  payload.auth.mockResolvedValue({ user: { id: 1, role: 'staff' } })
  payload.find.mockResolvedValue({ docs: [{ heroImage: 1 }] })
  payload.findByID.mockResolvedValue({ id: 1, filename: 'poster.webp', mimeType: 'image/webp' })
  payload.db.drizzle.execute.mockResolvedValue({ rows: [{ id: 1 }] })
  vi.mocked(newCoverJob).mockReturnValue(job)
})
it('rejects cross-origin requests and unauthenticated callers', async () => {
  expect((await POST(request([1], 'https://other.example'))).status).toBe(403)
  expect(getPayload).not.toHaveBeenCalled()
  payload.auth.mockResolvedValue({ user: null })
  expect((await POST(request())).status).toBe(403)
  expect(processMediaCover).not.toHaveBeenCalled()
})
it('rejects oversized batches and images outside published activities before billing', async () => {
  expect((await POST(request([1, 2, 3, 4]))).status).toBe(400)
  expect((await POST(request([999]))).status).toBe(400)
  expect(processMediaCover).not.toHaveBeenCalled()
})
it('preserves an approved cover, including a manually corrected replacement', async () => {
  payload.findByID.mockResolvedValue({ filename: 'poster.webp', cardCover: 195, cardCoverJob: { ...job, status: 'ready' } })
  const response = await POST(request())
  expect((await response.json()).results[0].status).toBe('skipped')
  expect(payload.db.drizzle.execute).not.toHaveBeenCalled()
  expect(processMediaCover).not.toHaveBeenCalled()
})
it('deduplicates IDs and returns successful generated previews', async () => {
  payload.findByID.mockResolvedValueOnce({ filename: 'poster.webp', mimeType: 'image/webp' })
    .mockResolvedValueOnce({ cardCoverJob: { ...job, status: 'ready' }, cardCover: { url: '/cover.webp' } })
  const data = await (await POST(request([1, 1]))).json()
  expect(data.results).toHaveLength(1)
  expect(data.results[0]).toMatchObject({ status: 'ready', doc: { cardCover: { url: '/cover.webp' } } })
  expect(processMediaCover).toHaveBeenCalledOnce()
})
it('does not bill when an active job or concurrent update owns the image', async () => {
  payload.findByID.mockResolvedValueOnce({ filename: 'poster.webp', cardCoverJob: job })
  expect((await (await POST(request())).json()).results[0].status).toBe('busy')
  payload.db.drizzle.execute.mockResolvedValueOnce({ rows: [] })
  expect((await (await POST(request())).json()).results[0].status).toBe('busy')
  expect(processMediaCover).not.toHaveBeenCalled()
})
it('returns a safe failure when a source was replaced during generation', async () => {
  payload.findByID.mockResolvedValueOnce({ filename: 'poster.webp', mimeType: 'image/webp' })
    .mockResolvedValueOnce({ cardCoverJob: { ...job, token: 'replacement-job', status: 'ready' } })
  expect((await (await POST(request())).json()).results[0].status).toBe('failed')
})
