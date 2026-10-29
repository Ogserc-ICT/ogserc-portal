import { Badge, documentStatusTone } from '@/components/ui/Badge'
import { DOCUMENT_STATUS_LABEL, type DocumentStatus } from '@/lib/documents/types'

/** Every document shows its status (CLAUDE.md conventions, FR-DOC-03). */
export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge tone={documentStatusTone[status]}>{DOCUMENT_STATUS_LABEL[status]}</Badge>
}
