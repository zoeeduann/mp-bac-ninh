import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Support full-course registration, Chinese-level screening, and Zalo contacts. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "activities"
      ADD COLUMN IF NOT EXISTS "registration_mode" varchar DEFAULT 'per_occurrence',
      ADD COLUMN IF NOT EXISTS "requires_chinese_proficiency" boolean DEFAULT false;

    UPDATE "activities"
      SET "registration_mode" = 'per_occurrence'
      WHERE "registration_mode" IS NULL OR "registration_mode" = '';

    UPDATE "activities"
      SET "registration_mode" = 'series',
          "requires_chinese_proficiency" = true
      WHERE "slug" = 'tea-ceremony-seven-forms-training';

    ALTER TABLE "activities"
      ALTER COLUMN "registration_mode" SET DEFAULT 'per_occurrence',
      ALTER COLUMN "registration_mode" SET NOT NULL,
      ALTER COLUMN "requires_chinese_proficiency" SET DEFAULT false,
      ALTER COLUMN "requires_chinese_proficiency" SET NOT NULL;

    ALTER TABLE "reservations"
      ADD COLUMN IF NOT EXISTS "zalo_id" varchar,
      ADD COLUMN IF NOT EXISTS "full_series_confirmed" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "chinese_proficiency" varchar;

    UPDATE "reservations"
      SET "full_series_confirmed" = false
      WHERE "full_series_confirmed" IS NULL;

    ALTER TABLE "reservations"
      ALTER COLUMN "full_series_confirmed" SET DEFAULT false,
      ALTER COLUMN "full_series_confirmed" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "reservations"
      DROP COLUMN IF EXISTS "chinese_proficiency",
      DROP COLUMN IF EXISTS "full_series_confirmed",
      DROP COLUMN IF EXISTS "zalo_id";

    ALTER TABLE "activities"
      DROP COLUMN IF EXISTS "requires_chinese_proficiency",
      DROP COLUMN IF EXISTS "registration_mode";
  `)
}
