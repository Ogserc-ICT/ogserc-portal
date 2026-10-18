import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_e2e_drafts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__e2e_drafts_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "e2e_drafts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_e2e_drafts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_e2e_drafts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__e2e_drafts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "e2e_drafts_id" integer;
  ALTER TABLE "_e2e_drafts_v" ADD CONSTRAINT "_e2e_drafts_v_parent_id_e2e_drafts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."e2e_drafts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "e2e_drafts_updated_at_idx" ON "e2e_drafts" USING btree ("updated_at");
  CREATE INDEX "e2e_drafts_created_at_idx" ON "e2e_drafts" USING btree ("created_at");
  CREATE INDEX "e2e_drafts__status_idx" ON "e2e_drafts" USING btree ("_status");
  CREATE INDEX "_e2e_drafts_v_parent_idx" ON "_e2e_drafts_v" USING btree ("parent_id");
  CREATE INDEX "_e2e_drafts_v_version_version_updated_at_idx" ON "_e2e_drafts_v" USING btree ("version_updated_at");
  CREATE INDEX "_e2e_drafts_v_version_version_created_at_idx" ON "_e2e_drafts_v" USING btree ("version_created_at");
  CREATE INDEX "_e2e_drafts_v_version_version__status_idx" ON "_e2e_drafts_v" USING btree ("version__status");
  CREATE INDEX "_e2e_drafts_v_created_at_idx" ON "_e2e_drafts_v" USING btree ("created_at");
  CREATE INDEX "_e2e_drafts_v_updated_at_idx" ON "_e2e_drafts_v" USING btree ("updated_at");
  CREATE INDEX "_e2e_drafts_v_latest_idx" ON "_e2e_drafts_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_e2e_drafts_fk" FOREIGN KEY ("e2e_drafts_id") REFERENCES "public"."e2e_drafts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_e2e_drafts_id_idx" ON "payload_locked_documents_rels" USING btree ("e2e_drafts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "e2e_drafts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_e2e_drafts_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "e2e_drafts" CASCADE;
  DROP TABLE "_e2e_drafts_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_e2e_drafts_fk";
  
  DROP INDEX "payload_locked_documents_rels_e2e_drafts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "e2e_drafts_id";
  DROP TYPE "public"."enum_e2e_drafts_status";
  DROP TYPE "public"."enum__e2e_drafts_v_version_status";`)
}
