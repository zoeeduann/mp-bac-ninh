import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * 禅茶读书会 was published twice (mindful-tea-reading for 30 Sep and
 * dhyana-tea-reading-circle for 7 Oct), two pages with the same title
 * competing for the same searches. Keep the newer page and fold the older one
 * into it, the same way 20260920_151000_merge_duplicate_activities did:
 *
 * - the session keeps its id, so reservations, reminders and share links
 *   (?occ=<id>) still resolve; reservations and journal entries are
 *   repointed to the kept activity
 * - the moved session keeps its seat limit via capacityOverride
 * - the emptied record is archived (not deleted); its URL 308-redirects to
 *   the kept page (src/lib/merged-activities.ts)
 *
 * Every step checks the expected id + slug, so it is a no-op on any database
 * that does not hold these exact records, and re-running is harmless.
 */
const KEEP = { id: 140, slug: 'dhyana-tea-reading-circle' }
const DUP = { id: 122, slug: 'mindful-tea-reading', occurrenceIds: ['6ab920570880a85e7af9907f'] }

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const ready = await db.execute(sql`SELECT to_regclass('public.activities_occurrences') IS NOT NULL AS "exists"`)
  if (!ready.rows[0]?.exists) return

  const keeper = await db.execute(sql`
    SELECT 1 FROM "activities" WHERE "id" = ${KEEP.id} AND "slug" = ${KEEP.slug} AND "status" = 'published'
  `)
  if (keeper.rows.length === 0) return
  const found = await db.execute(sql`
    SELECT 1 FROM "activities" WHERE "id" = ${DUP.id} AND "slug" = ${DUP.slug}
  `)
  if (found.rows.length === 0) return

  for (const occurrenceId of DUP.occurrenceIds) {
    await db.execute(sql`
      UPDATE "activities_occurrences"
      SET "_parent_id" = ${KEEP.id},
          "capacity_override" = COALESCE("capacity_override", (SELECT "capacity" FROM "activities" WHERE "id" = ${DUP.id}))
      WHERE "id" = ${occurrenceId} AND "_parent_id" = ${DUP.id}
    `)
    await db.execute(sql`
      UPDATE "reservations" SET "activity_id" = ${KEEP.id}
      WHERE "activity_id" = ${DUP.id} AND "occurrence_id" = ${occurrenceId}
    `)
  }
  await db.execute(sql`
    UPDATE "journal" SET "related_activity_id" = ${KEEP.id} WHERE "related_activity_id" = ${DUP.id}
  `)
  await db.execute(sql`UPDATE "activities" SET "status" = 'archived' WHERE "id" = ${DUP.id}`)
}

// Journal links stay on the kept page: which entries pointed at the archived
// record is not recorded, and the kept page covers the same series.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const occurrenceId of DUP.occurrenceIds) {
    await db.execute(sql`
      UPDATE "activities_occurrences" SET "_parent_id" = ${DUP.id}
      WHERE "id" = ${occurrenceId} AND "_parent_id" = ${KEEP.id}
    `)
    await db.execute(sql`
      UPDATE "reservations" SET "activity_id" = ${DUP.id}
      WHERE "activity_id" = ${KEEP.id} AND "occurrence_id" = ${occurrenceId}
    `)
  }
  await db.execute(sql`
    UPDATE "activities" SET "status" = 'published'
    WHERE "id" = ${DUP.id} AND "slug" = ${DUP.slug} AND "status" = 'archived'
  `)
}
