#!/bin/sh
# Deletes visitor statistics older than two years, as the Privacy Policy (section 7) promises
# (D-077, RUNBOOK Section 6). Run monthly by cron as the deploy user:
#   30 3 1 * * /opt/ogserc/deploy/prune-analytics.sh >> /var/backups/ogserc/prune-analytics.log 2>&1
# Check it without deleting anything:
#   /opt/ogserc/deploy/prune-analytics.sh --dry-run
# Only visitor data is deleted. Accounts, websites, reports, boards, share links and replays that
# staff saved on purpose are kept.
set -eu

cd "$(dirname "$0")/.."
finish=COMMIT
if [ "${1:-}" = "--dry-run" ]; then
  finish=ROLLBACK
fi

{
  echo 'BEGIN;'
  cat <<'SQL'
DO $$
DECLARE
  cutoff timestamptz := now() - interval '2 years';
  t text;
  n bigint;
BEGIN
  -- Event rows first, sessions last. The table names are fixed here, never taken from input.
  FOREACH t IN ARRAY ARRAY['event_data', 'session_data', 'revenue', 'error_event',
                           'heatmap_event', 'session_replay', 'website_event'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t AND column_name = 'created_at') THEN
      EXECUTE format('DELETE FROM public.%I WHERE created_at < $1', t) USING cutoff;
      GET DIAGNOSTICS n = ROW_COUNT;
      RAISE NOTICE '%: % rows older than % deleted', t, n, cutoff::date;
    ELSE
      -- A Umami upgrade renamed or removed it: review this list (RUNBOOK Section 10).
      RAISE WARNING '%: table or created_at column missing, skipped', t;
    END IF;
  END LOOP;

  -- A session is removed only once none of its page views remain.
  DELETE FROM public.session s
  WHERE s.created_at < cutoff
    AND NOT EXISTS (SELECT 1 FROM public.website_event e WHERE e.session_id = s.session_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'session: % rows deleted', n;
END $$;
SQL
  echo "$finish;"
} | docker compose -f docker-compose.prod.yml exec -T db psql -U ogserc -d umami -q -v ON_ERROR_STOP=1

echo "$(date -u +%FT%TZ) prune ok ($finish)"
