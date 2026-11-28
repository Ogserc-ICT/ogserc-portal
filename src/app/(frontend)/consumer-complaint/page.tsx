import type { Metadata } from 'next'

import { ConsumerComplaintView } from '@/components/consumer/ConsumerComplaintView'
import { BEING_PREPARED_TITLE, BeingPreparedView } from '@/components/layout/BeingPreparedView'
import { CONSUMER_COMPLAINT_SLUG } from '@/lib/consumer/consumer-complaint'
import { findPage } from '@/lib/cms/content'

export async function generateMetadata(): Promise<Metadata> {
  const page = await findPage(CONSUMER_COMPLAINT_SLUG)
  if (!page) return { title: BEING_PREPARED_TITLE, robots: { index: false } }
  return { title: page.title, description: page.summary ?? undefined }
}

/**
 * FR-CON-01/02 Consumer Complaint landing page; its text is the Pages entry `consumer-complaint`
 * (D-101). Until that is published, the menu link here shows "This section is being prepared", so
 * publishing it in the admin panel is all it takes to go live.
 */
export default async function ConsumerComplaintPage() {
  const page = await findPage(CONSUMER_COMPLAINT_SLUG)
  return page ? <ConsumerComplaintView page={page} /> : <BeingPreparedView />
}
