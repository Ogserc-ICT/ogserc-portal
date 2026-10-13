# Design review: build step 2

These screenshots are for OGSERC's review of the design system and homepage (SRS 2.5). No other pages are built until this design is approved. Every piece of text in square brackets, for example "[Sample tagline, OGSERC to supply]", is a placeholder for OGSERC to replace.

Regenerate them with the site running: `node scripts/design-review-screenshots.mjs`.

| File | What it shows |
|---|---|
| `home-360.png`, `home-768.png`, `home-1280.png` | Homepage on a phone, a tablet and a desktop (full page) |
| `menu-open-360.png`, `menu-open-768.png` | Mobile menu open, with "Regulatory Instruments" expanded |
| `menu-open-1280.png` | Desktop menu with the "Regulatory Instruments" dropdown open |
| `design-system-*.png` | Colours, type, buttons, badges, cards and form controls |
| `being-prepared-*.png` | The page that every not-yet-built menu link opens |
| `header-1024.png` | Header at 1024px, the narrowest width with the desktop menu |
| `header-1024-wide-fallback.png` | The same header when Public Sans has not loaded and the device's fallback font is wide (Linux, Android): long labels wrap onto two lines instead of overflowing |

## Please check

1. **Colours and overall look.** Do the greens and gold feel right for OGSERC? Is it clear, credible and government-grade?
2. **Header.** The OGSERC logo with the commission's name, the utility bar (Contact Us, Licences, FAQs, Search) and the seven-item menu from SRS Section 4. Are the menu labels and the dropdown items correct?
3. **Homepage order** (FR-WEB-02): hero, quick services, latest updates, public notices, tenders, events, contact, footer.
4. **Hero.** Please supply the tagline and short introduction, and confirm the button wording ("How to make a complaint").
5. **Typeface.** Public Sans. Is it easy to read on a phone?
6. **Footer.** Quick links, contact details, social media, and the legal links (Privacy, Terms, Cookies, Accessibility, Sitemap).

## Needed from OGSERC

- **The full logo lockup** (logo with the commission's name), so the dark olive-brown text colour can be sampled from it. A temporary colour is used for now.
- **The Ogun State crest** (high-resolution, ideally SVG or transparent PNG), for the dashed "Crest" box in the header.
- **A hero photograph** of electricity infrastructure in Ogun State, or approval of the green background as final.
- **The tagline and introduction** for the hero.
- **Office address, phone number and email address**, and confirmation that a map should be shown.
- **Social media accounts** to link in the footer.
