import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Distinguish the three Thailand-network academies from independently hosted
 * academy pages. Existing records remain in the Thailand network by default;
 * the already-created Bac Ninh Shanming Courtyard is explicitly standalone.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "is_thailand_network" boolean DEFAULT true;

    UPDATE "locations"
      SET "is_thailand_network" = false
      WHERE "slug" = 'bac-ninh';

    UPDATE "locations"
      SET "is_thailand_network" = true
      WHERE "is_thailand_network" IS NULL;

    ALTER TABLE "locations"
      ALTER COLUMN "is_thailand_network" SET DEFAULT true,
      ALTER COLUMN "is_thailand_network" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "locations"
      DROP COLUMN IF EXISTS "is_thailand_network";
  `)
}
