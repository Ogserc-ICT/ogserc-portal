import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_audit_log_action" ADD VALUE '2fa.enrolled' BEFORE 'media.created';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE '2fa.verified' BEFORE 'media.created';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE '2fa.failed' BEFORE 'media.created';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE '2fa.removed' BEFORE 'media.created';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE '2fa.reset' BEFORE 'media.created';
  CREATE TABLE "totp_attempts" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"lock_until" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "totp_secret" varchar;`)
}

// Rolling back deletes the two-factor audit entries and every enrolled secret (D-084).
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "totp_attempts" CASCADE;
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  -- Entries for the removed actions cannot be kept under the old type.
  DELETE FROM "audit_log" WHERE "action" LIKE '2fa.%';
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('login.succeeded', 'login.failed', 'login.limited', 'account.locked', 'account.unlocked', 'logout', 'password.reset-requested', 'password.reset-completed', 'password.changed', 'user.created', 'user.updated', 'user.roles-changed', 'user.deleted', 'media.created', 'media.updated', 'media.deleted');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  ALTER TABLE "users" DROP COLUMN "totp_secret";`)
}
