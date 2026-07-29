import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Schema migration for automatic and context-aware image descriptions.
 *
 * `IF NOT EXISTS` and `DROP NOT NULL` keep the migration safe for environments
 * where Payload's development push mode may already have applied the changes.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media_locales"
      ALTER COLUMN "alt" DROP NOT NULL;

    ALTER TABLE "journal_locales"
      ADD COLUMN IF NOT EXISTS "cover_alt" varchar;

    ALTER TABLE "journal_photos_locales"
      ADD COLUMN IF NOT EXISTS "alt" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "journal_photos_locales"
      DROP COLUMN IF EXISTS "alt";

    ALTER TABLE "journal_locales"
      DROP COLUMN IF EXISTS "cover_alt";

    UPDATE "media_locales"
      SET "alt" = ''
      WHERE "alt" IS NULL;

    ALTER TABLE "media_locales"
      ALTER COLUMN "alt" SET NOT NULL;
  `)
}
