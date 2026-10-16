import { emptyTestMediaDir, testMediaDir } from '../support/test-media-dir'

/** Removes the run's test uploads, so nothing is left behind (playwright.db.config.ts). */
export default function globalTeardown(): void {
  emptyTestMediaDir(process.env.E2E_MEDIA_DIR ?? testMediaDir())
}
