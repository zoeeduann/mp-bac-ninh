import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Anthropic SDK before importing translate.ts. The factory below
// returns a constructor whose instances expose messages.create(), which the
// individual tests configure via mockResolvedValueOnce.
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import {
  collectTextLeaves,
  applyTextLeaves,
  buildSystemPrompt,
  parseNumberedTranslations,
  translateText,
  translateRichText,
  translateForSlug,
} from '@/lib/translate'

beforeEach(() => {
  mockCreate.mockReset()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

// ─── Lexical walker: collectTextLeaves ─────────────────────────────────────

describe('collectTextLeaves()', () => {
  it('returns [] for null/undefined/empty', () => {
    expect(collectTextLeaves(null)).toEqual([])
    expect(collectTextLeaves(undefined)).toEqual([])
    expect(collectTextLeaves({})).toEqual([])
  })

  it('extracts text from a single text leaf', () => {
    expect(collectTextLeaves({ type: 'text', text: 'hello' })).toEqual(['hello'])
  })

  it('walks nested children in document order', () => {
    const root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'a' },
            { type: 'text', text: 'b' },
          ],
        },
        { type: 'paragraph', children: [{ type: 'text', text: 'c' }] },
      ],
    }
    expect(collectTextLeaves(root)).toEqual(['a', 'b', 'c'])
  })
})

// ─── Lexical walker: applyTextLeaves ───────────────────────────────────────

describe('applyTextLeaves()', () => {
  it('replaces text in a single text leaf', () => {
    const out = applyTextLeaves(
      { type: 'text', text: 'old', format: 0 },
      ['new'],
    ) as any
    expect(out).toEqual({ type: 'text', text: 'new', format: 0 })
  })

  it('preserves non-text props (format, tag, type) when replacing', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'a', format: 1 },
            { type: 'text', text: 'b' },
          ],
        },
        {
          type: 'heading',
          tag: 'h2',
          children: [{ type: 'text', text: 'c' }],
        },
      ],
    }
    const result = applyTextLeaves(tree, ['A', 'B', 'C']) as any
    expect(result.type).toBe('root')
    expect(result.children[0].type).toBe('paragraph')
    expect(result.children[0].children[0].format).toBe(1)
    expect(result.children[1].tag).toBe('h2')
    expect(result.children[0].children[0].text).toBe('A')
    expect(result.children[0].children[1].text).toBe('B')
    expect(result.children[1].children[0].text).toBe('C')
  })

  it('keeps original text when no translation provided at that position', () => {
    expect(applyTextLeaves({ type: 'text', text: 'untouched' }, [])).toEqual({
      type: 'text',
      text: 'untouched',
    })
  })

  it('round-trips: collect → apply same texts yields equal structure', () => {
    const original = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: '茶' },
            { type: 'text', text: '会', format: 1 },
          ],
        },
      ],
    }
    const texts = collectTextLeaves(original)
    expect(applyTextLeaves(original, texts)).toEqual(original)
  })
})

// ─── Prompt construction ───────────────────────────────────────────────────

describe('buildSystemPrompt()', () => {
  it('includes the glossary entries verbatim', () => {
    const sys = buildSystemPrompt()
    expect(sys).toContain('- 如如 = Ruru')
    expect(sys).toContain('- 静心学堂 = Mindful Peace Academy')
    expect(sys).toContain('- 普吉 = Phuket')
  })

  it('instructs the model to output only the translation', () => {
    const sys = buildSystemPrompt()
    // tone-and-format guard — important enough to assert
    expect(sys.toLowerCase()).toMatch(/output only/i)
  })
})

// ─── Response parsing ──────────────────────────────────────────────────────

describe('parseNumberedTranslations()', () => {
  it('parses a clean numbered list', () => {
    const txt = '1. Hello\n2. World\n3. Goodbye'
    expect(parseNumberedTranslations(txt)).toEqual(['Hello', 'World', 'Goodbye'])
  })

  it('tolerates blank lines between items', () => {
    const txt = '1. Hello\n\n2. World\n\n3. Goodbye'
    expect(parseNumberedTranslations(txt)).toEqual(['Hello', 'World', 'Goodbye'])
  })

  it('ignores lines that do not match the "N. text" shape', () => {
    const txt = 'Here you go:\n1. Hello\n2. World\nThanks!'
    expect(parseNumberedTranslations(txt)).toEqual(['Hello', 'World'])
  })

  it('returns [] for empty input', () => {
    expect(parseNumberedTranslations('')).toEqual([])
  })
})

