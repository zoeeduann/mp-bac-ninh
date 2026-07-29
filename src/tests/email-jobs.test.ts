import { describe, expect, it, vi } from 'vitest'
import { enqueueEmail } from '../lib/email-jobs'

vi.mock('../lib/email', () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }))

describe('enqueueEmail', () => {
  it('creates a job row with status=pending', async () => {
    const created: any[] = []
    const payload: any = {
      create: vi.fn(async ({ data }: any) => {
        const job = { id: 'j1', ...data }
        created.push(job)
        return job
      }),
      findByID: vi.fn(async ({ id }: any) => created.find(c => c.id === id)),
      update: vi.fn(async () => ({})),
    }

    const job = await enqueueEmail(payload, { to: 'a@b.com', subject: 'Test', body: 'Hello' })

    expect(job.id).toBe('j1')
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'email-jobs',
        data: expect.objectContaining({ status: 'pending', to: 'a@b.com' }),
      }),
    )
  })

  it('passes relatedReservation when provided', async () => {
    const payload: any = {
      create: vi.fn(async ({ data }: any) => ({ id: 'j2', ...data })),
      findByID: vi.fn(async () => ({ id: 'j2', to: 'x@y.com', subject: 's', body: 'b', relatedReservation: 42 })),
      update: vi.fn(async () => ({})),
    }

    const job = await enqueueEmail(payload, {
      to: 'x@y.com',
      subject: 's',
      body: 'b',
      relatedReservation: 42,
    })

    // Implementation coerces relatedReservation to Number for Postgres relationship field
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ relatedReservation: 42 }),
      }),
    )
    expect(job.relatedReservation).toBe(42)
  })
})
