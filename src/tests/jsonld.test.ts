import { describe, it, expect } from 'vitest'
import {
  richTextToPlain,
  geoFromMapEmbed,
  faqPageJsonLd,
  plainFaqPageJsonLd,
  localBusinessJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  itemListJsonLd,
  articleJsonLd,
} from '@/lib/jsonld'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value as JsonRecord
}

function asRecordArray(value: unknown): JsonRecord[] {
  return value as JsonRecord[]
}

describe('richTextToPlain', () => {
  it('flattens nested Lexical paragraphs and list items', () => {
    const value = {
      root: {
        children: [
          { type: 'paragraph', children: [{ text: 'Hello' }, { text: ' world' }] },
          {
            type: 'list',
            children: [
              { type: 'listitem', children: [{ text: 'one' }] },
              { type: 'listitem', children: [{ text: 'two' }] },
            ],
          },
        ],
      },
    }
    expect(richTextToPlain(value)).toBe('Hello world one two')
  })

  it('returns empty string for null / malformed input', () => {
    expect(richTextToPlain(null)).toBe('')
    expect(richTextToPlain({})).toBe('')
    expect(richTextToPlain('not an object')).toBe('')
  })
})

describe('geoFromMapEmbed', () => {
  it('extracts lat/lng from a Google Maps embed URL', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18!2d98.9853!3d18.7883!4f13.1'
    expect(geoFromMapEmbed(url)).toEqual({ latitude: 18.7883, longitude: 98.9853 })
  })

  it('returns null when no coordinate pair is present', () => {
    expect(geoFromMapEmbed('https://maps.google.com/?q=chiangmai')).toBeNull()
    expect(geoFromMapEmbed(null)).toBeNull()
    expect(geoFromMapEmbed(undefined)).toBeNull()
  })
})

describe('faqPageJsonLd', () => {
  it('builds a FAQPage, skipping items missing q or a', () => {
    const faq = [
      {
        q: 'Cost?',
        a: { root: { children: [{ type: 'paragraph', children: [{ text: 'Free.' }] }] } },
      },
      { q: 'No answer', a: null },
      { q: '', a: { root: { children: [{ text: 'orphan' }] } } },
    ]
    const out = asRecord(faqPageJsonLd(faq))
    const mainEntity = asRecordArray(out.mainEntity)
    const firstEntity = asRecord(mainEntity[0])
    const acceptedAnswer = asRecord(firstEntity.acceptedAnswer)

    expect(out['@type']).toBe('FAQPage')
    expect(mainEntity).toHaveLength(1)
    expect(firstEntity.name).toBe('Cost?')
    expect(acceptedAnswer.text).toBe('Free.')
  })

  it('returns null for empty / missing faq', () => {
    expect(faqPageJsonLd([])).toBeNull()
    expect(faqPageJsonLd(null)).toBeNull()
    expect(faqPageJsonLd([{ q: 'no answer', a: null }])).toBeNull()
  })
})

describe('plainFaqPageJsonLd', () => {
  it('builds a FAQPage from plain text and skips blank entries', () => {
    const out = asRecord(
      plainFaqPageJsonLd([
        { question: 'Can beginners join?', answer: 'Yes.' },
        { question: '', answer: 'Skipped.' },
        { question: 'No answer', answer: '' },
      ]),
    )
    const mainEntity = asRecordArray(out.mainEntity)
    const firstEntity = asRecord(mainEntity[0])
    const acceptedAnswer = asRecord(firstEntity.acceptedAnswer)

    expect(out['@type']).toBe('FAQPage')
    expect(mainEntity).toHaveLength(1)
    expect(firstEntity.name).toBe('Can beginners join?')
    expect(acceptedAnswer.text).toBe('Yes.')
  })
})

describe('localBusinessJsonLd', () => {
  it('includes geo when map embed has coordinates and omits empty fields', () => {
    const out = localBusinessJsonLd({
      displayName: '清迈心灯学堂',
      city: '清迈',
      url: 'https://mindfulpeaceth.com/chiangmai',
      locale: 'zh-CN',
      address: '123 Nimman Rd',
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!2d98.98!3d18.78',
      email: 'cm@example.com',
      phone: null,
      sameAs: [],
    })
    const address = asRecord(out.address)
    const knowsAbout = asRecordArray(out.knowsAbout)

    expect(out['@type']).toEqual(['LocalBusiness', 'EducationalOrganization'])
    expect(out.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 18.78, longitude: 98.98 })
    expect(address.streetAddress).toBe('123 Nimman Rd')
    expect(address.addressCountry).toBe('TH')
    // Empty / null fields are dropped
    expect('telephone' in out).toBe(false)
    expect('sameAs' in out).toBe(false)
    expect(knowsAbout.some((topic) => topic.name === '佛学')).toBe(true)
  })

  it('omits Thailand identity from a standalone academy', () => {
    const out = localBusinessJsonLd({
      displayName: '善明小院',
      city: '越南北宁',
      url: 'https://mindfulpeaceth.com/bac-ninh',
      locale: 'zh-CN',
      isThailandNetwork: false,
    })
    const address = asRecord(out.address)
    const areaServed = asRecordArray(out.areaServed)

    expect('addressCountry' in address).toBe(false)
    expect('parentOrganization' in out).toBe(false)
    expect(areaServed.some((area) => area.name === 'Thailand')).toBe(false)
  })
})

