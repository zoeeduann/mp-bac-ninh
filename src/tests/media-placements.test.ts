// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), findByID: vi.fn() }))
vi.mock('@/lib/payload', () => ({ getPayloadClient: async () => mocks }))
import { GET } from '@/app/api/media/[id]/placements/route'
const req = () => GET(new Request('https://site.test/api/media/20/placements'), { params: Promise.resolve({ id: '20' }) })
beforeEach(() => vi.clearAllMocks())
it('protects media usage details behind staff authentication', async () => {
  mocks.auth.mockResolvedValue({ user: null })
  expect((await req()).status).toBe(403)
  expect(mocks.find).not.toHaveBeenCalled()
})
it('resolves a generated asset back to its published activity and returns actual placement URLs', async () => {
  mocks.auth.mockResolvedValue({ user: { id: 1, role: 'staff' } })
  const cover = { id: 20, url: '/generated.webp', filename: 'generated.webp', sizes: { card: { url: '/card.webp' } } }
  mocks.findByID.mockResolvedValue(cover)
  mocks.find.mockResolvedValueOnce({ docs: [{ id: 10 }] }).mockResolvedValueOnce({ docs: [{
    id: 5, title: '禅茶', updatedAt: 'copy1', heroImage: { filename: 'source.webp', cardCover: cover,
      cardCoverJob: { token: 't', sourceFilename: 'source.webp', requestedAt: 'now', status: 'ready' } },
  }] })
  const response = await req()
  const data = await response.json()
  expect(data.isGenerated).toBe(true)
  expect(data.activities[0]).toMatchObject({ id: 5, card: '/card.webp', hero: '/generated.webp' })
  expect(data.activities[0].share).toContain('/api/activities/5/share-image')
  expect(mocks.find.mock.calls[1][0].where.and).toEqual([{ status: { equals: 'published' } }, { heroImage: { in: [20, 10] } }])
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
})
