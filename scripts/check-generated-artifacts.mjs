#!/usr/bin/env node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const deployDir = join(root, 'docs/integrations/cpa-tools/deploy')
const generator = join(deployDir, 'build.mjs')
const outreachState = join(root, 'outreach-kit/.outreach-state.json')

function filesUnder(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...filesUnder(path))
    else files.push(path)
  }
  return files
}

function checkCanonicalJson(path) {
  const current = readFileSync(path, 'utf8')
  const canonical = `${JSON.stringify(JSON.parse(current), null, 2)}\n`
  if (current === canonical) return []
  return [relative(root, path)]
}

function isCpaFieldGuideGenerated(path) {
  const name = relative(deployDir, path)
  return (
    name.endsWith('.html') ||
    name === 'llms.txt' ||
    name === 'llms-full.txt' ||
    name === 'sitemap.xml'
  )
}

const tempDir = mkdtempSync(join(tmpdir(), 'duedatehq-generated-'))

try {
  const generated = spawnSync(process.execPath, [generator, '--out-dir', tempDir], {
    cwd: root,
    encoding: 'utf8',
  })
  if (generated.status !== 0) {
    process.stderr.write(generated.stdout)
    process.stderr.write(generated.stderr)
    process.exitCode = generated.status ?? 1
  } else {
    const drift = checkCanonicalJson(outreachState)
    const generatedFiles = filesUnder(tempDir)
    const generatedNames = new Set(generatedFiles.map((path) => relative(tempDir, path)))

    for (const candidate of generatedFiles) {
      const generatedRelative = relative(tempDir, candidate)
      const committed = join(deployDir, generatedRelative)
      let committedContent
      try {
        committedContent = readFileSync(committed)
      } catch {
        drift.push(relative(root, committed))
        continue
      }
      if (!readFileSync(candidate).equals(committedContent)) drift.push(relative(root, committed))
    }

    for (const committed of filesUnder(deployDir).filter(isCpaFieldGuideGenerated)) {
      if (!generatedNames.has(relative(deployDir, committed))) drift.push(relative(root, committed))
    }

    if (drift.length) {
      console.error('Generated artifacts are stale or not canonically serialized:')
      for (const path of [...new Set(drift)].toSorted((left, right) => left.localeCompare(right))) {
        console.error(`- ${path}`)
      }
      console.error(
        'Run the owning generator, review its output, and commit the synchronized files.',
      )
      process.exitCode = 1
    } else {
      console.log('Generated artifact contract is clean and deterministic.')
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
