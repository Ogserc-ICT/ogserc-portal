import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "announcements" ADD COLUMN "issued_under_label" varchar;
  ALTER TABLE "announcements" ADD COLUMN "issued_under_reference" varchar;
  ALTER TABLE "announcements" ADD COLUMN "issued_under_link" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_issued_under_label" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_issued_under_reference" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_issued_under_link" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "announcements" DROP COLUMN "issued_under_label";
  ALTER TABLE "announcements" DROP COLUMN "issued_under_reference";
  ALTER TABLE "announcements" DROP COLUMN "issued_under_link";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_issued_under_label";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_issued_under_reference";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_issued_under_link";`)
}
