import { describe, expect, it } from 'vitest'
import { singleLocationBrief } from '@/lib/llms-brief'

const location = {
  id: 4,
  slug: 'bac-ninh',
  name: '越南北宁善明静心小院',
  city: '越南北宁',
  tagline: '北宁的一处安静修学空间',
  address: '4262+VGR, Đại Đồng, Bắc Ninh, 越南',
  timeZone: 'Asia/Ho_Chi_Minh',
  social: [{ label: 'Facebook', url: 'https://www.facebook.com/mindfulpeaceshanming' }],
}

const soon = new Date(Date.now() + 3 * 86_400_000).toISOString()
const past = new Date(Date.now() - 3 * 86_400_000).toISOString()

const zhDocs = [
  {
    id: 1,
    slug: 'mindfulness-in-eating',
    title: '正念为食',
    shortDesc: '安住当下，感恩大自然馈赠',
    occurrences: [{ startAt: soon, status: 'open' }, { startAt: past, status: 'open' }],
  },
  { id: 2, slug: 'guided-reading-club', title: '按导读书会', occurrences: [{ startAt: past, status: 'open' }] },
  { id: 3, slug: 'cancelled-one', title: '已取消', occurrences: [{ startAt: soon, status: 'cancelled' }] },
  { id: 4, slug: '  ', title: '没有网址的活动', occurrences: [] },
]

const payload = {
  find: async ({ locale }: { locale: string }) => ({
    docs: locale === 'en' ? [{ id: 1, title: 'Mindfulness in Eating' }] : zhDocs,
  }),
}

describe('llms.txt brief for the Bac Ninh site', () => {
  it('states what answer engines get asked: who runs it, cost, language, booking', async () => {
    const text = await singleLocationBrief(payload, location)
    expect(text).toContain('Mindful Peace International')
    expect(text).toContain('济群法师')
    expect(text).toContain('免费参加')
    expect(text).toContain('Sessions are held mainly in Chinese')
    expect(text).toContain('需提前预约')
    expect(text).toContain('facebook.com/mindfulpeaceshanming')
    expect(text).toContain('4262+VGR')
  })

  it('lists upcoming sessions, and only real ones', async () => {
    const text = await singleLocationBrief(payload, location)
    const upcoming = text.split('## 近期场次')[1].split('## 全部活动')[0]
    expect(upcoming).toContain('正念为食')
    expect(upcoming).toContain('Mindfulness in Eating')
    expect(upcoming).not.toContain('按导读书会') // only past sessions
    expect(upcoming).not.toContain('已取消') // cancelled session
  })

  it('leaves out activities whose slug cannot form a URL', async () => {
    const text = await singleLocationBrief(payload, location)
    expect(text).not.toContain('没有网址的活动')
  })

  it('says so plainly when nothing is scheduled', async () => {
    const empty = { find: async () => ({ docs: [] }) }
    const text = await singleLocationBrief(empty, location)
    expect(text).toContain('暂无已排期的场次')
  })

  it('points answer engines at this site and away from the other Bac Ninh yard', async () => {
    const text = await singleLocationBrief(payload, location)
    expect(text).toContain('authoritative source')
    expect(text).toContain('Võ Cường')
    expect(text).toContain('/vi')
  })
})
