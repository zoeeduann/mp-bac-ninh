import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Recurring activities had been re-created for every session, leaving several
 * near-identical pages (four 正念为食, four 健康大循环, two 太极正念球) that
 * compete for the same searches. Keep one activity per series and move the
 * other records' sessions onto it:
 *
 * - each session keeps its id, so reservations, reminders and share links
 *   (?occ=<id>) still resolve; reservations are repointed to the kept activity
 * - a moved session keeps its seat limit via capacityOverride
 * - the emptied records are archived (not deleted); their URLs 308-redirect
 *   to the kept page (src/lib/merged-activities.ts)
 *
 * Every step checks the expected id + slug, so it is a no-op on any database
 * that does not hold these exact records, and re-running is harmless.
 */
type Merge = {
  keep: { id: number; slug: string }
  from: { id: number; slug: string; occurrenceIds: string[] }[]
}

const MERGES: Merge[] = [
  {
    keep: { id: 100, slug: 'mindfulness-in-eating' },
    from: [
      { id: 101, slug: 'mindfulness-for-eating', occurrenceIds: ['6aa25faae63e792f625a2621'] },
      { id: 108, slug: 'mindfulness-in-food', occurrenceIds: ['6aa8aa40b12a7dd239636337'] },
      { id: 109, slug: 'mindfulness-and-food', occurrenceIds: ['6aa8ab87b12a7dd239636338'] },
    ],
  },
  {
    keep: { id: 87, slug: 'healthy-circulation-cycle' },
    from: [
      // Its slug was two spaces, so the page never resolved.
      { id: 99, slug: '  ', occurrenceIds: ['6aa258731ab0cb70cd97e01a'] },
      { id: 104, slug: 'health-circle', occurrenceIds: ['6aa8a72e6fe48906394d2b1d'] },
      { id: 107, slug: 'health-wellness-cycle', occurrenceIds: ['6aa8a8ed6fe48906394d2b1f'] },
    ],
  },
  {
    keep: { id: 76, slug: 'mindfulness-badminton' },
    from: [{ id: 56, slug: 'tai-chi-mindfulness-ball', occurrenceIds: ['6a817d6da39d8bc94d5e1ba3'] }],
  },
]

// A blank slug cannot stay unique-and-valid once archived; give it a real one.
const BLANK_SLUG_REPLACEMENT = 'health-in-full-circle-archived'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const ready = await db.execute(sql`SELECT to_regclass('public.activities_occurrences') IS NOT NULL AS "exists"`)
  if (!ready.rows[0]?.exists) return

  for (const { keep, from } of MERGES) {
    const keeper = await db.execute(sql`
      SELECT 1 FROM "activities" WHERE "id" = ${keep.id} AND "slug" = ${keep.slug} AND "status" = 'published'
    `)
    if (keeper.rows.length === 0) continue

    for (const dup of from) {
      const found = await db.execute(sql`
        SELECT "capacity" FROM "activities" WHERE "id" = ${dup.id} AND "slug" = ${dup.slug}
      `)
      if (found.rows.length === 0) continue

      for (const occurrenceId of dup.occurrenceIds) {
        await db.execute(sql`
          UPDATE "activities_occurrences"
          SET "_parent_id" = ${keep.id},
              "capacity_override" = COALESCE("capacity_override", (SELECT "capacity" FROM "activities" WHERE "id" = ${dup.id}))
          WHERE "id" = ${occurrenceId} AND "_parent_id" = ${dup.id}
        `)
        await db.execute(sql`
          UPDATE "reservations" SET "activity_id" = ${keep.id}
          WHERE "activity_id" = ${dup.id} AND "occurrence_id" = ${occurrenceId}
        `)
      }
      await db.execute(sql`
        UPDATE "activities"
        SET "status" = 'archived',
            "slug" = CASE WHEN trim("slug") = '' THEN ${BLANK_SLUG_REPLACEMENT} ELSE "slug" END
        WHERE "id" = ${dup.id}
      `)
    }
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const { keep, from } of MERGES) {
    for (const dup of from) {
      for (const occurrenceId of dup.occurrenceIds) {
        await db.execute(sql`
          UPDATE "activities_occurrences" SET "_parent_id" = ${dup.id}
          WHERE "id" = ${occurrenceId} AND "_parent_id" = ${keep.id}
        `)
        await db.execute(sql`
          UPDATE "reservations" SET "activity_id" = ${dup.id}
          WHERE "activity_id" = ${keep.id} AND "occurrence_id" = ${occurrenceId}
        `)
      }
      const slug = dup.slug.trim() === '' ? BLANK_SLUG_REPLACEMENT : dup.slug
      await db.execute(sql`
        UPDATE "activities" SET "status" = 'published', "slug" = ${dup.slug}
        WHERE "id" = ${dup.id} AND "slug" = ${slug} AND "status" = 'archived'
      `)
    }
  }
}
