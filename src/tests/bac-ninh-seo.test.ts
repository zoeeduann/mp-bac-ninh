import { describe, expect, it } from 'vitest'
import { languageToggleHref } from '@/lib/locale-url'
import { zhOnlyPaths } from '@/lib/untranslated-paths'
import { MERGED_ACTIVITY_PATHS } from '@/lib/merged-activities'
import { BAC_NINH_ALTERNATE_NAMES, BAC_NINH_POSTAL_ADDRESS, bacNinhDetailTitle, bacNinhSeo } from '@/lib/bac-ninh-seo'
import { localBusinessJsonLd, placePageBreadcrumbJsonLd } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/metadata'
import { hasUsableLocalizedTitle, localizedDocsForLocale } from '@/lib/public-locale'

describe('English pages never show Chinese fallbacks', () => {
  it('treats a missing or Chinese English title as untranslated', () => {
    expect(hasUsableLocalizedTitle('Mindfulness in Eating', 'en')).toBe(true)
    expect(hasUsableLocalizedTitle('正念球', 'en')).toBe(false)
    expect(hasUsableLocalizedTitle(null, 'en')).toBe(false)
    expect(hasUsableLocalizedTitle('正念球', 'zh-CN')).toBe(true)
  })

  it('drops untranslated entries from English lists only', () => {
    const docs = [{ title: 'Tea Gathering' }, { title: '正念球' }, { title: null }]
    expect(localizedDocsForLocale(docs, 'en')).toEqual([{ title: 'Tea Gathering' }])
    expect(localizedDocsForLocale(docs, 'zh-CN')).toHaveLength(3)
  })
})

describe('language toggle', () => {
  const bacNinh = { slug: 'bac-ninh' }
  const zhOnly = zhOnlyPaths('activities', [
    { slug: 'mindfulness-ball', title: null, location: bacNinh },
    { slug: 'mindfulness-in-eating', title: 'Mindfulness in Eating', location: bacNinh },
    { slug: '  ', title: null, location: bacNinh },
  ])

  it('lists only untranslated pages with a real slug', () => {
    expect(zhOnly).toHaveLength(1)
    expect(zhOnly[0]).toMatch(/\/activities\/mindfulness-ball$/)
  })

  it('links an untranslated Chinese page to the English list it belongs to', () => {
    expect(languageToggleHref('/activities/mindfulness-ball', 'en', ['/activities/mindfulness-ball'])).toBe(
      '/en/activities',
    )
  })

  it('swaps the prefix when the English page exists, and for English → Chinese', () => {
    expect(languageToggleHref('/activities/mindfulness-in-eating', 'en', ['/activities/mindfulness-ball'])).toBe(
      '/en/activities/mindfulness-in-eating',
    )
    expect(languageToggleHref('/en/activities/mindfulness-in-eating', 'zh-CN', [])).toBe(
      '/activities/mindfulness-in-eating',
    )
  })
})

describe('merged duplicate activities', () => {
  it('sends every merged page to the kept page of its series', () => {
    expect(MERGED_ACTIVITY_PATHS['/activities/mindfulness-and-food']).toBe('/activities/mindfulness-in-eating')
    expect(MERGED_ACTIVITY_PATHS['/activities/health-circle']).toBe('/activities/healthy-circulation-cycle')
    expect(MERGED_ACTIVITY_PATHS['/activities/tai-chi-mindfulness-ball']).toBe('/activities/mindfulness-badminton')
  })

  it('never redirects a kept page or an unrelated one', () => {
    const kept = new Set(Object.values(MERGED_ACTIVITY_PATHS))
    for (const from of Object.keys(MERGED_ACTIVITY_PATHS)) expect(kept.has(from)).toBe(false)
    expect(MERGED_ACTIVITY_PATHS['/activities/mindfulness-ball']).toBeUndefined()
  })
})

describe('Bac Ninh search copy', () => {
  it('applies to the Bac Ninh location only', () => {
    expect(bacNinhSeo('bac-ninh', 'zh-CN')?.homeTitle).toContain('北宁善明静心小院')
    expect(bacNinhSeo('bac-ninh', 'en')?.homeTitle).toContain('Shanming Mindful Peace Yard')
    expect(bacNinhSeo('chiangmai', 'zh-CN')).toBeNull()
  })

  it('puts the place and intent in detail titles', () => {
    expect(bacNinhDetailTitle('zh-CN', 'activity', '正念为食')).toBe('正念为食｜北宁禅修与正念活动｜善明静心小院')
    expect(bacNinhDetailTitle('en', 'activity', 'Mindfulness in Eating')).toBe(
      'Mindfulness in Eating – Bac Ninh | Shanming Mindful Peace Yard',
    )
  })
})

describe('Bac Ninh structured data', () => {
  const data = localBusinessJsonLd({
    displayName: '善明静心小院',
    city: '越南北宁',
    url: 'https://mindfulpeacebacninh.com',
    locale: 'zh-CN',
    address: '4262+VGR, Đại Đồng, Bắc Ninh, 越南',
    isThailandNetwork: false,
    alternateNames: BAC_NINH_ALTERNATE_NAMES,
    postalAddress: BAC_NINH_POSTAL_ADDRESS,
    parentOrganization: { name: 'Mindful Peace International', url: 'https://mindfulpeace.org' },
    priceCurrency: 'VND',
  }) as any

  it('gives a Vietnamese address, the parent association and free entry', () => {
    expect(data.address).toMatchObject({ '@type': 'PostalAddress', addressCountry: 'VN', addressRegion: 'Bắc Ninh' })
    expect(data.parentOrganization).toEqual({
      '@type': 'Organization',
      name: 'Mindful Peace International',
      url: 'https://mindfulpeace.org',
    })
    expect(data.isAccessibleForFree).toBe(true)
    expect(data.hasOfferCatalog.itemListElement[0]).toMatchObject({ price: '0', priceCurrency: 'VND' })
  })

  it('keeps old names as alternate names instead of a generated 静心学堂 name', () => {
    expect(data.alternateName).toContain('善明小院')
    expect(data.alternateName).toContain('Shanming Mindful Peace Yard')
    expect(data.alternateName).not.toContain('越南北宁静心学堂')
  })

  it('builds place → page breadcrumbs', () => {
    const crumbs = placePageBreadcrumbJsonLd({
      locale: 'en',
      locSlug: 'bac-ninh',
      placeName: 'Shanming Mindful Peace Yard',
      pageName: 'Contact',
      pagePath: '/contact',
    }) as any
    expect(crumbs.itemListElement.map((i: any) => i.name)).toEqual(['Shanming Mindful Peace Yard', 'Contact'])
  })
})

describe('noindex', () => {
  it('keeps empty lists out of the index but follows links', () => {
    const meta = buildMetadata({
      title: 'Journal',
      description: 'Empty',
      url: 'https://mindfulpeacebacninh.com/journal',
      locale: 'zh-CN',
      noindex: true,
    })
    expect(meta.robots).toMatchObject({ index: false, follow: true })
  })
})
