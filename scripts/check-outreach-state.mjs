#!/usr/bin/env node
/**
 * Guard: outreach-kit/.outreach-state.json is the APPEND-ONLY send record (who has
 * received which touch). It must never shrink. A stale copy riding along in an
 * unrelated PR (this happened once — a docs PR reverted it to a day-1 snapshot)
 * would make the sender think already-contacted CPAs weren't sent, and DOUBLE-EMAIL
 * them. This fails if the current file records fewer touches than the baseline, or
 * drops any touch an email already had.
 *
 * Usage:  node scripts/check-outreach-state.mjs [--base <ref>]   (default: origin/main)
 */
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const FILE = 'outreach-kit/.outreach-state.json'
const i = process.argv.indexOf('--base')
const baseRef = i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : 'origin/main'

const TOUCHES = ['t1', 't2', 't3']
function summarize(json) {
  const sent = json.sent || {}
  let touches = 0
  for (const k of Object.keys(sent)) for (const t of TOUCHES) if (sent[k]?.[t]) touches++
  return { emails: Object.keys(sent).length, touches, sent }
}

if (!fs.existsSync(FILE)) {
  console.log(`[outreach-state-guard] ${FILE} not present — nothing to check.`)
  process.exit(0)
}
const cur = summarize(JSON.parse(fs.readFileSync(FILE, 'utf8')))

let base = null
try {
  base = summarize(
    JSON.parse(
      execSync(`git show ${baseRef}:${FILE}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    ),
  )
} catch {
  console.log(
    `[outreach-state-guard] no baseline at ${baseRef}:${FILE} — OK (nothing to regress against).`,
  )
  process.exit(0)
}

const lost = []
for (const [email, rec] of Object.entries(base.sent)) {
  const c = cur.sent[email] || {}
  for (const t of TOUCHES) if (rec?.[t] && !c[t]) lost.push(`${email} lost ${t}`)
}

if (cur.touches < base.touches || lost.length) {
  console.error('[outreach-state-guard] FAIL — the send record would regress:')
  console.error(`  baseline (${baseRef}): ${base.emails} emails, ${base.touches} touches`)
  console.error(`  this change:           ${cur.emails} emails, ${cur.touches} touches`)
  if (lost.length) {
    console.error('  touches dropped (would let the sender re-email these):')
    for (const l of lost.slice(0, 25)) console.error(`    - ${l}`)
    if (lost.length > 25) console.error(`    …and ${lost.length - 25} more`)
  }
  console.error('  This file is append-only. Do NOT commit an older copy of it. Rebase your branch')
  console.error(`  on ${baseRef} and keep the newer state, then re-run this check.`)
  process.exit(1)
}

console.log(
  `[outreach-state-guard] OK: ${cur.emails} emails, ${cur.touches} touches (>= baseline ${base.touches}).`,
)
