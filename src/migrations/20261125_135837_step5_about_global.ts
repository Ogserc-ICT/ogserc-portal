import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_about_ogserc_about_us_what_we_do_icon" AS ENUM('licence', 'scales', 'bolt', 'eye', 'megaphone', 'document', 'register', 'question', 'calendar', 'clock', 'mapPin', 'phone', 'mail');
  CREATE TYPE "public"."enum__about_ogserc_v_version_about_us_what_we_do_icon" AS ENUM('licence', 'scales', 'bolt', 'eye', 'megaphone', 'document', 'register', 'question', 'calendar', 'clock', 'mapPin', 'phone', 'mail');
  ALTER TYPE "public"."enum_audit_log_target_type" ADD VALUE 'about-ogserc' BEFORE 'e2e-drafts';
  CREATE TABLE "about_ogserc_about_us_introduction" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_about_us_what_we_do" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"icon" "enum_about_ogserc_about_us_what_we_do_icon" NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_history_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_history_key_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_mission_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_structure_introduction" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_structure_office_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_structure_divisions_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc_structure_divisions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "about_ogserc" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"about_us_description" varchar NOT NULL,
  	"history_description" varchar NOT NULL,
  	"mission_description" varchar NOT NULL,
  	"mission_vision" varchar NOT NULL,
  	"mission_mission" varchar NOT NULL,
  	"structure_description" varchar NOT NULL,
  	"structure_organogram_note" varchar NOT NULL,
  	"structure_office_name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_about_ogserc_v_version_about_us_introduction" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_about_us_what_we_do" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"icon" "enum__about_ogserc_v_version_about_us_what_we_do_icon" NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_history_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_history_key_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_mission_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_structure_introduction" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_structure_office_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_structure_divisions_units" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v_version_structure_divisions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_ogserc_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_about_us_description" varchar NOT NULL,
  	"version_history_description" varchar NOT NULL,
  	"version_mission_description" varchar NOT NULL,
  	"version_mission_vision" varchar NOT NULL,
  	"version_mission_mission" varchar NOT NULL,
  	"version_structure_description" varchar NOT NULL,
  	"version_structure_organogram_note" varchar NOT NULL,
  	"version_structure_office_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "about_ogserc_about_us_introduction" ADD CONSTRAINT "about_ogserc_about_us_introduction_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_about_us_what_we_do" ADD CONSTRAINT "about_ogserc_about_us_what_we_do_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_history_paragraphs" ADD CONSTRAINT "about_ogserc_history_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_history_key_dates" ADD CONSTRAINT "about_ogserc_history_key_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_mission_values" ADD CONSTRAINT "about_ogserc_mission_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_structure_introduction" ADD CONSTRAINT "about_ogserc_structure_introduction_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_structure_office_units" ADD CONSTRAINT "about_ogserc_structure_office_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_structure_divisions_units" ADD CONSTRAINT "about_ogserc_structure_divisions_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc_structure_divisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_ogserc_structure_divisions" ADD CONSTRAINT "about_ogserc_structure_divisions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_ogserc"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_about_us_introduction" ADD CONSTRAINT "_about_ogserc_v_version_about_us_introduction_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_about_us_what_we_do" ADD CONSTRAINT "_about_ogserc_v_version_about_us_what_we_do_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_history_paragraphs" ADD CONSTRAINT "_about_ogserc_v_version_history_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_history_key_dates" ADD CONSTRAINT "_about_ogserc_v_version_history_key_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_mission_values" ADD CONSTRAINT "_about_ogserc_v_version_mission_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_structure_introduction" ADD CONSTRAINT "_about_ogserc_v_version_structure_introduction_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_structure_office_units" ADD CONSTRAINT "_about_ogserc_v_version_structure_office_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_structure_divisions_units" ADD CONSTRAINT "_about_ogserc_v_version_structure_divisions_units_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v_version_structure_divisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_ogserc_v_version_structure_divisions" ADD CONSTRAINT "_about_ogserc_v_version_structure_divisions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_ogserc_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_ogserc_about_us_introduction_order_idx" ON "about_ogserc_about_us_introduction" USING btree ("_order");
  CREATE INDEX "about_ogserc_about_us_introduction_parent_id_idx" ON "about_ogserc_about_us_introduction" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_about_us_what_we_do_order_idx" ON "about_ogserc_about_us_what_we_do" USING btree ("_order");
  CREATE INDEX "about_ogserc_about_us_what_we_do_parent_id_idx" ON "about_ogserc_about_us_what_we_do" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_history_paragraphs_order_idx" ON "about_ogserc_history_paragraphs" USING btree ("_order");
  CREATE INDEX "about_ogserc_history_paragraphs_parent_id_idx" ON "about_ogserc_history_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_history_key_dates_order_idx" ON "about_ogserc_history_key_dates" USING btree ("_order");
  CREATE INDEX "about_ogserc_history_key_dates_parent_id_idx" ON "about_ogserc_history_key_dates" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_mission_values_order_idx" ON "about_ogserc_mission_values" USING btree ("_order");
  CREATE INDEX "about_ogserc_mission_values_parent_id_idx" ON "about_ogserc_mission_values" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_structure_introduction_order_idx" ON "about_ogserc_structure_introduction" USING btree ("_order");
  CREATE INDEX "about_ogserc_structure_introduction_parent_id_idx" ON "about_ogserc_structure_introduction" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_structure_office_units_order_idx" ON "about_ogserc_structure_office_units" USING btree ("_order");
  CREATE INDEX "about_ogserc_structure_office_units_parent_id_idx" ON "about_ogserc_structure_office_units" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_structure_divisions_units_order_idx" ON "about_ogserc_structure_divisions_units" USING btree ("_order");
  CREATE INDEX "about_ogserc_structure_divisions_units_parent_id_idx" ON "about_ogserc_structure_divisions_units" USING btree ("_parent_id");
  CREATE INDEX "about_ogserc_structure_divisions_order_idx" ON "about_ogserc_structure_divisions" USING btree ("_order");
  CREATE INDEX "about_ogserc_structure_divisions_parent_id_idx" ON "about_ogserc_structure_divisions" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_about_us_introduction_order_idx" ON "_about_ogserc_v_version_about_us_introduction" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_about_us_introduction_parent_id_idx" ON "_about_ogserc_v_version_about_us_introduction" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_about_us_what_we_do_order_idx" ON "_about_ogserc_v_version_about_us_what_we_do" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_about_us_what_we_do_parent_id_idx" ON "_about_ogserc_v_version_about_us_what_we_do" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_history_paragraphs_order_idx" ON "_about_ogserc_v_version_history_paragraphs" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_history_paragraphs_parent_id_idx" ON "_about_ogserc_v_version_history_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_history_key_dates_order_idx" ON "_about_ogserc_v_version_history_key_dates" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_history_key_dates_parent_id_idx" ON "_about_ogserc_v_version_history_key_dates" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_mission_values_order_idx" ON "_about_ogserc_v_version_mission_values" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_mission_values_parent_id_idx" ON "_about_ogserc_v_version_mission_values" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_structure_introduction_order_idx" ON "_about_ogserc_v_version_structure_introduction" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_structure_introduction_parent_id_idx" ON "_about_ogserc_v_version_structure_introduction" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_structure_office_units_order_idx" ON "_about_ogserc_v_version_structure_office_units" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_structure_office_units_parent_id_idx" ON "_about_ogserc_v_version_structure_office_units" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_structure_divisions_units_order_idx" ON "_about_ogserc_v_version_structure_divisions_units" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_structure_divisions_units_parent_id_idx" ON "_about_ogserc_v_version_structure_divisions_units" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_version_structure_divisions_order_idx" ON "_about_ogserc_v_version_structure_divisions" USING btree ("_order");
  CREATE INDEX "_about_ogserc_v_version_structure_divisions_parent_id_idx" ON "_about_ogserc_v_version_structure_divisions" USING btree ("_parent_id");
  CREATE INDEX "_about_ogserc_v_created_at_idx" ON "_about_ogserc_v" USING btree ("created_at");
  CREATE INDEX "_about_ogserc_v_updated_at_idx" ON "_about_ogserc_v" USING btree ("updated_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "about_ogserc_about_us_introduction" CASCADE;
  DROP TABLE "about_ogserc_about_us_what_we_do" CASCADE;
  DROP TABLE "about_ogserc_history_paragraphs" CASCADE;
  DROP TABLE "about_ogserc_history_key_dates" CASCADE;
  DROP TABLE "about_ogserc_mission_values" CASCADE;
  DROP TABLE "about_ogserc_structure_introduction" CASCADE;
  DROP TABLE "about_ogserc_structure_office_units" CASCADE;
  DROP TABLE "about_ogserc_structure_divisions_units" CASCADE;
  DROP TABLE "about_ogserc_structure_divisions" CASCADE;
  DROP TABLE "about_ogserc" CASCADE;
  DROP TABLE "_about_ogserc_v_version_about_us_introduction" CASCADE;
  DROP TABLE "_about_ogserc_v_version_about_us_what_we_do" CASCADE;
  DROP TABLE "_about_ogserc_v_version_history_paragraphs" CASCADE;
  DROP TABLE "_about_ogserc_v_version_history_key_dates" CASCADE;
  DROP TABLE "_about_ogserc_v_version_mission_values" CASCADE;
  DROP TABLE "_about_ogserc_v_version_structure_introduction" CASCADE;
  DROP TABLE "_about_ogserc_v_version_structure_office_units" CASCADE;
  DROP TABLE "_about_ogserc_v_version_structure_divisions_units" CASCADE;
  DROP TABLE "_about_ogserc_v_version_structure_divisions" CASCADE;
  DROP TABLE "_about_ogserc_v" CASCADE;
  ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_target_type";
  CREATE TYPE "public"."enum_audit_log_target_type" AS ENUM('user', 'media', 'document-files', 'documents', 'news', 'events', 'announcements', 'tenders', 'reports', 'faqs', 'pages', 'galleries', 'site-settings', 'e2e-drafts');
  ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE "public"."enum_audit_log_target_type" USING "target_type"::"public"."enum_audit_log_target_type";
  DROP TYPE "public"."enum_about_ogserc_about_us_what_we_do_icon";
  DROP TYPE "public"."enum__about_ogserc_v_version_about_us_what_we_do_icon";`)
}
