/**
 * Unit tests for Activities and Reservations hook functions.
 * These are pure-function tests — Payload is mocked, no DB required.
 *
 * Chunk 2.5 note: Activities, Journal, and Reservations all now have a required
 * `location` relationship field (→ locations). The hook functions tested here
 * (occurrence soft-delete, publish validator, audit timestamps, location derivation)
 * do not themselves enforce location's presence — that is Payload schema validation.
 * The Reservations.beforeChange location-derivation tests are in the
 * "Reservations.beforeChange — location derivation from activity" describe block.
 */

import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/email-jobs', () => ({ enqueueEmail: vi.fn().mockResolvedValue({ id: 'j1' }) }))
vi.mock('../lib/translate', () => ({
  translateText: vi.fn(),
  translateRichText: vi.fn(),
}))

import {
  activitiesBeforeChange,
  activitiesBeforeValidate,
  activitiesAutoTranslate,
} from '../collections/Activities.hooks'
import { reservationsBeforeChange, reservationsAfterChange } from '../collections/Reservations.hooks'
import { translateText, translateRichText } from '../lib/translate'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, any> = {}) {
  return {
    user: { id: 'user-1' },
    locale: 'zh-CN',
    payload: {
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    },
    ...overrides,
  }
}

// ─── Activities.beforeChange — occurrence soft-delete ────────────────────────

describe('Activities.beforeChange — occurrence soft-delete', () => {
  it('re-inserts removed occurrences with status=deleted', async () => {
    const originalDoc = {
      occurrences: [
        { id: 'occ-1', startAt: '2026-01-01', status: 'open' },
        { id: 'occ-2', startAt: '2026-02-01', status: 'open' },
      ],
    }
    // Admin removed occ-2 from the UI
    const data = {
      occurrences: [{ id: 'occ-1', startAt: '2026-01-01', status: 'open' }],
    }

    const result = await activitiesBeforeChange({ data, originalDoc }) as any

    expect(result.occurrences).toHaveLength(2)
    const softDeleted = result.occurrences.find((o: any) => o.id === 'occ-2')
    expect(softDeleted).toBeDefined()
    expect(softDeleted.status).toBe('deleted')
  })

  it('leaves occurrences unchanged when nothing was removed', async () => {
    const occ = { id: 'occ-1', startAt: '2026-01-01', status: 'open' }
    const originalDoc = { occurrences: [occ] }
    const data = { occurrences: [occ] }

    const result = await activitiesBeforeChange({ data, originalDoc }) as any

    expect(result.occurrences).toHaveLength(1)
    expect(result.occurrences[0].status).toBe('open')
  })

  it('passes through when originalDoc has no occurrences', async () => {
    const data = { occurrences: [] }
    const result = await activitiesBeforeChange({ data, originalDoc: null }) as any
    expect(result).toBe(data)
  })
})

// ─── Activities.beforeValidate — publish validator ────────────────────────────

describe('Activities.beforeValidate — publish validator (zh-CN required; en handled by auto-translate)', () => {
  it('passes for draft status without calling DB', async () => {
    const req = makeReq()
    const data = { status: 'draft', title: 'test' }

    const result = await activitiesBeforeValidate({ data, originalDoc: null, req })

    expect(result).toBe(data)
    expect(req.payload.findByID).not.toHaveBeenCalled()
  })

  it('passes publish-on-create when zh title and shortDesc are present', async () => {
    const req = makeReq()
    const data = { status: 'published', title: '禅修课', shortDesc: '简介' }

    const result = await activitiesBeforeValidate({ data, originalDoc: null, req })

    expect(result).toBe(data)
    expect(req.payload.findByID).not.toHaveBeenCalled()
  })

  it('throws publish-on-create when zh title is missing', async () => {
    const req = makeReq()
    const data = { status: 'published', shortDesc: '简介' }

    await expect(
      activitiesBeforeValidate({ data, originalDoc: null, req }),
    ).rejects.toThrow(/中文/)
  })

  it('throws publish-on-create when zh shortDesc is missing', async () => {
    const req = makeReq()
    const data = { status: 'published', title: '禅修课' }

    await expect(
      activitiesBeforeValidate({ data, originalDoc: null, req }),
    ).rejects.toThrow(/中文/)
  })

  it('passes publish on update when zh content is present (en empty is fine)', async () => {
    const req = makeReq()
    const data = { status: 'published', title: '禅修课', shortDesc: '简介' }
    const originalDoc = { id: 'act-1', status: 'draft' }

    const result = await activitiesBeforeValidate({ data, originalDoc, req })

    expect(result).toBe(data)
  })

  it('throws publish on update when zh title is missing in both data and original', async () => {
    const req = makeReq()
    const data = { status: 'published' }
    const originalDoc = { id: 'act-1', status: 'draft', title: '', shortDesc: '简介' }

    await expect(
      activitiesBeforeValidate({ data, originalDoc, req }),
    ).rejects.toThrow(/中文/)
  })

  it('looks up zh-CN from DB when current locale is en (cross-locale publish)', async () => {
    const req = makeReq({ locale: 'en' })
    req.payload.findByID.mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介' })
    const data = { status: 'published', title: 'Meditation' }   // en submission
    const originalDoc = { id: 'act-1', status: 'draft' }

    const result = await activitiesBeforeValidate({ data, originalDoc, req })

    expect(result).toBe(data)
    expect(req.payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'activities', id: 'act-1', locale: 'zh-CN' }),
    )
  })
})

