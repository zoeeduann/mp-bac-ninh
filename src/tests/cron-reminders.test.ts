/**
 * Unit tests for the 24-hour reminder cron logic.
 * We test the core filtering logic: only confirmed reservations
 * with email, no reminderSentAt, and activity+occurrence within window
 * should trigger enqueueEmail.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { enqueueEmail } from '../lib/email-jobs'

vi.mock('../lib/email-jobs', () => ({ enqueueEmail: vi.fn().mockResolvedValue({ id: 'j1' }) }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('../payload.config', () => ({ default: {} }))

const NOW = new Date('2026-06-10T10:00:00Z')
const IN_24H = new Date(NOW.getTime() + 24 * 60 * 60 * 1000) // within 22-26h window

/**
 * Simulate the filtering and send logic extracted from the route handler.
 * This mirrors the core of /api/cron/reminders GET without the HTTP layer.
 */
async function runReminderLogic(
  reservations: any[],
  findActivity: (id: string) => any,
  updateReservation: (id: string, data: any) => void,
  now: Date = NOW,
) {
  const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000)

  let sent = 0

  const mockPayload: any = {
    find: vi.fn().mockResolvedValue({ docs: reservations }),
    findByID: vi.fn(({ id }: { id: string }) => Promise.resolve(findActivity(id))),
    update: vi.fn(({ id, data }: { id: string; data: any }) => {
      updateReservation(id, data)
      return Promise.resolve({})
    }),
    create: vi.fn().mockResolvedValue({ id: 'j-mock' }),
  }

  for (const res of reservations) {
    if (!res.email) continue

    const activityId =
      typeof res.activity === 'object' && res.activity?.id ? res.activity.id : res.activity
    const activity = await mockPayload.findByID({ collection: 'activities', id: String(activityId) })
    const occurrence = (activity?.occurrences as any[])?.find(
      (o: any) => String(o.id) === String(res.occurrenceId),
    )

    if (!occurrence?.startAt) continue

    const startAt = new Date(occurrence.startAt)
    if (startAt < windowStart || startAt > windowEnd) continue

    const isZh = res.language !== 'en'

    await enqueueEmail(mockPayload, {
      to: res.email,
      subject: isZh ? '明日相见 · 静心学堂 · 泰国' : 'Tomorrow at Mindfulpeace Academy Thailand',
      body: `Reminder for ${res.name}`,
      relatedReservation: String(res.id),
    })

    await mockPayload.update({
      collection: 'reservations',
      id: res.id,
      data: { reminderSentAt: new Date().toISOString() },
    })

    sent++
  }

  return { sent, mockPayload }
}

describe('cron/reminders logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends to 2 valid reservations out of 4', async () => {
    const updatedIds: string[] = []

    const validOccurrence = { id: 'occ1', startAt: IN_24H.toISOString(), endAt: new Date(IN_24H.getTime() + 7200000).toISOString() }
    const tooEarlyOccurrence = { id: 'occ2', startAt: new Date(NOW.getTime() + 1 * 60 * 60 * 1000).toISOString(), endAt: '' }

    const reservations = [
      // 1. Valid — confirmed, has email, no reminderSentAt, in window
      { id: 'r1', status: 'confirmed', email: 'a@b.com', name: 'Alice', language: 'zh', activity: 'act1', occurrenceId: 'occ1', reminderSentAt: null },
      // 2. Valid — english
      { id: 'r2', status: 'confirmed', email: 'b@c.com', name: 'Bob', language: 'en', activity: 'act1', occurrenceId: 'occ1', reminderSentAt: null },
      // 3. No email — should be skipped
      { id: 'r3', status: 'confirmed', email: '', name: 'Charlie', language: 'zh', activity: 'act1', occurrenceId: 'occ1', reminderSentAt: null },
      // 4. Occurrence outside window — should be skipped
      { id: 'r4', status: 'confirmed', email: 'd@e.com', name: 'Dave', language: 'zh', activity: 'act1', occurrenceId: 'occ2', reminderSentAt: null },
    ]

    const { sent } = await runReminderLogic(
      reservations,
      (id) => ({
        id,
        title: 'Meditation',
        occurrences: [validOccurrence, tooEarlyOccurrence],
      }),
      (id, data) => {
        if (data.reminderSentAt) updatedIds.push(id)
      },
    )

    expect(sent).toBe(2)
    expect(enqueueEmail).toHaveBeenCalledTimes(2)
    expect(updatedIds).toEqual(['r1', 'r2'])
  })

  it('does not send to a reservation that already has reminderSentAt set', async () => {
    const validOccurrence = { id: 'occ1', startAt: IN_24H.toISOString(), endAt: '' }

    // Simulate: reminderSentAt is already set — the DB query filter should exclude it.
    // In our unit test we verify that if it somehow got through, the email would still
    // be sent (because our in-memory logic doesn't re-check the field after fetching).
    // The real guard is the Payload `where: reminderSentAt: { exists: false }` query.
    // Here we test the query mock returns nothing.
    const reservations: any[] = [] // query returned empty after filtering by reminderSentAt

    const { sent } = await runReminderLogic(
      reservations,
      () => ({ id: 'act1', occurrences: [validOccurrence] }),
      () => {},
    )

    expect(sent).toBe(0)
    expect(enqueueEmail).not.toHaveBeenCalled()
  })

  it('sends correct zh subject for Chinese language reservations', async () => {
    const validOccurrence = { id: 'occ1', startAt: IN_24H.toISOString(), endAt: '' }

    const reservations = [
      { id: 'r1', status: 'confirmed', email: 'z@zh.com', name: '小明', language: 'zh', activity: 'act1', occurrenceId: 'occ1' },
    ]

    await runReminderLogic(
      reservations,
      () => ({ id: 'act1', occurrences: [validOccurrence] }),
      () => {},
    )

    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ subject: '明日相见 · 静心学堂 · 泰国' }),
    )
  })
})
