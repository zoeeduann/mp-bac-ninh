import { describe, expect, it, vi } from 'vitest'
import { syncedUrl } from '@/lib/media-url-sync'
import { syncMediaUrlAfterChange } from '@/collections/Media.hooks'

// ─── syncedUrl() — pure helper ─────────────────────────────────────────────

describe('syncedUrl()', () => {
  it('returns the same url when basename already equals plain filename', () => {
    expect(syncedUrl('https://pub-x.r2.dev/foo.webp', 'foo.webp')).toBe(
      'https://pub-x.r2.dev/foo.webp',
    )
  })

  it('returns the same url when basename is already the encoded form of filename', () => {
    // %E5%A6%82 = 如
    expect(syncedUrl('https://pub-x.r2.dev/%E5%A6%82.webp', '如.webp')).toBe(
      'https://pub-x.r2.dev/%E5%A6%82.webp',
    )
  })

  it('replaces the last segment with the encoded filename when stale', () => {
    expect(syncedUrl('https://pub-x.r2.dev/old.webp', 'xindeng-background.webp')).toBe(
      'https://pub-x.r2.dev/xindeng-background.webp',
    )
  })

  it('encodes spaces and non-ASCII characters in the filename', () => {
    expect(syncedUrl('https://pub-x.r2.dev/old.webp', 'ruru academy logo.webp')).toBe(
      'https://pub-x.r2.dev/ruru%20academy%20logo.webp',
    )
    expect(syncedUrl('https://pub-x.r2.dev/old.webp', '如如.webp')).toBe(
      'https://pub-x.r2.dev/%E5%A6%82%E5%A6%82.webp',
    )
  })

  it('preserves nested paths', () => {
    expect(syncedUrl('https://pub-x.r2.dev/media/2026/old.webp', 'new.webp')).toBe(
      'https://pub-x.r2.dev/media/2026/new.webp',
    )
  })

  it('returns the input unchanged when filename is missing (cannot sync)', () => {
    expect(syncedUrl('https://pub-x.r2.dev/old.webp', null)).toBe(
      'https://pub-x.r2.dev/old.webp',
    )
    expect(syncedUrl('https://pub-x.r2.dev/old.webp', '')).toBe(
      'https://pub-x.r2.dev/old.webp',
    )
  })

  it('returns null/undefined when url is missing (cannot derive base)', () => {
    expect(syncedUrl(null, 'foo.webp')).toBeNull()
    expect(syncedUrl(undefined, 'foo.webp')).toBeUndefined()
  })

  it('returns the input unchanged when url has no slash (malformed)', () => {
    expect(syncedUrl('weird-no-slash', 'new.webp')).toBe('weird-no-slash')
  })
})

// ─── syncMediaUrlAfterChange() — hook behaviour ────────────────────────────

function makeReq(updateFn = vi.fn().mockResolvedValue({})) {
  return {
    payload: { update: updateFn },
    context: {} as Record<string, unknown>,
  }
}

describe('syncMediaUrlAfterChange()', () => {
  it('calls payload.update with the corrected url when stale', async () => {
    const update = vi.fn().mockResolvedValue({})
    const req = makeReq(update)
    const doc = { id: 14, url: 'https://pub-x.r2.dev/old.webp', filename: 'new.webp' }

    await syncMediaUrlAfterChange({ doc, req, operation: 'update' } as any)

    expect(update).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        id: 14,
        data: { url: 'https://pub-x.r2.dev/new.webp' },
        context: { skipUrlSync: true },
        overrideAccess: true,
      }),
    )
  })

  it('does NOT call payload.update when url already matches filename', async () => {
    const update = vi.fn()
    const req = makeReq(update)
    const doc = { id: 1, url: 'https://pub-x.r2.dev/foo.webp', filename: 'foo.webp' }

    await syncMediaUrlAfterChange({ doc, req, operation: 'update' } as any)

    expect(update).not.toHaveBeenCalled()
  })

  it('skips on create (storage plugin handles initial url)', async () => {
    const update = vi.fn()
    const req = makeReq(update)
    const doc = { id: 2, url: 'https://pub-x.r2.dev/old.webp', filename: 'new.webp' }

    await syncMediaUrlAfterChange({ doc, req, operation: 'create' } as any)

    expect(update).not.toHaveBeenCalled()
  })

  it('does not recurse: skipUrlSync context flag short-circuits', async () => {
    const update = vi.fn()
    const req = { payload: { update }, context: { skipUrlSync: true } }
    const doc = { id: 3, url: 'https://pub-x.r2.dev/old.webp', filename: 'new.webp' }

    await syncMediaUrlAfterChange({ doc, req, operation: 'update' } as any)

    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing when url or filename is missing', async () => {
    const update = vi.fn()
    await syncMediaUrlAfterChange({
      doc: { id: 4, url: null, filename: 'foo.webp' },
      req: makeReq(update),
      operation: 'update',
    } as any)
    await syncMediaUrlAfterChange({
      doc: { id: 5, url: 'https://pub-x.r2.dev/foo.webp', filename: null },
      req: makeReq(update),
      operation: 'update',
    } as any)
    expect(update).not.toHaveBeenCalled()
  })
})
