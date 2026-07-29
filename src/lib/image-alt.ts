import Anthropic from '@anthropic-ai/sdk'
import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import sharp from 'sharp'

const MODEL = process.env.ANTHROPIC_VISION_MODEL || 'claude-haiku-4-5'
const TIMEOUT_MS = 15_000
const MAX_IMAGES_PER_REQUEST = 20

export type AltImageInput = {
  key: string
  caption?: string | null
  source: { type: 'base64'; data: string; mediaType: 'image/webp' } | { type: 'url'; url: string }
}

export type GeneratedImageAlt = {
  key: string
  zh: string
  en: string
}

function cleanAlt(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim()
    .slice(0, maxLength)
}

function extractJson(text: string): string {
  const unfenced = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const arrayStart = unfenced.indexOf('[')
  const arrayEnd = unfenced.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return unfenced.slice(arrayStart, arrayEnd + 1)
  }
  return unfenced
}

/** Parse and sanitize the deliberately small JSON contract used by the vision prompt. */
export function parseGeneratedImageAlts(text: string): GeneratedImageAlt[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(text))
  } catch {
    return []
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as any).images)
      ? (parsed as any).images
      : []

  const seen = new Set<string>()
  const results: GeneratedImageAlt[] = []
  for (const row of rows) {
    const key = cleanAlt((row as any)?.key, 120)
    const zh = cleanAlt((row as any)?.zh, 80)
    const en = cleanAlt((row as any)?.en, 180)
    if (!key || !zh || !en || seen.has(key)) continue
    seen.add(key)
    results.push({ key, zh, en })
  }
  return results
}

export function buildImageAltPrompt(articleContext?: string): string {
  const context = cleanAlt(articleContext, 2_000)
  return `Write useful alternative text for images on the Mindful Peace Academy Thailand website.

For every supplied image, return one concise Simplified Chinese alt text and one natural English alt text.

Rules:
- Describe the visible subject, action, and setting accurately.
- Use the article context only when it helps identify the event or place. Never invent details that the image or context does not support.
- Do not identify a person from appearance alone.
- Do not start with "图片", "照片", "image of", or "photo of".
- Do not add SEO keyword lists, promotional claims, hashtags, quotation marks, or commentary.
- Chinese should normally be no more than 50 Chinese characters. English should normally be no more than 120 characters.
- If a caption is supplied for an image, use it as supporting context without merely repeating it.

Article context:
${context || 'No article context; describe each image generically.'}

Return ONLY a JSON array in this exact shape:
[{"key":"the supplied key","zh":"中文说明","en":"English description"}]`
}

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey, timeout: TIMEOUT_MS })
}

function responseText(response: { content?: Array<{ type?: string; text?: string }> }): string {
  return response.content?.find((block) => block.type === 'text')?.text ?? ''
}

function imageBlock(input: AltImageInput): ImageBlockParam {
  if (input.source.type === 'url') {
    return {
      type: 'image',
      source: { type: 'url', url: input.source.url },
    }
  }
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: input.source.mediaType,
      data: input.source.data,
    },
  }
}

/**
 * Generate bilingual, context-aware alt text. Missing API configuration and
 * malformed model output are soft failures so content saves are never blocked.
 */
export async function generateImageAlts(
  images: AltImageInput[],
  articleContext?: string,
): Promise<GeneratedImageAlt[]> {
  const client = getClient()
  if (!client || images.length === 0) return []

  const selected = images.slice(0, MAX_IMAGES_PER_REQUEST)
  const content: Array<ImageBlockParam | TextBlockParam> = [
    { type: 'text', text: buildImageAltPrompt(articleContext) },
  ]
  for (const image of selected) {
    content.push({
      type: 'text',
      text: `Image key: ${image.key}${image.caption ? `\nCaption: ${cleanAlt(image.caption, 300)}` : ''}`,
    })
    content.push(imageBlock(image))
  }
  content.push({
    type: 'text',
    text: `Return exactly ${selected.length} JSON object(s), one for each supplied image key.`,
  })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: Math.min(4_096, 300 + selected.length * 180),
    messages: [{ role: 'user', content }],
  })

  const allowedKeys = new Set(selected.map((image) => image.key))
  return parseGeneratedImageAlts(responseText(response as any)).filter((result) =>
    allowedKeys.has(result.key),
  )
}

/** Downsize and normalize an uploaded image before sending it to the vision API. */
export async function uploadedImageSource(
  data: Buffer | null | undefined,
): Promise<AltImageInput['source'] | null> {
  if (!data?.length) return null
  const normalized = await sharp(data)
    .rotate()
    .resize({
      width: 1_024,
      height: 1_024,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 76 })
    .toBuffer()
  return {
    type: 'base64',
    mediaType: 'image/webp',
    data: normalized.toString('base64'),
  }
}

export function publicImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  if (/^https?:\/\//i.test(value)) return value
  const base = process.env.NEXT_PUBLIC_SERVER_URL
  if (!base || !value.startsWith('/')) return null
  return `${base.replace(/\/$/, '')}${value}`
}
