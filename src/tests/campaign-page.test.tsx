import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CampaignPage, { generateMetadata } from '@/app/(campaigns)/[loc]/discover/[focus]/page'

vi.mock('@/lib/campaign-content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaign-content')>()
  return {
    ...actual,
    getCampaignContent: vi.fn(async () => ({
      location: {
        id: 4,
        slug: 'bac-ninh',
        name: '越南北宁善明静心小院',
        address: 'Bac Ninh, Vietnam',
        heroImage: null,
      },
      activities: [],
    })),
  }
})
vi.mock('@/lib/site-config', () => ({
  SITE_BASE: 'https://mindfulpeacebacninh.com',
  TURNSTILE_ENABLED: false,
  locationPath: (_locale: string, _slug: string, suffix = '') => suffix || '/',
  locationUrl: (_locale: string, _slug: string, suffix = '') =>
    `https://mindfulpeacebacninh.com${suffix}`,
}))

describe('campaign routes', () => {
  it.each(['mindfulness', 'buddhism'])(
    'renders %s with a single same-page name and Zalo form and no invented schedule',
    async (focus) => {
      const element = await CampaignPage({ params: Promise.resolve({ loc: 'bac-ninh', focus }) })
      const html = renderToStaticMarkup(element)
      expect(html.match(/<form\b/g)).toHaveLength(1)
      expect(html).toContain('name="zalo"')
      expect(html).toContain('name="name"')
      expect(html).toContain('href="#inquiry"')
      expect(html).toContain('资料使用说明')
      expect(html).not.toContain('campaign-example-status')
      expect(html).not.toContain('googletagmanager')
      // The hero button only scrolls to the form, so it must not share the
      // submit button's label.
      expect(html).toContain('留下 Zalo，了解安排')
      const submitLabel = focus === 'mindfulness' ? '了解正念活动安排' : '了解佛学课程安排'
      expect(html.match(new RegExp(submitLabel, 'g'))).toHaveLength(1)
    },
  )
  it('sets distinct canonical metadata without advertising a non-existent English translation', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ loc: 'bac-ninh', focus: 'buddhism' }),
    })
    expect(meta.alternates?.canonical).toBe('https://mindfulpeacebacninh.com/discover/buddhism')
    expect(meta.alternates?.languages).toBeUndefined()
  })
  it('rejects unsupported locations instead of showing Bac Ninh content on another academy', async () => {
    await expect(
      CampaignPage({ params: Promise.resolve({ loc: 'phuket', focus: 'buddhism' }) }),
    ).rejects.toThrow()
  })
})
