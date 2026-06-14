import { describe, expect, it } from 'vitest'
import {
  MVP_RULE_JURISDICTIONS,
  RECALL_GROUND_TRUTH_EVENTS,
  type RuleJurisdiction,
} from '@duedatehq/core/rules'
import { PULSE_CHANGE_KINDS } from '@duedatehq/db/schema/pulse'
import { listAlertSourceCoverage, pulseManagedSourceIds } from './rule-source-adapters'

// Cache FED coverage — every event's covering set unions it (disaster relief is
// usually caught by the federal IRS sources even for a state-applied event).
const fedSourceIds = new Set(listAlertSourceCoverage('FED')[0]!.sourceIds)

function coveringSourceIds(jurisdiction: RuleJurisdiction): string[] {
  const own = listAlertSourceCoverage(jurisdiction)[0]?.sourceIds ?? []
  return [...new Set([...own, ...fedSourceIds])].filter((id) => pulseManagedSourceIds.has(id))
}

function isOfficialHost(host: string): boolean {
  const h = host.toLowerCase()
  return h === 'irs.gov' || h.endsWith('.gov') || h.endsWith('.us') || h.endsWith('.mil')
}

const jurisdictions = new Set<string>(MVP_RULE_JURISDICTIONS)
const changeKinds = new Set<string>(PULSE_CHANGE_KINDS)

describe('RECALL_GROUND_TRUTH_EVENTS hygiene', () => {
  it('has unique ids', () => {
    const ids = RECALL_GROUND_TRUTH_EVENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('announcedOn and addedOn are valid ISO dates', () => {
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      expect(Number.isNaN(Date.parse(e.announcedOn)), `${e.id} announcedOn`).toBe(false)
      expect(Number.isNaN(Date.parse(e.addedOn)), `${e.id} addedOn`).toBe(false)
    }
  })

  it('every officialUrl is an https official-host URL', () => {
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      expect(e.officialUrls.length, `${e.id} needs ≥1 url`).toBeGreaterThan(0)
      for (const raw of e.officialUrls) {
        const url = new URL(raw)
        expect(url.protocol, `${e.id} ${raw}`).toBe('https:')
        expect(isOfficialHost(url.host), `${e.id} ${raw} host`).toBe(true)
      }
    }
  })

  it('every event has ≥2 keywords, all lowercase', () => {
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      expect(e.keywords.length, e.id).toBeGreaterThanOrEqual(2)
      for (const kw of e.keywords) expect(kw, `${e.id}: ${kw}`).toBe(kw.toLowerCase())
    }
  })

  it('no two live alerted events share an identical keyword set', () => {
    const seen = new Map<string, string>()
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      const outcome: string = e.expectedOutcome ?? 'alerted'
      if (e.evalMode !== 'live' || outcome !== 'alerted') continue
      const key = [...e.keywords].toSorted().join('|')
      expect(seen.has(key), `${e.id} duplicates ${seen.get(key)}`).toBe(false)
      seen.set(key, e.id)
    }
  })

  it('expectedChangeKind is a real PULSE_CHANGE_KIND', () => {
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      expect(changeKinds.has(e.expectedChangeKind), `${e.id}: ${e.expectedChangeKind}`).toBe(true)
    }
  })

  it('jurisdiction is a valid rule jurisdiction', () => {
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      expect(jurisdictions.has(e.jurisdiction), `${e.id}: ${e.jurisdiction}`).toBe(true)
    }
  })
})

describe('RECALL_GROUND_TRUTH_EVENTS ↔ coverage', () => {
  it('every event has a non-empty managed covering source set', () => {
    // If this is empty the evaluator would mis-attribute MISSED_NO_SOURCE — a
    // false miss born of a dataset/coverage mismatch. Catch it at commit time.
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      const covering = coveringSourceIds(e.jurisdiction)
      expect(
        covering.length,
        `${e.id} (${e.jurisdiction}) has no managed covering source`,
      ).toBeGreaterThan(0)
    }
  })

  it('declared expectedSourceIds are actually managed and cover the event', () => {
    for (const e of RECALL_GROUND_TRUTH_EVENTS) {
      if (!e.expectedSourceIds) continue
      const covering = new Set(coveringSourceIds(e.jurisdiction))
      for (const id of e.expectedSourceIds) {
        expect(pulseManagedSourceIds.has(id), `${e.id}: ${id} not pulse-managed`).toBe(true)
        expect(covering.has(id), `${e.id}: ${id} not in covering set`).toBe(true)
      }
    }
  })
})
