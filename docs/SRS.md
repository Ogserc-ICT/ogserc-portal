# OGSERC Integrated Regulatory, Consumer Services & Information Management Portal

## Software Requirements Specification (SRS)

| | |
|---|---|
| **Client** | Ogun State Electricity Regulatory Commission (OGSERC) |
| **Document status** | Draft v1.0, for review by OGSERC |
| **Benchmark** | Lagos State Electricity Regulatory Commission (LASERC), https://laserc.com.ng/ (structure and portal model only; branding and content are not copied) |
| **Build scope** | Phase 1 (see Section 3). Phases 2 and 3 are documented requirements for later builds. |

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for the OGSERC portal: a public website, a regulatory information centre, a content management system (CMS), and, in later phases, consumer services, complaint management, licensing, and payments.

### 1.2 Product vision
OGSERC's digital home should follow the proven structure of a state electricity regulator's site (LASERC): a clear seven-item main menu, a library of regulatory instruments, and a single login portal for licence applications, complaints, petitions, whistleblowing, and the user's profile. It should improve on the benchmark with stronger search, clearer pre-login information, and easier document discovery.

### 1.3 Scope
The portal shall allow OGSERC to:
- publish its mandate, leadership, regulations, codes, orders, tariffs, reports, and news;
- run a searchable register of licensed operators (licencees);
- let consumers lodge and track complaints (Phase 2);
- let applicants apply for licences and pay fees online (Phase 3);
- let authorised staff manage all content without developer help.

### 1.4 Definitions
| Term | Meaning |
|---|---|
| OGSERC | Ogun State Electricity Regulatory Commission |
| LASERC | Lagos State Electricity Regulatory Commission (benchmark) |
| Licencee | An operator holding an OGSERC licence (for example a distribution company or mini-grid operator) |
| CMS | Content management system used by OGSERC staff |
| Provider | An electricity provider/licencee serving consumers in Ogun State |
| SRS | Software Requirements Specification |

### 1.5 Guiding principle
LASERC's structure and functionality are used as the template. OGSERC's own logo, colours, state identity, wording, and content are used throughout; nothing is copied from the benchmark site. All regulations, licence categories, tariff data, complaint procedures, fees, forms, deadlines, and organisational information **must come from OGSERC** and be legally approved by it before publication. The developer does not invent regulatory content.

---

## 2. Overall description

### 2.1 Users
| User | Description |
|---|---|
| Public visitor | Anyone reading information or downloading documents |
| Consumer | Electricity customer who lodges and tracks complaints (Phase 2) |
| Licencee / provider | Operator who responds to complaints and manages its profile (Phase 3) |
| Applicant | Organisation applying for a licence (Phase 3) |
| OGSERC staff | Editors, officers, and reviewers using the CMS |
| Administrator | Manages users, roles, and system settings |

### 2.2 Constraints and assumptions
- The site must work well on low-bandwidth mobile connections, since most Nigerian users browse on phones.
- Official content (documents, fees, procedures) will be supplied by OGSERC. Delays in supply affect the launch date.
- Hosting, domain, database, and service accounts may be held under whichever accounts the developer and OGSERC choose; nothing in this specification requires them to be in OGSERC's name. Account details and recovery steps are recorded in the runbook.
- Personal data collected from consumers is subject to the Nigeria Data Protection Act (2023).

### 2.3 Proposed technology (for the build; open to review)
Next.js (TypeScript), Tailwind CSS, Payload CMS, PostgreSQL (managed), Vercel hosting, Paystack/Flutterwave/Remita for payments (Phase 3), Termii or similar for SMS (Phase 2+).

### 2.4 Brand identity

OGSERC's identity (supplied by OGSERC) is used throughout the site.

- **Logo:** "OGSERC" wordmark in green with the Ogun State map in the letter O and a gold lightning bolt in the E, shown with the full name "Ogun State Electricity Regulatory Commission". The Ogun State crest appears beside it in the header.
- **Colours:** greens (from a fresh mid-green to a deep forest green) as the primary colour, a gold/yellow (from the lightning bolt) as the accent, and the dark olive-brown of the commission's name text as the dark neutral, with white backgrounds. Values sampled from the supplied logo: mid green `#1D9D62`, deep green `#1D7248`, darkest green `#0D4126`, light green highlight `#A5D07D`, gold `#FED009`. The dark olive-brown neutral is to be sampled from the full logo lockup with the commission name. These are recorded once in the design system.
- **Imagery:** power transmission towers and electricity infrastructure for hero banners, with real photographs of OGSERC events for news.
- **Accessibility rule:** gold is used for buttons, highlights, and underlines, not for body text on white, because it fails contrast requirements. Text on gold uses the dark olive-brown or black.
- **Independence from the benchmark:** the layout follows LASERC's structure, but the look, colours, typography, and imagery are OGSERC's own.