// ─── Activities.afterChange — auto-translate to en on publish ──────────────

describe('Activities.afterChange — auto-translate to en on publish', () => {
  it('translates zh title/shortDesc/description to en when publishing with empty en', async () => {
    vi.mocked(translateText).mockImplementation(async (zh: string) => `EN(${zh})`)
    vi.mocked(translateRichText).mockResolvedValue({ root: { type: 'root', translated: true, children: [] } } as any)

    const req = makeReq()
    // First call: zh-CN doc
    req.payload.findByID
      .mockResolvedValueOnce({
        title: '禅修课',
        shortDesc: '简介',
        description: { root: { type: 'root', children: [{ type: 'text', text: '正文' }] } },
      })
      // Second call: en doc — all empty
      .mockResolvedValueOnce({ title: '', shortDesc: '', description: null })

    const doc = { id: 'act-1', status: 'published' }
    const previousDoc = { id: 'act-1', status: 'draft' }

    await activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any)

    expect(req.payload.update).toHaveBeenCalledOnce()
    const call = req.payload.update.mock.calls[0][0]
    expect(call.collection).toBe('activities')
    expect(call.id).toBe('act-1')
    expect(call.locale).toBe('en')
    expect(call.data.title).toBe('EN(禅修课)')
    expect(call.data.shortDesc).toBe('EN(简介)')
    expect(call.data.description).toEqual({ root: { type: 'root', translated: true, children: [] } })
    expect(call.context).toEqual({ skipAutoTranslate: true })
  })

  it('triggers on any save while status=published when EN is empty (no transition required)', async () => {
    vi.mocked(translateText).mockImplementation(async (zh: string) => `EN(${zh})`)
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介', description: null })
      .mockResolvedValueOnce({ title: '', shortDesc: '', description: null })

    const doc = { id: 'act-1', status: 'published' }
    // previousDoc is also published — no draft→published transition, but EN
    // is empty, so the hook still fires (covers deploy timing edge cases:
    // the activity may have been published before this code was live).
    const previousDoc = { id: 'act-1', status: 'published' }

    await activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any)

    expect(req.payload.update).toHaveBeenCalledOnce()
    const data = req.payload.update.mock.calls[0][0].data
    expect(data.title).toBe('EN(禅修课)')
  })

  it('does not trigger when new status is not published', async () => {
    const req = makeReq()
    const doc = { id: 'act-1', status: 'draft' }

    await activitiesAutoTranslate({ doc, previousDoc: null, req, operation: 'create' } as any)

    expect(req.payload.update).not.toHaveBeenCalled()
  })

  it('skips fields where en is already filled (no overwrite)', async () => {
    vi.mocked(translateText).mockImplementation(async (zh: string) => `EN(${zh})`)
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介', description: null })
      .mockResolvedValueOnce({ title: 'Existing EN title', shortDesc: '', description: null })

    const doc = { id: 'act-1', status: 'published' }
    const previousDoc = { id: 'act-1', status: 'draft' }

    await activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any)

    expect(req.payload.update).toHaveBeenCalledOnce()
    const data = req.payload.update.mock.calls[0][0].data
    expect(data.title).toBeUndefined()
    expect(data.shortDesc).toBe('EN(简介)')
  })

  it('does not call payload.update when nothing needs translating', async () => {
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介', description: null })
      .mockResolvedValueOnce({ title: 'EN title', shortDesc: 'EN desc', description: null })

    const doc = { id: 'act-1', status: 'published' }
    const previousDoc = { id: 'act-1', status: 'draft' }

    await activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any)

    expect(req.payload.update).not.toHaveBeenCalled()
  })

  it('tolerates translator throwing (catches, save not rolled back)', async () => {
    vi.mocked(translateText).mockRejectedValue(new Error('claude down'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介', description: null })
      .mockResolvedValueOnce({ title: '', shortDesc: '', description: null })

    const doc = { id: 'act-1', status: 'published' }
    const previousDoc = { id: 'act-1', status: 'draft' }

    await expect(
      activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any),
    ).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(req.payload.update).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('short-circuits on recursive entry via skipAutoTranslate context flag', async () => {
    const req = makeReq()
    ;(req as any).context = { skipAutoTranslate: true }
    const doc = { id: 'act-1', status: 'published' }
    const previousDoc = { id: 'act-1', status: 'draft' }

    await activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any)

    expect(req.payload.findByID).not.toHaveBeenCalled()
    expect(req.payload.update).not.toHaveBeenCalled()
  })

  it('queries en with fallbackLocale: false so an empty en row is not masked by zh-CN fallback', async () => {
    vi.mocked(translateText).mockResolvedValue('EN')
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介', description: null })
      .mockResolvedValueOnce({ title: '', shortDesc: '', description: null })

    const doc = { id: 'act-1', status: 'published' }
    const previousDoc = { id: 'act-1', status: 'draft' }

    await activitiesAutoTranslate({ doc, previousDoc, req, operation: 'update' } as any)

    // Second findByID call is the en lookup; it MUST disable fallback so that
    // an empty en locale row is not silently returned as the zh-CN content.
    expect(req.payload.findByID).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'activities',
        id: 'act-1',
        locale: 'en',
        fallbackLocale: false,
      }),
    )
  })

  it('triggers on new activity created directly as published (no previousDoc)', async () => {
    vi.mocked(translateText).mockImplementation(async (zh: string) => `EN(${zh})`)
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ title: '禅修课', shortDesc: '简介', description: null })
      .mockResolvedValueOnce({ title: '', shortDesc: '', description: null })

    const doc = { id: 'act-1', status: 'published' }

    await activitiesAutoTranslate({ doc, previousDoc: null, req, operation: 'create' } as any)

    expect(req.payload.update).toHaveBeenCalled()
  })
})

