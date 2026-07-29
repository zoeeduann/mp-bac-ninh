import nodemailer from 'nodemailer'

// Fresh transport per invocation. Module-level caching is unsafe in
// Vercel serverless: the underlying socket can be torn down between
// invocations, leaving a stale transport that hangs the next call.
// Port 587 with STARTTLS is more reliable than the default port-465
// SMTPS through cloud egress, and explicit timeouts mean a flaky SMTP
// fails in seconds (caught by our retry loop) rather than hanging the
// whole function until Vercel kills it mid-flight.
export function getTransport(): nodemailer.Transporter {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail SMTP not configured: set GMAIL_USER and GMAIL_APP_PASSWORD env vars')
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 15_000,
  })
}

export interface SendMailOpts {
  to: string
  subject: string
  body: string
  /**
   * Sender display name shown to the recipient. Defaults to the network
   * brand "静心学堂 · 泰国". When sending in a per-location context, pass
   * the specific academy name so replies are visually anchored to that
   * academy (e.g. "曼谷如如学堂" / "清迈心灯学堂").
   */
  fromName?: string
  /**
   * Reply-To address. Set this to the specific location's contact email
   * (e.g. chiangmai@mindfulpeaceth.com) so when a recipient hits "Reply"
   * it routes to the right academy mailbox — independent of the SMTP
   * sender account.
   */
  replyTo?: string
  attachments?: Array<{ filename: string; content: string; contentType: string }>
}

// Resend's HTTP API. Reliable on Vercel serverless where outbound SMTP
// to Gmail hangs unpredictably. Falls back to nodemailer SMTP when
// RESEND_API_KEY isn't set (local dev convenience).
//
// Hard 8s per-attempt timeout via AbortController. Node's `fetch` has no
// default timeout, so without this a stuck Resend connection would hang
// the entire Vercel function. With our 3-attempt retry loop (1s/2s/4s
// backoff in processEmailJob), total worst-case is ~31s — under the 60s
// route ceiling but above the 10s Hobby default.
async function sendViaResend(opts: SendMailOpts): Promise<void> {
  const fromName = opts.fromName ?? '静心学堂 · 泰国'
  const fromAddr = process.env.RESEND_FROM ?? 'onboarding@resend.dev'
  const payload: Record<string, unknown> = {
    from: `${fromName} <${fromAddr}>`,
    to: [opts.to],
    subject: opts.subject,
    text: opts.body,
  }
  if (opts.replyTo) payload.reply_to = opts.replyTo
  if (opts.attachments?.length) {
    payload.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    }))
  }

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 8_000)
  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Resend API timed out after 8s')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend API ${res.status}: ${text || res.statusText}`)
  }
}

async function sendViaSMTP(opts: SendMailOpts): Promise<void> {
  const t = getTransport()
  const fromName = opts.fromName ?? '静心学堂 · 泰国'
  await t.sendMail({
    from: `"${fromName}" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
  })
}

export async function sendMail(opts: SendMailOpts): Promise<void> {
  if (process.env.RESEND_API_KEY) return sendViaResend(opts)
  return sendViaSMTP(opts)
}