### 2.5 Design process and approvals

- Reference screenshots of the benchmark site and the OGSERC logo are stored in `docs/reference/` and used for **layout and structure only**.
- The design system (colours, typography, spacing, buttons, cards, forms) and the **homepage** are built and approved by OGSERC before any other page is built.
- OGSERC shall approve in writing, before the build starts: this SRS (scope and phases), the sitemap (Section 4), and the brand (Section 2.4). Later changes to scope go through a short written change note.

---

## 3. Delivery phases

| Phase | Name | Modules |
|---|---|---|
| **1 (current build)** | Public site & information centre | Public Website, CMS, Regulations & Orders, Codes/Guidelines/Standards, Tariff information, Metering information, Licencee Register (read-only), Reports & Publications, News & Events, Site search, Contact |
| 2 | Consumer services | Authentication & User Management, Consumer Portal, Complaint Management, Notifications, Petitions (submission) |
| 3 | Transactions & oversight | Licensing (applications), Payments, Provider Portal, Hearings management, Analytics & Reporting |

Rule: work on a later phase does not begin until the earlier phase is deployed and accepted.

### 3.1 Module-to-phase map (18 modules)
| # | Module | Phase |
|---|---|---|
| 1 | Public Website | 1 |
| 2 | CMS | 1 |
| 3 | Authentication & User Management | 2 (staff login in Phase 1) |
| 4 | Consumer Portal | 2 |
| 5 | Complaint Management | 2 |
| 6 | Provider Portal | 3 |
| 7 | Licensing | 3 |
| 8 | Licencee Register | 1 (read-only), 3 (managed by providers) |
| 9 | Tariff Management | 1 |
| 10 | Metering Information | 1 |
| 11 | Regulations & Orders | 1 |
| 12 | Codes, Guidelines & Standards | 1 |
| 13 | Hearings & Petitions | 1 (information), 2 (petitions), 3 (full management) |
| 14 | Reports & Publications | 1 |
| 15 | News & Events | 1 |
| 16 | Payments | 3 |
| 17 | Notifications | 2 |
| 18 | Analytics & Reporting | 3 |
| 19 | Whistleblowing (confidential reports) | 3 |
| 20 | Tenders (published notices) | 1 |

---

## 4. Website structure (sitemap)

Modelled on the LASERC site. Utility bar (top right): **Contact Us | Licences | FAQs | Search**, beside the OGSERC and Ogun State identity marks.

Main menu (seven items):

1. **About OGSERC**: About Us, Our History, Our Mission, OGSERC's Structure (commissioners, management, departments, organogram)
2. **Regulatory Instruments**: Rules & Regulations, Energy Caps, Guidelines, Forms, Consultation, Licences, Orders & Directives, Codes, Manuals, Market Documents, Standards
3. **Mandate**: Licensing & Registration, Whistleblowing, Petitions, Hearings & Dispute Resolution
4. **Consumer Complaint**: landing page explaining the process, then the login/registration portal*
5. **Media Center**: News, Tenders, Events, Photos & Videos
6. **Resources**: downloads, reports and publications, statistics, tariff and metering information, consumer education, useful links
7. **User Profile**: login and registration; after login, the user's dashboard*

Footer: About Us, Regulatory Framework, Energy Caps, Licences & Permits, Consumer Complaints, News & Updates; contact details (address, email, phone); social links; Privacy Policy, Terms of Service, Sitemap.

\* Interactive services are delivered in Phase 2 or 3. In Phase 1 the pages explain the process and show the current channels (for example the consumer affairs email address).

### 4.1 Where earlier content now lives

| Content | Location |
|---|---|
| Tariff orders, approved rates, tariff lookup | Regulatory Instruments > Energy Caps and Orders & Directives |
| Metering regulations and standards | Regulatory Instruments > Codes, Manuals, Standards; plus Resources |
| Licencee register and licence verification | Licences (utility bar and Regulatory Instruments) |
| Reports, publications, statistics | Resources |
| Consumer rights, procedure, and education | Consumer Complaint landing page and Resources |
| Careers, offices, contact | About OGSERC (Careers), Contact Us (utility bar) |

### 4.2 Portal ("What requires login?")

