// We use `any` casts here because `email-jobs` is a new collection and
// payload-types.ts will only be regenerated the next time `pnpm generate:types`
// (or `pnpm dev`) runs. At runtime the Payload local API accepts any registered
// collection slug — the casts are safe.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Payload } from 'payload'
import { sendMail } from './email'

export async function enqueueEmail(
  payload: Payload,
  args: {
    to: string
    subject: string
    body: string
    /** Sender display name (defaults to "静心学堂 · 泰国"). Use per-academy
     *  name for booking-related emails so recipients see the right context. */
    fromName?: string
    /** Reply-To address (e.g. chiangmai@mindfulpeaceth.com) — independent
     *  of the SMTP sender account; ensures replies route to the right academy. */
    replyTo?: string
    relatedReservation?: number | string
    attachments?: Array<{ filename: string; content: string; contentType: string }>
  },
) {
  const p = payload as any
  // Coerce relatedReservation to a number — Payload's postgres adapter
  // requires numeric IDs for relationship fields. We accept either form
  // at the API boundary for convenience.
  const data = {
    ...args,
    status: 'pending',
    ...(args.relatedReservation !== undefined
      ? { relatedReservation: Number(args.relatedReservation) }
      : {}),
  }
  const job = await p.create({
    collection: 'email-jobs',
    data,
  })
  // Process synchronously. The Vercel-killed-promise problem with
  // fire-and-forget made emails silently drop in production, and the
  // newer next/server `after()` API was unreliable in this lambda layout
  // (tasks never executed). A 1-2 s extra wait on the API response is
  // an acceptable price for guaranteed delivery on a booking flow.
  await processEmailJob(payload, String(job.id))
  return job
}

export async function processEmailJob(payload: Payload, id: string): Promise<void> {
  const p = payload as any
  const delays = [1000, 2000, 4000] // exponential backoff: 1s, 2s, 4s
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const job = await p.findByID({ collection: 'email-jobs', id })
      await sendMail({
        to: job.to as string,
        subject: job.subject as string,
        body: job.body as string,
        fromName: (job.fromName as string | undefined) ?? undefined,
        replyTo: (job.replyTo as string | undefined) ?? undefined,
        attachments: job.attachments as Array<{ filename: string; content: string; contentType: string }> | undefined,
      })
      try {
        await p.update({
          collection: 'email-jobs',
          id,
          data: { status: 'sent', attempts: attempt },
        })
      } catch (updateErr) {
        console.error(`[email-jobs] Failed to mark job ${id} as sent:`, updateErr)
      }
      if (job.relatedReservation) {
        try {
          await p.update({
            collection: 'reservations',
            id: String(
              typeof job.relatedReservation === 'object' && job.relatedReservation !== null
                ? (job.relatedReservation as any).id
                : job.relatedReservation,
            ),
            data: { emailStatus: 'sent' },
          })
        } catch (updateErr) {
          console.error(`[email-jobs] Failed to update reservation emailStatus to sent for job ${id}:`, updateErr)
        }
      }
      return
    } catch (err: unknown) {
      if (attempt === 3) {
        const errMsg = err instanceof Error ? err.message : String(err)
        try {
          await p.update({
            collection: 'email-jobs',
            id,
            data: { status: 'failed', attempts: attempt, lastError: errMsg },
          })
          const job = await p.findByID({ collection: 'email-jobs', id })
          if (job.relatedReservation) {
            await p.update({
              collection: 'reservations',
              id: String(
                typeof job.relatedReservation === 'object' && job.relatedReservation !== null
                  ? (job.relatedReservation as any).id
                  : job.relatedReservation,
              ),
              data: { emailStatus: 'failed' },
            })
          }
        } catch (err) {
          console.error(`[email-jobs] Failed to mark job ${id} as failed:`, err)
        }
      } else {
        await new Promise(r => setTimeout(r, delays[attempt - 1]))
      }
    }
  }
}
