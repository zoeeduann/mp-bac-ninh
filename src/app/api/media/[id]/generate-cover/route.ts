import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { mediaCoverJob, coverJobIsBusy } from '@/lib/media-cover-state'
import { newCoverJob, processMediaCover } from '@/lib/media-cover-jobs'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 300

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Same-origin browser action; never accept an arbitrary source URL or prompt.
  const origin = request.headers.get('origin')
  const origins = [new URL(request.url).origin, process.env.NEXT_PUBLIC_SERVER_URL].filter(Boolean)
  if (!origin || !origins.includes(origin)) return Response.json({ error: '请求来源无效。' }, { status: 403 })
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || !['admin', 'staff'].includes(user.role)) return Response.json({ error: '请先登录后台。' }, { status: 403 })
  if (!process.env.ARK_API_KEY) return Response.json({ error: '图片生成服务尚未配置，请联系管理员设置 ARK_API_KEY。' }, { status: 503 })
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: '图片编号无效。' }, { status: 400 })
  if (!rateLimit(`media-cover:${user.id}`, 6, 10 * 60_000).ok) return Response.json({ error: '生成次数较多，请稍后再试。' }, { status: 429 })
  let media
  try { media = await payload.findByID({ collection: 'media', id, depth: 0, user, overrideAccess: false }) }
  catch { return Response.json({ error: '找不到这张图片。' }, { status: 404 }) }
  if (!media.filename || !media.mimeType?.startsWith('image/')) return Response.json({ error: '请先上传并保存图片。' }, { status: 400 })
  const oldJob = mediaCoverJob(media.cardCoverJob)
  if (coverJobIsBusy(oldJob)) return Response.json({ error: '正在生成，请稍候。' }, { status: 409 })
  const job = newCoverJob(media.filename)
  const queued = await payload.db.drizzle.execute(sql`
    UPDATE "media" SET "card_cover_job" = ${JSON.stringify(job)}::jsonb
    WHERE "id" = ${id} AND "filename" = ${media.filename}
      AND ("card_cover_job"->>'token') IS NOT DISTINCT FROM ${oldJob?.token ?? null}
    RETURNING "id"
  `)
  if (!queued.rows.length) return Response.json({ error: '图片已更新或正在生成，请刷新后重试。' }, { status: 409 })
  try {
    await processMediaCover(payload, id)
    const updated = await payload.findByID({ collection: 'media', id, depth: 1, user, overrideAccess: false })
    const result = mediaCoverJob(updated.cardCoverJob)
    if (result?.token !== job.token) return Response.json({ error: '原图已替换，旧生成结果未应用。' }, { status: 409 })
    return Response.json({ doc: updated, error: result?.error }, { status: result?.status === 'ready' ? 200 : 502 })
  } catch {
    return Response.json({ error: '生成暂时未完成，原图不受影响；稍后可重试。' }, { status: 500 })
  }
}
