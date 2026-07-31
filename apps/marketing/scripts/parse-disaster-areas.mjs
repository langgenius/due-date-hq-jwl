#!/usr/bin/env node
/**
 * parse-disaster-areas.mjs — L4 groundwork: parse the verbatim IRS
 * `affectedArea` strings (2020–present archive) into structured locality data.
 *
 * Contract (docs/marketing/disaster-cluster-architecture-2026-07-31.md §3):
 * county pages must NOT ship until this parser is sample-audited. This script
 * produces the audit artifacts; it does not feed the build.
 *
 * Conservative by design: a row is `parsed` only when the whole string is
 * consumed by known patterns; anything else is `partial` or `unparsed` with the
 * raw text preserved. Tribal designations are FIRST-CLASS rows (never county
 * aliases) — a county page that ignores them answers its own question wrongly.
 *
 * Usage:  node scripts/parse-disaster-areas.mjs
 * Reads:  src/lib/disaster-archive.json (+ enriched rows for current codes are
 *         NOT read from TS — the archive raw text is what history gives us; the
 *         one known divergence, LA-2026-02's 7/28 parish expansion, is patched
 *         below with a dated note).
 * Writes: ../../docs/marketing/l4-area-parse-2026-07-31.json
 *         ../../docs/marketing/l4-area-parse-audit-2026-07-31.md
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const archivePath = join(here, '../src/lib/disaster-archive.json')
const outJson = join(here, '../../../docs/marketing/l4-area-parse-2026-07-31.json')
const outAudit = join(here, '../../../docs/marketing/l4-area-parse-audit-2026-07-31.md')

const archive = JSON.parse(readFileSync(archivePath, 'utf8'))

// Known post-archive corrections (verified against the IRS release banner).
const AREA_OVERRIDES = {
  // 7/28/26 update added Lafourche and Pointe Coupee (see disaster-notices.ts).
  'LA-2026-02':
    'Avoyelles, Lafourche, Pointe Coupee, St. Landry, St. Tammany, and Terrebonne parishes',
}

// ---- helpers ----------------------------------------------------------------

const UNIT_WORDS =
  /\b(counties|county|parishes|parish|municipios|municipalities|municipality|boroughs|borough|census areas?|islands?)\b/i

const TRIBAL_WORDS = /\b(tribe|tribes|tribal|nation|nations|reservation|pueblo|indian)\b/i

/** Split a natural-language list ("A, B, and C") into trimmed names. */
function splitList(s) {
  return s
    .split(/,|\band\b|&/i)
    .map((x) => x.trim().replace(/^the\s+/i, ''))
    .filter((x) => x.length > 0 && !/^(counties|parishes|municipalities|boroughs)$/i.test(x))
}

/** True if the string names the whole state rather than a locality list. */
function isStatewide(raw, state) {
  if (!state) return false
  const r = raw.toLowerCase()
  const s = state.toLowerCase()
  return (
    r.includes(`entire state`) ||
    r.includes(`all of ${s}`) ||
    r.includes(`statewide`) ||
    r === s ||
    r === `state of ${s}` ||
    r === `the state of ${s}` ||
    r.includes(`reside or have a business in ${s}`) ||
    r.includes(`anywhere in ${s}`) ||
    r.includes(`anywhere in the state of ${s}`) ||
    r.includes(`all ${s}`) ||
    // "All 46 counties in South Carolina", "All 64 parishes in Louisiana"
    /^all\s+\d+\s+(counties|parishes|municipios|municipalities|boroughs)\b/.test(r)
  )
}

