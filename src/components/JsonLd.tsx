import React from 'react'

/**
 * Renders one or more schema.org JSON-LD blobs into a <script> tag.
 *
 * Server component — emitted into the page <body>, which Google and the AI
 * answer engines (ChatGPT / Perplexity / Claude) parse for structured facts.
 * `data` may be a single node or an array (each rendered as its own script).
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[]
}) {
  const blobs = Array.isArray(data) ? data : [data]
  return (
    <>
      {blobs.map((blob, i) => (
        <script
          // Index key is stable here — the array is built fresh each render
          // from server data and never reordered.
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blob) }}
        />
      ))}
    </>
  )
}
