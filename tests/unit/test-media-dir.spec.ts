import path from 'node:path'

import { expect, test } from '@playwright/test'

import { testMediaDir, testMediaDirProblem } from '../support/test-media-dir'

// The test uploads folder is emptied before and after each database-backed run, so only a
// throwaway "e2e" folder inside the OS temp folder may ever be used.
const TMP = path.resolve('/tmp-test')
const MEDIA = path.resolve('/project/media')
const problem = (dir: string) => testMediaDirProblem(dir, TMP, MEDIA)

test('the default test uploads folder is safe to empty', () => {
  expect(testMediaDirProblem(testMediaDir())).toBeNull()
  expect(problem(path.join(TMP, 'ogserc-e2e-media'))).toBeNull()
})

test('refuses a folder outside the OS temp folder, or the temp folder itself', () => {
  expect(problem(path.resolve('/project/ogserc-e2e-media'))).toMatch(/not inside the OS temp folder/)
  expect(problem(TMP)).toMatch(/not inside the OS temp folder/)
  expect(problem(path.join(TMP, '..', 'ogserc-e2e-media'))).toMatch(/not inside the OS temp folder/)
})

test('refuses a folder whose name does not contain e2e', () => {
  expect(problem(path.join(TMP, 'uploads'))).toMatch(/must contain "e2e"/)
})

test('refuses the development media folder, inside or around it', () => {
  // A project inside the temp folder, so only the media rule can catch it.
  const media = path.join(TMP, 'project', 'media')
  expect(testMediaDirProblem(path.join(media, 'e2e'), TMP, media)).toMatch(/development media folder/)
  expect(testMediaDirProblem(path.join(TMP, 'project-e2e'), TMP, path.join(TMP, 'project-e2e', 'media'))).toMatch(
    /development media folder/,
  )
})
