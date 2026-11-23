import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_documents_category" AS ENUM('rules-and-regulations', 'energy-caps', 'guidelines', 'forms', 'consultation', 'licences', 'orders-and-directives', 'codes', 'manuals', 'market-documents', 'standards');
  CREATE TYPE "public"."enum_documents_document_status" AS ENUM('published', 'superseded', 'revoked');
  CREATE TYPE "public"."enum_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documents_v_version_category" AS ENUM('rules-and-regulations', 'energy-caps', 'guidelines', 'forms', 'consultation', 'licences', 'orders-and-directives', 'codes', 'manuals', 'market-documents', 'standards');
  CREATE TYPE "public"."enum__documents_v_version_document_status" AS ENUM('published', 'superseded', 'revoked');
  CREATE TYPE "public"."enum__documents_v_version_status" AS ENUM('draft', 'published');
  ALTER TYPE "public"."enum_audit_log_target_type" ADD VALUE 'documents' BEFORE 'e2e-drafts';
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" "enum_documents_category",
  	"type_label" varchar,
  	"reference" varchar,
  	"document_status" "enum_documents_document_status" DEFAULT 'published',
  	"publication_date" timestamp(3) with time zone,
  	"effective_date" timestamp(3) with time zone,
  	"superseded_by_id" integer,
  	"description" varchar,
  	"file_id" integer,
  	"file_description" varchar,
  	"thumbnail_id" integer,
  	"body" jsonb,
  	"code_family" varchar,
  	"consultation_closing_date" timestamp(3) with time zone,
  	"consultation_comment_email" varchar,
  	"consultation_comment_address" varchar,
  	"consultation_subject_line" varchar,
  	"consultation_hearing_date" timestamp(3) with time zone,
  	"consultation_hearing_place" varchar,
  	"consultation_final_document_id" integer,
  	"enquiries_email" varchar,
  	"enquiries_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_documents_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "documents_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  CREATE TABLE "_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" "enum__documents_v_version_category",
  	"version_type_label" varchar,
  	"version_reference" varchar,
  	"version_document_status" "enum__documents_v_version_document_status" DEFAULT 'published',
  	"version_publication_date" timestamp(3) with time zone,
  	"version_effective_date" timestamp(3) with time zone,
  	"version_superseded_by_id" integer,
  	"version_description" varchar,
  	"version_file_id" integer,
  	"version_file_description" varchar,
  	"version_thumbnail_id" integer,
  	"version_body" jsonb,
  	"version_code_family" varchar,
  	"version_consultation_closing_date" timestamp(3) with time zone,
  	"version_consultation_comment_email" varchar,
  	"version_consultation_comment_address" varchar,
  	"version_consultation_subject_line" varchar,
  	"version_consultation_hearing_date" timestamp(3) with time zone,
  	"version_consultation_hearing_place" varchar,
  	"version_consultation_final_document_id" integer,
  	"version_enquiries_email" varchar,
  	"version_enquiries_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__documents_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_documents_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_documents_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "documents_id" integer;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_superseded_by_id_documents_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_file_id_document_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."document_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_consultation_final_document_id_documents_id_fk" FOREIGN KEY ("consultation_final_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents_texts" ADD CONSTRAINT "documents_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents_rels" ADD CONSTRAINT "documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents_rels" ADD CONSTRAINT "documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_parent_id_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_superseded_by_id_documents_id_fk" FOREIGN KEY ("version_superseded_by_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_file_id_document_files_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "public"."document_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_version_consultation_final_document_id_documents_id_fk" FOREIGN KEY ("version_consultation_final_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v_texts" ADD CONSTRAINT "_documents_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v_rels" ADD CONSTRAINT "_documents_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v_rels" ADD CONSTRAINT "_documents_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "documents_slug_idx" ON "documents" USING btree ("slug");
  CREATE INDEX "documents_category_idx" ON "documents" USING btree ("category");
  CREATE INDEX "documents_reference_idx" ON "documents" USING btree ("reference");
  CREATE INDEX "documents_document_status_idx" ON "documents" USING btree ("document_status");
  CREATE INDEX "documents_publication_date_idx" ON "documents" USING btree ("publication_date");
  CREATE INDEX "documents_superseded_by_idx" ON "documents" USING btree ("superseded_by_id");
  CREATE INDEX "documents_file_idx" ON "documents" USING btree ("file_id");
  CREATE INDEX "documents_thumbnail_idx" ON "documents" USING btree ("thumbnail_id");
  CREATE INDEX "documents_consultation_consultation_final_document_idx" ON "documents" USING btree ("consultation_final_document_id");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE INDEX "documents__status_idx" ON "documents" USING btree ("_status");
  CREATE INDEX "documents_texts_order_parent" ON "documents_texts" USING btree ("order","parent_id");
  CREATE INDEX "documents_rels_order_idx" ON "documents_rels" USING btree ("order");
  CREATE INDEX "documents_rels_parent_idx" ON "documents_rels" USING btree ("parent_id");
  CREATE INDEX "documents_rels_path_idx" ON "documents_rels" USING btree ("path");
  CREATE INDEX "documents_rels_documents_id_idx" ON "documents_rels" USING btree ("documents_id");
  CREATE INDEX "_documents_v_parent_idx" ON "_documents_v" USING btree ("parent_id");
  CREATE INDEX "_documents_v_version_version_slug_idx" ON "_documents_v" USING btree ("version_slug");
  CREATE INDEX "_documents_v_version_version_category_idx" ON "_documents_v" USING btree ("version_category");
  CREATE INDEX "_documents_v_version_version_reference_idx" ON "_documents_v" USING btree ("version_reference");
  CREATE INDEX "_documents_v_version_version_document_status_idx" ON "_documents_v" USING btree ("version_document_status");
  CREATE INDEX "_documents_v_version_version_publication_date_idx" ON "_documents_v" USING btree ("version_publication_date");
  CREATE INDEX "_documents_v_version_version_superseded_by_idx" ON "_documents_v" USING btree ("version_superseded_by_id");
  CREATE INDEX "_documents_v_version_version_file_idx" ON "_documents_v" USING btree ("version_file_id");
  CREATE INDEX "_documents_v_version_version_thumbnail_idx" ON "_documents_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_documents_v_version_consultation_version_consultation_f_idx" ON "_documents_v" USING btree ("version_consultation_final_document_id");
  CREATE INDEX "_documents_v_version_version_updated_at_idx" ON "_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_documents_v_version_version_created_at_idx" ON "_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_documents_v_version_version__status_idx" ON "_documents_v" USING btree ("version__status");
  CREATE INDEX "_documents_v_created_at_idx" ON "_documents_v" USING btree ("created_at");
  CREATE INDEX "_documents_v_updated_at_idx" ON "_documents_v" USING btree ("updated_at");
  CREATE INDEX "_documents_v_latest_idx" ON "_documents_v" USING btree ("latest");
  CREATE INDEX "_documents_v_autosave_idx" ON "_documents_v" USING btree ("autosave");
  CREATE INDEX "_documents_v_texts_order_parent" ON "_documents_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_documents_v_rels_order_idx" ON "_documents_v_rels" USING btree ("order");
  CREATE INDEX "_documents_v_rels_parent_idx" ON "_documents_v_rels" USING btree ("parent_id");
  CREATE INDEX "_documents_v_rels_path_idx" ON "_documents_v_rels" USING btree ("path");
  CREATE INDEX "_documents_v_rels_documents_id_idx" ON "_documents_v_rels" USING btree ("documents_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "documents_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "documents_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_documents_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_documents_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_documents_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "documents_texts" CASCADE;
  DROP TABLE "documents_rels" CASCADE;
  DROP TABLE "_documents_v" CASCADE;
  DROP TABLE "_documents_v_texts" CASCADE;
  DROP TABLE "_documents_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_documents_fk";
  
  ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_target_type";
  CREATE TYPE "public"."enum_audit_log_target_type" AS ENUM('user', 'media', 'document-files', 'e2e-drafts');
  ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE "public"."enum_audit_log_target_type" USING "target_type"::"public"."enum_audit_log_target_type";
  DROP INDEX "payload_locked_documents_rels_documents_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "documents_id";
  DROP TYPE "public"."enum_documents_category";
  DROP TYPE "public"."enum_documents_document_status";
  DROP TYPE "public"."enum_documents_status";
  DROP TYPE "public"."enum__documents_v_version_category";
  DROP TYPE "public"."enum__documents_v_version_document_status";
  DROP TYPE "public"."enum__documents_v_version_status";`)
}