One account gives access to all of: licence application, consumer complaints, petitions, whistleblowing, and the user's profile (view submissions and their status). The login page shall list these services beside the form, with the relevant enquiry email for each, so users know what to expect before registering.

---

## 5. LASERC to OGSERC feature-parity checklist

| LASERC feature | OGSERC equivalent | Phase |
|---|---|---|
| About LASERC (About Us, History, Mission, Structure) | About OGSERC | 1 |
| Regulatory Instruments (11 document categories) | Regulatory Instruments | 1 |
| Mandate: Licensing & Registration | Licensing & Registration (information) | 1 info, 3 online applications |
| Mandate: Petitions | Petitions | 1 info, 2 submission, 3 full management |
| Mandate: Hearings & Dispute Resolution | Hearings & Dispute Resolution | 1 info, 3 management |
| Mandate: Whistleblowing | Whistleblowing | 1 info, 3 secure reporting |
| Consumer Complaint (login and sign-up) | Consumer Complaint | 1 info, 2 portal |
| Media Center: News, Tenders, Events, Photos/Videos | Media Center | 1 |
| Resources | Resources | 1 |
| User Profile / portal | User Profile | 2 |
| Utility bar: Contact Us, Licences, FAQs, Search | Same | 1 |
| Home: hero banner (OGSERC: hero carousel), Latest Updates carousel | Homepage (Section 6.1) | 1 |
| Footer with quick links, contact, social links, policy pages | Same | 1 |

The developer shall complete a one-time audit of the live LASERC site against this table and record any features found that are not listed.

### 5.1 Improvements over the benchmark
- Pre-login explanation of each service before asking users to register.
- Search covering all content types (FR-SRCH), prominently placed.
- Document pages with status, related documents, and superseded versions (FR-DOC).
- Structured tariff and licence data with lookup and verification, not only PDF downloads.

---

## 6. Functional requirements: Phase 1

### 6.1 Public website (FR-WEB)
- **FR-WEB-01** The site shall provide the navigation and pages described in Section 4.
- **FR-WEB-02** The homepage shall contain, in order: header and main navigation; hero carousel (FR-WEB-08), with the tagline and introduction on the first slide and one primary action on each slide; quick services (Consumer Complaint, Licences, Regulatory Instruments, Energy Caps, FAQs); Latest Updates carousel of news cards; public notices; tenders; events; contact (office, phone, email, map); footer. On desktop the header shows the utility bar and the seven-item main menu from Section 4; on smaller screens both are in the menu drawer (FR-WEB-11).
- **FR-WEB-03** Every page shall have breadcrumbs, a consistent footer, and a link to search.
- **FR-WEB-04** Public notices shall be visible from the homepage and sortable by date.
- **FR-WEB-05** Pages shall be fully responsive, with mobile as the primary design target.
- **FR-WEB-06** The footer shall link to a Privacy Policy, Terms of Service, Cookie Notice, Accessibility Statement, and Sitemap. OGSERC (with its legal advisers) supplies the text; the site shall show a cookie notice if any non-essential cookies are used.
- **FR-WEB-07** Privacy-friendly site analytics (for example Plausible or Umami, no personal profiling) shall be active from launch to show which pages are used.
- **FR-WEB-08 Hero carousel.** The homepage hero shall be a carousel of slides built from photographs OGSERC has the right to publish (listed in `docs/ASSET-CREDITS.md`), each slide with a headline and one primary action. It shall have previous and next controls, slide indicators and a visible pause/play control; it shall not autoplay for users who prefer reduced motion, and shall stop rotating when keyboard focus enters it. Text over photographs shall meet WCAG AA contrast against the lightest possible pixel (using an overlay). Only the first photograph shall load with the page; the others load afterwards. Without JavaScript the first slide shall show in full.
- **FR-WEB-09 Splash screen.** A short logo splash may show once per browser session. It shall never block content, the pointer or search engines (the page content is in the HTML), shall end when the page has loaded and in any case within about 800ms, shall not show for reduced-motion users, when JavaScript is off, or when browser storage is unavailable, and shall not lower the mobile performance score.
- **FR-WEB-10 Motion.** Homepage sections may fade in subtly as they scroll into view, and cards and buttons may respond gently to hover, using CSS and a small IntersectionObserver (no animation library). All content shall be fully visible without JavaScript, motion shall cause no layout shift, and all motion shall respect `prefers-reduced-motion`.
- **FR-WEB-11 Mobile header and menu drawer.** Below the desktop breakpoint (1024px), the header shall show only the logo, the Ogun State crest and a menu button, without horizontal overflow at 320px. The menu button shall open a drawer from the left, over a dimmed backdrop, containing the main menu (with expandable sections) and the utility links. The drawer shall trap focus, close on Escape, on a backdrop click and with a close button, lock page scrolling while open, return focus to the menu button when closed, use correct dialog semantics, and work (without animation) in browsers that do not support its transition features. On desktop, menu dropdowns shall open on click, Enter and Space, and also on hover on devices that support hover, following WCAG 1.4.13.
- **FR-WEB-12 Footer pattern.** The footer may carry a subtle decorative background pattern (thin grid lines in brand-green tints with occasional gold accents), built in CSS with no images or JavaScript. It shall be hidden from assistive technology, shall never sit above footer text or links, shall cause no layout shift or horizontal overflow, and footer text shall keep WCAG AA contrast against the lightest part of the pattern.

