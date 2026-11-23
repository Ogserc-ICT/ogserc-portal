import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'file.uploaded';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'file.updated';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'file.deleted';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'content.created';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'content.draft-saved';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'content.published';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'content.unpublished';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'content.deleted';
  ALTER TYPE "public"."enum_audit_log_target_type" ADD VALUE 'document-files';
  ALTER TYPE "public"."enum_audit_log_target_type" ADD VALUE 'e2e-drafts';
  CREATE TABLE "document_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_objectkey" varchar,
  	"prefix" varchar,
  	"title" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "_e2e_drafts_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "document_files_id" integer;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "document_files_updated_at_idx" ON "document_files" USING btree ("updated_at");
  CREATE INDEX "document_files_created_at_idx" ON "document_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "document_files_filename_idx" ON "document_files" USING btree ("filename");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_document_files_fk" FOREIGN KEY ("document_files_id") REFERENCES "public"."document_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_e2e_drafts_v_autosave_idx" ON "_e2e_drafts_v" USING btree ("autosave");
  CREATE INDEX "payload_locked_documents_rels_document_files_id_idx" ON "payload_locked_documents_rels" USING btree ("document_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "document_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "document_files" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_document_files_fk";
  
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('login.succeeded', 'login.failed', 'login.limited', 'account.locked', 'account.unlocked', 'logout', 'password.reset-requested', 'password.reset-completed', 'password.changed', 'user.created', 'user.updated', 'user.roles-changed', 'user.deleted', '2fa.enrolled', '2fa.verified', '2fa.failed', '2fa.removed', '2fa.reset', 'media.created', 'media.updated', 'media.deleted');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_target_type";
  CREATE TYPE "public"."enum_audit_log_target_type" AS ENUM('user', 'media');
  ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE "public"."enum_audit_log_target_type" USING "target_type"::"public"."enum_audit_log_target_type";
  DROP INDEX "_e2e_drafts_v_autosave_idx";
  DROP INDEX "payload_locked_documents_rels_document_files_id_idx";
  ALTER TABLE "_e2e_drafts_v" DROP COLUMN "autosave";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "document_files_id";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
