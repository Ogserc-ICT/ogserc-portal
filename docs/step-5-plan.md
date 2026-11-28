# Step 5: static information pages

Approved by the owner on 2026-11-25, with these choices: the Consumer Complaint page shows "[Sample, OGSERC to supply]"
placeholders until OGSERC supplies or publishes its complaint procedure (the draft Customer Service Standards and
Protection Regulation, 2026 is marked "not for gazette publication", so the site does not quote it); the contact form
keeps opening the visitor's email program (D-059, D-085) until the owner decides how the site sends email; Careers stays
out (it is not in the six-item menu, D-075).

Requirements: SRS Section 4 (About OGSERC, Consumer Complaint, Contact), FR-CMS-01, FR-CON-01/02, FR-CNT-01/02,
FR-WEB-06 with D-074 (Privacy Policy and Terms of Service; cookies are a section of the Privacy Policy).

## Slices (one branch and pull request each)

1. **About OGSERC into the CMS** (`feat/step-5-about-cms`, D-098). An "About OGSERC" global with a tab per page and
   fields matching each layout: About Us (introduction, the "What we do" cards with icons), Our History (the story, key
   dates), Vision, Mission and Values (the PRIDE values), Structure (introduction, the organogram's description, the
   office beside the Chairman / CEO, the divisions and their units). A data migration puts today's text in word for word;
   `src/lib/about/content.ts` is deleted.
2. **Legal pages into the CMS.** The Privacy Policy and Terms of Service become Pages entries with a "last updated"
   field, filled word for word by a migration (D-100). (The Cookies section already has approved text, D-077.)
3. **Consumer Complaint landing page** at `/consumer-complaint` (FR-CON-01/02), information only (the complaint portal is
   Phase 2): rights and obligations, how to complain and how complaints escalate, what to include, service standards,
   billing, disconnection and reconnection, safety, FAQs on the topic, and contacts (the complaints email from the site
   settings). Every section is edited in the CMS. The menu entry goes live. Done as D-101: the text summarises
   OGSERC's draft Customer Service Standards and Protection Regulations, 2026, and stays unpublished until they are
   approved.

Each slice: Playwright tests at 360px and desktop with axe, a test that drafts never show (where the content has
drafts), before and after screenshots for review, and the docs (DECISIONS, RUNBOOK, STATUS).

Not in Step 5: sending the contact form by email (owner to decide), Careers.
