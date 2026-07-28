#!/usr/bin/env node
// Segment classifier for outreach firm lists (AutoGTM-style ICP split).
// Reads a firm CSV (Tier,State,Type,Firm,City,Decision-maker,Contact,Fit,Notes),
// tags each firm by service mix found in Notes, writes per-segment CSVs.
//
//   node classify-segments.mjs wave5-alert-WA-189.csv out-dir/
//
// A firm can belong to multiple segments; firms matching none land in
// `segment-generic.csv` (the default alerts-only track). Segment keys are
// stable — variants in segmented-outreach-plan-2026-07-28.md key off them.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const SEGMENTS = [
  ['payroll', /payroll/i],
  ['nonprofit', /nonprofit|non-profit|501/i],
  ['audit', /audit|attest/i],
  ['ea-solo', /enrolled agent|\bEA\b|sole practitioner|solo/i],
  ['bookkeeping', /bookkeep/i],
  ['industry-niche', /construction|medical|dental|real estate|restaurant/i],
]

const [, , inFile, outDir = 'segments'] = process.argv
if (!inFile) {
  console.error('usage: node classify-segments.mjs <firms.csv> [out-dir]')
  process.exit(1)
}

// Minimal CSV parse (handles quoted fields with commas).
function parseCsv(text) {
  const rows = []
  let row = [],
    field = '',
    inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') inQ = false
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
      if (c === '\r' && text[i + 1] === '\n') i++
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const rows = parseCsv(readFileSync(resolve(inFile), 'utf8'))
const header = rows.shift()
const notesIdx = header.indexOf('Notes')
const firmIdx = header.indexOf('Firm')
if (notesIdx === -1 || firmIdx === -1) {
  console.error('CSV must have Firm and Notes columns')
  process.exit(1)
}

// Dedupe by firm name, first occurrence wins.
const seen = new Set()
const firms = rows.filter((r) => {
  const k = (r[firmIdx] || '').trim().toLowerCase()
  if (!k || seen.has(k)) return false
  seen.add(k)
  return true
})

const buckets = new Map(SEGMENTS.map(([k]) => [k, []]))
buckets.set('generic', [])
for (const r of firms) {
  const notes = r[notesIdx] || ''
  const hits = SEGMENTS.filter(([, re]) => re.test(notes))
  if (hits.length === 0) buckets.get('generic').push(r)
  else for (const [k] of hits) buckets.get(k).push(r)
}

mkdirSync(resolve(outDir), { recursive: true })
const csvLine = (r) => r.map((f) => (/[",\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f)).join(',')
for (const [k, rs] of buckets) {
  if (!rs.length) continue
  const out = [csvLine(header), ...rs.map(csvLine)].join('\n') + '\n'
  writeFileSync(join(resolve(outDir), `segment-${k}.csv`), out)
  console.log(`${String(rs.length).padStart(4)}  segment-${k}.csv`)
}
console.log(`${String(firms.length).padStart(4)}  firms total (deduped)`)