describe('organizationJsonLd / websiteJsonLd', () => {
  it('describes the network as a Buddhist and Zen education organization', () => {
    const out = organizationJsonLd({
      url: 'https://mindfulpeaceth.com',
      locale: 'en',
      locations: [
        {
          name: 'Xindeng Academy',
          city: 'Chiang Mai',
          url: 'https://mindfulpeaceth.com/chiangmai',
          imageUrl: '/media/xindeng.jpg',
        },
      ],
    })
    const alternateName = out.alternateName as string[]
    const knowsAbout = asRecordArray(out.knowsAbout)
    const department = asRecordArray(out.department)

    expect(out['@type']).toEqual(['Organization', 'EducationalOrganization'])
    expect(alternateName).toContain('静心学堂')
    expect(out.logo).toBe('http://localhost:3000/brand/master-logo.png')
    expect(out.image).toBe('http://localhost:3000/brand/master-logo-with-positioning.png')
    expect(knowsAbout.some((topic) => topic.name === 'Zen meditation')).toBe(true)
    expect(department[0].image).toBe('http://localhost:3000/media/xindeng.jpg')
  })

  it('builds WebSite JSON-LD with canonical topics', () => {
    const out = websiteJsonLd({
      url: 'https://mindfulpeaceth.com/',
      locale: 'zh-CN',
    })
    const about = asRecordArray(out.about)

    expect(out['@type']).toBe('WebSite')
    expect(about.some((topic) => topic.name === '禅修')).toBe(true)
  })
})

describe('breadcrumbJsonLd', () => {
  it('numbers positions from 1', () => {
    const out = breadcrumbJsonLd([
      { name: 'Home', url: 'https://x.com/' },
      { name: 'Activities', url: 'https://x.com/cm/activities' },
    ])
    const items = asRecordArray(out.itemListElement)

    expect(items[0].position).toBe(1)
    expect(items[1].position).toBe(2)
    expect(items[1].name).toBe('Activities')
  })
})

describe('content JSON-LD helpers', () => {
  it('builds ItemList entries with absolute image URLs', () => {
    const out = itemListJsonLd({
      name: 'Activities',
      url: 'https://mindfulpeaceth.com/chiangmai/activities',
      items: [
        {
          name: 'Tea Meditation',
          url: 'https://mindfulpeaceth.com/chiangmai/activities/tea',
          imageUrl: '/media/tea.jpg',
        },
      ],
    })
    const itemList = asRecordArray(out.itemListElement)
    const firstItem = asRecord(itemList[0].item)

    expect(out['@type']).toBe('ItemList')
    expect(itemList[0].position).toBe(1)
    expect(firstItem.image).toBe('http://localhost:3000/media/tea.jpg')
  })

  it('builds Article JSON-LD with keywords', () => {
    const out = articleJsonLd({
      headline: '清迈静坐记录',
      url: 'https://mindfulpeaceth.com/chiangmai/journal/sitting',
      locale: 'zh-CN',
      datePublished: '2026-07-01',
      imageUrl: 'https://cdn.example.com/sitting.jpg',
    })

    expect(out['@type']).toBe('Article')
    expect(String(out.keywords)).toContain('佛学')
    expect(out.image).toBe('https://cdn.example.com/sitting.jpg')
  })

  it('lets an independent academy own its Article metadata', () => {
    const out = articleJsonLd({
      headline: '善明小院记录',
      url: 'https://mindfulpeaceth.com/bac-ninh/journal/notes',
      locale: 'zh-CN',
      authorName: '善明小院',
      authorUrl: 'https://mindfulpeaceth.com/bac-ninh',
      publisherName: '越南北宁善明小院',
      publisherUrl: 'https://mindfulpeaceth.com/bac-ninh',
      keywords: ['越南北宁', '禅修'],
    })
    const publisher = asRecord(out.publisher)

    expect(publisher.name).toBe('越南北宁善明小院')
    expect(out.keywords).toBe('越南北宁, 禅修')
    expect(String(out.keywords)).not.toContain('泰国')
  })
})
