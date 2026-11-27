import type { Metadata } from 'next'

import { BEING_PREPARED_TITLE, BeingPreparedView } from '@/components/layout/BeingPreparedView'

export const metadata: Metadata = {
  title: BEING_PREPARED_TITLE,
  robots: { index: false },
}

// Shared destination for every menu link whose page is not built yet (D-027).
export default function BeingPreparedPage() {
  return <BeingPreparedView />
}
