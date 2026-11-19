import { documentHref, documentsInCategory, fileSummary } from '@/lib/documents/catalogue'
import type { DocumentStatus } from '@/lib/documents/types'
import {
  FORM_VERSION,
  type RegistrationForm,
  downloadLabel,
  formAnchor,
  formFileSize,
  formHref,
  registrationForms,
} from '@/lib/forms/registration'
import { instrumentCategories, routes } from '@/lib/navigation'

/**
 * Resources > Downloads (D-067): every file the site offers, gathered from where each file is
 * published, so a new document shows up here without a separate entry. Groups follow the
 * Regulatory Instruments menu; empty groups are left out.
 */

export type DownloadItem = {
  id: string
  title: string
  /** Reference or form code, e.g. "OGSERC/ORD/2026/001" or "REG-01C". */
  reference: string
  /** "PDF, 2.5 MB, 20 pages" or "Word, 406 KB". */
  fileSummary: string
  href: string
  downloadName: string
  /** The download link's accessible name, unique on the page. */
  downloadLabel: string
  /** The item's own page, where it has one. */
  pageHref: string
  date?: string
  status?: DocumentStatus
  version?: string
}

export type DownloadGroup = { id: string; label: string; items: DownloadItem[] }

const formItem = (form: RegistrationForm): DownloadItem => ({
  id: form.code,
  title: form.title,
  reference: form.code,
  fileSummary: `Word, ${formFileSize(form)}`,
  href: formHref(form),
  downloadName: form.fileName,
  downloadLabel: downloadLabel(form),
  pageHref: `${routes.forms.path}#${formAnchor(form)}`,
  version: FORM_VERSION,
})

const itemsIn = (categoryPath: string): DownloadItem[] =>
  categoryPath === routes.forms.path
    ? registrationForms.map(formItem)
    : documentsInCategory(categoryPath).map((doc) => ({
        id: doc.slug,
        title: doc.title,
        reference: doc.reference,
        fileSummary: fileSummary(doc),
        href: doc.file.href,
        downloadName: doc.file.downloadName,
        downloadLabel: `Download ${doc.reference}, ${fileSummary(doc)}`,
        pageHref: documentHref(doc),
        date: doc.publicationDate,
        status: doc.status,
      }))

export const downloadGroups = (): DownloadGroup[] =>
  instrumentCategories()
    .map((category) => ({
      id: category.path.split('/').pop() ?? category.path,
      label: category.label,
      items: itemsIn(category.path),
    }))
    .filter((group) => group.items.length > 0)
