import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'

import { installGitHooks } from './install-git-hooks.mjs'

const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

function createRepository(hooks = ['pre-commit', 'pre-push']) {
  const directory = mkdtempSync(join(tmpdir(), 'ddhq-git-hooks-'))
  temporaryDirectories.push(directory)
  execFileSync('git', ['init', '--quiet'], { cwd: directory })

  const hookDirectory = join(directory, '.vite-hooks')
  mkdirSync(hookDirectory)
  for (const hook of hooks) {
    const hookFile = join(hookDirectory, hook)
    writeFileSync(hookFile, '#!/usr/bin/env sh\nexit 0\n')
    chmodSync(hookFile, 0o755)
  }

  return directory
}

test('installs the tracked hook directory in local Git config', () => {
  const directory = createRepository()

  const result = installGitHooks({ cwd: directory })
  const configuredPath = execFileSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
    cwd: directory,
    encoding: 'utf8',
  }).trim()

  assert.equal(result.repoRoot, realpathSync(directory))
  assert.equal(result.hooksPath, '.vite-hooks')
  assert.equal(configuredPath, '.vite-hooks')
})

test('refuses to install an incomplete hook contract', () => {
  const directory = createRepository(['pre-commit'])

  assert.throws(
    () => installGitHooks({ cwd: directory }),
    /Required Git hook is missing or not executable: .*pre-push/,
  )
})
