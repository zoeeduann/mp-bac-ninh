import { describe, expect, it } from 'vitest'
import { buildImageAltPrompt, parseGeneratedImageAlts, publicImageUrl } from '@/lib/image-alt'

describe('image alt generation helpers', () => {
  it('parses fenced JSON and normalizes whitespace', () => {
    const result = parseGeneratedImageAlts(`
\`\`\`json
[
  {
    "key": "cover",
    "zh": "  学员在庭院中\\n练习静坐  ",
    "en": "  Participants practice meditation   in a courtyard  "
  }
]
\`\`\`
`)

    expect(result).toEqual([
      {
        key: 'cover',
        zh: '学员在庭院中 练习静坐',
        en: 'Participants practice meditation in a courtyard',
      },
    ])
  })

  it('drops malformed, incomplete, and duplicate rows', () => {
    expect(
      parseGeneratedImageAlts(
        JSON.stringify([
          { key: 'photo-1', zh: '茶席', en: 'A tea setting' },
          { key: 'photo-1', zh: '重复', en: 'Duplicate' },
          { key: 'photo-2', zh: '', en: 'Missing Chinese' },
        ]),
      ),
    ).toEqual([{ key: 'photo-1', zh: '茶席', en: 'A tea setting' }])
    expect(parseGeneratedImageAlts('not json')).toEqual([])
  })

  it('includes article context and anti-keyword-stuffing guidance in the prompt', () => {
    const prompt = buildImageAltPrompt('文章标题：春季茶会')
    expect(prompt).toContain('文章标题：春季茶会')
    expect(prompt).toContain('Do not add SEO keyword lists')
    expect(prompt).toContain('Never invent details')
  })

  it('makes relative media URLs absolute only when a public base is available', () => {
    const previous = process.env.NEXT_PUBLIC_SERVER_URL
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://mindfulpeaceth.com/'
    expect(publicImageUrl('/api/media/file/tea.webp')).toBe(
      'https://mindfulpeaceth.com/api/media/file/tea.webp',
    )
    expect(publicImageUrl('https://cdn.example.com/tea.webp')).toBe(
      'https://cdn.example.com/tea.webp',
    )
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL
    else process.env.NEXT_PUBLIC_SERVER_URL = previous
  })
})
