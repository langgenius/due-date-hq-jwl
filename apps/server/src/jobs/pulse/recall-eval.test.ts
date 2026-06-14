import { describe, expect, it } from 'vitest'
import type { RecallGroundTruthEvent } from '@duedatehq/core/rules'
import {
  evaluateRecall,
  isIdentifierKeyword,
  normalizeOfficialUrl,
  renderScorecardMarkdown,
  type RecallEvalInput,
  type RecallPulseRow,
  type RecallSnapshotRow,
  type RecallSourceStateRow,
} from './recall-eval'

const NOW = new Date('2026-06-15T12:00:00.000Z')
const day = (iso: string) => Date.parse(iso)

function event(overrides: Partial<RecallGroundTruthEvent> = {}): RecallGroundTruthEvent {
  return {
    id: 'ga.2026.wildfires',
    title: 'GA wildfire relief',
    jurisdiction: 'GA',
    expectedChangeKind: 'deadline_shift',
    announcedOn: '2026-05-06',
    officialUrls: ['https://www.irs.gov/newsroom/ga-wildfire-relief-aug-20'],
    keywords: ['ga-2026-03', 'wildfires', 'southeast georgia'],
    expectedSourceIds: ['irs.disaster'],
    expectedNewDueDate: '2026-08-20',
    evalMode: 'live',
    origin: 'irs_disaster_page',
    addedOn: '2026-06-14',
    ...overrides,
  }
}

function pulse(overrides: Partial<RecallPulseRow> = {}): RecallPulseRow {
  return {
    id: 'p1',
    source: 'irs.disaster',
    sourceUrl: 'https://www.irs.gov/newsroom/ga-wildfire-relief-aug-20',
    publishedAt: day('2026-05-07'),
    createdAt: day('2026-05-08'),
    changeKind: 'deadline_shift',
    status: 'approved',
    parsedJurisdiction: 'GA',
    parsedCounties: ['Clinch'],
    parsedForms: ['1040'],
    parsedNewDueDate: day('2026-08-20'),
    dedupeKey: 'k1',
    aiSummary: 'Southeast Georgia wildfire relief, deadlines postponed to Aug 20',
    verbatimQuote: 'GA-2026-03',
    ...overrides,
  }
}

function snapshot(overrides: Partial<RecallSnapshotRow> = {}): RecallSnapshotRow {
  return {
    id: 's1',
    sourceId: 'irs.disaster',
    externalId: 'ga-wildfire',
    title: 'GA-2026-03 Southeast Georgia wildfires',
    officialSourceUrl: 'https://www.irs.gov/newsroom/ga-wildfire-relief-aug-20',
    publishedAt: day('2026-05-07'),
    fetchedAt: day('2026-05-08'),
    parseStatus: 'extracted',
    failureReason: null,
    pulseId: 'p1',
    ingestMethod: null,
    ...overrides,
  }
}

function state(overrides: Partial<RecallSourceStateRow> = {}): RecallSourceStateRow {
  return {
    sourceId: 'irs.disaster',
    enabled: true,
    healthStatus: 'healthy',
    lastSuccessAt: day('2026-05-08'),
    ...overrides,
  }
}

function input(overrides: Partial<RecallEvalInput> = {}): RecallEvalInput {
  return {
    events: [event()],
    pulses: [],
    snapshots: [],
    sourceStates: [state()],
    coveringSourceIds: () => ['irs.disaster', 'irs.newsroom'],
    now: NOW,
    ...overrides,
  }
}

describe('normalizeOfficialUrl', () => {
  it('strips scheme, www, query, fragment and trailing slash', () => {
    expect(normalizeOfficialUrl('https://www.irs.gov/Newsroom/Foo/?utm=x#sec')).toBe(
      'irs.gov/newsroom/foo',
    )
    expect(normalizeOfficialUrl('http://irs.gov/newsroom/foo')).toBe('irs.gov/newsroom/foo')
    expect(normalizeOfficialUrl('https://www.irs.gov/a/b/')).toBe('irs.gov/a/b')
  })
})

