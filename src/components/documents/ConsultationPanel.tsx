import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import type { Consultation } from '@/lib/documents/types'
import { formatDate } from '@/lib/format-date'

/**
 * How to comment on a document published for consultation (FR-DRAFT-01, FR-DRAFT-02). Comments go
 * by email or by hand; online submission is a later phase.
 */
export function ConsultationPanel({ consultation }: { consultation: Consultation }) {
  const { closingDate, hearing, email, address, subjectLine } = consultation
  return (
    <Panel id="have-your-say" title="Have your say">
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-ink-muted">Comments due by</dt>
          <dd className="font-semibold">
            <time dateTime={closingDate}>{formatDate(closingDate)}</time>
          </dd>
        </div>
        {hearing ? (
          <div>
            <dt className="text-ink-muted">Stakeholder hearing</dt>
            <dd className="font-semibold">
              <time dateTime={hearing.date}>{formatDate(hearing.date)}</time>, {hearing.place}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-ink-muted">Send written comments to</dt>
          <dd>
            <a
              href={`mailto:${email}${subjectLine ? `?subject=${encodeURIComponent(subjectLine)}` : ''}`}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-green-700 underline underline-offset-4"
            >
              <Icon name="mail" className="size-4" />
              {email}
            </a>
            <p className="text-ink-muted">or by hand to {address}.</p>
          </dd>
        </div>
        {subjectLine ? (
          <div>
            <dt className="text-ink-muted">Subject line</dt>
            <dd className="font-semibold break-words">{subjectLine}</dd>
          </div>
        ) : null}
      </dl>
    </Panel>
  )
}
