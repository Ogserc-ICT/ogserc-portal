/**
 * PLACEHOLDER slot for the Ogun State crest (SRS 2.4), which OGSERC has not supplied yet.
 * Replace with the crest image (with alt text "Ogun State Government crest") when it arrives.
 */
export function CrestPlaceholder() {
  return (
    <div
      role="img"
      aria-label="Placeholder for the Ogun State crest, OGSERC to supply"
      className="flex h-12 w-11 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-line-strong text-center text-[10px] leading-tight font-semibold text-ink-muted sm:h-16 sm:w-14 sm:text-xs"
    >
      <span aria-hidden="true">Crest</span>
    </div>
  )
}
