# Image credits and permissions

Every image the site shows, where it came from, and the licence or permission to publish it. Anything marked **TO CONFIRM** must be answered by OGSERC before launch (docs/RUNBOOK.md launch checklist). Images are processed with `scripts/optimise-images.mjs`, which resizes them and strips all metadata (docs/DECISIONS.md D-034).

## Images in use

| Served file | Original file (as supplied) | What it shows | Source / author | Licence or permission | Changes made |
|---|---|---|---|---|---|
| `src/assets/hero/hero-1.jpg` | `electricity4.jpg` (5637×3758, 1.9 MB) | Line of transmission towers at sunrise, blue-to-orange sky. No people. | TO CONFIRM | TO CONFIRM | Resized to 2048px wide, metadata stripped, re-encoded |
| `src/assets/hero/hero-2.jpg` | `electricity3.jpg` (4608×3072, 2.0 MB) | Transmission towers against a teal-to-gold sky. No people. | TO CONFIRM | TO CONFIRM | Resized to 2048px wide, metadata stripped, re-encoded |
| `src/assets/hero/hero-3.jpg` | `electricity2.jpg` (5156×3437, 1.8 MB) | Transmission towers silhouetted against an orange sunset. No people. | TO CONFIRM | TO CONFIRM | Resized to 2048px wide, metadata stripped, re-encoded |
| `public/brand/ogun-state-crest.png` | `Ogun-State-Crest.png` (540×576) | Ogun State crest ("Ogun State, Nigeria") | TO CONFIRM (supplied by OGSERC) | TO CONFIRM: Ogun State Government permission | White margin trimmed, metadata stripped |
| `public/brand/ogserc-logo.png` | `ogserc-logo.png` (1920×1038) | OGSERC logo (wordmark) | Supplied by OGSERC; designer TO CONFIRM | TO CONFIRM: OGSERC owns the logo | None |
| `public/brand/ogserc-wordmark.png` | trimmed from `ogserc-logo.png` | OGSERC wordmark, used in the header | As above | As above | Transparent margin trimmed (D-029) |

The hero photographs are decorative (empty alt text); the slide headline carries the meaning.

## Supplied but not used

| Original file | What it shows | Why not used |
|---|---|---|
| `electricity1.jpg` (4000×3000, 1.9 MB) | Close-up of substation equipment, bright blue sky | Not chosen for the hero (step 2b). Removed from `public/`; still in git history (commit 5326dd3). |
| `Nigeria's logo.png` (135×128) | Coat of arms of the Federal Republic of Nigeria | Held back until OGSERC confirms permission to display it (step 2b). Removed from `public/`; still in git history (commit b1c7b78). |

## What OGSERC needs to tell us

1. **Each hero photograph** (`electricity2.jpg`, `electricity3.jpg`, `electricity4.jpg`): the website or photographer it came from, the licence (for example the Unsplash or Pexels licence, or a paid stock licence and its number), and whether a credit line is required. If they were taken for OGSERC, the photographer's name and confirmation that OGSERC owns the rights.
2. **Where the photographs were taken.** They do not appear to be in Ogun State. SRS 2.4 asks for power infrastructure imagery; please confirm stock imagery is acceptable or supply local photographs.
3. **Ogun State crest:** who supplied the file, and confirmation that OGSERC is permitted to display the State crest on its website (and any usage conditions, such as minimum size or clear space).
4. **OGSERC logo:** confirmation that OGSERC owns the logo, and the designer's name if a credit is wanted.
5. **Nigeria coat of arms** (only if it is to be shown): confirmation that OGSERC may display it. Use of national symbols is regulated.
6. **People:** none of the supplied images shows an identifiable person, so no model releases are needed for these. Future news and event photographs will need consent where people are identifiable.
