# Step 4: content collections and sample content

Approved by the owner on 2026-11-23, with these choices: scheduled publishing included (FR-CMS-04); `pnpm seed` never runs
against the production database; document files limited to 25 MB until OGSERC gives a number. Earlier owner decisions:
drafts with autosave on every content collection, and uploaded files stay public (D-089).

Requirements: FR-CMS-01 to 08, FR-DOC-01/02, FR-DRAFT-01, FR-CODE-01/02, FR-REP-01/02, FR-NEWS-01 to 04, SRS Sections 10
and 11. Pages that list and show this content are built in later steps (6: documents, 9: Media Center); Step 4 builds the
collections, the homepage's switch to the CMS and the seed script.

## Slices (one branch and pull request each)

1. **Foundation** (`feat/step-4-foundation`)
   - `contentCollection()`: the shared setup for every content collection. Drafts with autosave (D-089), scheduled
     publishing, version history, `publicOrTwoFactor(publishedOnly)` read, `canSaveContent` with `guardPublishedContent`,
     publishers delete, the audit hooks. The test-only `e2e-drafts` collection uses it, so the existing draft tests cover it.
   - A `slug` field helper: lowercase words and hyphens, unique, filled from the title when left empty.
   - `document-files`: an upload collection for PDF, Word (.docx) and Excel (.xlsx), checked by content (a ZIP's entries
     must be a real Word or Excel file, without macros), 25 MB, public read (D-089), in the S3 bucket like Media.
   - Audit log: content created, changed, published, unpublished, deleted (FR-CMS-05). Autosaves are not logged one by
     one; version history keeps them.
   - Scheduled publishing: Payload's `schedulePublish` job. The job runner (`/api/payload-jobs/run`) only accepts a
     secret (`JOBS_RUN_SECRET`), and a cron job on the server calls it every 5 minutes. No timer inside the app (D-051).
     A scheduled publish runs as the person who scheduled it, so an editor's schedule is refused like their publish.
2. **Documents**: the eleven Regulatory Instruments categories (FR-DOC-01), FR-DOC-02's fields (status Published,
   Superseded, Revoked; draft is the CMS draft state), an optional consultation group (FR-DRAFT-01), a code family
   (FR-CODE-01).
3. **News, Events, Announcements, Tenders** (FR-NEWS-01 to 03).
4. **Reports, FAQs, Pages, Galleries** (FR-REP, FR-NEWS-04) and site settings (hero slides, contact details, office
   hours, social links, departments, footer text).
5. **Seed, import and the homepage switch**: `pnpm seed` loads "[Sample, OGSERC to supply]" items for every type and
   refuses the production database. A one-time import moves the real news, public notices and site settings into the CMS,
   and in the same slice the homepage, footer and contact page read the CMS and `src/lib/placeholder-content.ts` is
   deleted (D-028). Changed on 2026-11-23 (moved from slice 4): switching the homepage before the import would empty the
   live homepage's lists. Orders, consultation papers and forms move in Step 6 with their pages, keeping their addresses.

## Tests for every slice
Migrations, `pnpm generate:types`, the access audit (`tests/unit/config-access.spec.ts`), and database tests: a draft never
reaches a public read (D-049), an editor's autosave on a published item leaves the published version unchanged, work saved
before a sign-out is there after signing in again (D-089), and an editor cannot publish by scheduling.
