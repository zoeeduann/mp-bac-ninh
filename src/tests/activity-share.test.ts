// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Activity, Location, Media } from '@/payload-types'
import { activityShareImageUrl, shareBrandName, shareDomain, shareSafeText } from '@/lib/activity-share'

const mocks = vi.hoisted(() => ({ find: vi.fn(), inline: vi.fn(), render: vi.fn() }))
vi.mock('@/lib/payload', () => ({ getPayloadClient: async () => ({ find: mocks.find }) }))
vi.mock('@/lib/poster-image', () => ({ fetchInlineImage: mocks.inline }))
vi.mock('@/lib/render-activity-share', () => ({ renderActivityShare: mocks.render }))
vi.mock('@/lib/site-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/site-config')>()),
  SITE_LOCATION_SLUG: 'bac-ninh',
}))
import { GET } from '@/app/api/activities/[id]/share-image/route'
const cover = { filename: 'cover.webp', url: 'https://cdn.test/cover.webp', updatedAt: 'v1' } as Media
const source = { id: 1, createdAt: 'v1', updatedAt: 'v1', filename: 'source.webp', url: 'https://cdn.test/source.webp', cardCover: cover,
  cardCoverJob: { token: 't', requestedAt: '2026-09-07', sourceFilename: 'source.webp', status: 'ready' } } as Media
const location = { id: 3, slug: 'bac-ninh', name: '越南北宁善明小院' } as Location
const activity = { id: 7, title: '安心禅茶', updatedAt: 'copy1', heroImage: source, location } as Activity
const request = (id = '7', query = '') => GET(new Request('https://site.test/api/activities/'+id+'/share-image'+query), { params: Promise.resolve({ id }) })
beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue({ docs: [activity] }); mocks.inline.mockResolvedValue('data:image/webp;base64,cover'); mocks.render.mockReturnValue(new Response('png')) })

describe('activity share artwork', () => {
  it('refreshes the URL when copy or generated artwork changes, and carries the locale', () => {
    const url = activityShareImageUrl(activity, 'en')
    expect(url).toContain('/api/activities/7/share-image?locale=en')
    expect(activityShareImageUrl({ ...activity, updatedAt: 'copy2' }, 'en')).not.toBe(url)
    expect(activityShareImageUrl({ ...activity, heroImage: { ...source, cardCover: { ...cover, updatedAt: 'v2' } } }, 'en')).not.toBe(url)
    expect(activityShareImageUrl({ ...activity, heroImage: { ...source, filename: 'new-source.webp' } }, 'en')).toBeUndefined()
  })
  it('rejects invalid IDs/locales without querying content', async () => {
    expect((await request('0')).status).toBe(404)
    expect((await request('7', '?locale=unknown')).status).toBe(404)
    expect((await request('7', '?locale=vi')).status).toBe(404)
    expect(mocks.find).not.toHaveBeenCalled()
  })
  it('only queries published content and returns 404 for missing or untitled events', async () => {
    mocks.find.mockResolvedValueOnce({ docs: [] })
    expect((await request()).status).toBe(404)
    expect(mocks.find.mock.calls[0][0].where.and).toContainEqual({ status: { equals: 'published' } })
    mocks.find.mockResolvedValueOnce({ docs: [{ ...activity, title: '  ' }] })
    expect((await request('7', '?locale=en')).status).toBe(404)
    expect(mocks.inline).not.toHaveBeenCalled()
  })
  it('never renders another academy from the shared database', async () => {
    mocks.find.mockResolvedValueOnce({ docs: [{ ...activity, location: { ...location, slug: 'chiangmai' } }] })
    expect((await request()).status).toBe(404)
    expect(mocks.inline).not.toHaveBeenCalled()
  })
  it('never renders a source poster if the generated cover is unavailable', async () => {
    mocks.find.mockResolvedValueOnce({ docs: [{ ...activity, heroImage: { ...source, cardCover: null } }] })
    expect((await request()).status).toBe(404)
    expect(mocks.inline).not.toHaveBeenCalled()
  })
  it('renders with current CMS title, Bac Ninh branding and generated artwork, with cache headers', async () => {
    const response = await request()
    expect(mocks.inline).toHaveBeenCalledWith(cover.url, 756, 90, 'png')
    expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({
      title: '安心禅茶', academy: '越南北宁善明小院', image: 'data:image/webp;base64,cover',
    }))
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400')
  })
  it('returns a retryable response when artwork fetch fails', async () => {
    mocks.inline.mockResolvedValueOnce(null)
    expect((await request()).status).toBe(503)
    expect(mocks.render).not.toHaveBeenCalled()
  })
})

describe('share text helpers', () => {
  it('falls back to the Bac Ninh brand when the academy name is missing', () => {
    expect(shareBrandName(null, 'zh-CN')).toBe('越南北宁善明小院')
    expect(shareBrandName('', 'en')).toBe('Mindful Peace Yard Bac Ninh')
  })
  it('shows the bare public host', () => {
    expect(shareDomain('https://www.mindfulpeacebacninh.com')).toBe('mindfulpeacebacninh.com')
    expect(shareDomain('not a url')).toBe('')
  })
  it('folds Vietnamese letters the CJK share font lacks, keeping CJK and đ', () => {
    expect(shareSafeText('Thiện Minh · Bắc Ninh')).toBe('Thien Minh · Bac Ninh')
    expect(shareSafeText('Đại Đồng 善明')).toBe('Đai Đong 善明')
  })
})
