// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/lib/media-cover-jobs', () => ({ newCoverJob: vi.fn(), processMediaCover: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockReturnValue({ ok: true }) }))
import { getPayload } from 'payload'
import { newCoverJob, processMediaCover } from '@/lib/media-cover-jobs'
import { POST } from '@/app/api/media/[id]/generate-cover/route'

const job = { token: 'new-job', sourceFilename: 'poster.webp', status: 'queued' as const, requestedAt: new Date().toISOString() }
const payload = {
  auth: vi.fn(), findByID: vi.fn(),
  db: { drizzle: { execute: vi.fn() } },
}
function request(origin = 'https://example.com') {
  return new Request('https://example.com/api/media/1/generate-cover', { method: 'POST', headers: { origin } })
}
const params = { params: Promise.resolve({ id: '1' }) }
afterEach(() => vi.unstubAllEnvs())

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ARK_API_KEY', 'test-key')
  vi.mocked(getPayload).mockResolvedValue(payload as never)
  payload.auth.mockResolvedValue({ user: { id: 1, role: 'staff' } })
  payload.findByID.mockResolvedValue({ id: 1, filename: 'poster.webp', mimeType: 'image/webp' })
  payload.db.drizzle.execute.mockResolvedValue({ rows: [{ id: 1 }] })
  vi.mocked(newCoverJob).mockReturnValue(job)
})

it('rejects cross-origin requests before accessing the CMS', async () => {
  expect((await POST(request('https://untrusted.example'), params)).status).toBe(403)
  expect(getPayload).not.toHaveBeenCalled()
})
it('rejects guests before invoking the image provider', async () => {
  payload.auth.mockResolvedValue({ user: null })
  expect((await POST(request(), params)).status).toBe(403)
  expect(processMediaCover).not.toHaveBeenCalled()
})
it('reports missing configuration without creating a job', async () => {
  vi.stubEnv('ARK_API_KEY', '')
  expect((await POST(request(), params)).status).toBe(503)
  expect(payload.db.drizzle.execute).not.toHaveBeenCalled()
})
it('does not enqueue a duplicate active generation', async () => {
  payload.findByID.mockResolvedValue({ filename: 'poster.webp', mimeType: 'image/webp', cardCoverJob: job })
  expect((await POST(request(), params)).status).toBe(409)
  expect(processMediaCover).not.toHaveBeenCalled()
})
it('lets authorized staff generate and receive a preview', async () => {
  payload.findByID.mockResolvedValueOnce({ filename: 'poster.webp', mimeType: 'image/webp' })
    .mockResolvedValueOnce({ cardCoverJob: { ...job, status: 'ready' }, cardCover: { url: '/cover.webp' } })
  const response = await POST(request(), params)
  expect(response.status).toBe(200)
  expect((await response.json()).doc.cardCover.url).toBe('/cover.webp')
})
it('detects a concurrent source change before billing', async () => {
  payload.db.drizzle.execute.mockResolvedValueOnce({ rows: [] })
  expect((await POST(request(), params)).status).toBe(409)
  expect(processMediaCover).not.toHaveBeenCalled()
})
