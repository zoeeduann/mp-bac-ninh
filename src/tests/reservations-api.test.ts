import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '../app/api/reservations/route'
import { _resetForTest } from '../lib/rate-limit'

vi.mock('../lib/turnstile', () => ({ verifyTurnstile: vi.fn().mockResolvedValue(true) }))
vi.mock('../lib/email-jobs', () => ({ enqueueEmail: vi.fn().mockResolvedValue({ id: 'j1' }) }))

// Mock the payload config import — route.ts imports this at the top
vi.mock('../payload.config', () => ({ default: {} }))

const mockPayload = {
  find: vi.fn(),
  findByID: vi.fn(),
  findGlobal: vi.fn().mockResolvedValue({ adminEmail: 'admin@test.com' }),
  create: vi.fn(),
  db: {
    drizzle: {
      execute: vi.fn().mockResolvedValue(undefined),
    },
  },
}

vi.mock('payload', () => ({ getPayload: vi.fn(async () => mockPayload) }))

const makeReq = (body: any, ip = '1.1.1.1') =>
  new Request('http://test/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as any

const validInquiry = {
  name: 'Test User',
  phone: '+66 99 000 0000',
  email: 'test@example.com',
  turnstileToken: 'bypass',
  honeypot: '',
  direction: 'visit' as const,
  source: 'book_general_inquiry' as const,
  language: 'zh' as const,
  location: 'loc-chiangmai',
}

beforeEach(() => {
  _resetForTest()
  vi.clearAllMocks()
  mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'admin@test.com' })
})