// ─── Reservations.beforeChange — location derivation ─────────────────────────

describe('Reservations.beforeChange — location derivation from activity', () => {
  it('derives location from activity when activity is set and location is missing', async () => {
    const req = makeReq()
    req.payload.findByID.mockResolvedValueOnce({ id: 'act-1', location: 'loc-chiangmai' })

    const data: any = { status: 'pending', activity: 'act-1' }
    const result = await reservationsBeforeChange({ data, originalDoc: null, req, operation: 'create' }) as any

    expect(req.payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'activities', id: 'act-1' }),
    )
    expect(result.location).toBe('loc-chiangmai')
  })

  it('always overwrites with activity.location even if location was pre-set', async () => {
    const req = makeReq()
    // activity is the source of truth — it overrides any manually-set location
    req.payload.findByID.mockResolvedValueOnce({ id: 'act-1', location: 'loc-chiangmai' })
    const data: any = { status: 'pending', activity: 'act-1', location: 'loc-bangkok' }
    const result = await reservationsBeforeChange({ data, originalDoc: null, req, operation: 'create' }) as any

    expect(req.payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'activities', id: 'act-1' }),
    )
    expect(result.location).toBe('loc-chiangmai')
  })

  it('handles activity as object with id property', async () => {
    const req = makeReq()
    req.payload.findByID.mockResolvedValueOnce({ id: 'act-2', location: { id: 'loc-chiangmai' } })

    const data: any = { status: 'pending', activity: { id: 'act-2' } }
    const result = await reservationsBeforeChange({ data, originalDoc: null, req, operation: 'create' }) as any

    expect(result.location).toBe('loc-chiangmai')
  })

  it('leaves location unset when no activity is provided (general inquiry)', async () => {
    const req = makeReq()
    const data: any = { status: 'pending' }
    const result = await reservationsBeforeChange({ data, originalDoc: null, req, operation: 'create' }) as any

    expect(req.payload.findByID).not.toHaveBeenCalled()
    expect(result.location).toBeUndefined()
  })
})