// ─── translateText (mocked SDK) ────────────────────────────────────────────

describe('translateText()', () => {
  it('returns the model output text when the SDK resolves', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Spring Tea Gathering' }],
    })
    const out = await translateText('春季茶会')
    expect(out).toBe('Spring Tea Gathering')
  })

  it('includes the glossary in the system prompt sent to the model', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Bangkok Ruru Academy' }],
    })
    await translateText('曼谷如如学堂')
    expect(mockCreate).toHaveBeenCalledOnce()
    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toContain('- 如如 = Ruru')
    expect(call.messages[0].content).toBe('曼谷如如学堂')
  })

  it('returns null when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const out = await translateText('春季茶会')
    expect(out).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns null for blank input without calling the SDK', async () => {
    expect(await translateText('')).toBeNull()
    expect(await translateText('   ')).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('appends a maxChars constraint to the system prompt when opts.maxChars is set', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Spring Tea Gathering' }],
    })
    await translateText('春季茶会', { maxChars: 240 })
    expect(mockCreate).toHaveBeenCalledOnce()
    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toMatch(/240 characters or fewer/i)
  })

  it('truncates the result when it exceeds opts.maxChars (defensive — model occasionally overruns)', async () => {
    const tooLong = 'a'.repeat(250)
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: tooLong }] })
    const result = await translateText('春季茶会', { maxChars: 240 })
    expect(result).toHaveLength(240)
  })
})

// ─── translateForSlug (mocked SDK) ─────────────────────────────────────────

describe('translateForSlug()', () => {
  it('returns the model output as a clean English title', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Spring Tea Gathering' }],
    })
    expect(await translateForSlug('春季茶会')).toBe('Spring Tea Gathering')
  })

  it('strips surrounding whitespace from the model output', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '  Spring Tea Gathering  \n' }],
    })
    expect(await translateForSlug('春季茶会')).toBe('Spring Tea Gathering')
  })

  it('includes glossary entries in the system prompt so pinyin names are preserved', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Xindeng Meditation Intro' }],
    })
    await translateForSlug('心灯禅修入门')
    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toContain('- 心灯 = Xindeng')
    expect(call.system).toContain('- 静心学堂 = Mindful Peace Academy')
  })

  it('instructs short, URL-friendly output in the system prompt', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'X' }],
    })
    await translateForSlug('某活动')
    const call = mockCreate.mock.calls[0][0]
    expect(call.system.toLowerCase()).toMatch(/url slug|short/i)
  })

  it('returns null when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(await translateForSlug('春季茶会')).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns null for blank input without calling the SDK', async () => {
    expect(await translateForSlug('')).toBeNull()
    expect(await translateForSlug('  ')).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

// ─── translateRichText (mocked SDK) ────────────────────────────────────────

describe('translateRichText()', () => {
  it('translates all text leaves preserving structure', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '1. Welcome\n2. Friends' }],
    })
    const input = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '欢迎', format: 1 },
              { type: 'text', text: '朋友' },
            ],
          },
        ],
      },
    }
    const out = (await translateRichText(input)) as any
    expect(out).not.toBeNull()
    expect(out.root.children[0].children[0].text).toBe('Welcome')
    expect(out.root.children[0].children[0].format).toBe(1)
    expect(out.root.children[0].children[1].text).toBe('Friends')
  })

  it('returns input unchanged when there are no text leaves', async () => {
    const input = { root: { type: 'root', children: [] } }
    const out = await translateRichText(input)
    expect(out).toEqual(input)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns null when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const input = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '你好' }],
          },
        ],
      },
    }
    expect(await translateRichText(input)).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns null if parsed translation count does not match (safer than garbling)', async () => {
    // Model returns only one item but the tree has two — bail rather than misalign
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '1. Hello' }],
    })
    const input = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '你' },
              { type: 'text', text: '好' },
            ],
          },
        ],
      },
    }
    expect(await translateRichText(input)).toBeNull()
  })
})
