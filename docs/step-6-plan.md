# Step 6: Regulatory Instruments

Approved by the owner on 2026-11-28, with categories that have no documents yet showing "No documents have been
published in this category yet". Slice 1: D-102.

Requirements: SRS Section 4 (Regulatory Instruments: eleven categories), FR-DOC-01 to FR-DOC-05, FR-DRAFT-01/02,
FR-CODE-01/02, FR-CMS-01, FR-CMS-03 to FR-CMS-05. Builds on the Documents collection (D-091) and the hand-built pages
for the first documents (D-060 Orders, D-063 registration forms, D-071 consultation).

## Where things stand
- The **Documents collection** exists (D-091) but is empty on the live site.
- Four real documents are still **in code** (`src/lib/documents/catalogue.ts`, with their full text in `text-*.ts`):
  Orders OGSERC/ORD/2026/001 and 002, consultation paper CP/2026/001 and the draft Order it consults on. Their PDFs
  are in `public/documents/`.
- The eleven **registration forms** (REG-01A to K) and the selection guide are in code (`src/lib/forms/registration.ts`,
  `public/forms/registration/`).
- Built pages: Orders & Directives, Consultation (each a list and a document page), Forms, Resources > Downloads.
  Not built: the Regulatory Instruments overview (`/regulatory-instruments`) and seven category pages.

## Slices (one branch and pull request each)

1. **The four documents into the CMS.** A data migration (as D-097 did for photos) uploads each PDF to object storage
   and creates its Documents entry, published, with the same title, reference, dates, description, status, tags and
   related documents. The full text goes into the rich-text field, word for word, with two blocks for what plain rich
   text cannot hold: a **table** block (the schedules' tables) and a **signatories** block. A test turns the CMS text
   back into plain words and compares it with today's text. The document pages read the CMS. The old PDF addresses
   (`/documents/...pdf`) redirect to the files, so links already shared keep working. `catalogue.ts` and `text-*.ts`
   are deleted; the PDFs move out of `public/` to the migration's own folder (a fresh database still needs them).
2. **Registration forms into the CMS.** The eleven Word files become Documents in the Forms category (form code as the
   reference, version 2026.1), the same way. The selection guide becomes a Pages entry (its table in the table block),
   so staff can change it; a test still compares it with `docs/source/registration-guide.md`. The Forms page and
   Resources > Downloads read the CMS; `/forms/registration/...docx` addresses redirect. `registration.ts` is deleted.
3. **Every category page, and the overview with filters.** One page design for all eleven categories at
   `/regulatory-instruments/<category>` (replacing the two hand-built ones), and one document page design at
   `/regulatory-instruments/<category>/<document>`. The overview at `/regulatory-instruments` lists every document with
   filters for **category, year and status**, and **newest or oldest first** (FR-DOC-04). Filters are a plain form
   (the choices are in the address, so a filtered list can be bookmarked or shared) and work without JavaScript. The
   Codes page groups documents by code family (FR-CODE-01). All Regulatory Instruments menu entries go live.
4. **Status and links between documents.** A superseded or revoked document stays public with a clear banner naming
   and linking the document that replaces it (FR-DOC-05); lists label each status. Related documents show on both
   documents. A consultation shows "Open for comments until …" or "Closed" from its closing date, and links the final
   document once adopted (FR-DRAFT-01). The sitemap lists documents from the CMS.

Each slice: Playwright tests at 360px and desktop with axe; a test that a draft document never appears in a list, a
filter result, its own address, Downloads or the sitemap (D-049); before and after screenshots; DECISIONS, RUNBOOK
(Section 11 items closed), STATUS.

## Choices made in this plan (say if you want any changed)
- **Energy Caps and Licences** get the same document list as the other categories in this step. Step 7 adds the
  tariff lookup to Energy Caps; Step 8 builds the licencee register (the utility bar's Licences).
- **Categories with no documents yet** (seven of the eleven today) show their page with "No documents have been
  published in this category yet" and links to the others, instead of "being prepared". See the question below.
- **Old addresses keep working.** Every document keeps its page address; file links redirect.
- **No new libraries.** The table and signatories blocks use Payload's own blocks, as the "key points" block does.
- **Not in this step:** searching inside documents and PDF text extraction (Step 10), tariff data (Step 7), the
  licencee register (Step 8), online consultation comments (a future enhancement, FR-DRAFT-02).

## Question for the owner
Empty categories: show the page with a "no documents yet" message (recommended: the menu is complete and staff can
fill a category from the admin panel without a developer), or keep "This section is being prepared" until a
category has its first document?
