import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "card_cover_id" integer;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "card_cover_job" jsonb;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_card_cover_id_media_id_fk') THEN
        ALTER TABLE "media" ADD CONSTRAINT "media_card_cover_id_media_id_fk"
          FOREIGN KEY ("card_cover_id") REFERENCES "media"("id") ON DELETE SET NULL;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS "media_card_cover_idx" ON "media" ("card_cover_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "media_card_cover_idx";
    ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_card_cover_id_media_id_fk";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "card_cover_id";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "card_cover_job";
  `)
}
