import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Remove Payload's development-push marker after the schema has been adopted
 * by checked-in production migrations. Leaving this marker in place causes
 * every non-interactive production build to pause for confirmation.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload_migrations"
      WHERE "batch" = -1;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The development-push marker is runtime metadata and must not be recreated.
}
