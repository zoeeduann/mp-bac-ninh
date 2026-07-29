import Anthropic from '@anthropic-ai/sdk'
import { glossaryForPrompt } from './translation-glossary'

const MODEL = 'claude-haiku-4-5'
const TIMEOUT_MS = 30_000

// ─── Lexical walker (pure) ──────────────────────────────────────────────────

export type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
  [k: string]: unknown
}

/** Depth-first, document-order collection of every `text` leaf in a tree. */
export function collectTextLeaves(
  node: LexicalNode | null | undefined,
): string[] {
  if (!node) return []
  const out: string[] = []
  if (typeof node.text === 'string') out.push(node.text)
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      out.push(...collectTextLeaves(child))
    }
  }
  return out
}

/**
 * Walk the tree and replace each `text` leaf with the next string in `texts`
 * (in the same document order). Preserves every non-text property (format,
 * tag, type, attributes, etc.). When `texts` is shorter than the number of
 * leaves, remaining leaves keep their original text.
 */
export function applyTextLeaves(
  node: LexicalNode | null | undefined,
  texts: string[],
): LexicalNode | null | undefined {
  const cursor = { i: 0 }
  return walk(node, texts, cursor)
}

function walk(
  node: LexicalNode | null | undefined,
  texts: string[],
  cursor: { i: number },
): LexicalNode | null | undefined {
  if (!node) return node
  if (typeof node.text === 'string') {
    const next = cursor.i < texts.length ? texts[cursor.i++] : node.text
    return { ...node, text: next }
  }
  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(
        (c) => walk(c, texts, cursor) as LexicalNode,
      ),
    }
  }
  return node
}

// ─── Prompt and response parsing (pure) ────────────────────────────────────

export function buildSystemPrompt(): string {
  return `You translate marketing copy for Mindful Peace Academy Thailand — a Buddhist contemplative learning network — from Simplified Chinese to natural, warm, brand-aligned English suitable for the website.

You MUST use the following exact translations for these terms (do NOT translate by meaning):
${glossaryForPrompt()}

For other Buddhist/contemplative terms (禅修, 茶会, 正念, 共修, etc), use plain natural English (meditation, tea gathering, mindfulness, group practice). Tone: contemplative, plain, warm — like a quiet bookshop, not a marketing brochure.

Output ONLY the translated text — no quotes, no labels, no commentary, no leading "Here is the translation:".`
}

/** Parse Claude's "1. foo\n2. bar" output into ['foo', 'bar']. */
export function parseNumberedTranslations(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*\d+\.\s*(.*)$/)
    if (m) out.push(m[1].trim())
  }
  return out
}

// ─── Claude API wrappers ────────────────────────────────────────────────────

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key, timeout: TIMEOUT_MS })
}

function extractText(response: { content?: Array<{ type?: string; text?: string }> }): string | null {
  const block = response.content?.find((c) => c.type === 'text')
  return block?.text ?? null
}

/** Translate a single Chinese string to English. Returns null on missing key /
 * blank input. Throws if the SDK call itself errors — callers handle.
 *
 * `opts.maxChars` adds a character-budget instruction to the system prompt
 * (the model typically respects it) AND truncates the response defensively
 * (the model occasionally overruns by a handful of characters). Required for
 * persisting back to Payload fields that carry a `maxLength` constraint —
 * Activities `shortDesc` has `maxLength: 240`, so a raw translation that
 * runs long would fail validation with `400 字段无效`.
 */
export async function translateText(
  zh: string,
  opts?: { maxChars?: number },
): Promise<string | null> {
  if (!zh || !zh.trim()) return null
  const client = getClient()
  if (!client) return null
  const system = opts?.maxChars
    ? buildSystemPrompt() +
      `\n\nLENGTH LIMIT: Your output MUST be ${opts.maxChars} characters or fewer. If a faithful translation would run longer, rewrite it tighter — keep the meaning, drop the flourishes.`
    : buildSystemPrompt()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: zh }],
  })
  const text = extractText(response as any)
  if (text && opts?.maxChars && text.length > opts.maxChars) {
    return text.slice(0, opts.maxChars)
  }
  return text
}

/**
 * Translate a Chinese activity title into a short English phrase intended to
 * feed `slugify()`. Uses the same glossary as `translateText` so that academy
 * names land in pinyin (Ruru / Xindeng / Heguang) instead of being translated
 * by meaning. Returns null on missing key or blank input.
 *
 * Why a separate function: the marketing-tone system prompt used by
 * `translateText` is too florid for URL slugs (would produce 12-word titles).
 * This prompt asks for 3–7 words, Title Case, no punctuation beyond hyphens —
 * matching the shape `slugify()` ultimately expects.
 */
export async function translateForSlug(zhTitle: string): Promise<string | null> {
  if (!zhTitle || !zhTitle.trim()) return null
  const client = getClient()
  if (!client) return null
  const system = `You produce SHORT English titles meant to become URL slugs, from Chinese activity titles, for Mindful Peace Academy Thailand — a Buddhist contemplative learning network in Thailand.

You MUST use the following exact translations for these terms (do NOT translate by meaning):
${glossaryForPrompt()}

Style:
- 3–7 words is the target. Drop subtitle clauses (after "——", colons, slashes) unless they carry essential meaning the main clause doesn't.
- Title Case.
- No emoji. No punctuation except spaces and ASCII hyphens.
- Keep distinctive names, people, and concepts. Drop generic filler ("activity", "session", "event") unless it's load-bearing.
- For Buddhist/contemplative terms (禅修, 茶会, 正念, 共修, 读书会), use plain natural English (meditation, tea gathering, mindfulness, group practice, reading club).

Output ONLY the English title — no quotes, no commentary, no leading "Title:" label.`
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system,
    messages: [{ role: 'user', content: zhTitle }],
  })
  const text = extractText(response as any)
  return text?.trim() || null
}

/**
 * Translate every text leaf in a Payload Lexical rich-text value while
 * preserving structure and formatting. Returns null if the API key is missing
 * or if the parsed translation count doesn't match the source — safer to
 * leave the EN locale empty (falls back to ZH on render) than to misalign
 * translations against the wrong nodes.
 */
export async function translateRichText<T>(lexical: T | null | undefined): Promise<T | null> {
  if (!lexical) return null
  const root = (lexical as any)?.root as LexicalNode | undefined
  if (!root) return null

  const texts = collectTextLeaves(root).filter((t) => t.length > 0)
  if (texts.length === 0) return lexical

  const client = getClient()
  if (!client) return null

  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const system =
    buildSystemPrompt() +
    `\n\nYou will receive a numbered list of Chinese strings. Output the translations as the SAME numbered list — same numbers, one per line, in the same order. Output ONLY the numbered translations.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: numbered }],
  })
  const text = extractText(response as any) ?? ''
  const translated = parseNumberedTranslations(text)
  if (translated.length !== texts.length) return null

  // Map translations back onto only the non-empty leaves we collected; empty
  // leaves keep their original (empty) text.
  const allLeaves = collectTextLeaves(root)
  const mapped: string[] = []
  let ti = 0
  for (const leaf of allLeaves) {
    mapped.push(leaf.length > 0 ? translated[ti++] : leaf)
  }
  const newRoot = applyTextLeaves(root, mapped) as LexicalNode
  return { ...(lexical as any), root: newRoot } as T
}