describe('isIdentifierKeyword', () => {
  it('recognizes agency codes, not plain words', () => {
    expect(isIdentifierKeyword('ga-2026-03')).toBe(true)
    expect(isIdentifierKeyword('ir-2026-71')).toBe(true)
    expect(isIdentifierKeyword('dr-4830')).toBe(true)
    expect(isIdentifierKeyword('wildfires')).toBe(false)
    expect(isIdentifierKeyword('kona low')).toBe(false)
  })
})

describe('evaluateRecall — match tiers', () => {
  it('matches by canonical URL (tier url) → CAUGHT_ALERTED with lag', () => {
    const report = evaluateRecall(input({ pulses: [pulse()] }))
    const r = report.results[0]!
    expect(r.matchedVia).toBe('url')
    expect(r.outcome).toBe('CAUGHT_ALERTED')
    expect(r.lagDays).toBe(2) // announced 05-06, created 05-08
  })

  it('matches by snapshot URL when the pulse text is bare (tier snapshot_url)', () => {
    const bare = pulse({
      sourceUrl: 'https://example.gov/other',
      aiSummary: 'x',
      verbatimQuote: 'y',
      parsedJurisdiction: 'ZZ',
      changeKind: 'other',
    })
    const report = evaluateRecall(
      input({ pulses: [bare], snapshots: [snapshot({ pulseId: 'p1' })] }),
    )
    expect(report.results[0]!.matchedVia).toBe('snapshot_url')
    expect(report.results[0]!.outcome).toBe('CAUGHT_ALERTED')
  })

  it('matches by identifier keyword when URL differs (tier keyword_identifier)', () => {
    const p = pulse({
      sourceUrl: 'https://example.gov/x',
      verbatimQuote: 'see GA-2026-03 for details',
      parsedJurisdiction: 'ZZ',
      changeKind: 'other',
      aiSummary: 'storm',
    })
    expect(evaluateRecall(input({ pulses: [p] })).results[0]!.matchedVia).toBe('keyword_identifier')
  })

  it('matches structured+keyword and plain structured', () => {
    const structuredKw = pulse({
      sourceUrl: 'https://example.gov/x',
      verbatimQuote: 'q',
      aiSummary: 'southeast georgia storm',
    })
    expect(evaluateRecall(input({ pulses: [structuredKw] })).results[0]!.matchedVia).toBe(
      'structured+keyword',
    )

    const structuredOnly = pulse({
      sourceUrl: 'https://example.gov/x',
      verbatimQuote: 'q',
      aiSummary: 'unrelated text',
    })
    expect(evaluateRecall(input({ pulses: [structuredOnly] })).results[0]!.matchedVia).toBe(
      'structured',
    )
  })

  it('requires two plain keywords for the bare keyword tier', () => {
    const oneKw = pulse({
      sourceUrl: 'https://example.gov/x',
      parsedJurisdiction: 'ZZ',
      changeKind: 'other',
      aiSummary: 'wildfires somewhere',
      verbatimQuote: 'q',
    })
    expect(evaluateRecall(input({ pulses: [oneKw] })).results[0]!.outcome).toBe('MISSED_NOT_PARSED')

    const twoKw = pulse({
      sourceUrl: 'https://example.gov/x',
      parsedJurisdiction: 'ZZ',
      changeKind: 'other',
      aiSummary: 'wildfires in southeast georgia',
      verbatimQuote: 'q',
    })
    expect(evaluateRecall(input({ pulses: [twoKw] })).results[0]!.matchedVia).toBe('keyword')
  })
})

describe('evaluateRecall — status & lag', () => {
  it('approved past budget → CAUGHT_LATE (strict yes, headline no)', () => {
    const late = pulse({ createdAt: day('2026-06-01') }) // 26 days after announcedOn
    const report = evaluateRecall(input({ events: [event({ lagBudgetDays: 7 })], pulses: [late] }))
    expect(report.results[0]!.outcome).toBe('CAUGHT_LATE')
    expect(report.metrics.strictCaught).toBe(1)
    expect(report.metrics.headlineCaught).toBe(0)
  })

  it('pending_review → CAUGHT_IN_REVIEW; quarantined → CAUGHT_QUARANTINED', () => {
    expect(
      evaluateRecall(input({ pulses: [pulse({ status: 'pending_review' })] })).results[0]!.outcome,
    ).toBe('CAUGHT_IN_REVIEW')
    expect(
      evaluateRecall(input({ pulses: [pulse({ status: 'quarantined' })] })).results[0]!.outcome,
    ).toBe('CAUGHT_QUARANTINED')
  })

  it('only rejected → CAUGHT_REJECTED (flag)', () => {
    expect(
      evaluateRecall(input({ pulses: [pulse({ status: 'rejected' })] })).results[0]!.outcome,
    ).toBe('CAUGHT_REJECTED')
  })

  it('lag is taken from the earliest visible match and clamped at 0', () => {
    const early = pulse({ id: 'p2', createdAt: day('2026-05-01'), status: 'approved' }) // before announcedOn
    const report = evaluateRecall(input({ pulses: [pulse(), early] }))
    expect(report.results[0]!.lagDays).toBe(0)
    expect(report.warnings).toContain('lag_negative_check_announcedOn')
  })
})

