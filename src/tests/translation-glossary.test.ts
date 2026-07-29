import { describe, expect, it } from 'vitest'
import { GLOSSARY, glossaryForPrompt } from '@/lib/translation-glossary'

describe('GLOSSARY', () => {
  it('locks academy names to pinyin (not meaning translation)', () => {
    expect(GLOSSARY.academies['如如']).toBe('Ruru')
    expect(GLOSSARY.academies['心灯']).toBe('Xindeng')
    expect(GLOSSARY.academies['和光']).toBe('Heguang')
  })

  it('locks full academy names with city prefix', () => {
    expect(GLOSSARY.academies['曼谷如如学堂']).toBe('Bangkok Ruru Academy')
    expect(GLOSSARY.academies['清迈心灯学堂']).toBe('Chiang Mai Xindeng Academy')
    expect(GLOSSARY.academies['普吉和光小院']).toBe('Phuket Heguang Courtyard')
  })

  it('uses the canonical brand spelling', () => {
    expect(GLOSSARY.brand['静心学堂']).toBe('Mindful Peace Academy')
  })

  it('locks Thai cities', () => {
    expect(GLOSSARY.cities['曼谷']).toBe('Bangkok')
    expect(GLOSSARY.cities['清迈']).toBe('Chiang Mai')
    expect(GLOSSARY.cities['普吉']).toBe('Phuket')
    expect(GLOSSARY.cities['泰国']).toBe('Thailand')
  })
})

describe('glossaryForPrompt()', () => {
  it('emits each entry as a "- zh = en" line', () => {
    const out = glossaryForPrompt()
    expect(out).toContain('- 如如 = Ruru')
    expect(out).toContain('- 心灯 = Xindeng')
    expect(out).toContain('- 和光 = Heguang')
    expect(out).toContain('- 静心学堂 = Mindful Peace Academy')
    expect(out).toContain('- 曼谷 = Bangkok')
    expect(out).toContain('- 清迈 = Chiang Mai')
  })
})
