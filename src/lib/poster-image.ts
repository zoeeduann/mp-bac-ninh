import sharp from 'sharp'

/**
 * Fetch an external image URL on the server, resize via sharp, and return it
 * as a base64 `data:image/webp;base64,…` URL.
 *
 * Why we need this for the poster page: html-to-image clones the target node
 * into an SVG `<foreignObject>` and rasterises to canvas. iOS Safari's
 * implementation of that pipeline silently drops `<img>` sources it can't
 * inline at capture moment — even when the same image was visible on screen
 * a millisecond before. Inlining the hero as a `data:` URL sidesteps the
 * fetch entirely so capture is deterministic across browsers.
 *
 * Returns null on any failure — callers fall back to a gradient placeholder
 * so a flaky R2 fetch doesn't break the whole poster page.
 */
export async function fetchInlineImage(
  url: string,
  width = 920,
  quality = 82,
): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const out = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
    return `data:image/webp;base64,${out.toString('base64')}`
  } catch {
    return null
  }
}
