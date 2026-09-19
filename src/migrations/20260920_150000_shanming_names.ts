import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Name the Bac Ninh yard the way Mindful Peace International does:
 * 越南北宁善明静心小院 / "Shanming Mindful Peace Yard" (pinyin, matching the
 * facebook.com/mindfulpeaceshanming page). Updates the location's name, its
 * story and tagline text, the English address (was empty), and image
 * descriptions in the media library. The database is shared with the
 * Thailand site, so only the bac-ninh location and Bac Ninh-specific strings
 * are touched. Exact old values only; re-running is harmless.
 */
const NAMES: [locale: string, from: string, to: string][] = [
  ['zh-CN', '越南北宁善明小院', '越南北宁善明静心小院'],
  ['en', 'Thien Minh Courtyard · Bac Ninh, Vietnam', 'Shanming Mindful Peace Yard · Bac Ninh, Vietnam'],
]

// None of the targets contains its source, so applying twice changes nothing.
const TEXT: [from: string, to: string][] = [
  ['善明小院', '善明静心小院'],
  ['Thien Minh Courtyard', 'Shanming Mindful Peace Yard'],
  ['Mindful Peace Yard Bac Ninh', 'Shanming Mindful Peace Yard'],
]

const EN_ADDRESS = '4262+VGR, Đại Đồng, Bắc Ninh, Vietnam'

const BAC_NINH = sql`(SELECT "id" FROM "locations" WHERE "slug" = 'bac-ninh')`

async function exists(db: MigrateUpArgs['db'], table: string): Promise<boolean> {
  const result = await db.execute(sql`SELECT to_regclass(${`public.${table}`}) IS NOT NULL AS "exists"`)
  return Boolean(result.rows[0]?.exists)
}

async function rename(db: MigrateUpArgs['db'], direction: 'up' | 'down'): Promise<void> {
  const pairs = direction === 'up' ? TEXT : TEXT.slice(0, 2).map(([a, b]) => [b, a] as [string, string])

  if (await exists(db, 'locations_locales')) {
    for (const [locale, oldName, newName] of NAMES) {
      const [from, to] = direction === 'up' ? [oldName, newName] : [newName, oldName]
      await db.execute(sql`
        UPDATE "locations_locales" SET "name" = ${to}
        WHERE "name" = ${from} AND "_locale" = ${locale} AND "_parent_id" IN ${BAC_NINH}
      `)
    }
    for (const [from, to] of pairs) {
      await db.execute(sql`
        UPDATE "locations_locales"
        SET "story" = replace("story"::text, ${from}, ${to})::jsonb
        WHERE "story" IS NOT NULL AND position(${from} in "story"::text) > 0
          AND "_parent_id" IN ${BAC_NINH}
      `)
      await db.execute(sql`
        UPDATE "locations_locales" SET "tagline" = replace("tagline", ${from}, ${to})
        WHERE position(${from} in "tagline") > 0 AND "_parent_id" IN ${BAC_NINH}
      `)
    }
    if (direction === 'up') {
      await db.execute(sql`
        UPDATE "locations_locales" SET "address" = ${EN_ADDRESS}
        WHERE ("address" IS NULL OR "address" = '') AND "_locale" = 'en' AND "_parent_id" IN ${BAC_NINH}
      `)
    } else {
      await db.execute(sql`
        UPDATE "locations_locales" SET "address" = NULL
        WHERE "address" = ${EN_ADDRESS} AND "_locale" = 'en' AND "_parent_id" IN ${BAC_NINH}
      `)
    }
  }

  if (await exists(db, 'media_locales')) {
    for (const [from, to] of pairs) {
      await db.execute(sql`
        UPDATE "media_locales" SET "alt" = replace("alt", ${from}, ${to})
        WHERE position(${from} in "alt") > 0
      `)
    }
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await rename(db, 'up')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await rename(db, 'down')
}
