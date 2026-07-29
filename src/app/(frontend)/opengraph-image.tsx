import { ImageResponse } from 'next/og'

/**
 * Default Open Graph / share image for any frontend page that doesn't supply
 * its own (portal home, list pages). Pages WITH a hero image set
 * `openGraph.images` in generateMetadata and override this fallback.
 *
 * Generated with next/og — no binary asset to maintain. Intentionally
 * Latin-only: next/og's bundled font has no CJK glyphs, so Chinese text would
 * render as tofu boxes. The brand mark stays English here; pages with their
 * own hero image (the common case) carry the Chinese identity visually.
 * Brand palette: 虚空蓝 #82C1EB / 靓蓝 #1C76A6 / 沉香 #928178 / ink #2A2A33 (VI A-13).
 */
export const runtime = 'edge'
export const alt = 'Mindfulpeace Academy Thailand'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#F7F5F0',
          backgroundImage:
            'linear-gradient(135deg, #82C1EB 0%, #F7F5F0 58%, #F7F5F0 100%)',
          padding: '90px',
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#1C76A6',
            marginBottom: 24,
          }}
        >
          Mindfulpeace · Thailand
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.12,
            color: '#2A2A33',
            maxWidth: 900,
          }}
        >
          Meditation & Mindfulness Academies
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#928178',
            marginTop: 40,
            letterSpacing: '0.04em',
          }}
        >
          Bangkok · Chiang Mai · Phuket
        </div>
      </div>
    ),
    size,
  )
}
