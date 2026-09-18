import { getPayloadClient } from '@/lib/payload'
import { activityImageUrl } from '@/lib/activity-image'
import { activityShareImageUrl } from '@/lib/activity-share'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || !['admin', 'staff'].includes(user.role)) return Response.json({ error: '请先登录后台。' }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: '图片编号无效。' }, { status: 400 })
  let media
  try { media = await payload.findByID({ collection: 'media', id, depth: 1, locale: 'zh-CN', user, overrideAccess: false }) }
  catch { return Response.json({ error: '找不到图片。' }, { status: 404 }) }
  const parents = await payload.find({ collection: 'media', where: { cardCover: { equals: id } },
    depth: 0, limit: 500, select: { filename: true }, user, overrideAccess: false })
  const activities = await payload.find({ collection: 'activities', where: { and: [
    { status: { equals: 'published' } }, { heroImage: { in: [id, ...parents.docs.map(p => p.id)] } },
  ] }, locale: 'zh-CN', depth: 2, limit: 500, user, overrideAccess: false })
  return Response.json({
    master: { url: media.url, width: media.width, height: media.height, filesize: media.filesize },
    thumbnail: media.sizes?.thumbnail,
    isGenerated: parents.docs.length > 0,
    activities: activities.docs.map(activity => ({
      id: activity.id, title: activity.title,
      card: activityImageUrl(activity.heroImage, 'card'),
      hero: activityImageUrl(activity.heroImage, 'hero'),
      share: activityShareImageUrl(activity, 'zh-CN'),
    })),
    note: '列出已发布活动的封面引用；其他栏目图片仍按各自页面配置使用。',
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
