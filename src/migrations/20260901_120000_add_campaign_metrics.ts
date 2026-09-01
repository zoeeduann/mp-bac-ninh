import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Add anonymous daily aggregates for the campaign landing-page funnel. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "campaign_metrics" (
      "id" serial PRIMARY KEY NOT NULL,
      "metric_key" varchar NOT NULL,
      "metric_date" varchar NOT NULL,
      "focus" varchar NOT NULL,
      "utm_source" varchar DEFAULT '',
      "utm_medium" varchar DEFAULT '',
      "utm_campaign" varchar DEFAULT '',
      "utm_content" varchar DEFAULT '',
      "page_views" numeric DEFAULT 0 NOT NULL,
      "form_starts" numeric DEFAULT 0 NOT NULL,
      "lead_successes" numeric DEFAULT 0 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "campaign_metrics_metric_key_idx"
      ON "campaign_metrics" USING btree ("metric_key");
    CREATE INDEX IF NOT EXISTS "campaign_metrics_metric_date_idx"
      ON "campaign_metrics" USING btree ("metric_date");
    CREATE INDEX IF NOT EXISTS "campaign_metrics_focus_idx"
      ON "campaign_metrics" USING btree ("focus");
    CREATE INDEX IF NOT EXISTS "campaign_metrics_updated_at_idx"
      ON "campaign_metrics" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "campaign_metrics_created_at_idx"
      ON "campaign_metrics" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "campaign_metrics" CASCADE;`)
}
