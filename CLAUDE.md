# OGSERC Portal

Website and regulatory information portal for the Ogun State Electricity Regulatory Commission (OGSERC). The full requirements are in `docs/SRS.md`. Read the relevant SRS section before building any feature, and refer to requirements by ID (for example FR-DOC-02).

## Current scope: PHASE 1 ONLY

Build only what the SRS marks as Phase 1: public website, CMS, documents (regulations, orders, codes, guidelines, standards), tariffs, metering info, read-only licencee register, reports, news and events, site-wide search, contact.

Do NOT build, scaffold, or add placeholder code for Phase 2 or 3 features (public user accounts, complaint submission, licence applications, payments, provider portal, petitions, whistleblowing, analytics). Pages for those features show information only. If a request seems to need them, stop and ask.

## Reference and design process

- Reference screenshots live in `docs/reference/` (benchmark site structure and the OGSERC logo). Use them for layout and structure only; never copy the benchmark's branding, images, text, or code.
- Build the design system (Tailwind theme, buttons, cards, forms, navigation) and the homepage first, and stop for OGSERC's review before building other pages.
- Use the seed script (`pnpm seed`) to load clearly marked placeholder content for every content type so pages can be reviewed. Placeholder text must read like "[Sample, OGSERC to supply]". Never invent real regulatory content.

## Stack

- Next.js (App Router) with TypeScript, strict mode
- Tailwind CSS
- Payload CMS (runs inside the Next.js app) for content and the admin panel
- PostgreSQL (managed, e.g. Neon or Supabase) via Payload's Postgres adapter
- Playwright for end-to-end tests
- Hosting: Vercel

Local development uses a hosted development database (for example a Neon dev branch), not a local Postgres, to keep the developer's machine fast. Docker is for the production build and portability checks.

Do not add new libraries without explaining why and getting approval. Prefer what Next.js, Payload, and Tailwind already provide.

## Commands

- `pnpm dev`: start the dev server
- `pnpm build`: production build
- `pnpm start`: run the production build
- `pnpm lint`: lint
- `pnpm typecheck`: TypeScript check (generates Next.js route types first)
- `pnpm test:e2e`: Playwright tests with axe accessibility checks (mobile 360px and desktop)
- `pnpm migrate:create <name>`: create a migration after changing collections (schema push is off; see docs/DECISIONS.md D-008)
- `pnpm migrate` / `pnpm migrate:status`: apply / list migrations
- `pnpm generate:types` and `pnpm generate:importmap`: regenerate Payload types and admin import map after collection changes
- `pnpm audit --audit-level high`: dependency audit as run in CI

Before saying a task is done, run lint, typecheck, and the relevant tests, and fix failures.

## Project structure

- `src/app/(frontend)/`: public pages
- `src/app/(payload)/`: Payload admin routes
- `src/collections/`: Payload collections (Documents, News, Events, Tenders, Tariffs, Licencees, Reports, FAQs, Pages, Media, Users)
- `src/components/`: shared UI components
- `src/lib/`: utilities
- `tests/`: Playwright tests
- `docs/`: SRS and project documentation

## Conventions

