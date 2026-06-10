import { describe, expect, it } from 'vitest'
import {
  composeDashboardLoad,
  isSameUtcDay,
  resolveRecapAnchor,
  severityForDueDate,
  type DashboardLoadInput,
} from './dashboard'

const AS_OF = '2026-04-28'

function due(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

// 2026-06-10 (Daily Brief "Yesterday" row): the recap anchor must be the
// most recent EARLIER-day visit — surviving today's own rollover stamp via
// previous_visit_at — and fall back to a trailing 24h window.
describe('dashboard recap anchor', () => {
  const now = new Date('2026-06-10T15:00:00.000Z')

  it('compares UTC calendar days, not 24h windows', () => {
    expect(isSameUtcDay(new Date('2026-06-10T00:05:00Z'), new Date('2026-06-10T23:55:00Z'))).toBe(
      true,
    )
    expect(isSameUtcDay(new Date('2026-06-09T23:55:00Z'), new Date('2026-06-10T00:05:00Z'))).toBe(
      false,
    )
  })

  it('anchors on lastVisitAt when the viewer has not been stamped today', () => {
    const lastVisitAt = new Date('2026-06-09T20:00:00.000Z')
    expect(resolveRecapAnchor({ lastVisitAt, previousVisitAt: null }, now)).toEqual(lastVisitAt)
  })

  it("anchors on previousVisitAt after today's stamp", () => {
    const previousVisitAt = new Date('2026-06-09T08:30:00.000Z')
    expect(
      resolveRecapAnchor(
        { lastVisitAt: new Date('2026-06-10T07:00:00.000Z'), previousVisitAt },
        now,
      ),
    ).toEqual(previousVisitAt)
  })

  it('falls back to a trailing 24h window without a usable anchor', () => {
    const fallback = new Date('2026-06-09T15:00:00.000Z')
    expect(resolveRecapAnchor(null, now)).toEqual(fallback)
    // Stamped today but no preserved previous visit (pre-0076 rows).
    expect(
      resolveRecapAnchor(
        { lastVisitAt: new Date('2026-06-10T07:00:00.000Z'), previousVisitAt: null },
        now,
      ),
    ).toEqual(fallback)
  })
})

describe('dashboard aggregation', () => {
  it('computes activation summary from real obligation rows', () => {
    const result = composeDashboardLoad(
      [
        {
          obligationId: 'oi_overdue',
          clientId: 'client_1',
          clientName: 'Overdue LLC',
          clientEmail: null,
          taxType: 'ca_100',
          obligationType: 'filing' as const,
          filingDueDate: due('2026-04-27'),
          paymentDueDate: null,
          baseDueDate: due('2026-04-27'),
          currentDueDate: due('2026-04-27'),
          status: 'pending',
          penaltyFormulaVersion: null,
          clientState: 'CA',
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: null,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        },
        {
          obligationId: 'oi_week',
          clientId: 'client_2',
          clientName: 'This Week LLC',
          clientEmail: null,
          taxType: 'ny_ct3',
          obligationType: 'filing' as const,
          filingDueDate: due('2026-05-02'),
          paymentDueDate: null,
          baseDueDate: due('2026-05-02'),
          currentDueDate: due('2026-05-02'),
          status: 'review',
          penaltyFormulaVersion: 'penalty-v1-2026q2',
          clientState: 'NY',
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: 1_000_000,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        },
        {
          obligationId: 'oi_later',
          clientId: 'client_3',
          clientName: 'Later LLC',
          clientEmail: null,
          taxType: 'federal_1120',
          obligationType: 'filing' as const,
          filingDueDate: due('2026-05-20'),
          paymentDueDate: null,
          baseDueDate: due('2026-05-20'),
          currentDueDate: due('2026-05-20'),
          status: 'waiting_on_client',
          penaltyFormulaVersion: null,
          clientState: null,
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: 1_000_000,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        },
        {
          obligationId: 'oi_day_7',
          clientId: 'client_4',
          clientName: 'Boundary LLC',
          clientEmail: null,
          taxType: 'federal_1120',
          obligationType: 'filing' as const,
          filingDueDate: due('2026-05-05'),
          paymentDueDate: null,
          baseDueDate: due('2026-05-05'),
          currentDueDate: due('2026-05-05'),
          status: 'pending',
          penaltyFormulaVersion: 'penalty-v1-2026q2',
          clientState: null,
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: 1_000_000,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        },
      ],
      [
        {
          id: 'ev_1',
          obligationInstanceId: 'oi_overdue',
          aiOutputId: null,
          sourceType: 'verified_rule',
          sourceId: 'rule_1',
          sourceUrl: null,
          verbatimQuote: null,
          rawValue: null,
          normalizedValue: null,
          confidence: 1,
          model: null,
          appliedAt: due('2026-04-28'),
        },
      ],
      { asOfDate: AS_OF, windowDays: 7, topLimit: 8 },
    )

    expect(result.summary).toEqual({
      openObligationCount: 4,
      firmOpenObligationCount: 4,
      dueThisWeekCount: 3,
      needsReviewCount: 1,
      evidenceGapCount: 3,
      totalAccruedPenaltyCents: 0,
      accruedPenaltyReadyCount: 0,
      accruedPenaltyNeedsInputCount: 1,
      accruedPenaltyUnsupportedCount: 0,
    })
    expect(result.topRows[0]!.obligationId).toBe('oi_overdue')
    expect(result.topRows[0]!.severity).toBe('critical')
    expect(result.topRows[0]!.smartPriority.rank).toBe(1)
    expect(result.topRows[0]!.evidenceCount).toBe(1)
    expect(result.topRows[1]!.obligationId).toBe('oi_week')
    expect(result.topRows[1]!.severity).toBe('high')
    expect(result.triageTabs.map((tab) => [tab.key, tab.count])).toEqual([
      ['this_week', 3],
      ['this_month', 1],
      ['long_term', 0],
    ])
    expect(result.triageTabs[0]!.rows.map((row) => row.obligationId)).toEqual([
      'oi_overdue',
      'oi_week',
      'oi_day_7',
    ])
    expect(new Map(result.facets.clients.map((option) => [option.value, option.count]))).toEqual(
      new Map([
        ['client_1', 1],
        ['client_2', 1],
        ['client_3', 1],
        ['client_4', 1],
      ]),
    )
    expect(result.facets.evidence).toEqual([
      { value: 'needs', label: 'needs', count: 3 },
      { value: 'linked', label: 'linked', count: 1 },
    ])
  })

  it('assigns rows to exactly one triage tab at dashboard window boundaries', () => {
    const result = composeDashboardLoad(
      [
        ['overdue', '2026-04-27', 10_000],
        ['day_7', '2026-05-05', 20_000],
        ['day_8', '2026-05-06', 30_000],
        ['day_30', '2026-05-28', 40_000],
        ['day_31', '2026-05-29', 50_000],
        ['day_180', '2026-10-25', 60_000],
        ['day_181', '2026-10-26', 70_000],
      ].map(([obligationId, currentDueDate]) => {
        const dueDate = due(String(currentDueDate))
        return {
          obligationId: String(obligationId),
          clientId: `client_${obligationId}`,
          clientName: `${obligationId} LLC`,
          clientEmail: null,
          taxType: '1040',
          obligationType: 'filing' as const,
          filingDueDate: dueDate,
          paymentDueDate: null,
          baseDueDate: dueDate,
          currentDueDate: dueDate,
          status: 'pending' as const,
          penaltyFormulaVersion: 'penalty-v1-2026q2',
          clientState: null,
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: 1_000_000,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        }
      }),
      [],
      { asOfDate: AS_OF, windowDays: 7, topLimit: 20 },
    )

    expect(result.triageTabs.map((tab) => [tab.key, tab.count])).toEqual([
      ['this_week', 2],
      ['this_month', 2],
      ['long_term', 2],
    ])
    expect(result.triageTabs.flatMap((tab) => tab.rows.map((row) => row.obligationId))).toEqual([
      'overdue',
      'day_7',
      'day_8',
      'day_30',
      'day_31',
      'day_180',
    ])
  })

  it('filters triage table rows without changing global summary or top priority rows', () => {
    const rows = [
      {
        obligationId: 'oi_overdue',
        clientId: 'client_1',
        clientName: 'Overdue LLC',
        clientEmail: null,
        taxType: 'ca_100',
        obligationType: 'filing' as const,
        filingDueDate: due('2026-04-27'),
        paymentDueDate: null,
        baseDueDate: due('2026-04-27'),
        currentDueDate: due('2026-04-27'),
        status: 'pending' as const,
        penaltyFormulaVersion: null,
        clientState: 'CA',
        clientEntityType: 'c_corp',
        clientEstimatedTaxLiabilityCents: null,
        clientEquityOwnerCount: null,
        assigneeId: null,
        assigneeName: null,
      },
      {
        obligationId: 'oi_week',
        clientId: 'client_2',
        clientName: 'This Week LLC',
        clientEmail: null,
        taxType: 'ny_ct3',
        obligationType: 'filing' as const,
        filingDueDate: due('2026-05-02'),
        paymentDueDate: null,
        baseDueDate: due('2026-05-02'),
        currentDueDate: due('2026-05-02'),
        status: 'review' as const,
        penaltyFormulaVersion: 'penalty-v1-2026q2',
        clientState: 'NY',
        clientEntityType: 'c_corp',
        clientEstimatedTaxLiabilityCents: 1_000_000,
        clientEquityOwnerCount: null,
        assigneeId: null,
        assigneeName: null,
      },
      {
        obligationId: 'oi_day_7',
        clientId: 'client_3',
        clientName: 'Boundary LLC',
        clientEmail: null,
        taxType: 'federal_1120',
        obligationType: 'filing' as const,
        filingDueDate: due('2026-05-05'),
        paymentDueDate: null,
        baseDueDate: due('2026-05-05'),
        currentDueDate: due('2026-05-05'),
        status: 'in_progress' as const,
        penaltyFormulaVersion: 'penalty-v1-2026q2',
        clientState: null,
        clientEntityType: 'c_corp',
        clientEstimatedTaxLiabilityCents: 1_000_000,
        clientEquityOwnerCount: null,
        assigneeId: null,
        assigneeName: null,
      },
      {
        obligationId: 'oi_later',
        clientId: 'client_4',
        clientName: 'Later LLC',
        clientEmail: null,
        taxType: 'federal_1120',
        obligationType: 'filing' as const,
        filingDueDate: due('2026-05-20'),
        paymentDueDate: null,
        baseDueDate: due('2026-05-20'),
        currentDueDate: due('2026-05-20'),
        status: 'waiting_on_client' as const,
        penaltyFormulaVersion: null,
        clientState: null,
        clientEntityType: 'c_corp',
        clientEstimatedTaxLiabilityCents: 1_000_000,
        clientEquityOwnerCount: null,
        assigneeId: null,
        assigneeName: null,
      },
    ]
    const evidenceRows = [
      {
        id: 'ev_1',
        obligationInstanceId: 'oi_overdue',
        aiOutputId: null,
        sourceType: 'verified_rule',
        sourceId: 'rule_1',
        sourceUrl: null,
        verbatimQuote: null,
        rawValue: null,
        normalizedValue: null,
        confidence: 1,
        model: null,
        appliedAt: due('2026-04-28'),
      },
    ]
    const baseInput = { asOfDate: AS_OF, windowDays: 7, topLimit: 8 }
    const baseline = composeDashboardLoad(rows, evidenceRows, baseInput)
    const baselineTopRows = baseline.topRows.map((row) => row.obligationId)

    const cases: Array<[Partial<DashboardLoadInput>, string[]]> = [
      [{ clientIds: ['client_2'] }, ['oi_week']],
      [{ taxTypes: ['federal_1120'] }, ['oi_day_7', 'oi_later']],
      [{ dueBuckets: ['next_7_days'] }, ['oi_week', 'oi_day_7']],
      [{ status: ['review'] }, ['oi_week']],
      [{ severity: ['critical'] }, ['oi_overdue']],
      [{ evidence: ['needs'] }, ['oi_week', 'oi_day_7', 'oi_later']],
    ]

    for (const [filterInput, expectedIds] of cases) {
      const result = composeDashboardLoad(rows, evidenceRows, { ...baseInput, ...filterInput })
      expect(result.summary).toEqual(baseline.summary)
      expect(result.topRows.map((row) => row.obligationId)).toEqual(baselineTopRows)
      expect(result.triageTabs.flatMap((tab) => tab.rows.map((row) => row.obligationId))).toEqual(
        expectedIds,
      )
    }
  })

  // 2026-05-27 (D12 — Agent ω, journey-audit drain): paymentDueDate
  // must flow through composeDashboardLoad untouched so the render
  // layer can detect filed-but-payment-overdue rows. The repo selects
  // the column off `obligation_instance`; composeDashboardLoad spreads
  // the raw row into the top-row draft. This test pins that
  // pass-through against accidental refactors.
  it('preserves paymentDueDate from raw rows to top-rows', () => {
    const result = composeDashboardLoad(
      [
        {
          obligationId: 'oi_pay',
          clientId: 'client_pay',
          clientName: 'Payment Late LLC',
          clientEmail: null,
          taxType: 'federal_1120',
          obligationType: 'filing' as const,
          filingDueDate: due('2026-04-15'),
          paymentDueDate: due('2026-04-30'),
          baseDueDate: due('2026-04-15'),
          currentDueDate: due('2026-04-15'),
          status: 'pending',
          penaltyFormulaVersion: null,
          clientState: null,
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: null,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        },
        {
          obligationId: 'oi_no_pay',
          clientId: 'client_no_pay',
          clientName: 'No Payment LLC',
          clientEmail: null,
          taxType: 'federal_1120',
          obligationType: 'filing' as const,
          filingDueDate: due('2026-04-15'),
          paymentDueDate: null,
          baseDueDate: due('2026-04-15'),
          currentDueDate: due('2026-04-15'),
          status: 'pending',
          penaltyFormulaVersion: null,
          clientState: null,
          clientEntityType: 'c_corp',
          clientEstimatedTaxLiabilityCents: null,
          clientEquityOwnerCount: null,
          assigneeId: null,
          assigneeName: null,
        },
      ],
      [],
      { asOfDate: AS_OF, windowDays: 7, topLimit: 8 },
    )

    const payRow = result.topRows.find((row) => row.obligationId === 'oi_pay')
    const noPayRow = result.topRows.find((row) => row.obligationId === 'oi_no_pay')
    expect(payRow?.paymentDueDate).toEqual(due('2026-04-30'))
    expect(noPayRow?.paymentDueDate).toBeNull()
  })

  it('uses deterministic severity thresholds', () => {
    expect(severityForDueDate(due('2026-04-26'), AS_OF, 'pending')).toBe('critical')
    expect(severityForDueDate(due('2026-04-30'), AS_OF, 'pending')).toBe('critical')
    expect(severityForDueDate(due('2026-05-03'), AS_OF, 'pending')).toBe('high')
    expect(severityForDueDate(due('2026-05-10'), AS_OF, 'review')).toBe('medium')
    expect(severityForDueDate(due('2026-05-30'), AS_OF, 'pending')).toBe('neutral')
  })

  // 2026-06-10 (My work / Everyone): 'me' scope keeps rows whose effective
  // assignee is the viewer PLUS unassigned rows (an unclaimed deadline must
  // never disappear from everyone's Today). A name-only assignment with no
  // bound user id counts as unassigned. Every scoped number (summary,
  // ranks, facets) must agree with the visible rows; only
  // firmOpenObligationCount stays firm-wide.
  it("scopes rows to the viewer plus unassigned in 'me' scope", () => {
    const baseRow = {
      clientEmail: null,
      taxType: 'federal_1120',
      obligationType: 'filing' as const,
      filingDueDate: due('2026-05-02'),
      paymentDueDate: null,
      baseDueDate: due('2026-05-02'),
      currentDueDate: due('2026-05-02'),
      status: 'pending' as const,
      penaltyFormulaVersion: null,
      clientState: null,
      clientEntityType: 'c_corp',
      clientEstimatedTaxLiabilityCents: null,
      clientEquityOwnerCount: null,
    }
    const rows = [
      {
        ...baseRow,
        obligationId: 'oi_mine',
        clientId: 'client_mine',
        clientName: 'Mine LLC',
        assigneeId: 'user_me',
        assigneeName: 'Me Myself',
      },
      {
        ...baseRow,
        obligationId: 'oi_theirs',
        clientId: 'client_theirs',
        clientName: 'Theirs LLC',
        assigneeId: 'user_other',
        assigneeName: 'Someone Else',
      },
      {
        ...baseRow,
        obligationId: 'oi_unassigned',
        clientId: 'client_unassigned',
        clientName: 'Unassigned LLC',
        assigneeId: null,
        assigneeName: null,
      },
      {
        ...baseRow,
        obligationId: 'oi_name_only',
        clientId: 'client_name_only',
        clientName: 'Name Only LLC',
        assigneeId: null,
        assigneeName: 'Imported Free-Text',
      },
    ]

    const firmResult = composeDashboardLoad(rows, [], {
      asOfDate: AS_OF,
      windowDays: 7,
      topLimit: 8,
      scope: 'firm',
      scopeUserId: 'user_me',
    })
    expect(firmResult.summary.openObligationCount).toBe(4)
    expect(firmResult.summary.firmOpenObligationCount).toBe(4)
    expect(firmResult.topRows).toHaveLength(4)

    const meResult = composeDashboardLoad(rows, [], {
      asOfDate: AS_OF,
      windowDays: 7,
      topLimit: 8,
      scope: 'me',
      scopeUserId: 'user_me',
    })
    const meIds = meResult.topRows.map((row) => row.obligationId)
    expect(meIds).toHaveLength(3)
    expect(meIds).not.toContain('oi_theirs')
    expect(new Set(meIds)).toEqual(new Set(['oi_mine', 'oi_unassigned', 'oi_name_only']))
    // Scoped numbers agree with the visible rows; the firm-wide count
    // still reports the unscoped total for the empty-state split.
    expect(meResult.summary.openObligationCount).toBe(3)
    expect(meResult.summary.firmOpenObligationCount).toBe(4)
    // Smart Priority re-ranks within the scope — contiguous from #1.
    expect(
      meResult.topRows.map((row) => row.smartPriority.rank ?? -1).toSorted((a, b) => a - b),
    ).toEqual([1, 2, 3])
    // Effective assignee fields survive to the top rows (avatar source).
    const mine = meResult.topRows.find((row) => row.obligationId === 'oi_mine')
    expect(mine?.assigneeId).toBe('user_me')
    expect(mine?.assigneeName).toBe('Me Myself')
    // Facet counts follow the scope too.
    expect(meResult.facets.clients.map((option) => option.value).toSorted()).toEqual(
      ['client_mine', 'client_name_only', 'client_unassigned'].toSorted(),
    )
  })
})
