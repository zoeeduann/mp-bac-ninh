import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Complete the three-session schedule for the 2026 Zen Tea course. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "activities_occurrences"
      ("_order", "_parent_id", "id", "start_at", "end_at", "status")
    SELECT
      2,
      "activities"."id",
      '2aa829202608290200000001',
      '2026-08-29T02:00:00.000Z'::timestamptz,
      '2026-08-29T04:30:00.000Z'::timestamptz,
      'open'::"enum_activities_occurrences_status"
    FROM "activities"
    WHERE "activities"."slug" = 'tea-ceremony-seven-forms-training'
      AND NOT EXISTS (
        SELECT 1
        FROM "activities_occurrences"
        WHERE "activities_occurrences"."_parent_id" = "activities"."id"
          AND "activities_occurrences"."start_at" = '2026-08-29T02:00:00.000Z'::timestamptz
      );

    INSERT INTO "activities_occurrences"
      ("_order", "_parent_id", "id", "start_at", "end_at", "status")
    SELECT
      3,
      "activities"."id",
      '2aa905202609050200000002',
      '2026-09-05T02:00:00.000Z'::timestamptz,
      '2026-09-05T09:30:00.000Z'::timestamptz,
      'open'::"enum_activities_occurrences_status"
    FROM "activities"
    WHERE "activities"."slug" = 'tea-ceremony-seven-forms-training'
      AND NOT EXISTS (
        SELECT 1
        FROM "activities_occurrences"
        WHERE "activities_occurrences"."_parent_id" = "activities"."id"
          AND "activities_occurrences"."start_at" = '2026-09-05T02:00:00.000Z'::timestamptz
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "activities_occurrences"
    WHERE "id" IN (
      '2aa829202608290200000001',
      '2aa905202609050200000002'
    );
  `)
}
