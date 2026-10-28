import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Optional organizer email on activities (`organizerEmail` in
 * src/collections/Activities.ts). New bookings for the activity notify it.
 *
 * The database is shared with the Thailand site, which ships this migration
 * under the same name, so whichever deploy runs first records it in the shared
 * payload_migrations table and the other skips it. It only adds a nullable
 * column; `IF NOT EXISTS` keeps it safe where Payload's development push mode
 * already added it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "activities"
      ADD COLUMN IF NOT EXISTS "organizer_email" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "activities"
      DROP COLUMN IF EXISTS "organizer_email";
  `)
}
