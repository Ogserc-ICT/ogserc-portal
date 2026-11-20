-- Audit log retention (D-083, RUNBOOK Section 6), run by deploy/prune-audit.sh and by
-- tests/e2e-db/audit-log.spec.ts. psql variables, both whole numbers of days, checked by the caller:
--   ip_days    blank the internet address and browser of entries older than this (90)
--   keep_days  delete entries older than this (730, two years)
-- Only the audit_log table is touched. The caller wraps it in a transaction (COMMIT or ROLLBACK).

UPDATE public.audit_log
SET ip_address = NULL, user_agent = NULL
WHERE created_at < now() - make_interval(days => :ip_days)
  AND (ip_address IS NOT NULL OR user_agent IS NOT NULL);

DELETE FROM public.audit_log
WHERE created_at < now() - make_interval(days => :keep_days);