### 6.2 Information centre: documents (FR-DOC)
- **FR-DOC-01** Staff shall be able to publish documents in these categories (matching Regulatory Instruments): rules & regulations, energy caps, guidelines, forms, consultation, licences, orders & directives, codes, manuals, market documents, standards.
- **FR-DOC-02** Each document shall store: title, category, reference number, publication date, effective date, description, file (PDF or other), related documents, status (draft, published, superseded, revoked), tags.
- **FR-DOC-03** Each document page shall show a download button, status, and related documents.
- **FR-DOC-04** Users shall be able to filter lists by category, year, and status, and sort by date.
- **FR-DOC-05** Superseded documents shall remain accessible and clearly labelled.

### 6.3 Draft regulations and consultations (FR-DRAFT)
- **FR-DRAFT-01** OGSERC shall be able to publish a draft regulation with: consultation notice, consultation deadline, public hearing information, and a link to the final regulation when adopted.
- **FR-DRAFT-02** In Phase 1, stakeholder comments are received by the email address or form given in the notice. Online comment submission is a future enhancement.

### 6.4 Codes, guidelines & standards (FR-CODE)
- **FR-CODE-01** A dedicated Codes page shall list categories supplied by OGSERC (for example Distribution Code, Metering Code, Safety Code, Customer Service Code, technical and commercial standards).
- **FR-CODE-02** Documents shall be added through the same document workflow as FR-DOC.

### 6.5 Licencee register (FR-LIC, read-only)
- **FR-LIC-01** The site shall provide a searchable, filterable table of licencees with columns: licencee, licence type, location, licence number, status.
- **FR-LIC-02** Each licencee shall have a profile page: company name, logo, licence number, licence type, address, contact information, service area, issue date, expiry date, status, regulatory documents, related orders.
- **FR-LIC-03** A licence verification page shall let a visitor enter a licence number and see its validity.
- **FR-LIC-04** Staff shall manage licencee records in the CMS.

### 6.6 Tariffs (FR-TAR)
- **FR-TAR-01** The tariff area shall include: current tariff, tariff history, tariff orders, tariff methodology, review process, customer categories, approved rates, effective dates, and downloadable documents.
- **FR-TAR-02** A tariff lookup shall let a user select provider, customer type, and date and see the applicable tariff.
- **FR-TAR-03** Tariff data shall be entered in the CMS as structured records (not only PDFs) so the lookup works.

### 6.7 Metering information (FR-MET)
- **FR-MET-01** A metering section shall hold: metering policy, regulations, standards, application and installation guidance, meter fault information, metering FAQs, and consumer education content.
- **FR-MET-02** Metering vendor information shall be listed where OGSERC provides it.

### 6.8 Consumer information (FR-CON)
- **FR-CON-01** The Consumer Complaint landing page and Resources shall present rights, obligations, the complaint procedure, education content, FAQs, service standards, billing, disconnection and reconnection, and safety information.
- **FR-CON-02** The complaint procedure shall reflect Ogun's actual escalation process as defined by OGSERC.

### 6.9 Reports and publications (FR-REP)
- **FR-REP-01** Staff shall publish annual, quarterly, regulatory performance, market, and consumer reports, plus research and statistics.
- **FR-REP-02** Each report shall have title, type, period, date, summary, file, and optional thumbnail.
- **FR-REP-03** A statistics area shall support published infographics and data tables supplied by OGSERC.

### 6.10 News, events & announcements (FR-NEWS)
- **FR-NEWS-01** News items shall include title, date, author, category, featured image, content, attachments, and related documents.
- **FR-NEWS-02** Events shall include name, date, venue, description, registration link (if any), and documents.
- **FR-NEWS-03** Announcements shall be categorised as public notice, regulatory notice, service announcement, or consultation notice.
- **FR-NEWS-04** Galleries shall support photos and embedded videos.

