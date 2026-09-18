// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

vi.mock('node:fs/promises', () => ({ readFile: vi.fn().mockResolvedValue(Buffer.from('source')) }))
vi.mock('@/lib/generate-landscape-cover', () => ({ generateLandscapeCover: vi.fn().mockResolvedValue(Buffer.from('cover')) }))
vi.mock('next/server', () => ({ after: vi.fn() }))
import { processMediaCover, newCoverJob } from '@/lib/media-cover-jobs'
import { prepareMediaCover, scheduleMediaCover } from '@/collections/Media.cover-hooks'
import { generateLandscapeCover } from '@/lib/generate-landscape-cover'
import { after } from 'next/server'

const job = { token: 'test-token', sourceFilename: 'poster.webp', status: 'queued', requestedAt: new Date().toISOString() }
function makePayload() {
  return {
    findByID: vi.fn().mockResolvedValue({ id: 1, filename: 'poster.webp', cardCoverJob: job }),
    create: vi.fn().mockResolvedValue({ id: 22 }),
    db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [{ id: 1 }] }) } },
    collections: { media: { config: { upload: { staticDir: '/tmp/test-media' } } } },
  }
}

beforeEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); vi.stubEnv('S3_BUCKET', '') })

describe('portrait cover hooks', () => {
  it('defers processing of a queued upload until the response is sent', async () => {
    await scheduleMediaCover({ doc: { id: 1, cardCoverJob: job }, req: { context: {}, file: { data: Buffer.from('image') } } } as never)
    expect(after).toHaveBeenCalledOnce()
    expect(generateLandscapeCover).not.toHaveBeenCalled()
  })
  it('queues portrait uploads and clears old covers on replacement', async () => {
    vi.stubEnv('ARK_API_KEY', 'test')
    const req = { context: {}, file: { data: Buffer.from('image') } }
    const portrait = await prepareMediaCover({ data: { width: 600, height: 900, filename: 'new.webp', cardCover: 9 }, req } as never)
    expect(portrait.cardCover).toBeNull()
    expect(portrait.cardCoverJob).toMatchObject({ status: 'queued', sourceFilename: 'new.webp' })
    const landscape = await prepareMediaCover({ data: { width: 900, height: 600, filename: 'wide.webp' }, req } as never)
    expect(landscape.cardCoverJob).toBeNull()
  })
  it('does not let stale editor fields overwrite a background result', async () => {
    const data = await prepareMediaCover({ data: { alt: 'manual', cardCover: 12, cardCoverJob: job }, req: { context: {} } } as never)
    expect(data).toEqual({ alt: 'manual' })
  })
  it('does not recurse for generated images or alt-text saves', async () => {
    const req = { context: { skipCoverGeneration: true }, file: { data: Buffer.from('x') } }
    await scheduleMediaCover({ doc: { id: 1, cardCoverJob: job }, req } as never)
    expect(after).not.toHaveBeenCalled()
    const data = await prepareMediaCover({ data: { alt: 'translated' }, req: { ...req, context: { skipAutoAlt: true } } } as never)
    expect(data.cardCoverJob).toBeUndefined()
  })
  it('makes missing configuration visible without failing uploads', () => {
    vi.stubEnv('ARK_API_KEY', '')
    expect(newCoverJob('poster.webp').status).toBe('unconfigured')
  })
})

describe('cover generation worker', () => {
  it('stores a separate image without replacing the original', async () => {
    const payload = makePayload()
    await processMediaCover(payload as unknown as Payload, 1)
    expect(generateLandscapeCover).toHaveBeenCalledOnce()
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'media', context: { skipCoverGeneration: true, skipAutoAlt: true },
      file: expect.objectContaining({ name: 'cover-1-test-token.webp' }),
    }))
    expect(payload.db.drizzle.execute).toHaveBeenCalledTimes(2)
  })
  it('does not call the provider when another worker claimed the job', async () => {
    const payload = makePayload()
    payload.db.drizzle.execute.mockResolvedValueOnce({ rows: [] })
    await processMediaCover(payload as unknown as Payload, 1)
    expect(generateLandscapeCover).not.toHaveBeenCalled()
  })
  it('discards a result when the original was replaced during generation', async () => {
    const payload = makePayload()
    payload.findByID.mockResolvedValueOnce({ id: 1, filename: 'poster.webp', cardCoverJob: job })
      .mockResolvedValueOnce({ id: 1, filename: 'new.webp', cardCoverJob: { ...job, token: 'new-token' } })
    await processMediaCover(payload as unknown as Payload, 1)
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('records failure without uploading or replacing an existing cover', async () => {
    const payload = makePayload()
    vi.mocked(generateLandscapeCover).mockRejectedValueOnce(new Error('provider unavailable'))
    await processMediaCover(payload as unknown as Payload, 1)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.db.drizzle.execute).toHaveBeenCalledTimes(2)
  })
})
