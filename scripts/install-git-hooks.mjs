#!/usr/bin/env node

import { constants, accessSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const hooksPath = '.vite-hooks'
const requiredHooks = ['pre-commit', 'pre-push']

function runGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message
    throw new Error(`Unable to configure repository Git hooks: ${detail}`, { cause: error })
  }
}

export function installGitHooks({ cwd = process.cwd() } = {}) {
  const repoRoot = runGit(['rev-parse', '--show-toplevel'], cwd)

  for (const hook of requiredHooks) {
    const hookFile = resolve(repoRoot, hooksPath, hook)

    try {
      accessSync(hookFile, constants.R_OK | constants.X_OK)
    } catch (error) {
      throw new Error(`Required Git hook is missing or not executable: ${hookFile}`, {
        cause: error,
      })
    }
  }

  runGit(['config', '--local', 'core.hooksPath', hooksPath], repoRoot)

  const configuredPath = runGit(['config', '--local', '--get', 'core.hooksPath'], repoRoot)
  if (configuredPath !== hooksPath) {
    throw new Error(
      `Git hook installation failed: expected core.hooksPath=${hooksPath}, got ${configuredPath}`,
    )
  }

  return { hooksPath: configuredPath, repoRoot }
}

const isEntrypoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  const result = installGitHooks()
  console.log(`Git hooks installed: ${result.hooksPath}`)
}