### 6.11 Site-wide search (FR-SRCH), mandatory
- **FR-SRCH-01** One search box shall search regulations, orders, codes, news, tariffs, licencees, reports, FAQs, publications, and public notices.
- **FR-SRCH-02** Results shall be grouped by content type and show a title, short excerpt, date, and link.
- **FR-SRCH-03** Search shall tolerate minor spelling mistakes and return results within 2 seconds under normal load.
- **FR-SRCH-04** The text inside uploaded PDF documents shall be extracted and searchable, with results showing the matching passage. PDFs that are scans without a text layer shall be flagged to staff so they can be replaced or OCR-processed. (OGSERC to confirm; if declined, search covers titles, summaries, and metadata only.)

### 6.12 Contact (FR-CNT)
- **FR-CNT-01** The site shall show office locations with map, departments, phone numbers, and email addresses.
- **FR-CNT-02** An enquiry form shall send the message to a configurable OGSERC inbox and show a confirmation. It shall include spam protection.

### 6.13 Licensing & Registration page (FR-LICP)
Modelled on LASERC's Licensing & Registration page.
- **FR-LICP-01** The page shall present a list of licence categories on the left and the selected category's details on the right. Initial categories: Generation, Transmission, Distribution, Trading, Supply. OGSERC shall confirm the final list (for example whether embedded generation or mini-grids are separate categories).
- **FR-LICP-02** Each category shall have: a description of the licence, a requirements checklist (for example application form, supporting documents, fees), a **View Application Form** button, and a **View Guidelines** button. In Phase 1 the form is a downloadable document; from Phase 3 it opens the online application.
- **FR-LICP-03** A "How to Apply" panel shall show three steps: select licence type, submit documents, receive approval (licence certificate).
- **FR-LICP-04** Categories, descriptions, requirements, forms, and guidelines shall be managed in the CMS so staff can update them without a developer.
- **FR-LICP-05** The page shall link to licence fees, the licencee register, and licence verification (FR-LIC).

---

## 7. CMS requirements (Phase 1)

- **FR-CMS-01** OGSERC staff shall manage all public content without developer involvement.
- **FR-CMS-02** CMS sections: Dashboard, Pages, News, Events, Announcements, Regulations, Orders, Codes, Guidelines, Standards, Tariffs, Licencees, Reports, Publications, FAQs, Consumer Information, Hearings, Media, Downloads, Users.
- **FR-CMS-03** Adding a document shall follow: *Resources → Add Document → title, category, description, reference number, date, file, thumbnail, tags → publish or unpublish.*
- **FR-CMS-04** Content shall have draft, scheduled, and published states, and an approval step where configured.
- **FR-CMS-05** The CMS shall keep a version history and an audit log (who changed what and when).
- **FR-CMS-06** The CMS shall enforce role-based access (Section 10).
- **FR-CMS-07** Every staff account shall use two-factor authentication.
- **FR-CMS-08** The project shall include a seed script that loads clearly marked placeholder content (for example "[Sample, OGSERC to supply]") for every content type so all pages can be reviewed before real content exists. Placeholder content shall be removed or replaced before launch.

---

## 8. Functional requirements: Phase 2 (planned)

### 8.1 Accounts and consumer portal
- Consumers register and log in with email or phone verification, with password reset.
- A consumer dashboard shows their complaints and petitions and their statuses.

### 8.2 Complaint management
Guided complaint flow:

1. Who is your electricity provider?
2. What is your complaint about?
3. Have you already complained to the provider?
4. Complaint details (meter/account number, contact details, description)
5. Supporting documents
6. Submit and receive an OGSERC reference number
7. Track status

Initial complaint categories (final list to be approved by OGSERC): billing, metering, service interruption, voltage, load shedding, customer band/service classification, disconnection, delay in reconnection, non-compliance, customer service, other.

Complaint statuses: Submitted → Acknowledged → With Provider → Escalated to OGSERC (if applicable) → Under Review → Resolved or Closed. Exact statuses and time limits to be confirmed by OGSERC.

### 8.3 Notifications
- Email (and SMS where approved) at submission, status changes, and requests for information.

### 8.4 Petitions
- Authorised submission with petitioner name, organisation, contact, subject, details, and supporting documents; a reference number is issued, and the petition can be tracked.

---

## 9. Functional requirements: Phase 3 (planned)

### 9.1 Licence application system
Applicant flow: create account → select licence → complete application → upload documents → pay fee → submit → track.

