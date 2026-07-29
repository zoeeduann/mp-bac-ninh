import { describe, expect, it } from 'vitest'
import { slugify } from '../lib/slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('strips diacritics', () => {
    expect(slugify('Café')).toBe('cafe')
  })

  it('keeps Chinese characters', () => {
    expect(slugify('静心 学堂')).toBe('静心-学堂')
  })

  it('trims leading/trailing dashes and collapses multiple dashes', () => {
    expect(slugify('  --hi--  ')).toBe('hi')
  })
})