describe('evaluateRecall — funnel attribution', () => {
  it('no covering source → MISSED_NO_SOURCE', () => {
    const r = evaluateRecall(
      input({ events: [event({ lagBudgetDays: 1 })], coveringSourceIds: () => [] }),
    )
    expect(r.results[0]!.outcome).toBe('MISSED_NO_SOURCE')
  })

  it('covering source never fetched in window → MISSED_FETCH', () => {
    const r = evaluateRecall(
      input({
        events: [event({ lagBudgetDays: 1 })],
        sourceStates: [state({ lastSuccessAt: day('2026-01-01') })],
      }),
    )
    expect(r.results[0]!.outcome).toBe('MISSED_FETCH')
  })

  it('fetched but no matching snapshot → MISSED_NOT_PARSED, confirmed by golden audit', () => {
    const r = evaluateRecall(
      input({
        events: [event({ lagBudgetDays: 1 })],
        goldenAuditMisses: [{ sourceId: 'irs.disaster', externalId: 'ga-wildfire' }],
      }),
    )
    expect(r.results[0]!.outcome).toBe('MISSED_NOT_PARSED')
    expect(r.results[0]!.notes).toContain('confirmed_by_golden_audit')
  })

  it('snapshot failed → MISSED_EXTRACT_FAILED carrying failureReason', () => {
    const r = evaluateRecall(
      input({
        events: [event({ lagBudgetDays: 1 })],
        snapshots: [
          snapshot({ parseStatus: 'failed', failureReason: 'AI_UNAVAILABLE: down', pulseId: null }),
        ],
      }),
    )
    expect(r.results[0]!.outcome).toBe('MISSED_EXTRACT_FAILED')
    expect(r.results[0]!.failureReason).toBe('AI_UNAVAILABLE: down')
  })

  it('snapshot ignored → MISSED_FILTERED; stuck in queue → MISSED_STUCK_QUEUE', () => {
    expect(
      evaluateRecall(
        input({
          events: [event({ lagBudgetDays: 1 })],
          snapshots: [
            snapshot({
              parseStatus: 'ignored',
              failureReason: 'out_of_scope_program',
              pulseId: null,
            }),
          ],
        }),
      ).results[0]!.outcome,
    ).toBe('MISSED_FILTERED')
    expect(
      evaluateRecall(
        input({
          events: [event({ lagBudgetDays: 1 })],
          snapshots: [snapshot({ parseStatus: 'pending_extract', pulseId: null })],
        }),
      ).results[0]!.outcome,
    ).toBe('MISSED_STUCK_QUEUE')
  })

  it('within lag budget and uncaught → PENDING (not a miss)', () => {
    // announced 2 days before NOW, budget 14 → window not elapsed.
    const r = evaluateRecall(
      input({ events: [event({ announcedOn: '2026-06-13' })], coveringSourceIds: () => [] }),
    )
    expect(r.results[0]!.outcome).toBe('PENDING')
    expect(r.metrics.countableLive).toBe(0)
  })
})