Application statuses: Draft → Submitted → Payment Confirmed → Under Review → Query Raised → Applicant Response → Technical Review → Management Review → Approved or Rejected → Licence Issued.

### 9.2 Payments
- Online payment of application and licence fees through an approved payment provider's hosted checkout.
- Payment confirmed through the provider's server-to-server notification, not just the browser redirect.
- Receipts issued; staff reconciliation report available.
- The site shall never store card details.

### 9.3 Provider portal
- Providers log in to respond to complaints, update their profile, and view their licence status and notices.

### 9.3a Whistleblowing
- Secure, confidential reporting from the portal, with an option to report without revealing identity if OGSERC's policy allows. Reports are visible only to designated officers, never to providers, and are encrypted at rest. A reference number lets the reporter follow up. OGSERC must approve the whistleblowing policy before this is built.

### 9.4 Hearings management
- Hearing schedules, notices, documents, and decisions managed in the CMS, linked to petitions and regulations.

### 9.5 Analytics and reporting
- Dashboards for staff on complaint volumes and categories by provider, resolution times, application throughput, and site usage.

---

## 10. User roles and permissions

| Role | Capabilities |
|---|---|
| Public visitor | Read public content, search, download |
| Consumer (Phase 2) | Manage own account, complaints, petitions |
| Provider user (Phase 3) | Respond to complaints assigned to their company; manage own profile |
| Applicant (Phase 3) | Manage own licence applications |
| Content editor | Create and edit content; cannot publish if approval is required |
| Content publisher | Approve and publish content |
| Complaints officer (Phase 2) | View and handle complaints |
| Licensing officer (Phase 3) | Review applications |
| Administrator | Manage users, roles, settings, and audit logs |

---

## 11. Data entities (overview)

Page, Document (with category), Draft Regulation, Licencee, Licence, Tariff (with provider, customer category, effective date), Report, News Item, Event, Announcement, FAQ, Hearing, Media Asset, User, Role, Audit Log. Phase 2 and 3 add: Complaint, Complaint Update, Petition, Application, Payment, Notification.

---

## 12. Non-functional requirements

- **Performance:** Pages load in under 3 seconds on a typical 4G mobile connection; images optimised and lazily loaded.
- **Accessibility:** Meets WCAG 2.1 AA (contrast, keyboard navigation, screen-reader labels, text resizing).
- **Compatibility:** Latest two versions of Chrome, Safari, Firefox, and Edge, and Android and iOS browsers.
- **Availability:** Target 99.5% monthly uptime; uptime monitoring with alerts.
- **Security:** see Section 12.1 (mandatory).
- **Privacy:** Collect only needed data; privacy notice and cookie notice; data retention policy agreed with OGSERC; compliance with the Nigeria Data Protection Act (2023).
- **Backups:** Automated daily database backups; restore tested before launch and periodically afterwards.
- **Maintainability:** Version control, staging environment, automated tests for critical flows, written README and runbook.
- **SEO:** Clean URLs, page titles and descriptions, sitemap.xml, and structured data for documents and news.
- **Languages:** English at launch; other languages (for example Yoruba) as a future option.

### 12.1 Security requirements

**Accounts and access**
- **NFR-SEC-01** Staff accounts require two-factor authentication, strong passwords (minimum length, breach-checked), account lockout after repeated failures, and session expiry.
- **NFR-SEC-02** Least privilege: each role sees and does only what it needs (Section 10); the public can read published content only. Access control is enforced on the server for every collection and endpoint, never only in the interface.
- **NFR-SEC-03** The admin area is rate limited, bot-protected, and can be restricted by IP or additional login protection if OGSERC prefers. Default or shared accounts are not allowed.
- **NFR-SEC-04** Staff accounts are removed promptly when people leave; an audit log records logins and content changes.

**Application protection**
- **NFR-SEC-05** HTTPS everywhere with HSTS; security headers (Content-Security-Policy, X-Content-Type-Options, frame protection, Referrer-Policy, Permissions-Policy); cookies set Secure, HttpOnly, and SameSite.
- **NFR-SEC-06** All input is validated on the server; database access uses the ORM or parameterised queries only (no string-built SQL); output is escaped to prevent cross-site scripting; state-changing requests are protected against cross-site request forgery.
- **NFR-SEC-07** Forms and login endpoints are rate limited and use bot protection (for example Cloudflare Turnstile).
- **NFR-SEC-08** File uploads are limited by type and size, checked by content (not only file extension), stored outside the application code, never executed, and scanned for malware where the host allows it.
- **NFR-SEC-09** Errors shown to users never reveal stack traces, file paths, or configuration.

