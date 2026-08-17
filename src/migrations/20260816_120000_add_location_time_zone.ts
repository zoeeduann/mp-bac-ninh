import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Store the wall-clock timezone used by booking communications per academy. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "locations"
      ADD COLUMN IF NOT EXISTS "time_zone" varchar;

    UPDATE "locations"
      SET "time_zone" = 'Asia/Ho_Chi_Minh'
      WHERE "slug" = 'bac-ninh';

    UPDATE "locations"
      SET "time_zone" = 'Asia/Bangkok'
      WHERE "slug" IN ('bangkok', 'chiangmai', 'phuket');

    UPDATE "locations"
      SET "time_zone" = 'Asia/Ho_Chi_Minh'
      WHERE "time_zone" IS NULL OR "time_zone" = '';

    ALTER TABLE "locations"
      ALTER COLUMN "time_zone" SET DEFAULT 'Asia/Ho_Chi_Minh',
      ALTER COLUMN "time_zone" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "locations" DROP COLUMN IF EXISTS "time_zone";
  `)
}
