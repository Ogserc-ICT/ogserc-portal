import { emptyTestMediaDir, testMediaDir } from '../support/test-media-dir'
import { clearRunCache } from './support/run-cache'

/** Removes the run's test uploads and cached results, so nothing is left behind (playwright.db.config.ts). */
export default async function globalTeardown(): Promise<void> {
  emptyTestMediaDir(process.env.E2E_MEDIA_DIR ?? testMediaDir())
  await clearRunCache(['drafts'])
}
