import { describe, expect, it } from 'vitest'
import { posterFilename, buildPosterQrTarget } from '@/lib/poster-download'

describe('posterFilename()', () => {
  it('appends -poster.png to the activity slug', () => {
    expect(posterFilename('chan-tea-reading-club')).toBe(
      'chan-tea-reading-club-poster.png',
    )
  })

  it('falls back to "activity" when slug is missing', () => {
    expect(posterFilename('')).toBe('activity-poster.png')
    expect(posterFilename(undefined as any)).toBe('activity-poster.png')
  })

  it('strips characters that file systems reject (slash, backslash, colon)', () => {
    expect(posterFilename('chiangmai/foo:bar\\baz')).toBe(
      'chiangmai-foo-bar-baz-poster.png',
    )
  })
})

describe('buildPosterQrTarget()', () => {
  const base = 'https://www.mindfulpeaceth.com'

  it('encodes the booking URL with src=poster when a future occurrence exists', () => {
    const result = buildPosterQrTarget({
      base,
      locSlug: 'chiangmai',
      activitySlug: 'chan-tea-reading-club',
      occurrenceId: 'occ-abc',
      locale: 'zh-CN',
    })
    expect(result).toBe(
      'https://www.mindfulpeaceth.com/chiangmai/book?activity=chan-tea-reading-club&occ=occ-abc&src=poster',
    )
  })

  it('falls back to the activity detail URL when no occurrence is given', () => {
    expect(
      buildPosterQrTarget({
        base,
        locSlug: 'chiangmai',
        activitySlug: 'chan-tea-reading-club',
        occurrenceId: null,
        locale: 'zh-CN',
      }),
    ).toBe('https://www.mindfulpeaceth.com/chiangmai/activities/chan-tea-reading-club')
  })

  it('also falls back when occurrenceId is an empty string', () => {
    expect(
      buildPosterQrTarget({
        base,
        locSlug: 'chiangmai',
        activitySlug: 'chan-tea-reading-club',
        occurrenceId: '',
        locale: 'zh-CN',
      }),
    ).toBe('https://www.mindfulpeaceth.com/chiangmai/activities/chan-tea-reading-club')
  })

  it('URL-encodes special characters in the activity slug (space → +, valid in query)', () => {
    const result = buildPosterQrTarget({
      base,
      locSlug: 'chiangmai',
      activitySlug: 'foo bar',
      occurrenceId: 'o1',
      locale: 'zh-CN',
    })
    // URLSearchParams emits "+" for space in query strings — that's the
    // standard form and what the booking page's searchParams parser expects.
    expect(result).toContain('activity=foo+bar')
  })

  it('encodes the /en prefix for English posters', () => {
    expect(
      buildPosterQrTarget({
        base,
        locSlug: 'chiangmai',
        activitySlug: 'tea',
        occurrenceId: '5',
        locale: 'en',
      }),
    ).toBe('https://www.mindfulpeaceth.com/en/chiangmai/book?activity=tea&occ=5&src=poster')
  })

  it('leaves zh-CN posters unprefixed on the detail fallback', () => {
    expect(
      buildPosterQrTarget({
        base,
        locSlug: 'chiangmai',
        activitySlug: 'tea',
        occurrenceId: null,
        locale: 'zh-CN',
      }),
    ).toBe('https://www.mindfulpeaceth.com/chiangmai/activities/tea')
  })
})