**Secrets, code, and dependencies**
- **NFR-SEC-10** Secrets live only in environment variables or the host's secret store; never in the repository, prompts, screenshots, or chat. Secret scanning is provided by the host where available, otherwise by a free scanner running in CI, and a leaked key is rotated immediately.
- **NFR-SEC-11** Automated dependency updates and vulnerability scanning (Dependabot and `pnpm audit` in CI); critical vulnerabilities are patched promptly.
- **NFR-SEC-12** All code touching authentication, authorisation, file uploads, and payments is reviewed by a developer experienced in application security before Phase 2 and Phase 3 go live.
- **NFR-SEC-13** The database user used by the app has only the permissions it needs; the database is not open to the public internet except through the managed provider's secured connection.

**Infrastructure and operations**
- **NFR-SEC-14** The domain has registrar lock enabled; the registrar and hosting accounts use two-factor authentication; DNSSEC is enabled where supported. A CDN/WAF layer (for example Cloudflare) provides DDoS and bot protection.
- **NFR-SEC-15** Email from the domain uses SPF, DKIM, and DMARC, so messages are authentic and the domain cannot easily be spoofed.
- **NFR-SEC-16** Backups cover the database and uploaded files, are encrypted, and are restore-tested. Monitoring alerts on downtime, error spikes, and suspicious login activity.
- **NFR-SEC-17** A short incident response plan names who is told, who can take the site offline, how credentials are rotated, and how affected people are notified. A `security.txt` page tells researchers how to report a vulnerability.
- **NFR-SEC-18** An independent security test (penetration test or structured security review) is completed before Phase 2 (accounts and personal data) and again before Phase 3 (payments).

**Personal data (Phases 2 and 3)**
- **NFR-SEC-19** Personal data is collected only where needed, encrypted in transit and at rest, access-logged, and kept under a retention policy approved by OGSERC. Compliance with the Nigeria Data Protection Act (2023) is confirmed with OGSERC's legal advisers, including rules on hosting data outside Nigeria.
- **NFR-SEC-20** Logs and error reports never contain passwords, tokens, payment data, or complaint/whistleblowing content.
- **NFR-SEC-21** Payments use the provider's hosted checkout. Payment notifications are accepted only after verifying the provider's signature, are processed once only (idempotent), and amounts are checked server-side. Card details never touch the application.
- **NFR-SEC-22** Whistleblowing reports have stricter controls: restricted to designated officers, extra audit logging, no identity capture if anonymous reporting is allowed, and never visible to licencees or other staff.

### 12.2 Operations and delivery quality

- **NFR-OPS-01** The source code is held in a private repository, which may live under the developer's own GitHub account. Changes are merged through pull requests. The main branch is protected where the hosting plan supports it, otherwise by a documented rule, a local pre-push hook, and CI checks that must be green before merging.
- **NFR-OPS-02** Automated checks run on every pull request and on every push to main: lint, type check, end-to-end tests (Playwright), and an automated accessibility check (axe). A failing check blocks merging where the hosting plan enforces it; otherwise merging only after every check is green is a documented rule.
- **NFR-OPS-03** A staging site mirrors production; every change is tested there first.
- **NFR-OPS-04** A `docs/DECISIONS.md` records major technical choices and the reasons for them.
- **NFR-OPS-05** Local development uses a hosted development database (for example a free Neon development branch) so a modest computer is not slowed down; Docker is used for the production build and portability check.

---

## 13. External integrations

| Integration | Purpose | Phase |
|---|---|---|
| Email service | Enquiries and notifications | 1 |
| Maps | Office location | 1 |
| SMS provider | Complaint alerts | 2 |
| Payment provider | Fees (to be confirmed with OGSERC) | 3 |
| Error monitoring and uptime monitoring | Operations | 1 |

### 13.1 Hosting and running costs

The software used to build the portal is free and open-source (Next.js, Tailwind CSS, Payload CMS). The ongoing costs are for hosting and services, which OGSERC must budget for. Prices below are indicative and must be confirmed against each provider's pricing page before commitment.

| Item | Indicative cost | Notes |
|---|---|---|
| Web hosting (Vercel) | Free "Hobby" plan is for personal, non-commercial use only. A commission site requires the Pro plan, about USD 20 per month per developer seat | Includes a usage credit; usage above allowances is billed |
| Database (managed PostgreSQL, e.g. Neon or Supabase) | Free tiers exist; a small paid plan is recommended for production | Needed for reliable automated backups |
| Domain name | Yearly registration fee | Official government domain to be confirmed with OGSERC |
| Email (enquiries, notifications) | Free or low monthly cost | Phase 1 enquiry form only |
| Error and uptime monitoring | Free tiers are usually sufficient at launch | |
| SMS provider | Per-message charges | Phase 2 onward |
| Payment provider | Percentage fee per transaction, no fixed monthly cost | Phase 3 only; provider to be agreed with OGSERC |