- Content is edited in the CMS, never hard-coded. Staff must be able to change any page text, document, tariff, or licencee without a developer.
- Follow the sitemap and navigation in SRS Section 4 exactly (seven-item main menu plus utility bar, modelled on LASERC's structure). Use OGSERC's own branding and wording; never copy the benchmark site's logo, images, text, or code. Keep URLs clean and lowercase (for example `/regulatory-instruments/rules-and-regulations`).
- Mobile-first. Test layouts at 360px wide first. Keep pages light for low-bandwidth connections: optimised images, lazy loading, minimal client-side JavaScript.
- Accessibility: WCAG 2.1 AA. Semantic HTML, visible focus states, sufficient contrast, alt text, keyboard navigation.
- Brand: OGSERC's identity is green (fresh mid-green to deep forest green) with a gold/yellow accent and a dark olive-brown neutral, per the logo (Ogun State map in the O, gold lightning bolt in the E, Ogun State crest beside it). Palette sampled from the logo (`public/brand/ogserc-logo.png`, transparent): mid green `#1D9D62`, deep green `#1D7248`, darkest green `#0D4126`, light green `#A5D07D`, gold `#FED009`; sample the dark olive-brown neutral from the full lockup. Define these once as Tailwind theme colors and never hard-code hex values elsewhere. Use gold for buttons and accents, never for body text on white (contrast); use the dark neutral on gold.
- Design: clear, credible, government-grade. One consistent design system (colors, type scale, spacing, components) defined in Tailwind config and reused everywhere. Navigation and search must be easier to use than the benchmark site.
- Documents always show status (draft, published, superseded, revoked), and superseded documents remain accessible.
- Use server components by default; use client components only when interactivity needs them.
- Write small, focused functions. Add comments only where intent is not obvious.
- Before writing Next.js code, consult the version-matched docs in node_modules/next/dist/docs/ (see AGENTS.md). If AGENTS.md ever conflicts with this file or docs/SRS.md, CLAUDE.md and the SRS take precedence.

## Motion and interactivity

Rules for anything that moves or responds to the pointer (SRS FR-WEB-08 to FR-WEB-13; docs/DECISIONS.md D-035 to D-040, D-043).

- Hover is never the only way to do anything. Menus that open on hover also open on click, Enter and Space, close on Escape and after a short delay once the pointer leaves, and follow WCAG 1.4.13 (dismissible, hoverable, persistent). Use hover only where `(hover: hover)` matches; touch devices tap.
- Dialogs and drawers trap focus, close on Escape, on a backdrop click and with a close button, lock page scrolling while open, return focus to the control that opened them, and use correct ARIA. Animation is progressive: without `@starting-style` or `allow-discrete` they must still open and close, just instantly.
- The hero carousel has one control: a small pause/play button in a corner (WCAG 2.2.2), with a name that switches between "Pause slideshow" and "Play slideshow", a visible focus outline and a 44×44px target. No arrows or dots (owner's choice, D-042). The interval is the single constant `HERO_INTERVAL_MS` (5000) in `HeroCarousel.tsx`. It never autoplays for `prefers-reduced-motion`, pauses while hovered, stops when keyboard focus enters until Play is pressed, keeps `aria-live` "off" while playing and "polite" when paused, keeps hidden slides inert, and keeps text over images at AA contrast (use an overlay, checked against a pure-white pixel). Only the first image loads eagerly; the others load after the page.
- The splash shows at most once per session, never blocks content, the pointer or search engines, ends on page load with a CSS hard cap of about 800ms, and is skipped for reduced-motion users, without JavaScript, and when storage is unavailable (wrap every storage call in try/catch).
- Back to top (D-043): the footer's `#top` link works without JavaScript. The floating button (`BackToTop.tsx`) shows after one screen of scrolling, using an IntersectionObserver and no scroll listener. It hides whenever the footer is in view, so it never covers footer content, and hides while the drawer is open and when printing. It scrolls smoothly, or instantly for reduced motion, then focuses the skip link. Keep it a 44×44px target with the pause button's gold-ring-and-halo focus style.
- Motion uses CSS and, at most, a small IntersectionObserver. No animation library. Content is fully visible without JavaScript, motion causes no layout shift (opacity and transform only), and everything respects `prefers-reduced-motion`.
- Decorative backgrounds (such as the footer pattern) are pure CSS or tiny inline SVG, `aria-hidden`, never above text or links, cause no overflow, and keep text at AA contrast against their lightest part.
- Keep client JavaScript small: measure the homepage's JavaScript and mobile performance before and after any interactive change (D-041). Put CSS for page-level components in `globals.css`, not a component stylesheet, because a page-level CSS import becomes a separate render-blocking file.

## Security and data rules

- Never commit secrets. Use environment variables; keep `.env.example` current with placeholder values only.
- Validate all form input on the server. Add spam protection and rate limiting to the contact form.
- Restrict file uploads by type and size.
- Enforce role-based access in Payload (access control on every collection). The public must only ever read published content.
- Staff accounts require two-factor authentication. Admin routes are rate limited. No default or shared accounts.
- Set security headers (CSP, HSTS, X-Content-Type-Options, frame protection, Referrer-Policy, Permissions-Policy) and secure cookie flags (Secure, HttpOnly, SameSite).
- Use the ORM or parameterised queries only; never build SQL from strings. Escape output and avoid `dangerouslySetInnerHTML` unless the content is sanitised.
- Check file uploads by content type and size, store them outside the app code, and never execute them.
- Never log passwords, tokens, payment data, or complaint/whistleblowing content. Never show stack traces to users.
- Never ask for, print, or paste real secrets in chat or code. If a secret appears anywhere, say so and tell the user to rotate it.
- Enforce authorisation on the server for every collection and endpoint, not only in the UI.
- Payments (Phase 3): hosted checkout only, verify the provider's webhook signature, process each notification once, check amounts on the server, never touch card details.
- Before each commit that touches auth, uploads, forms, or access control, run through this checklist and state the result: input validated? access control enforced? secrets absent? errors safe? new dependency justified?
- Never invent regulatory content, fees, tariffs, licence data, or legal text. Use clearly marked placeholder content (for example "[OGSERC to supply]") until real content exists.

## Portability (no vendor lock-in)

The site must be movable to any host that runs Node.js or Docker (a VPS, Railway, Render, Fly.io, and similar), not only Vercel.

- Do not use Vercel-specific services or APIs (Vercel Blob, KV, Edge Config, Vercel Analytics, `@vercel/*` packages). If one seems necessary, stop and ask.
- Store uploaded files (documents, images) in S3-compatible object storage through Payload's storage adapter, configured with environment variables, so the provider can be swapped.
- Use plain PostgreSQL only. No vendor-specific database features, extensions, or client libraries beyond what Payload's Postgres adapter needs. Keep schema changes in migration files committed to the repo.
- Keep a working `Dockerfile` (and `docker-compose.yml` for local development with Postgres) in the repo, and make sure the app builds and runs from it.
- All configuration comes from environment variables. Document every variable in `.env.example`.
- Do not hard-code domain names or hosting URLs. Read the site URL from an environment variable.
- Keep `docs/RUNBOOK.md` current with deploy steps and the migration procedure: deploy code, set environment variables, restore the database dump, copy storage files, update DNS.

## Workflow

1. For each task, read the matching SRS section, then propose a short plan and wait for approval before large changes.
2. Work in small slices (for example: project setup, then Documents collection, then documents listing page, then search). One slice per session where possible.
3. Commit after each working slice with a clear message. Never mix unrelated changes in one commit.
4. Add or update a Playwright test for each user-facing flow you build.
5. Update `README.md` and `docs/RUNBOOK.md` when setup, deployment, or operations change.
6. If a requirement is ambiguous or conflicts with the SRS, ask instead of guessing.
7. Work on a branch and open a pull request for each slice; do not commit directly to `main`. Every CI check (lint, typecheck, dependency audit, build, Playwright with axe accessibility, secret scan, Docker build) must be green before merging. GitHub does not enforce this on the current plan, so it is a rule to follow, not a setting (see docs/RUNBOOK.md Section 2).
8. Record important technical choices and the reasons in `docs/DECISIONS.md`.
9. Include privacy-friendly analytics, a legal-pages footer (Privacy, Terms, Cookies, Accessibility, Sitemap), and PDF text extraction for search, as specified in the SRS.

## Build order (Phase 1)

1. Scaffold the project, repository settings, CI checks, `.env.example`, Dockerfile, and `docs/DECISIONS.md`
2. Design system and layout shell (header with utility bar and seven-item menu, footer) using the brand palette; build the homepage and **stop for OGSERC review**
3. Users, roles, two-factor authentication, and access control in Payload
4. Collections: Documents (with categories), News, Events, Announcements, Tenders, Reports, FAQs, Pages, Media; plus the seed script with placeholder content
5. Static information pages (About, Consumer Complaint landing, Contact, legal pages)
6. Regulatory Instruments: document listings, filters, detail pages, status handling
7. Tariffs (Energy Caps) collection and lookup
8. Licences: licencee register, profile pages, verification; Licensing & Registration page (categories, requirements, forms, how to apply)
9. Media Center and Resources: news, tenders, events, galleries, reports, publications
10. Site-wide search including PDF text
11. SEO (sitemap, metadata), analytics, performance and accessibility pass; fix the font fallback: next/font's Public Sans fallback is `local(Arial)`, which Linux and Android lack, so text renders in a much wider system font while Public Sans loads (see docs/DECISIONS.md D-032)
12. Playwright tests for critical flows, security checklist review, set up a strict Content Security Policy (see docs/DECISIONS.md D-011; hash or externalise the inline splash script, D-038), README, RUNBOOK
13. Staging deploy and launch checklist (backup restore test, monitoring, spend limits, email SPF/DKIM/DMARC, placeholder content removed)
