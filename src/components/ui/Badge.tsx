import type { ReactNode } from 'react'

export type BadgeTone = 'green' | 'gold' | 'neutral' | 'danger'

const tones: Record<BadgeTone, string> = {
  green: 'border-green-300 bg-green-50 text-green-900',
  gold: 'border-gold-500 bg-gold-400 text-ink',
  neutral: 'border-line-strong bg-white text-ink',
  danger: 'border-danger bg-white text-danger',
}

export function Badge({ tone = 'green', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Document statuses (CLAUDE.md: documents always show status). Used from build step 6. */
export const documentStatusTone = {
  draft: 'neutral',
  published: 'green',
  superseded: 'gold',
  revoked: 'danger',
} as const satisfies Record<string, BadgeTone>