describe('POST /api/reservations', () => {
  // ── Validation ────────────────────────────────────────────────────────────

  it('400 on missing required fields (no name)', async () => {
    const res = await POST(makeReq({ phone: '123', email: 'a@b.com', turnstileToken: 't' }))
    expect(res.status).toBe(400)
  })

  it('400 on missing phone', async () => {
    const res = await POST(makeReq({ name: 'A', email: 'a@b.com', turnstileToken: 't' }))
    expect(res.status).toBe(400)
  })

  it('400 when neither email nor wechatId is provided', async () => {
    const res = await POST(makeReq({ name: 'A', phone: '123', turnstileToken: 't', honeypot: '' }))
    expect(res.status).toBe(400)
  })

  // ── Honeypot ──────────────────────────────────────────────────────────────

  it('400 on honeypot non-empty', async () => {
    const res = await POST(makeReq({
      name: 'A', phone: '1', email: 'a@b.com',
      turnstileToken: 't', honeypot: 'spam',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_payload')
  })

  // ── General inquiry path ──────────────────────────────────────────────────

  it('writes pending for valid general inquiry (no activity)', async () => {
    mockPayload.create.mockResolvedValueOnce({ id: 'r1' })
    const res = await POST(makeReq(validInquiry))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.ok).toBe(true)
    expect(resBody.id).toBe('r1')
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'reservations',
        data: expect.objectContaining({ status: 'pending' }),
      }),
    )
  })

  it('sets emailStatus=no_email when no email provided (general inquiry with wechatId)', async () => {
    mockPayload.create.mockResolvedValueOnce({ id: 'r2' })
    const res = await POST(makeReq({
      name: 'B', phone: '123', wechatId: 'wx123',
      turnstileToken: 't', honeypot: '',
      source: 'book_general_inquiry',
      direction: 'visit',
      location: 'loc-chiangmai',
    }))
    expect(res.status).toBe(200)
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailStatus: 'no_email' }),
      }),
    )
  })

  // ── Activity booking: capacity available → created ────────────────────────

  it('activity booking with capacity available returns 200, kind=created', async () => {
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'a1',
      status: 'published',
      capacity: 10,
      occurrences: [{ id: 'o1', capacityOverride: null, status: 'open' }],
    })
    mockPayload.find.mockResolvedValueOnce({ docs: [] }) // no existing reservations
    mockPayload.create.mockResolvedValueOnce({ id: 'r3' })

    const res = await POST(makeReq({
      name: 'C', phone: '123', email: 'c@d.com',
      turnstileToken: 't', honeypot: '',
      activity: 'a1', occurrenceId: 'o1',
      guests: 2,
      source: 'activity_detail',
    }))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.ok).toBe(true)
    expect(resBody.kind).toBe('created')
    expect(resBody.id).toBe('r3')
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending' }),
      }),
    )
  })

  // ── Activity booking: over capacity → 409 ────────────────────────────────

  it('returns 409 capacity_full when activity is at full capacity', async () => {
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'a1',
      status: 'published',
      capacity: 5,
      occurrences: [{ id: 'o1', capacityOverride: null, status: 'open' }],
    })
    mockPayload.find.mockResolvedValueOnce({
      docs: [{ guests: 5, status: 'confirmed', occurrenceId: 'o1' }],
    })

    const res = await POST(makeReq({
      name: 'D', phone: '123', email: 'd@e.com',
      turnstileToken: 't', honeypot: '',
      activity: 'a1', occurrenceId: 'o1',
      guests: 1,
      source: 'activity_detail',
    }))
    expect(res.status).toBe(409)
    const resBody = await res.json()
    expect(resBody.error).toBe('capacity_full')
  })

  // ── Activity booking: full + acceptWaitlist → waitlisted ─────────────────

  it('creates waitlist reservation when full and acceptWaitlist=true', async () => {
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'a1',
      status: 'published',
      capacity: 5,
      occurrences: [{ id: 'o1', capacityOverride: null, status: 'open' }],
    })
    mockPayload.find.mockResolvedValueOnce({
      docs: [{ guests: 5, status: 'confirmed', occurrenceId: 'o1' }],
    })
    mockPayload.create.mockResolvedValueOnce({ id: 'r4' })

    const res = await POST(makeReq({
      name: 'E', phone: '123', email: 'e@f.com',
      turnstileToken: 't', honeypot: '',
      activity: 'a1', occurrenceId: 'o1',
      guests: 1, acceptWaitlist: true,
      source: 'activity_detail',
    }))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.kind).toBe('waitlisted')
    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'waitlist' }),
      }),
    )
  })

  // ── Per-academy admin notification routing ────────────────────────────────

  it('admin notification ALSO goes to location.email when set (Bangkok inquiry → Bangkok mailbox)', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    vi.clearAllMocks()
    mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'admin@test.com' })
    mockPayload.findByID.mockResolvedValueOnce({
      // Locations lookup for routing
      id: 'loc-bangkok',
      name: '曼谷如如学堂',
      email: 'bangkok@mindfulpeaceth.com',
    })
    mockPayload.create.mockResolvedValueOnce({ id: 'r_bkk' })

    await POST(makeReq({
      ...validInquiry,
      location: 'loc-bangkok',
    }, '9.9.9.9'))

    const enqueueMock = enqueueEmail as unknown as ReturnType<typeof vi.fn>
    // Find calls that look like admin notifications (subject starts with 预约通知 or 自由咨询)
    const adminCalls = enqueueMock.mock.calls.filter(
      (c: any[]) => /预约通知|自由咨询/.test(c[1]?.subject ?? ''),
    )
    const recipients = adminCalls.map((c: any[]) => c[1].to)
    expect(recipients).toContain('admin@test.com')
    expect(recipients).toContain('bangkok@mindfulpeaceth.com')
  })

  it('only sends one admin notification when location.email == settings.adminEmail (dedupe)', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    vi.clearAllMocks()
    mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'same@test.com' })
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'loc-chiangmai',
      name: '清迈心灯学堂',
      email: 'same@test.com',
    })
    mockPayload.create.mockResolvedValueOnce({ id: 'r_dup' })

    await POST(makeReq({ ...validInquiry, location: 'loc-chiangmai' }, '6.6.6.6'))

    const enqueueMock = enqueueEmail as unknown as ReturnType<typeof vi.fn>
    const adminCalls = enqueueMock.mock.calls.filter(
      (c: any[]) => /预约通知|自由咨询/.test(c[1]?.subject ?? ''),
    )
    expect(adminCalls).toHaveLength(1)
    expect(adminCalls[0][1].to).toBe('same@test.com')
  })

  it('admin notification body includes the occurrence start time in BKK', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    vi.clearAllMocks()
    mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'admin@test.com' })
    mockPayload.findByID.mockResolvedValueOnce({
      // Activity fetch in route handler
      id: 'a1',
      status: 'published',
      capacity: 10,
      title: '禅茶读书会',
      // 2026-06-15T12:30Z is 2026-06-15 19:30 BKK
      occurrences: [
        { id: 'o1', capacityOverride: null, status: 'open', startAt: '2026-06-15T12:30:00.000Z', endAt: '2026-06-15T14:00:00.000Z' },
      ],
    })
    mockPayload.find.mockResolvedValueOnce({ docs: [] })
    mockPayload.create.mockResolvedValueOnce({ id: 'r_occ' })
    mockPayload.findByID.mockResolvedValueOnce({
      // Location fetch in sendNotifications
      id: 'loc-bangkok',
      name: '曼谷如如学堂',
      email: 'bangkok@mindfulpeaceth.com',
    })

    await POST(makeReq({
      name: 'F', phone: '+66 81 000 0010', email: 'f@g.com',
      turnstileToken: 't', honeypot: '',
      activity: 'a1', occurrenceId: 'o1',
      guests: 1, source: 'activity_detail',
    }, '2.2.2.2'))

    const enqueueMock = enqueueEmail as unknown as ReturnType<typeof vi.fn>
    const adminCalls = enqueueMock.mock.calls.filter(
      (c: any[]) => /预约通知/.test(c[1]?.subject ?? ''),
    )
    expect(adminCalls.length).toBeGreaterThanOrEqual(1)
    // The body should mention the occurrence date and BKK wall-clock time
    const adminBody = adminCalls[0][1].body as string
    expect(adminBody).toMatch(/场次/)
    // BKK is UTC+7, so 12:30Z → 19:30
    expect(adminBody).toMatch(/2026/)
    expect(adminBody).toMatch(/19:30/)
    // Subject line should include a date-ish marker for quick scanning
    const subj = adminCalls[0][1].subject as string
    expect(subj).toMatch(/6\/15|06\/15/)
    expect(subj).toMatch(/19:30/)
  })

  it('falls back to admin email only when location has no email', async () => {
    const { enqueueEmail } = await import('../lib/email-jobs')
    vi.clearAllMocks()
    mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'admin@test.com' })
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'loc-phuket',
      name: '普吉和光小院',
      // email intentionally absent
    })
    mockPayload.create.mockResolvedValueOnce({ id: 'r_no_locemail' })

    await POST(makeReq({ ...validInquiry, location: 'loc-phuket' }, '4.4.4.4'))

    const enqueueMock = enqueueEmail as unknown as ReturnType<typeof vi.fn>
    const adminCalls = enqueueMock.mock.calls.filter(
      (c: any[]) => /预约通知|自由咨询/.test(c[1]?.subject ?? ''),
    )
    expect(adminCalls).toHaveLength(1)
    expect(adminCalls[0][1].to).toBe('admin@test.com')
  })

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it('rate limits: 21st submission from same IP gets 429', async () => {
    mockPayload.create.mockResolvedValue({ id: 'rx' })

    // Send 20 valid requests (should succeed — new threshold is 20)
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeReq({ ...validInquiry, location: 'loc-chiangmai' }, '5.5.5.5'))
      expect(res.status).toBe(200)
    }

    // 21st should be rate limited
    const res = await POST(makeReq({ ...validInquiry, location: 'loc-chiangmai' }, '5.5.5.5'))
    expect(res.status).toBe(429)
    const resBody = await res.json()
    expect(resBody.error).toBe('rate_limited')
  })

  // ── Advisory lock acquisition / release contract ──────────────────────────

  it('advisory lock acquired before reservation lookup', async () => {
    // Reset call-order tracking
    vi.clearAllMocks()
    mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'admin@test.com' })

    mockPayload.findByID.mockResolvedValueOnce({
      id: 'a1',
      status: 'published',
      capacity: 10,
      occurrences: [{ id: 'o1', capacityOverride: null, status: 'open' }],
    })
    mockPayload.find.mockResolvedValueOnce({ docs: [] })
    mockPayload.create.mockResolvedValueOnce({ id: 'r_lock_order' })

    await POST(makeReq({
      name: 'Lock Test', phone: '+66 81 000 0001', email: 'lock@test.com',
      turnstileToken: 't', honeypot: '',
      activity: 'a1', occurrenceId: 'o1',
      guests: 1, source: 'activity_detail',
    }, '7.7.7.7'))

    // execute is called for pg_advisory_lock AND pg_advisory_unlock
    // The first execute call should be advisory_lock, which must precede find
    const executeMock = mockPayload.db.drizzle.execute
    const findMock = mockPayload.find

    expect(executeMock).toHaveBeenCalled()
    expect(findMock).toHaveBeenCalled()

    // Verify lock was acquired (first execute call) before find was called
    const lockCallOrder = executeMock.mock.invocationCallOrder[0]
    const findCallOrder = findMock.mock.invocationCallOrder[0]
    expect(lockCallOrder).toBeLessThan(findCallOrder)
  })

  it('advisory lock released even when create throws', async () => {
    vi.clearAllMocks()
    mockPayload.findGlobal.mockResolvedValue({ adminEmail: 'admin@test.com' })

    mockPayload.findByID.mockResolvedValueOnce({
      id: 'a2',
      status: 'published',
      capacity: 10,
      occurrences: [{ id: 'o2', capacityOverride: null, status: 'open' }],
    })
    mockPayload.find.mockResolvedValueOnce({ docs: [] })
    // Simulate create throwing
    mockPayload.create.mockRejectedValueOnce(new Error('DB write failure'))

    // The route propagates the error (Next.js runtime catches it and returns 500).
    // In the test environment we catch it ourselves so we can assert on the lock.
    let threw = false
    try {
      await POST(makeReq({
        name: 'Lock Release Test', phone: '+66 81 000 0002', email: 'lockrel@test.com',
        turnstileToken: 't', honeypot: '',
        activity: 'a2', occurrenceId: 'o2',
        guests: 1, source: 'activity_detail',
      }, '8.8.8.8'))
    } catch {
      threw = true
    }

    // Verify the route threw (would become a 500 in production)
    expect(threw).toBe(true)

    // Despite the create failure, pg_advisory_unlock must have been called (finally block)
    const executeMock = mockPayload.db.drizzle.execute
    const unlockCalls = executeMock.mock.calls.filter((call: any[]) =>
      String(call[0]).includes('pg_advisory_unlock'),
    )
    expect(unlockCalls.length).toBeGreaterThanOrEqual(1)
  })
})