// ─── Reservations.beforeChange — audit fields ─────────────────────────────────

describe('Reservations.beforeChange — audit fields', () => {
  it('create with status=confirmed fills confirmedAt and confirmedBy', async () => {
    const req = makeReq()
    const data: any = { status: 'confirmed' }

    const result = await reservationsBeforeChange({ data, originalDoc: null, req, operation: 'create' }) as any

    expect(result.confirmedAt).toBeDefined()
    expect(result.confirmedBy).toBe('user-1')
    expect(result.deletedAt).toBeUndefined()
  })

  it('create with status=pending leaves audit fields untouched', async () => {
    const req = makeReq()
    const data: any = { status: 'pending' }

    const result = await reservationsBeforeChange({ data, originalDoc: null, req, operation: 'create' }) as any

    expect(result.confirmedAt).toBeUndefined()
    expect(result.confirmedBy).toBeUndefined()
    expect(result.deletedAt).toBeUndefined()
  })

  it('update pending→confirmed fills confirmedAt and confirmedBy', async () => {
    const req = makeReq()
    const originalDoc = { status: 'pending', confirmedAt: undefined }
    const data: any = { status: 'confirmed' }

    const result = await reservationsBeforeChange({ data, originalDoc, req, operation: 'update' }) as any

    expect(result.confirmedAt).toBeDefined()
    expect(result.confirmedBy).toBe('user-1')
  })

  it('update confirmed→confirmed leaves existing confirmedAt unchanged', async () => {
    const req = makeReq()
    const originalConfirmedAt = '2026-01-15T10:00:00.000Z'
    const originalDoc = { status: 'confirmed', confirmedAt: originalConfirmedAt }
    const data: any = { status: 'confirmed' }

    const result = await reservationsBeforeChange({ data, originalDoc, req, operation: 'update' }) as any

    // Status didn't change so the if-branch is not entered — confirmedAt not overwritten
    expect(result.confirmedAt).toBeUndefined()
  })

  it('update pending→deleted fills deletedAt and deletedBy', async () => {
    const req = makeReq()
    const originalDoc = { status: 'pending' }
    const data: any = { status: 'deleted' }

    const result = await reservationsBeforeChange({ data, originalDoc, req, operation: 'update' }) as any

    expect(result.deletedAt).toBeDefined()
    expect(result.deletedBy).toBe('user-1')
  })
})

// ─── Reservations.afterChange — confirmation email ────────────────────────────

describe('Reservations.afterChange — status → confirmed email', () => {
  it('enqueues confirmation email when status transitions to confirmed and email is set', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    const req = makeReq()

    await reservationsAfterChange({
      doc: { id: 'r1', status: 'confirmed', email: 'guest@example.com', name: 'Guest', language: 'zh' },
      previousDoc: { status: 'pending' },
      req,
    })

    expect(enqueueEmail).toHaveBeenCalledWith(
      req.payload,
      expect.objectContaining({
        to: 'guest@example.com',
        subject: '静心学堂 · 泰国 · 预约已确认',
        relatedReservation: 'r1',
      }),
    )
  })

  it('enqueues English confirmation when language=en', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    const req = makeReq()

    await reservationsAfterChange({
      doc: { id: 'r2', status: 'confirmed', email: 'guest@example.com', name: 'Guest', language: 'en' },
      previousDoc: { status: 'pending' },
      req,
    })

    expect(enqueueEmail).toHaveBeenCalledWith(
      req.payload,
      expect.objectContaining({
        subject: 'Mindfulpeace Academy Thailand · Booking confirmed',
      }),
    )
  })

  it('does NOT enqueue when status was already confirmed', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    vi.mocked(enqueueEmail).mockClear()
    const req = makeReq()

    await reservationsAfterChange({
      doc: { id: 'r3', status: 'confirmed', email: 'guest@example.com', name: 'Guest', language: 'zh' },
      previousDoc: { status: 'confirmed' },
      req,
    })

    expect(enqueueEmail).not.toHaveBeenCalled()
  })

  it('does NOT enqueue when no email address on record', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    vi.mocked(enqueueEmail).mockClear()
    const req = makeReq()

    await reservationsAfterChange({
      doc: { id: 'r4', status: 'confirmed', name: 'Guest', language: 'zh' },
      previousDoc: { status: 'pending' },
      req,
    })

    expect(enqueueEmail).not.toHaveBeenCalled()
  })
})
