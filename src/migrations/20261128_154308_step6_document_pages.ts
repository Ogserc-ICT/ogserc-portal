import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" ADD COLUMN "file_pages" numeric;
  ALTER TABLE "_documents_v" ADD COLUMN "version_file_pages" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" DROP COLUMN "file_pages";
  ALTER TABLE "_documents_v" DROP COLUMN "version_file_pages";`)
}
