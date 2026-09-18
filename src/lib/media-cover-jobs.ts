import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { Media } from '@/payload-types'
import { generateLandscapeCover } from './generate-landscape-cover'
import { fetchRetryingNetworkErrors, networkErrorDetail } from './network-retry'
import { mediaCoverJob, type MediaCoverJob } from './media-cover-state'

export function newCoverJob(filename: string): MediaCoverJob {
  return {
    token: randomUUID(), sourceFilename: filename,
    status: process.env.ARK_API_KEY ? 'queued' : 'unconfigured',
    requestedAt: new Date().toISOString(),
  }
}

async function originalImage(payload: Payload, media: Media): Promise<Buffer> {
  if (!media.filename || path.basename(media.filename) !== media.filename) throw new Error('原图文件名无效。')
  if (process.env.S3_BUCKET) {
    // Derive from trusted storage configuration, never a client-editable URL.
    const host = process.env.S3_PUBLIC_HOSTNAME
    if (!host) throw new Error('请先配置媒体公开域名。')
    const url = `https://${host}/${encodeURIComponent(media.filename)}`
    let response: Response
    try {
      response = await fetchRetryingNetworkErrors(() => fetch(url, {
        redirect: 'error', signal: AbortSignal.timeout(20_000),
      }))
    } catch (error) {
      const detail = networkErrorDetail(error)
      if (detail) throw new Error(`无法下载原图（${detail}），请稍后重试。`)
      throw error
    }
    if (!response.ok) throw new Error('无法读取原图，请确认原图仍然存在。')
    if (Number(response.headers.get('content-length')) > 25_000_000) throw new Error('原图过大，请上传小于 25 MB 的图片。')
    if (!response.body) throw new Error('原图为空。')
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 25_000_000) { await reader.cancel(); throw new Error('原图过大，请上传小于 25 MB 的图片。') }
      chunks.push(chunk.value)
    }
    return Buffer.concat(chunks)
  }
  const upload = payload.collections.media.config.upload
  if (!upload || typeof upload.staticDir !== 'string') throw new Error('本地媒体目录尚未配置。')
  const buffer = await readFile(path.join(upload.staticDir, media.filename))
  if (buffer.length > 25_000_000) throw new Error('原图过大，请上传小于 25 MB 的图片。')
  return buffer
}

/** Claim and finish via compare-and-swap, so parallel workers cannot bill twice
 * and an older generation cannot replace the cover of a newly uploaded file. */
export async function processMediaCover(payload: Payload, id: number): Promise<void> {
  const media = await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
  const job = mediaCoverJob(media.cardCoverJob)
  if (!job || job.status !== 'queued' || media.filename !== job.sourceFilename) return
  const processing = { ...job, status: 'processing' }
  const claim = await payload.db.drizzle.execute(sql`
    UPDATE "media" SET "card_cover_job" = ${JSON.stringify(processing)}::jsonb
    WHERE "id" = ${id} AND "card_cover_job"->>'token' = ${job.token}
      AND "card_cover_job"->>'status' = 'queued'
    RETURNING "id"
  `)
  if (!claim.rows.length) return
  try {
    const output = await generateLandscapeCover(await originalImage(payload, media))
    // Recheck before storing the generated file, then CAS again when attaching it.
    const current = await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
    if (mediaCoverJob(current.cardCoverJob)?.token !== job.token) return
    const cover = await payload.create({
      collection: 'media', locale: 'zh-CN', overrideAccess: true,
      context: { skipCoverGeneration: true, skipAutoAlt: true },
      data: { alt: media.alt || '活动横版封面' },
      file: { data: output, name: `cover-${id}-${job.token}.webp`, mimetype: 'image/webp', size: output.length },
    })
    await payload.db.drizzle.execute(sql`
      UPDATE "media" SET "card_cover_id" = ${cover.id},
        "card_cover_job" = ${JSON.stringify({ ...job, status: 'ready' })}::jsonb,
        "updated_at" = now()
      WHERE "id" = ${id} AND "card_cover_job"->>'token' = ${job.token}
        AND "filename" = ${job.sourceFilename}
    `)
  } catch (error) {
    const message = error instanceof Error && error.name !== 'TimeoutError'
      ? error.message : '图片生成超时，请稍后重试。'
    // Log only a bounded diagnostic; do not expose raw buffers or credentials.
    const failed = { ...job, status: 'failed', error: message.slice(0, 240) }
    await payload.db.drizzle.execute(sql`
      UPDATE "media" SET "card_cover_job" = ${JSON.stringify(failed)}::jsonb
      WHERE "id" = ${id} AND "card_cover_job"->>'token' = ${job.token}
    `)
  }
  // No cache invalidation: Bac Ninh renders public pages dynamically, and the
  // campaign page's 60-second fetch cache expires on its own.
}
