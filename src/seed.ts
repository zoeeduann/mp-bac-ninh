/**
 * Seed script for 静心学堂 · 泰国 / Mindfulpeace Academy Thailand
 *
 * Seeds: 1 admin user, 3 locations, 7 categories, 15 placeholder images,
 * 3 activities (all linked to chiangmai), 1 journal entry (chiangmai),
 * portalHome global, Settings global.
 *
 * Idempotent: each resource is guarded by an existence check ([SKIP] on repeat).
 *
 * Run: pnpm seed
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local (Payload dev convention)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { getPayload } from 'payload'
import configPromise from './payload.config'
import type { Activity, Category, Location, Media, PortalHome, Setting } from './payload-types'

// ─── ID brand helpers ───────────────────────────────────────────────────────
// Payload relationship fields are typed as `number | DocType`.  The seed
// always passes plain numeric IDs; these helpers make the narrowing explicit
// without an `as any` cast.
type MediaId = Media['id']
type LocationId = Location['id']
type CategoryId = Category['id']
type ActivityId = Activity['id']

const toMediaId = (id: MediaId): MediaId => id
const toLocationId = (id: LocationId): LocationId => id
const toCategoryId = (id: CategoryId): CategoryId => id
const toActivityId = (id: ActivityId): ActivityId => id

// ─── Constants ──────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'superduanziwei@gmail.com'
const ADMIN_PASSWORD = `changeme-${Date.now().toString(36)}`

const CATEGORIES = [
  { zh: '禅修课', en: 'Meditation Class', slug: 'meditation-class', order: 0 },
  { zh: '工作坊', en: 'Workshop', slug: 'workshop', order: 1 },
  { zh: '一对一', en: 'One-on-One', slug: 'one-on-one', order: 2 },
  { zh: '共修', en: 'Community Practice', slug: 'community-practice', order: 3 },
  { zh: '住山', en: 'Residential', slug: 'residential', order: 4 },
  { zh: '正念活动', en: 'Mindful Activity', slug: 'mindful-activity', order: 5 },
  { zh: '茶会', en: 'Tea Gathering', slug: 'tea-gathering', order: 6 },
]

// Location image URLs (Unsplash)
const LOCATION_IMAGES = {
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80',
  chiangmai: 'https://images.unsplash.com/photo-1493804714600-6edb1cd93080?auto=format&fit=crop&w=1600&q=80',
  phuket: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1600&q=80',
}

// portalHome hero image (Thai temple under blue sky)
const PORTAL_HOME_IMAGE_URL = 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=2400&q=80'

// Evocative Unsplash images related to Chiang Mai / temples / tea / meditation / forest
const PLACEHOLDER_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600', alt_zh: '山中寺庙', alt_en: 'Temple in the mountains' },
  { url: 'https://images.unsplash.com/photo-1544016768-982d1554f0f7?w=1600', alt_zh: '茶叶特写', alt_en: 'Close-up of tea leaves' },
  { url: 'https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?w=1600', alt_zh: '森林小径', alt_en: 'Forest path' },
  { url: 'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=1600', alt_zh: '泰国寺庙日出', alt_en: 'Thai temple at sunrise' },
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600', alt_zh: '禅意庭院', alt_en: 'Zen garden courtyard' },
  { url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1600', alt_zh: '茶道冲泡', alt_en: 'Tea ceremony preparation' },
  { url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600', alt_zh: '清迈山景', alt_en: 'Chiang Mai mountain view' },
  { url: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1600', alt_zh: '坐禅冥想', alt_en: 'Sitting meditation' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600', alt_zh: '竹林小径', alt_en: 'Bamboo forest path' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600', alt_zh: '清晨薄雾', alt_en: 'Morning mist' },
  { url: 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=1600', alt_zh: '荷花池塘', alt_en: 'Lotus flower pond' },
  { url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1600', alt_zh: '热带花园', alt_en: 'Tropical garden' },
  { url: 'https://images.unsplash.com/photo-1461696114087-397271a7aedc?w=1600', alt_zh: '瑜伽冥想', alt_en: 'Yoga meditation outdoors' },
  { url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1600', alt_zh: '古老木门', alt_en: 'Ancient wooden doorway' },
  { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1600', alt_zh: '灯笼夜景', alt_en: 'Lanterns at night' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchImageFile(
  url: string,
  filename: string,
): Promise<{ data: Buffer; name: string; mimetype: string; size: number } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return { data: buffer, name: filename, mimetype: 'image/jpeg', size: buffer.length }
  } catch {
    return null
  }
}

function daysFromNow(days: number, hour = 9, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** Build a minimal Lexical richText node wrapping a single paragraph of text */
function toRichText(text: string) {
  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
              text,
              type: 'text',
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

// ─── Main seed ──────────────────────────────────────────────────────────────

async function seed() {
  console.log('Starting seed...')

  const payload = await getPayload({ config: configPromise })

  // ── 1. Admin user ──────────────────────────────────────────────────────

  const existingUsers = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingUsers.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: '管理员',
        role: 'admin',
      },
      overrideAccess: true,
    })
    console.log(`[OK] Admin user created: ${ADMIN_EMAIL}`)
    console.log(`[KEY] Admin password: ${ADMIN_PASSWORD}  <- CHANGE THIS after first login!`)
  } else {
    console.log(`[SKIP] Admin user already exists: ${ADMIN_EMAIL}`)
    console.log('   (Password unchanged — use the existing password)')
  }

  // ── 2. Categories ──────────────────────────────────────────────────────

  const catIds: Record<string, number> = {}

  for (const cat of CATEGORIES) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: cat.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      catIds[cat.slug] = existing.docs[0].id
      console.log(`[SKIP] Category already exists: ${cat.zh} (${cat.slug})`)
      continue
    }

    const created = await payload.create({
      collection: 'categories',
      data: { name: cat.zh, slug: cat.slug, order: cat.order },
      locale: 'zh-CN',
      overrideAccess: true,
    })
    catIds[cat.slug] = created.id

    await payload.update({
      collection: 'categories',
      id: created.id,
      data: { name: cat.en },
      locale: 'en',
      overrideAccess: true,
    })

    console.log(`[OK] Category created: ${cat.zh} / ${cat.en}`)
  }

  // ── 3. Placeholder images ──────────────────────────────────────────────
  // Idempotency key: alt text (zh-CN). Payload renames files on upload
  // (adds a counter suffix, converts to webp) so filename is not stable.

  const mediaIds: number[] = []

  for (let i = 0; i < PLACEHOLDER_IMAGES.length; i++) {
    const img = PLACEHOLDER_IMAGES[i]
    const filename = `placeholder-${String(i + 1).padStart(2, '0')}.jpg`
    const seedKey = `placeholder:${i + 1}`

    // Use seedKey for idempotency (not alt text)
    const existing = await payload.find({
      collection: 'media',
      where: { seedKey: { equals: seedKey } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      mediaIds.push(existing.docs[0].id)
      console.log(`[SKIP] Media already exists: ${seedKey}`)
      continue
    }

    const fileData = await fetchImageFile(img.url, filename)
    if (!fileData) {
      console.warn(`[WARN] Could not fetch image ${img.url} — skipping`)
      continue
    }

    try {
      const created = await payload.create({
        collection: 'media',
        data: {
          alt: img.alt_zh,
          seedKey,
          isPlaceholder: true,
        },
        file: {
          data: fileData.data,
          name: fileData.name,
          mimetype: fileData.mimetype,
          size: fileData.size,
        },
        locale: 'zh-CN',
        overrideAccess: true,
      })
      mediaIds.push(created.id)

      await payload.update({
        collection: 'media',
        id: created.id,
        data: { alt: img.alt_en },
        locale: 'en',
        overrideAccess: true,
      })

      console.log(`[OK] Media uploaded: ${img.alt_zh} (${filename})`)
    } catch (err) {
      console.warn(`[WARN] Failed to upload ${filename}: ${(err as Error).message}`)
    }
  }

  const heroFallbackId = mediaIds[0]

  // ── 4. Location hero images ────────────────────────────────────────────

  // Upload location-specific hero images (or reuse if already uploaded).
  // Idempotency key: seedKey = `location-hero:${slug}`.
  const LOCATION_HERO_ALT: Record<string, { zh: string; en: string }> = {
    bangkok:   { zh: '曼谷如如学堂主视觉',        en: 'Bangkok Ruru Academy hero image' },
    chiangmai: { zh: '清迈心灯学堂主视觉',        en: 'Chiang Mai Xindeng Academy hero image' },
    phuket:    { zh: '普吉和光小院主视觉',        en: 'Phuket Heguang Courtyard hero image' },
  }

  async function uploadLocationHero(slug: string, url: string): Promise<number | undefined> {
    const filename = `location-hero-${slug}.jpg`
    const seedKey = `location-hero:${slug}`
    const existing = await payload.find({
      collection: 'media',
      where: { seedKey: { equals: seedKey } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      console.log(`[SKIP] Location hero already exists: ${slug}`)
      return existing.docs[0].id
    }
    const fileData = await fetchImageFile(url, filename)
    if (!fileData) {
      console.warn(`[WARN] Could not fetch location hero ${url}`)
      return heroFallbackId
    }
    const altTexts = LOCATION_HERO_ALT[slug] ?? { zh: slug, en: slug }
    try {
      const created = await payload.create({
        collection: 'media',
        data: { alt: altTexts.zh, seedKey, isPlaceholder: true },
        file: { data: fileData.data, name: fileData.name, mimetype: fileData.mimetype, size: fileData.size },
        locale: 'zh-CN',
        overrideAccess: true,
      })
      await payload.update({
        collection: 'media',
        id: created.id,
        data: { alt: altTexts.en },
        locale: 'en',
        overrideAccess: true,
      })
      console.log(`[OK] Location hero uploaded: ${filename}`)
      return created.id
    } catch (err) {
      console.warn(`[WARN] Failed to upload location hero ${filename}: ${(err as Error).message}`)
      return heroFallbackId
    }
  }

  const bangkokHeroId = await uploadLocationHero('bangkok', LOCATION_IMAGES.bangkok)
  const chiangmaiHeroId = await uploadLocationHero('chiangmai', LOCATION_IMAGES.chiangmai)
  const phuketHeroId = await uploadLocationHero('phuket', LOCATION_IMAGES.phuket)

  // ── 5. Locations ───────────────────────────────────────────────────────

  const locationDefs = [
    {
      slug: 'bangkok',
      name_zh: '曼谷如如学堂',
      name_en: 'Bangkok Ruru Academy',
      city_zh: '曼谷',
      city_en: 'Bangkok',
      tagline_zh: '城市中心的一处静处',
      tagline_en: 'In the heart of the city, a quieter pulse',
      heroId: bangkokHeroId,
      story_zh: '曼谷如如学堂位于市中心。在城市最喧嚣的肌理里,保留一处可以坐下来的房间——每周三场禅修课、不定期的茶会与共修。',
      story_en: 'Bangkok Ruru Academy sits in the city center. Within the densest fabric of the city, we keep a room where you can sit — three weekly meditation classes, occasional tea gatherings, and shared practice.',
      address_zh: '曼谷市中心(具体地址待补)',
      address_en: 'Central Bangkok (precise address to come)',
      email: 'bangkok@mindfulpeaceth.com',
      phone: '+66 (待定)',
      wechatId: 'mp_bangkok',
      whatsapp: '+66 81 000 0001',
      order: 1,
    },
    {
      slug: 'chiangmai',
      name_zh: '清迈心灯学堂',
      name_en: 'Chiang Mai Xindeng Academy',
      city_zh: '清迈',
      city_en: 'Chiang Mai',
      tagline_zh: '山脚下的修学之地',
      tagline_en: 'Where the hills hold the morning mist',
      heroId: chiangmaiHeroId,
      story_zh: '心灯学堂位于清迈。这里是一处与日常修学相伴的安静空间——晨修、共修、茶会、行禅,以及住山闭关。',
      story_en: 'Xindeng Academy is at the foot of the Chiang Mai hills. A quiet space alongside everyday practice — morning sittings, shared practice, tea, walking meditation, and residential retreats.',
      // Thai address kept romanized in both locales (no CN translation) —
      // more useful for taxis / Google Maps search.
      address_zh: 'PW74+92G, Nam Phrae, Hang Dong District, Chiang Mai 50230',
      address_en: 'PW74+92G, Nam Phrae, Hang Dong District, Chiang Mai 50230',
      mapEmbedUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3778.883621344077!2d98.90291971082006!3d18.71402778234418!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30da3764a680242f%3A0x9903059d2035276c!2z5riF6L-I6Z2Z5b-D5a2m5aCCIE1pbmRmdWxwZWFjZSBBY2FkZW15IENoaWFuZ01haQ!5e0!3m2!1szh-CN!2sth!4v1779445345280!5m2!1szh-CN!2sth',
      email: 'chiangmai@mindfulpeaceth.com',
      phone: '+66 53 000 247',
      wechatId: 'mp_chiangmai',
      whatsapp: '+66 81 000 0002',
      order: 2,
    },
    {
      slug: 'phuket',
      name_zh: '普吉和光小院',
      name_en: 'Phuket Heguang Courtyard',
      city_zh: '普吉',
      city_en: 'Phuket',
      tagline_zh: '海声与潮汐的间隙',
      tagline_en: 'Sea-light and the breath of the tide',
      heroId: phuketHeroId,
      story_zh: '普吉和光小院毗邻海岸。在浪声里坐定、在沙滩上行禅,以及一杯能听见海的茶。',
      story_en: 'Phuket Heguang Courtyard sits beside the coast. Sitting amid the sound of waves, walking on sand, and a cup of tea where you can hear the sea.',
      address_zh: '普吉(具体地址待补)',
      address_en: 'Phuket (precise address to come)',
      email: 'phuket@mindfulpeaceth.com',
      phone: '',
      wechatId: 'mp_phuket',
      whatsapp: '+66 81 000 0003',
      order: 3,
    },
  ]

  const locationIds: Record<string, number> = {}

  for (const loc of locationDefs) {
    const existing = await payload.find({
      collection: 'locations',
      where: { slug: { equals: loc.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      locationIds[loc.slug] = existing.docs[0].id
      console.log(`[SKIP] Location already exists: ${loc.name_zh} (${loc.slug})`)
      continue
    }

    const heroImageId = loc.heroId ?? heroFallbackId
    if (!heroImageId) {
      console.warn(`[WARN] No hero image for location ${loc.slug} — skipping`)
      continue
    }

    const created = await payload.create({
      collection: 'locations',
      data: {
        slug: loc.slug,
        name: loc.name_zh,
        city: loc.city_zh,
        isThailandNetwork: true,
        tagline: loc.tagline_zh,
        heroImage: toMediaId(heroImageId),
        story: toRichText(loc.story_zh) as Location['story'],
        address: loc.address_zh,
        email: loc.email,
        ...(loc.phone ? { phone: loc.phone } : {}),
        ...(loc.wechatId ? { wechatId: loc.wechatId } : {}),
        ...((loc as any).whatsapp ? { whatsapp: (loc as any).whatsapp } : {}),
        ...((loc as any).mapEmbedUrl ? { mapEmbedUrl: (loc as any).mapEmbedUrl } : {}),
        order: loc.order,
      },
      locale: 'zh-CN',
      overrideAccess: true,
    })
    locationIds[loc.slug] = created.id

    // Set English locale fields
    await payload.update({
      collection: 'locations',
      id: created.id,
      data: {
        name: loc.name_en,
        city: loc.city_en,
        tagline: loc.tagline_en,
        story: toRichText(loc.story_en) as Location['story'],
        address: loc.address_en,
      },
      locale: 'en',
      overrideAccess: true,
    })

    console.log(`[OK] Location created: ${loc.name_zh} / ${loc.name_en}`)
  }

  const chiangmaiLocationId = locationIds['chiangmai']

  if (!chiangmaiLocationId) {
    console.error('[ERROR] Chiang Mai location not created — activities/journal cannot be seeded')
    process.exit(1)
  }

  // ── 6. Activities ──────────────────────────────────────────────────────

  const activityDefs = [
    {
      slug: 'intro-meditation-class',
      title_zh: '禅修入门课',
      title_en: 'Introduction to Meditation',
      short_zh: '为初学者设计的禅修课程，学习基础呼吸观察与身体扫描技巧，在山脚的环境中开始你的禅修之旅。',
      short_en: 'A meditation course designed for beginners. Learn basic breath observation and body scan techniques in the peaceful environment of Chiang Mai.',
      category: 'meditation-class',
      mediaIndex: 0,
    },
    {
      slug: 'mindfulness-workshop',
      title_zh: '正念生活工作坊',
      title_en: 'Mindful Living Workshop',
      short_zh: '通过小组练习与分享，探索如何将正念融入日常生活。包含坐禅、慢步经行与茶道体验。',
      short_en: 'Explore how to integrate mindfulness into daily life through group practice and sharing. Includes sitting meditation, walking meditation, and tea ceremony.',
      category: 'workshop',
      mediaIndex: 2,
    },
    {
      slug: 'tea-gathering-spring',
      title_zh: '春季茶会',
      title_en: 'Spring Tea Gathering',
      short_zh: '以茶为媒，静心相遇。品饮清迈高山茶，在茶香中体验当下的宁静与连接。',
      short_en: 'Meeting through tea. Taste high-mountain teas from Chiang Mai and experience present-moment peace and connection in the fragrance of tea.',
      category: 'tea-gathering',
      mediaIndex: 5,
    },
  ]

  const activityIds: number[] = []

  for (const def of activityDefs) {
    const existing = await payload.find({
      collection: 'activities',
      where: { slug: { equals: def.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      activityIds.push(existing.docs[0].id)
      console.log(`[SKIP] Activity already exists: ${def.title_zh}`)
      continue
    }

    const heroId = mediaIds[def.mediaIndex] ?? heroFallbackId
    if (!heroId) {
      console.warn(`[WARN] No media available for activity ${def.slug} — skipping`)
      continue
    }

    const categoryId = catIds[def.category]
    if (!categoryId) {
      console.warn(`[WARN] Category ${def.category} not found — skipping activity ${def.slug}`)
      continue
    }

    const occurrences: {
      startAt: string
      endAt: string
      status: 'open' | 'full' | 'cancelled' | 'deleted'
    }[] = [
      { startAt: daysFromNow(14, 9, 0), endAt: daysFromNow(14, 11, 0), status: 'open' },
      { startAt: daysFromNow(28, 9, 0), endAt: daysFromNow(28, 11, 0), status: 'open' },
    ]

    // Create as draft first (zh-CN locale). The publish-time validator skips
    // when there is no id yet, so we create with status=draft, then set EN
    // locale, then publish.
    const created = await payload.create({
      collection: 'activities',
      data: {
        title: def.title_zh,
        slug: def.slug,
        category: toCategoryId(categoryId),
        location: toLocationId(chiangmaiLocationId),
        heroImage: toMediaId(heroId),
        shortDesc: def.short_zh,
        venueNote: '学堂',
        capacity: 12,
        occurrences,
        status: 'draft',
      },
      locale: 'zh-CN',
      overrideAccess: true,
    })
    activityIds.push(created.id)

    // Set English locale fields
    await payload.update({
      collection: 'activities',
      id: created.id,
      data: {
        title: def.title_en,
        shortDesc: def.short_en,
        venueNote: 'At the academy',
      },
      locale: 'en',
      overrideAccess: true,
    })

    // Now publish — both locales are filled so the validator passes
    await payload.update({
      collection: 'activities',
      id: created.id,
      data: { status: 'published' },
      locale: 'zh-CN',
      overrideAccess: true,
    })

    console.log(`[OK] Activity created: ${def.title_zh}`)
  }

  // ── 7. Journal entry ───────────────────────────────────────────────────

  const journalSlug = 'spring-tea-gathering-journal'
  const existingJournal = await payload.find({
    collection: 'journal',
    where: { slug: { equals: journalSlug } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingJournal.totalDocs > 0) {
    console.log(`[SKIP] Journal entry already exists: ${journalSlug}`)
  } else if (mediaIds.length >= 4) {
    const coverImage = mediaIds[5] ?? mediaIds[0]
    const relatedActivity = activityIds[2] // tea-gathering

    const photoMediaIds = [
      mediaIds[5] ?? mediaIds[0],
      mediaIds[6] ?? mediaIds[1],
      mediaIds[7] ?? mediaIds[2],
      mediaIds[8] ?? mediaIds[3],
    ].filter((id): id is number => id !== undefined)

    await payload.create({
      collection: 'journal',
      data: {
        title: '春季茶会回顾',
        slug: journalSlug,
        location: toLocationId(chiangmaiLocationId),
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        relatedActivity: relatedActivity !== undefined ? toActivityId(relatedActivity) : undefined,
        coverImage: toMediaId(coverImage),
        photos: photoMediaIds.map((id, i) => ({
          image: toMediaId(id),
          caption: `茶会现场 ${i + 1}`,
        })),
        status: 'published',
      },
      locale: 'zh-CN',
      overrideAccess: true,
    })

    const createdJournals = await payload.find({
      collection: 'journal',
      where: { slug: { equals: journalSlug } },
      limit: 1,
      overrideAccess: true,
    })

    if (createdJournals.totalDocs > 0) {
      await payload.update({
        collection: 'journal',
        id: createdJournals.docs[0].id,
        data: {
          title: 'Spring Tea Gathering Recap',
          photos: photoMediaIds.map((id, i) => ({
            image: toMediaId(id),
            caption: `Tea gathering scene ${i + 1}`,
          })),
        },
        locale: 'en',
        overrideAccess: true,
      })
    }

    console.log(`[OK] Journal entry created: ${journalSlug}`)
  } else {
    console.warn('[WARN] Not enough media for journal photos — skipping journal')
  }

  // ── 8. Globals ─────────────────────────────────────────────────────────

  const heroMediaId = mediaIds[0] ?? heroFallbackId

  // portalHome global (renamed from 'home', slug 'portal-home')
  // Check idempotency by attempting to read the existing global
  try {
    // Fetch portal home hero image — idempotency key: seedKey = 'portal-home-hero'
    let portalHeroId = heroMediaId
    const portalHeroSeedKey = 'portal-home-hero'
    const existingPortalHero = await payload.find({
      collection: 'media',
      where: { seedKey: { equals: portalHeroSeedKey } },
      limit: 1,
      overrideAccess: true,
    })
    if (existingPortalHero.totalDocs > 0) {
      portalHeroId = existingPortalHero.docs[0].id
      console.log('[SKIP] Portal home hero already exists')
    } else {
      const fileData = await fetchImageFile(PORTAL_HOME_IMAGE_URL, 'portal-home-hero.jpg')
      if (fileData) {
        try {
          const created = await payload.create({
            collection: 'media',
            data: { alt: '静心学堂·泰国 网络主视觉', seedKey: portalHeroSeedKey, isPlaceholder: true },
            file: { data: fileData.data, name: fileData.name, mimetype: fileData.mimetype, size: fileData.size },
            locale: 'zh-CN',
            overrideAccess: true,
          })
          await payload.update({
            collection: 'media',
            id: created.id,
            data: { alt: 'Mindfulpeace Academy Thailand network hero image' },
            locale: 'en',
            overrideAccess: true,
          })
          portalHeroId = created.id
          console.log('[OK] Portal home hero uploaded')
        } catch (err) {
          console.warn(`[WARN] Failed to upload portal hero: ${(err as Error).message}`)
        }
      }
    }

    // Check if global already has content (idempotency guard)
    let globalAlreadySeeded = false
    try {
      const existing = (await payload.findGlobal({
        slug: 'portal-home',
        overrideAccess: true,
      })) as Partial<PortalHome> | null
      globalAlreadySeeded = Boolean(existing?.heroTitle)
    } catch {
      globalAlreadySeeded = false
    }

    if (globalAlreadySeeded) {
      console.log('[SKIP] portalHome global already seeded')
    } else {
      await payload.updateGlobal({
        slug: 'portal-home',
        data: {
          heroImage: toMediaId(portalHeroId),
          heroTitle: '静心学堂 · 泰国',
          heroSubtitle: '三处学堂,一片心地',
          ctaPrimary: { label: '寻找学堂', href: '#academies' },
          ctaSecondary: { label: '了解我们', href: '#about-network' },
          middleParagraph: toRichText(
            '静心学堂 · 泰国 是国际静心协会(mindfulpeace.org)在泰国的本地分院。协会由济群法师创建,以「觉醒之道」为修学根脉——设学士、修士、胜士、智士四阶课程,贯穿禅修、读书、禅茶与日常修行。三处学堂在曼谷、清迈、普吉,各自守着一方静室——把修学落到一杯茶、一段共坐、一段共同走过的路。',
          ) as PortalHome['middleParagraph'],
        },
        locale: 'zh-CN',
        overrideAccess: true,
      })

      await payload.updateGlobal({
        slug: 'portal-home',
        data: {
          heroTitle: 'Mindfulpeace Academy Thailand',
          heroSubtitle: 'A network of Mindfulpeace academies across Thailand',
          ctaPrimary: { label: 'Find an academy', href: '#academies' },
          ctaSecondary: { label: 'About the network', href: '#about-network' },
          middleParagraph: toRichText(
            'Mindfulpeace Academy Thailand is the local Thai branch of the Mindfulpeace International Association (mindfulpeace.org). Founded by Master Jiqun (济群法师), the association teaches the Path of Awakening (觉醒之道) — a graduated curriculum of meditation, study, tea, and everyday practice across four stages: Bachelor, Master, Master of Practice, and Wisdom. Three academies — Bangkok, Chiang Mai, and Phuket — each keep a quiet room: a place where the teaching becomes a cup of tea, a sitting together, a walk shared.',
          ) as PortalHome['middleParagraph'],
        },
        locale: 'en',
        overrideAccess: true,
      })
      console.log('[OK] portalHome global seeded')
    }
  } catch (err) {
    console.warn('[WARN] portalHome global seed failed:', (err as Error).message)
  }

  // Settings global
  try {
    let settingsAlreadySeeded = false
    try {
      const existing = (await payload.findGlobal({
        slug: 'settings',
        overrideAccess: true,
      })) as Partial<Setting> | null
      settingsAlreadySeeded = Boolean(existing?.siteName)
    } catch {
      settingsAlreadySeeded = false
    }

    if (settingsAlreadySeeded) {
      console.log('[SKIP] Settings global already seeded')
    } else {
      await payload.updateGlobal({
        slug: 'settings',
        data: {
          siteName: '静心学堂 · 泰国',
          ogDefault: heroMediaId !== undefined ? toMediaId(heroMediaId) : undefined,
          footerText: '© 2026 静心学堂 · 泰国 · Mindfulpeace Academy Thailand',
          adminEmail: ADMIN_EMAIL,
          mindfulpeaceOrgUrl: 'https://mindfulpeace.org/',
          ...(chiangmaiLocationId ? { defaultLocation: toLocationId(chiangmaiLocationId) } : {}),
        },
        locale: 'zh-CN',
        overrideAccess: true,
      })

      await payload.updateGlobal({
        slug: 'settings',
        data: {
          siteName: 'Mindfulpeace Academy Thailand',
          footerText: '© 2026 Mindfulpeace Academy Thailand · 静心学堂 · 泰国',
        },
        locale: 'en',
        overrideAccess: true,
      })
      console.log('[OK] Settings global seeded')
    }
  } catch (err) {
    console.warn('[WARN] Settings global seed failed:', (err as Error).message)
  }

  console.log('\nSeed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
