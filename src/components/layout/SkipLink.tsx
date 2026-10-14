/**
 * Shown on keyboard focus. `focus-visible` rather than `focus`: the floating "Back to top" button
 * moves focus here (D-043), and after a mouse click or tap the link should take focus quietly
 * instead of flashing up in the corner.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-lg bg-gold-400 px-4 py-3 font-semibold text-ink focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-50"
    >
      Skip to main content
    </a>
  )
}
