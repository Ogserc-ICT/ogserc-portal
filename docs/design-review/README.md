# Design review: build step 2 (updated in step 2b)

These screenshots are for OGSERC's review of the design system and homepage (SRS 2.5). No other pages are built until this design is approved. Every piece of text in square brackets, for example "[Sample tagline, OGSERC to supply]", is a placeholder for OGSERC to replace.

Regenerate them with the site running: `node scripts/design-review-screenshots.mjs`. They are taken with reduced motion, so they show the settled design: no splash, no slide changes, no fade-ins.

| File | What it shows |
|---|---|
| `home-360.png`, `home-768.png`, `home-1280.png` | Homepage on a phone, a tablet and a desktop (full page) |
| `hero-360.png`, `hero-768.png`, `hero-1280.png` | The hero carousel: first slide, controls (pause/play, previous, indicators, next) |
| `menu-open-360.png`, `menu-open-768.png` | The menu drawer on a phone and a tablet, with "Regulatory Instruments" expanded |
| `menu-open-1280.png` | Desktop menu with the "Regulatory Instruments" dropdown opened by hovering |
| `footer-360.png`, `footer-768.png`, `footer-1280.png` | The footer with its grid background pattern |
| `design-system-*.png` | Colours, type, buttons, badges, cards and form controls |
| `being-prepared-*.png` | The page that every not-yet-built menu link opens |
| `header-1024.png` | Header at 1024px, the narrowest width with the desktop menu |
| `header-1024-wide-fallback.png` | The same header when Public Sans has not loaded and the device's fallback font is wide (Linux, Android): long labels wrap onto two lines instead of overflowing |

## Please check (step 2b)

1. **Header.** The Ogun State crest now sits on the right. On phones the header shows only the OGSERC logo, the crest and a Menu button; the commission's name and the top links (Contact Us, Licences, FAQs, Search) appear from desktop width, and are inside the menu on phones.
2. **Menu drawer** (phones and tablets). Slides in from the left over a dimmed page. Do the sections and links read clearly?
3. **Desktop menu.** Dropdowns now open when you point at them, as well as on click or keyboard.
4. **Hero carousel.** Three photographs, each slide with a headline and one button. It changes slide every 7 seconds unless paused (and never moves on its own for visitors who have asked their device for reduced motion). Are the photographs and the green overlay right for OGSERC?
5. **Opening splash.** On a visitor's first page, the OGSERC logo shows for under a second while the page loads. Not shown in the screenshots; try it in a fresh browser window.
6. **Gentle motion.** Homepage sections fade in as you scroll, and cards lift slightly under the pointer.
7. **Footer.** A faint grid pattern with a few gold squares. Is it subtle enough?
8. **Text colour.** Body text now uses the olive-brown sampled from the full logo lockup (`#483A16`).

## Needed from OGSERC

- **Photograph sources and licences**, and permission for the crest: see `docs/ASSET-CREDITS.md` for the exact questions.
- **Headlines for hero slides 2 and 3**, and confirmation of the button wording ("How to make a complaint", "View energy caps", "Browse regulatory instruments").
- **Nigeria coat of arms:** confirm whether it should appear in the header and that OGSERC may display it (it is held back for now).
- **The tagline and introduction** for the hero.
- **Office address, phone number and email address**, and confirmation that a map should be shown.
- **Social media accounts** to link in the footer.
- **Vector (SVG) logo and crest**, if available, for the sharpest result on all screens.
