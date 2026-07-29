const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV !== 'production') return true // bypass in dev/test
    return false
  }
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  })
  const res = await fetch(VERIFY_URL, { method: 'POST', body })
  const data = (await res.json()) as { success: boolean }
  return data.success === true
}
