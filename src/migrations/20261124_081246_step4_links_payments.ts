import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "news_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link" varchar
  );
  
  CREATE TABLE "_news_v_version_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "announcements_payment_accounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"account_name" varchar,
  	"account_number" varchar,
  	"bank" varchar,
  	"description" varchar,
  	"amount" varchar
  );
  
  CREATE TABLE "announcements_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link" varchar
  );
  
  CREATE TABLE "_announcements_v_version_payment_accounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"account_name" varchar,
  	"account_number" varchar,
  	"bank" varchar,
  	"description" varchar,
  	"amount" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_announcements_v_version_related_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "news" ADD COLUMN "link" varchar;
  ALTER TABLE "_news_v" ADD COLUMN "version_link" varchar;
  ALTER TABLE "announcements" ADD COLUMN "link" varchar;
  ALTER TABLE "announcements" ADD COLUMN "issued_at" varchar;
  ALTER TABLE "announcements" ADD COLUMN "payment_intro" varchar;
  ALTER TABLE "announcements" ADD COLUMN "enquiries_note" varchar;
  ALTER TABLE "announcements" ADD COLUMN "enquiries_email" varchar;
  ALTER TABLE "announcements" ADD COLUMN "sign_off_closing" varchar;
  ALTER TABLE "announcements" ADD COLUMN "sign_off_signatories" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_link" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_issued_at" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_payment_intro" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_enquiries_note" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_enquiries_email" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_sign_off_closing" varchar;
  ALTER TABLE "_announcements_v" ADD COLUMN "version_sign_off_signatories" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filename" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_introduction" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_contact_introduction" varchar;
  ALTER TABLE "news_related_links" ADD CONSTRAINT "news_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_version_related_links" ADD CONSTRAINT "_news_v_version_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_payment_accounts" ADD CONSTRAINT "announcements_payment_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_related_links" ADD CONSTRAINT "announcements_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v_version_payment_accounts" ADD CONSTRAINT "_announcements_v_version_payment_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_announcements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v_version_related_links" ADD CONSTRAINT "_announcements_v_version_related_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_announcements_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "news_related_links_order_idx" ON "news_related_links" USING btree ("_order");
  CREATE INDEX "news_related_links_parent_id_idx" ON "news_related_links" USING btree ("_parent_id");
  CREATE INDEX "_news_v_version_related_links_order_idx" ON "_news_v_version_related_links" USING btree ("_order");
  CREATE INDEX "_news_v_version_related_links_parent_id_idx" ON "_news_v_version_related_links" USING btree ("_parent_id");
  CREATE INDEX "announcements_payment_accounts_order_idx" ON "announcements_payment_accounts" USING btree ("_order");
  CREATE INDEX "announcements_payment_accounts_parent_id_idx" ON "announcements_payment_accounts" USING btree ("_parent_id");
  CREATE INDEX "announcements_related_links_order_idx" ON "announcements_related_links" USING btree ("_order");
  CREATE INDEX "announcements_related_links_parent_id_idx" ON "announcements_related_links" USING btree ("_parent_id");
  CREATE INDEX "_announcements_v_version_payment_accounts_order_idx" ON "_announcements_v_version_payment_accounts" USING btree ("_order");
  CREATE INDEX "_announcements_v_version_payment_accounts_parent_id_idx" ON "_announcements_v_version_payment_accounts" USING btree ("_parent_id");
  CREATE INDEX "_announcements_v_version_related_links_order_idx" ON "_announcements_v_version_related_links" USING btree ("_order");
  CREATE INDEX "_announcements_v_version_related_links_parent_id_idx" ON "_announcements_v_version_related_links" USING btree ("_parent_id");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news_related_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_version_related_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "announcements_payment_accounts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "announcements_related_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_announcements_v_version_payment_accounts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_announcements_v_version_related_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "news_related_links" CASCADE;
  DROP TABLE "_news_v_version_related_links" CASCADE;
  DROP TABLE "announcements_payment_accounts" CASCADE;
  DROP TABLE "announcements_related_links" CASCADE;
  DROP TABLE "_announcements_v_version_payment_accounts" CASCADE;
  DROP TABLE "_announcements_v_version_related_links" CASCADE;
  DROP INDEX "media_sizes_card_sizes_card_filename_idx";
  ALTER TABLE "news" DROP COLUMN "link";
  ALTER TABLE "_news_v" DROP COLUMN "version_link";
  ALTER TABLE "announcements" DROP COLUMN "link";
  ALTER TABLE "announcements" DROP COLUMN "issued_at";
  ALTER TABLE "announcements" DROP COLUMN "payment_intro";
  ALTER TABLE "announcements" DROP COLUMN "enquiries_note";
  ALTER TABLE "announcements" DROP COLUMN "enquiries_email";
  ALTER TABLE "announcements" DROP COLUMN "sign_off_closing";
  ALTER TABLE "announcements" DROP COLUMN "sign_off_signatories";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_link";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_issued_at";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_payment_intro";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_enquiries_note";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_enquiries_email";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_sign_off_closing";
  ALTER TABLE "_announcements_v" DROP COLUMN "version_sign_off_signatories";
  ALTER TABLE "media" DROP COLUMN "sizes_card_url";
  ALTER TABLE "media" DROP COLUMN "sizes_card_width";
  ALTER TABLE "media" DROP COLUMN "sizes_card_height";
  ALTER TABLE "media" DROP COLUMN "sizes_card_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_card_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_card_filename";
  ALTER TABLE "site_settings" DROP COLUMN "contact_introduction";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_contact_introduction";`)
}
