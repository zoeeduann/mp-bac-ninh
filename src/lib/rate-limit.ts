type Bucket = number[] // array of submission timestamps
const buckets = new Map<string, Bucket>()

export function rateLimit(ip: string, max: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  let bucket = buckets.get(ip)
  if (!bucket) {
    bucket = []
    buckets.set(ip, bucket)
  }
  // Drop timestamps outside the window
  while (bucket.length && bucket[0] < cutoff) bucket.shift()

  if (bucket.length >= max) return { ok: false, remaining: 0 }
  bucket.push(now)
  return { ok: true, remaining: max - bucket.length }
}

export function _resetForTest() {
  buckets.clear()
}