function parseArea(rawInput, state) {
  const raw = (rawInput ?? '').trim()
  if (!raw) return { kind: 'none', counties: [], tribal: [], notes: [], confidence: 'unparsed' }

  const notes = []

  // Nationwide / special notices.
  if (/^all taxpayers/i.test(raw) || /nationwide/i.test(raw)) {
    return { kind: 'national', counties: [], tribal: [], notes: [raw], confidence: 'parsed' }
  }
  if (isStatewide(raw, state)) {
    return { kind: 'statewide', counties: [], tribal: [], notes: [], confidence: 'parsed' }
  }

  const counties = []
  const tribal = []
  let confidence = 'parsed'
  let rest = raw

  // Peel a trailing tribal clause: "..., plus 25 tribal nations" / "and the
  // Oneida Indian Reservation" / "and the Confederated Tribes of ...". The
  // captured clause must not itself contain county-family words — otherwise
  // the county list would be swallowed into the tribal field.
  const tribalTail = rest.match(
    /(?:,?\s*(?:plus|and|as well as)\s+)((?:the\s+)?[^,]*?(?:tribal nations?|indian reservations?|nations?|tribes?|band of [^,]+)\s*\.?)$/i,
  )
  if (tribalTail && TRIBAL_WORDS.test(tribalTail[1]) && !UNIT_WORDS.test(tribalTail[1])) {
    tribal.push(tribalTail[1].trim())
    rest = rest.slice(0, tribalTail.index).replace(/[,;\s]+$/, '')
  }

  // Purely tribal areas ("San Carlos Apache Tribe", "Crow Reservation ...").
  if (TRIBAL_WORDS.test(rest) && !UNIT_WORDS.test(rest)) {
    tribal.push(rest)
    return { kind: 'tribal', counties, tribal, notes, confidence: 'parsed' }
  }

  // Single county-equivalent units (Alaska; territories).
  const singleUnit = rest.match(
    /^(?:the\s+)?(city and borough of .+|island of .+|municipality of .+)$/i,
  )
  if (singleUnit) {
    counties.push(singleUnit[1].trim())
    return { kind: 'counties', counties, tribal, notes, confidence: 'parsed' }
  }

  // NON-EXHAUSTIVE lists — "Counties including A, B, …" / "Localities including
  // …". The word "including" means the release covers MORE than the list; a
  // county page built from this list would answer "No" wrongly for unlisted
  // covered counties. Parse the names but hard-cap confidence at partial.
  const nonExhaustive = rest.match(/^(?:counties|localities|parishes)\s+including\s+(.*)$/i)
  if (nonExhaustive) {
    counties.push(...splitList(nonExhaustive[1].replace(/\s+(counties|parishes)\s*$/i, '')))
    notes.push('NON-EXHAUSTIVE ("including") — covered area exceeds the listed names')
    return { kind: 'counties-nonexhaustive', counties, tribal, notes, confidence: 'partial' }
  }

  // County-family lists. Accept the common IRS shapes:
  //   "A, B and C counties"      "counties of A, B, and C"
  //   "Municipalities of A, B"   "A, B, and C islands"
  const leadUnit = rest.match(
    /^(?:the\s+)?(?:counties|parishes|municipalities|municipios|boroughs|islands)\s+of\s+(.*)$/i,
  )
  const tailUnit = rest.match(
    /^(.*?)\s+(counties|county|parishes|parish|municipalities|municipios|boroughs|census areas?|islands)\b(.*)$/i,
  )

  if (leadUnit) {
    counties.push(...splitList(leadUnit[1]))
  } else if (tailUnit) {
    counties.push(...splitList(tailUnit[1]))
    const trailing = tailUnit[3].trim()
    if (trailing) {
      // Something after "counties" we did not model — keep it visible.
      if (TRIBAL_WORDS.test(trailing))
        tribal.push(trailing.replace(/^[,;\s]*(?:and|plus)?\s*/i, ''))
      else {
        notes.push(trailing)
        confidence = 'partial'
      }
    }
  } else {
    // No recognized unit word — not confidently parseable as a county list.
    return { kind: 'other', counties: [], tribal, notes: [raw], confidence: 'unparsed' }
  }

  if (counties.length === 0) confidence = 'partial'
  const kind = tribal.length > 0 ? 'counties+tribal' : 'counties'
  return { kind, counties, tribal, notes, confidence }
}

// ---- run --------------------------------------------------------------------

const rows = archive.map((e) => {
  const raw = (e.code && AREA_OVERRIDES[e.code]) || e.affectedArea
  const parsed = parseArea(raw, e.state)
  return {
    code: e.code,
    state: e.state,
    year: e.year,
    raw,
    ...parsed,
    overrideApplied: Boolean(e.code && AREA_OVERRIDES[e.code]),
  }
})

writeFileSync(outJson, `${JSON.stringify(rows, null, 2)}\n`)

// ---- audit report -----------------------------------------------------------

const by = (k) => rows.filter((r) => r.confidence === k)
const kinds = [...new Set(rows.map((r) => r.kind))]
const countyTotal = new Set(rows.flatMap((r) => r.counties.map((c) => `${r.state}|${c}`))).size

// Deterministic sample (no RNG — repeatable audits): every 7th row.
const sample = rows.filter((_, i) => i % 7 === 0)

const fmt = (r) =>
  `| ${r.code ?? '—'} | ${r.state ?? '—'} | ${r.kind} | ${r.confidence} | ${
    r.counties.length
  } | ${r.tribal.join('; ') || '—'} | ${(r.notes.join('; ') || '—').slice(0, 60)} |`

const audit = `# L4 affectedArea parse audit — 2026-07-31

Generated by \`apps/marketing/scripts/parse-disaster-areas.mjs\` from
\`disaster-archive.json\` (${rows.length} rows; LA-2026-02 patched to the 7/28 six-parish
list). Full parsed output: \`l4-area-parse-2026-07-31.json\`.

**Gate status: pages remain BLOCKED** until a human review of this file signs off
(architecture doc §3). Sign-off = review every \`partial\`/\`unparsed\` row below plus
the deterministic sample, then record the verdict here.

## Coverage

- parsed: **${by('parsed').length}** · partial: **${by('partial').length}** · unparsed: **${by('unparsed').length}**
- kinds: ${kinds.map((k) => `${k} (${rows.filter((r) => r.kind === k).length})`).join(' · ')}
- distinct state+county pairs extracted: **${countyTotal}**
- rows with tribal designations: **${rows.filter((r) => r.tribal.length > 0).length}** (first-class, never county aliases)

## Every partial / unparsed row (must be human-reviewed)

| code | state | kind | conf | #counties | tribal | notes/raw |
|---|---|---|---|---|---|---|
${rows
  .filter((r) => r.confidence !== 'parsed')
  .map(fmt)
  .join('\n')}

## Deterministic sample (every 7th row — re-runs identically)

| code | state | kind | conf | #counties | tribal | notes |
|---|---|---|---|---|---|---|
${sample.map(fmt).join('\n')}

## Reviewer verdict

- [ ] Every partial/unparsed row inspected against its IRS release
- [ ] Sample rows spot-checked against raw strings
- [ ] Tribal handling confirmed (no tribal name landed in a county list)

_Unchecked = L4 pages stay gated._
`

writeFileSync(outAudit, audit)

console.log(
  `rows=${rows.length} parsed=${by('parsed').length} partial=${by('partial').length} unparsed=${by('unparsed').length} counties=${countyTotal}`,
)
