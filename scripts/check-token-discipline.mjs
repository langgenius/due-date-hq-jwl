#!/usr/bin/env node
// Token-discipline guard — freezes arbitrary Tailwind values that should be
// design tokens (see docs/Design/token-audit-2026-06-10.md). Added 2026-06-10
// after a sweep that mapped ~500 inline sizes back to tokens; this stops the
// drift from creeping back in. Runs in pre-push (lefthook) + CI.
//
// Flags, in app + ui source (className-ish lines, not comments):
//   1. font-size  text-[Npx]   for N ≤ 15  → use text-caption(-xs)/xs/sm/base
//      (≥16px has no token — display sizes stay arbitrary)
//   2. hardcoded hex  bg|text|border|…-[#rrggbb]  → use a semantic color token
//   3. freelance radius  rounded(-side)?-[Npx]      → use rounded / -lg / -xl / -full
//
// EXEMPT: pre-login auth/onboarding surfaces keep their own softer scale;
// comment lines are ignored. Genuinely-intentional one-offs go in EXCEPTIONS.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SCAN = ['apps/app/src', 'packages/ui/src']
const BASELINE_FILE = join(ROOT, 'scripts/token-discipline-baseline.txt')
const UPDATE = process.argv.includes('--update')

// Baseline = the existing violations at the time the guard was introduced
// (grandfathered tech-debt, tracked in docs/Design/token-audit-2026-06-10.md).
// The guard FAILS only on NEW violations (signature not in the baseline), so
// drift can't grow; the baseline shrinks as the audit items get cleaned up.
// Signature is path+token (line-number-independent, survives edits above it).
const baseline = new Set(
  existsSync(BASELINE_FILE)
    ? readFileSync(BASELINE_FILE, 'utf8').split('\n').filter(Boolean)
    : [],
)

// Pre-login surfaces use a deliberately different (softer/larger) scale.
const EXEMPT_PATHS = [
  /routes\/(splash|two-factor|accept-invite|onboarding|sign-in|sign-up|login)\.tsx$/,
  /features\/auth\//,
  /features\/onboarding\//,
]

// Specific lines that are intentional and reviewed (path → substring match).
// Keep this list SHORT and justify each; it's the escape hatch, not a dumping ground.
const EXCEPTIONS = [
  // Tooltip arrow tip: 1px softening on the rotated 8px square — a decorative
  // detail, not a container radius (no canonical token applies).
  { path: 'packages/ui/src/components/ui/tooltip.tsx', has: 'rounded-[1px]' },
]

const FONT = /text-\[(\d+)px\]/g
const HEX = /(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-\[#[0-9a-fA-F]{3,8}\]/
const RADIUS = /rounded(?:-[a-z]+)?-\[\d+px\]/

const violations = []

function isExceptionLine(rel, line) {
  return EXCEPTIONS.some((e) => rel.endsWith(e.path) && line.includes(e.has))
}

function scan(file) {
  const rel = relative(ROOT, file).replaceAll('\\', '/')
  if (EXEMPT_PATHS.some((re) => re.test(rel))) return
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
    if (isExceptionLine(rel, line)) return
    let m
    FONT.lastIndex = 0
    while ((m = FONT.exec(line))) {
      const n = Number(m[1])
      if (n <= 15) push(rel, i, m[0], `text-[${n}px] → font token`)
    }
    const hex = line.match(HEX)
    if (hex) push(rel, i, hex[0], `hardcoded hex → color token`)
    const rad = line.match(RADIUS)
    if (rad) push(rel, i, rad[0], `freelance radius → rounded/-lg/-xl/-full`)
  })
}

function push(rel, lineIdx, token, msg) {
  violations.push({ sig: `${rel}\t${token}`, display: `${rel}:${lineIdx + 1}  ${msg}` })
}

function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (e === 'node_modules' || e === 'dist') continue
      walk(p)
    } else if (/\.(tsx?|jsx?)$/.test(e)) {
      scan(p)
    }
  }
}

for (const s of SCAN) walk(join(ROOT, s))

if (UPDATE) {
  const sigs = [...new Set(violations.map((v) => v.sig))].sort()
  writeFileSync(BASELINE_FILE, sigs.join('\n') + '\n')
  console.log(`✓ token-discipline: wrote baseline of ${sigs.length} grandfathered signature(s)`)
  process.exit(0)
}

const fresh = violations.filter((v) => !baseline.has(v.sig))
if (fresh.length > 0) {
  console.error(`\n✖ token-discipline: ${fresh.length} NEW violation(s) (not in baseline)\n`)
  for (const v of fresh.slice(0, 60)) console.error('  ' + v.display)
  if (fresh.length > 60) console.error(`  …and ${fresh.length - 60} more`)
  console.error('\nUse design tokens (docs/Design/token-audit-2026-06-10.md). Pre-login auth/')
  console.error('onboarding surfaces are exempt; justify true one-offs in EXCEPTIONS. The baseline')
  console.error('(scripts/token-discipline-baseline.txt) grandfathers pre-existing debt — do NOT')
  console.error('grow it; run `pnpm check:tokens --update` only when REMOVING entries.\n')
  process.exit(1)
}
const stale = baseline.size - new Set(violations.map((v) => v.sig)).size
console.log(
  `✓ token-discipline: no new violations` +
    (stale > 0 ? ` (${stale} baseline entr${stale === 1 ? 'y' : 'ies'} now fixed — run --update to shrink)` : ''),
)
