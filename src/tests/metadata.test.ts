import { describe, expect, it } from 'vitest'
import { buildMetadata } from '@/lib/metadata'

describe('buildMetadata', () => {
  it('uses an independent location identity and suppresses the Thailand fallback card', () => {
    const metadata = buildMetadata({
      title: '善明小院',
      description: '越南北宁的一处安静修学空间',
      url: 'https://mindfulpeaceth.com/bac-ninh',
      locale: 'zh-CN',
      siteName: '越南北宁善明小院',
    })

    expect(metadata.applicationName).toBe('越南北宁善明小院')
    expect(metadata.openGraph).toMatchObject({
      siteName: '越南北宁善明小院',
      images: [],
    })
    expect(metadata.twitter).toMatchObject({ images: [] })
  })
})
