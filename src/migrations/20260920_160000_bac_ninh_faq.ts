import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Seed the Bac Ninh FAQ, following the Thailand site's wording adapted to
 * this place. It renders on the contact page and, as FAQPage JSON-LD, gives
 * search and answer engines something to quote for "is it free", "do I need
 * to book", "which language" — the questions they actually get asked.
 *
 * Editors own it from here: the migration only fills an empty FAQ, and
 * leaves any FAQ that already has rows untouched.
 */
const FAQ: { zh: [string, string]; en: [string, string] }[] = [
  {
    zh: [
      '参加活动收费吗？',
      '所有活动均公益，免费参加，也不销售任何产品。部分场次名额有限，请通过活动页提前预约。',
    ],
    en: [
      'Do the activities cost anything?',
      'All activities are not-for-profit and free to attend, and nothing is sold here. Some sessions have limited places, so book in advance through the activity page.',
    ],
  },
  {
    zh: [
      '需要提前预约吗？可以直接前往吗？',
      '小院采用预约制，不建议直接前往。请先在活动页选择场次预约，或在预约页留言，收到确认后再出发。',
    ],
    en: [
      'Do I need to book, or can I just turn up?',
      'The yard runs by appointment, so please do not arrive unannounced. Reserve a session on an activity page or leave an inquiry on the booking page, and set out once you have a confirmation.',
    ],
  },
  {
    zh: [
      '活动以中文还是越南语进行？',
      '活动以中文为主。各场次的使用语言以活动页面为准；如需语言协助，请先联系小院确认。',
    ],
    en: [
      'Are sessions held in Chinese or Vietnamese?',
      'Sessions are held mainly in Chinese. Check each activity page for that session’s language, and contact the yard before booking if you need language assistance.',
    ],
  },
  {
    zh: [
      '没有禅修或静坐经验可以参加吗？',
      '可以。初学者可以从静坐、呼吸觉察、安心禅茶或读书活动开始，带领者会说明当次的练习方式。',
    ],
    en: [
      'Can I join without any meditation experience?',
      'Yes. Beginners can start with sitting practice, breath awareness, Dhyana Tea, or a reading circle. The facilitator explains the practice for that session.',
    ],
  },
  {
    zh: [
      '需要信仰佛教才能参加吗？',
      '不需要。小院以开放的方式分享佛学智慧与安顿身心的练习，欢迎真诚想学习的人。',
    ],
    en: [
      'Do I need to be Buddhist to join?',
      'No. The yard shares Buddhist wisdom and practices for settling body and mind in an open way, and welcomes anyone who wants to learn.',
    ],
  },
  {
    zh: [
      '可以只参加一次吗？',
      '可以。可以先从一次读书会、静坐、安心禅茶或正念生活活动开始，再按自己的时间决定是否继续。',
    ],
    en: [
      'Can I come just once?',
      'Yes. Start with a single reading circle, sitting session, Dhyana Tea or everyday mindfulness activity, then decide in your own time whether to continue.',
    ],
  },
  {
    zh: [
      '小院有哪些活动？',
      '活动包括正念禅修、安心禅茶、佛学读书会、太极正念球、中医按导与静心蔬食等日常觉察练习。近期安排、时间与名额以活动页为准。',
    ],
    en: [
      'What activities are there?',
      'Meditation, Dhyana Tea, Buddhist reading circles, Tai Chi mindfulness ball, traditional wellbeing practice and vegan gatherings, among other everyday awareness practices. The activities page has current dates, times and remaining places.',
    ],
  },
  {
    zh: [
      '小院在哪里？怎么前往？',
      '小院位于越南北宁 Đại Đồng（4262+VGR）。请先完成预约，再通过活动页或预约回复确认地图位置与当次接待安排后出发。',
    ],
    en: [
      'Where is the yard and how do I get there?',
      'It is in Đại Đồng, Bac Ninh, Vietnam (Plus Code 4262+VGR). Book first, then confirm the map location and reception details on the activity page or in the booking reply before travelling.',
    ],
  },
]

/** Lexical rich text for one paragraph, the shape the answer field stores. */
function paragraph(text: string): string {
  return JSON.stringify({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              version: 1,
            },
          ],
        },
      ],
    },
  })
}

const ROW_PREFIX = 'bnfaq'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const ready = await db.execute(
    sql`SELECT to_regclass('public.locations_faq') IS NOT NULL AS "exists"`,
  )
  if (!ready.rows[0]?.exists) return

  const location = await db.execute(sql`SELECT "id" FROM "locations" WHERE "slug" = 'bac-ninh'`)
  const locationId = location.rows[0]?.id
  if (!locationId) return

  // Never overwrite an FAQ an editor has already written.
  const existing = await db.execute(
    sql`SELECT 1 FROM "locations_faq" WHERE "_parent_id" = ${locationId} LIMIT 1`,
  )
  if (existing.rows.length > 0) return

  for (const [index, item] of FAQ.entries()) {
    const rowId = `${ROW_PREFIX}${index + 1}`
    await db.execute(sql`
      INSERT INTO "locations_faq" ("_order", "_parent_id", "id")
      VALUES (${index + 1}, ${locationId}, ${rowId})
    `)
    for (const [locale, [q, a]] of [
      ['zh-CN', item.zh],
      ['en', item.en],
    ] as const) {
      await db.execute(sql`
        INSERT INTO "locations_faq_locales" ("q", "a", "_locale", "_parent_id")
        VALUES (${q}, ${paragraph(a)}::jsonb, ${locale}, ${rowId})
      `)
    }
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const ready = await db.execute(
    sql`SELECT to_regclass('public.locations_faq') IS NOT NULL AS "exists"`,
  )
  if (!ready.rows[0]?.exists) return
  // Only the rows this migration inserted.
  await db.execute(sql`DELETE FROM "locations_faq" WHERE "id" LIKE ${`${ROW_PREFIX}%`}`)
}