describe('evaluateRecall — filtered true negatives', () => {
  const filteredEvent = event({
    id: 'fed.2026.free-file',
    jurisdiction: 'FED',
    expectedChangeKind: 'other',
    expectedOutcome: 'filtered',
    officialUrls: ['https://www.irs.gov/newsroom/free-file'],
    keywords: ['ir-2026-71', 'free file'],
    announcedOn: '2026-06-02',
  })

  it('correctly ignored → PASS_FILTERED', () => {
    const r = evaluateRecall(
      input({
        events: [filteredEvent],
        pulses: [],
        snapshots: [],
        coveringSourceIds: () => ['irs.newsroom'],
      }),
    )
    expect(r.results[0]!.outcome).toBe('PASS_FILTERED')
    expect(r.metrics.filteredPass).toBe(1)
  })

  it('produced an approved alert → FAIL_FALSE_ALERT', () => {
    const falseAlert = pulse({
      source: 'irs.newsroom',
      sourceUrl: 'https://www.irs.gov/newsroom/free-file',
      parsedJurisdiction: 'FED',
      changeKind: 'other',
      status: 'approved',
      aiSummary: 'free file',
    })
    const r = evaluateRecall(
      input({
        events: [filteredEvent],
        pulses: [falseAlert],
        coveringSourceIds: () => ['irs.newsroom'],
      }),
    )
    expect(r.results[0]!.outcome).toBe('FAIL_FALSE_ALERT')
    expect(r.metrics.filteredFail).toBe(1)
  })
})

describe('evaluateRecall — backtest, metrics, warnings', () => {
  it('backtest events stay out of the headline denominator', () => {
    const r = evaluateRecall(
      input({ events: [event({ evalMode: 'backtest_only' })], pulses: [pulse()] }),
    )
    expect(r.metrics.countableLive).toBe(0)
    expect(r.metrics.backtestCaught).toBe(1)
    expect(r.metrics.headlineRecall).toBe(1) // empty denominator → 1
  })

  it('computes recall variants and lag percentiles', () => {
    const events = [event({ id: 'a' }), event({ id: 'b', officialUrls: ['https://www.irs.gov/b'] })]
    const pulses = [
      pulse({ id: 'pa' }),
      pulse({ id: 'pb', sourceUrl: 'https://www.irs.gov/b', createdAt: day('2026-05-20') }),
    ]
    const r = evaluateRecall(input({ events, pulses }))
    expect(r.metrics.countableLive).toBe(2)
    expect(r.metrics.headlineRecall).toBe(1)
    expect(r.metrics.lagP50).not.toBeNull()
  })

  it('flags a noisy match (>3 pulses) and a bad dedupe fold', () => {
    const noisy = Array.from({ length: 4 }, (_, i) => pulse({ id: `p${i}` }))
    expect(evaluateRecall(input({ pulses: noisy })).warnings).toContain('noisy_match')

    // Two events sharing one pulse via structured tier, differing due dates.
    const evA = event({
      id: 'a',
      officialUrls: ['https://no.gov/a'],
      keywords: ['storm-x'],
      expectedNewDueDate: '2026-08-20',
    })
    const evB = event({
      id: 'b',
      officialUrls: ['https://no.gov/b'],
      keywords: ['storm-y'],
      expectedNewDueDate: '2026-09-30',
    })
    const shared = pulse({
      id: 'shared',
      sourceUrl: 'https://other.gov/z',
      aiSummary: 'unrelated',
      verbatimQuote: 'q',
      parsedNewDueDate: null,
    })
    const r = evaluateRecall(input({ events: [evA, evB], pulses: [shared] }))
    expect(r.warnings.some((w) => w.startsWith('possible_bad_dedupe_fold:'))).toBe(true)
  })
})

describe('renderScorecardMarkdown', () => {
  it('renders headline, golden section and staleness warning', () => {
    const report = evaluateRecall(
      input({ pulses: [pulse()], events: [event({ addedOn: '2026-01-01' })] }),
    )
    const md = renderScorecardMarkdown(
      report,
      {
        ranAt: '2026-06-15T10:05:00.000Z',
        auditedSources: 6,
        parsedItems: 12,
        misses: [],
        missingAdapterIds: [],
      },
      NOW,
    )
    expect(md).toContain('Alert recall scorecard')
    expect(md).toContain('Golden-set audit')
    expect(md).toContain('Ingestion misses: **0**')
    expect(md).toContain('GT curation stale')
  })

  it('warns when no golden result exists', () => {
    const report = evaluateRecall(input())
    expect(renderScorecardMarkdown(report, null, NOW)).toContain('No golden-audit result in KV')
  })
})
