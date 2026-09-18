import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { coverJobIsBusy, mediaCoverJob } from '@/lib/media-cover-state'
import { newCoverJob, processMediaCover } from '@/lib/media-cover-jobs'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 300

// A small, resumable batch. Only fills missing covers of published activities;
// existing approved/corrected artwork cannot be overwritten by this operation.
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || ![new URL(request.url).origin, process.env.NEXT_PUBLIC_SERVER_URL].includes(origin)) {
    return Response.json({ error: '请求来源无效。' }, { status: 403 })
  }
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || !['admin', 'staff'].includes(user.role)) return Response.json({ error: '请先登录后台。' }, { status: 403 })
  if (!process.env.ARK_API_KEY) return Response.json({ error: '请先配置 ARK_API_KEY。' }, { status: 503 })
  const body = await request.json().catch(() => null)
  const ids: unknown = body?.ids
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) {
    return Response.json({ error: '每批请选择 1 至 3 张图片。' }, { status: 400 })
  }
  if (!rateLimit(`media-cover-batch:${user.id}`, 4, 60_000).ok) {
    return Response.json({ error: '批次提交过快，请稍后继续。' }, { status: 429 })
  }
  const uniqueIds = [...new Set(ids as number[])]
  const activities = await payload.find({
    collection: 'activities', depth: 0, limit: 0, pagination: false,
    where: { and: [{ status: { equals: 'published' } }, { heroImage: { in: uniqueIds } }] },
    user, overrideAccess: false,
  })
  const allowed = new Set(activities.docs.map(a => typeof a.heroImage === 'object' ? a.heroImage.id : a.heroImage))
  if (uniqueIds.some(id => !allowed.has(id))) return Response.json({ error: '只能处理已发布活动的主图。' }, { status: 400 })
  const results = await Promise.all(uniqueIds.map(async id => {
    try {
      const media = await payload.findByID({ collection: 'media', id, depth: 0, user, overrideAccess: false })
      const oldJob = mediaCoverJob(media.cardCoverJob)
      if (media.cardCover && oldJob?.sourceFilename === media.filename) return { id, status: 'skipped' }
      if (coverJobIsBusy(oldJob)) return { id, status: 'busy', error: '正在生成，请稍后刷新。' }
      if (!media.filename || !media.mimeType?.startsWith('image/')) return { id, status: 'failed', error: '缺少有效原图。' }
      const job = newCoverJob(media.filename)
      const queued = await payload.db.drizzle.execute(sql`
        UPDATE "media" SET "card_cover_job" = ${JSON.stringify(job)}::jsonb
        WHERE "id" = ${id} AND "filename" = ${media.filename}
          AND ("card_cover_job"->>'token') IS NOT DISTINCT FROM ${oldJob?.token ?? null}
        RETURNING "id"
      `)
      if (!queued.rows.length) return { id, status: 'busy', error: '图片已更新或正在生成。' }
      await processMediaCover(payload, id)
      const doc = await payload.findByID({ collection: 'media', id, depth: 1, user, overrideAccess: false })
      const result = mediaCoverJob(doc.cardCoverJob)
      if (result?.token !== job.token) return { id, status: 'failed', error: '原图已更新，请刷新。' }
      return { id, status: result?.status === 'ready' ? 'ready' : 'failed', error: result?.error, doc }
    } catch {
      return { id, status: 'failed', error: '生成未完成，请刷新查看状态后继续。' }
    }
  }))
  return Response.json({ results })
}