**Estimated Phase 1 running cost:** roughly USD 20 to 40 per month in total, excluding the domain.

**Requirements**
- **NFR-HOST-01** Hosting, database, domain, and service accounts may be registered under any account chosen by the developer and OGSERC. Where practical, more than one trusted person should be able to administer each account, and how to access and move them is documented in the runbook.
- **NFR-HOST-02** OGSERC shall approve a monthly hosting budget before launch.
- **NFR-HOST-03** Hosting spend limits and alerts shall be enabled so usage cannot create unexpected bills.
- **NFR-HOST-04** If OGSERC or the State Government requires locally hosted infrastructure, the deployment approach shall be reviewed before the build proceeds.

---

## 14. Acceptance criteria

**Phase 1 is accepted when:**
1. All pages in Section 4 marked Phase 1 exist and are populated with OGSERC-approved content.
2. Staff can add, edit, publish, and unpublish each content type without developer help.
3. Site-wide search returns relevant results across all content types.
4. The licencee register and tariff lookup work on real OGSERC data.
5. The site passes mobile, accessibility, and performance checks in Section 12.
6. A backup has been restored successfully on a test environment.
7. Hosting, domain, and database accounts are set up, and their access and recovery steps are recorded in the runbook.
8. README and runbook are delivered.
9. Staff two-factor authentication is enforced, and the Section 12.1 security checklist is passed and recorded.
10. Automated checks (lint, type check, Playwright, accessibility) pass in the repository.
11. All placeholder content is replaced with OGSERC-approved content.
12. Legal pages (Privacy Policy, Terms, Cookie Notice, Accessibility Statement) are published.
13. Domain email is configured with SPF, DKIM, and DMARC, and the contact form delivers to the OGSERC inbox.
14. OGSERC has approved the design system and homepage (Section 2.5) and signed off the final site.

Phases 2 and 3 will have acceptance criteria written before they begin.

---

## 15. Open items for OGSERC to supply or decide

1. Official logo, brand colours, and approved "About" text (mandate, vision, mission, values, history).
2. Names, photos, and biographies of commissioners and management.
3. Regulations, orders, codes, guidelines, standards, and reports to publish at launch.
4. Final licence categories (initial list: Generation, Transmission, Distribution, Trading, Supply), requirements per category, application forms and guidelines, the current licencee list, and fee schedules.
5. Current approved tariffs and customer categories.
6. Complaint escalation procedure, categories, and response timelines.
7. Contact details and office locations.
8. Approval workflow: who may publish what.
9. Domain name and which accounts will host the site.
10. Preferred payment platform for Phase 3.
11. Data retention and privacy policy approval.
12. Who maintains the site after launch.
13. Approved monthly hosting budget (Section 13.1) and any government hosting requirements.
14. Vector (SVG) versions of the OGSERC logo and the Ogun State crest (a transparent PNG of the logo and a 540×576 PNG of the crest have been supplied), and OGSERC's confirmation of the brand colour values in Section 2.4, including the ink colour `#483A16` sampled from the full logo lockup (the design must not copy the benchmark's look).
15. Whistleblowing policy: anonymity rules, who receives reports, and how they are handled.
16. Rules for publishing tenders (what is published, retention, who approves).
17. Text for the Privacy Policy, Terms of Service, Cookie Notice, and Accessibility Statement, supplied by OGSERC's legal advisers.
18. Legal advice on hosting personal data outside Nigeria, before Phase 2.
19. Written approval of the SRS, sitemap, and brand (Section 2.5).
20. Whether PDF contents should be searchable (FR-SRCH-04) and whether scanned PDFs should be OCR-processed.
21. Who holds the roles of security contact and incident decision-maker (NFR-SEC-17).
22. The source, licence and permission for every image on the site (hero photographs, Ogun State crest, logo), as listed in `docs/ASSET-CREDITS.md`; permission to show the Nigeria coat of arms if it is wanted; and the headline and action wording for each hero slide.

---

## 16. Out of scope for Phase 1

User accounts for the public, complaint submission, licence applications, payments, the provider portal, online petition submission, online consultation comments, and analytics dashboards.
