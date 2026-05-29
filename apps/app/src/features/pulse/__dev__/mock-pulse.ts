// Dev-only mock seeder for Pulse alerts + drawer. Activated by demo/e2e flows
// adding `?mockPulse=1` to the URL. Pre-fills the React Query cache so the UI
// can be inspected end-to-end without a working backend or DB seed. NEVER
// imported in production builds — `installMockPulse` short-circuits outside
// `import.meta.env.DEV`.
//
// What gets seeded:
//   - `firms.listMine`     → one firm with role `owner` (so apply/dismiss CTAs unlock).
//   - `pulse.listAlerts`   → 5 alerts covering matched / needs-details / applied / dismissed
//                            states and success / info / warning / sub-50% confidence examples.
//   - `pulse.getDetail`    → matching detail per alert with affected clients.
//
// What is NOT mocked: the actual mutations (apply / dismiss / revert) still hit
// the backend. Click them only if you also have the Worker running with the
// alert IDs present — otherwise expect an error toast.

import type { QueryClient } from '@tanstack/react-query'

import type {
  FirmPublic,
  PulseAffectedClient,
  PulseAlertPublic,
  PulseDetail,
  PulseSourceHealth,
} from '@duedatehq/contracts'
import { SMART_PRIORITY_DEFAULT_PROFILE } from '@duedatehq/contracts'

import { orpc } from '@/lib/rpc'

const ALERT_IDS = {
  matched: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  needsDetails: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  applied: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  dismissed: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  veryLow: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
} as const

const PULSE_IDS = {
  matched: '11111111-1111-4111-8111-111111111111',
  needsDetails: '55555555-5555-4555-8555-555555555555',
  applied: '22222222-2222-4222-8222-222222222222',
  dismissed: '33333333-3333-4333-8333-333333333333',
  veryLow: '44444444-4444-4444-8444-444444444444',
} as const

function obligationId(prefix: string, n: number): string {
  // Build a deterministic UUID v4-shaped string. `n` is padded to 2 hex chars
  // so we can fit ~ff (255) rows per group without colliding the suffix.
  const tail = n.toString(16).padStart(2, '0').repeat(6).slice(0, 12)
  return `${prefix}-aaaa-4aaa-8aaa-${tail}`
}

const NOW = new Date()
const ISO_NOW = NOW.toISOString()

function isoDate(daysFromNow: number): string {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

const MOCK_FIRM: FirmPublic = {
  id: 'firm_mock_001',
  name: 'Mock Practice (Dev)',
  slug: 'mock-firm-dev',
  plan: 'firm',
  seatLimit: 10,
  timezone: 'America/Los_Angeles',
  internalDeadlineOffsetDays: 14,
  monitoringStartDate: isoDate(0),
  status: 'active',
  role: 'owner',
  ownerUserId: 'user_mock_001',
  coordinatorCanSeeDollars: false,
  smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
  // The Pulse mock seeds alert examples only; it does not seed the
  // Deadlines queue, so the global sidebar deadline count must stay 0.
  openObligationCount: 0,
  isCurrent: true,
  createdAt: ISO_NOW,
  updatedAt: ISO_NOW,
  deletedAt: null,
}

// --- Alert 1: matched (Apply path) ----------------------------------------

const MATCHED_AFFECTED: PulseAffectedClient[] = [
  {
    obligationId: obligationId('a0000001', 1),
    clientId: obligationId('c0000001', 1),
    clientName: 'Hudson & Wells LLC',
    state: 'CA',
    county: 'Los Angeles',
    entityType: 'llc',
    taxType: 'Form 1065',
    currentDueDate: isoDate(5),
    newDueDate: isoDate(35),
    status: 'pending',
    matchStatus: 'eligible',
    reason: null,
  },
  {
    obligationId: obligationId('a0000002', 2),
    clientId: obligationId('c0000002', 2),
    clientName: 'Pacific Coast Bakery, Inc.',
    state: 'CA',
    county: 'Ventura',
    entityType: 's_corp',
    taxType: 'Form 1120-S',
    currentDueDate: isoDate(7),
    newDueDate: isoDate(37),
    status: 'in_progress',
    matchStatus: 'eligible',
    reason: null,
  },
  {
    obligationId: obligationId('a0000003', 3),
    clientId: obligationId('c0000003', 3),
    clientName: 'Sierra Mountain Trust',
    state: 'CA',
    county: 'Los Angeles',
    entityType: 'trust',
    taxType: 'Form 1041',
    currentDueDate: isoDate(2),
    newDueDate: isoDate(32),
    status: 'review',
    matchStatus: 'needs_review',
    reason: 'Client confirmation pending — verify residency.',
  },
  {
    obligationId: obligationId('a0000004', 4),
    clientId: obligationId('c0000004', 4),
    clientName: 'Aria Park (Sole Prop)',
    state: 'CA',
    county: null,
    entityType: 'sole_prop',
    taxType: 'Form 1040',
    currentDueDate: isoDate(10),
    newDueDate: isoDate(40),
    status: 'pending',
    matchStatus: 'eligible',
    reason: null,
  },
]

const MATCHED_ALERT: PulseAlertPublic = {
  id: ALERT_IDS.matched,
  pulseId: PULSE_IDS.matched,
  status: 'matched',
  sourceStatus: 'approved',
  title: 'IRS extends CA wildfire-zone filing deadlines (TX-2026-04)',
  source: 'IRS',
  sourceUrl: 'https://www.irs.gov/newsroom/mock-ca-wildfire-2026-04',
  changeKind: 'deadline_shift',
  actionMode: 'due_date_overlay',
  summary:
    'IRS grants 30-day extension for individuals and businesses in Los Angeles + Ventura counties affected by the April 2026 wildfires. Applies to Forms 1040, 1065, 1120-S, 1041 with original due dates between Apr 25 and May 25, 2026.',
  publishedAt: ISO_NOW,
  matchedCount: 4,
  needsReviewCount: 1,
  applyReadiness: { status: 'ready', missing: [] },
  duplicateSourceSnapshotCount: 1,
  confidence: 0.96,
  isSample: true,
  jurisdiction: 'CA',
}

const MATCHED_DETAIL: PulseDetail = {
  alert: MATCHED_ALERT,
  jurisdiction: 'CA',
  counties: ['Los Angeles', 'Ventura'],
  forms: ['1040', '1065', '1120-S', '1041'],
  entityTypes: ['individual', 'llc', 's_corp', 'trust', 'sole_prop'],
  originalDueDate: isoDate(5),
  newDueDate: isoDate(35),
  effectiveFrom: isoDate(-3),
  effectiveUntil: null,
  affectedRuleIds: [],
  structuredChange: null,
  sourceExcerpt:
    'Affected taxpayers in the disaster area now have until May 25, 2026 to file most tax returns, including individual income tax returns, partnership returns, S-corporation returns, and fiduciary returns originally due on or after April 25, 2026.',
  reviewedAt: null,
  applyReadiness: { status: 'ready', missing: [] },
  affectedClients: MATCHED_AFFECTED,
}

// --- Alert 2: needs details before Apply -----------------------------------

const NEEDS_DETAILS_ALERT: PulseAlertPublic = {
  id: ALERT_IDS.needsDetails,
  pulseId: PULSE_IDS.needsDetails,
  status: 'matched',
  sourceStatus: 'approved',
  title: 'AZ DOR posts storm-extension notice with incomplete scope',
  source: 'AZ DOR',
  sourceUrl: 'https://azdor.gov/news-events-notices/mock-storm-extension-2026',
  changeKind: 'deadline_shift',
  actionMode: 'due_date_overlay',
  summary:
    'Arizona tax officials posted a storm-extension notice. Confirm the new due date and choose the deadlines before Apply.',
  publishedAt: new Date(NOW.getTime() - 1000 * 60 * 35).toISOString(),
  matchedCount: 0,
  needsReviewCount: 0,
  applyReadiness: { status: 'needs_details', missing: ['affected_clients'] },
  duplicateSourceSnapshotCount: 0,
  confidence: 0.68,
  isSample: true,
  jurisdiction: 'AZ',
}

const NEEDS_DETAILS_AFFECTED: PulseAffectedClient[] = [
  {
    obligationId: obligationId('a0000011', 11),
    clientId: obligationId('c0000011', 11),
    clientName: 'Sonoran Design LLC',
    state: 'AZ',
    county: 'Maricopa',
    entityType: 'llc',
    taxType: 'Form 1065',
    currentDueDate: isoDate(12),
    newDueDate: isoDate(42),
    status: 'pending',
    matchStatus: 'eligible',
    reason: null,
  },
  {
    obligationId: obligationId('a0000012', 12),
    clientId: obligationId('c0000012', 12),
    clientName: 'Mesa Clinic S-Corp',
    state: 'AZ',
    county: 'Pima',
    entityType: 's_corp',
    taxType: 'Form 1120-S',
    currentDueDate: isoDate(14),
    newDueDate: isoDate(42),
    status: 'review',
    matchStatus: 'eligible',
    reason: null,
  },
]

const NEEDS_DETAILS_DETAIL: PulseDetail = {
  alert: NEEDS_DETAILS_ALERT,
  jurisdiction: 'AZ',
  counties: [],
  forms: [],
  entityTypes: [],
  originalDueDate: null,
  newDueDate: isoDate(42),
  effectiveFrom: null,
  effectiveUntil: null,
  affectedRuleIds: [],
  structuredChange: {
    note: 'Due-date candidate. CPA must confirm the new date and selected deadlines.',
  },
  sourceExcerpt:
    'The Department has announced relief for taxpayers affected by recent storms. Certain filing and payment due dates may be extended; review the notice for the covered forms and original deadlines.',
  reviewedAt: null,
  applyReadiness: {
    status: 'needs_details',
    missing: ['affected_clients'],
  },
  affectedClients: NEEDS_DETAILS_AFFECTED,
}

// --- Alert 3: applied (Revert / Undo path) --------------------------------

const APPLIED_AFFECTED: PulseAffectedClient[] = [
  {
    obligationId: obligationId('a0000005', 5),
    clientId: obligationId('c0000005', 5),
    clientName: 'Northgate Holdings LLC',
    state: 'CA',
    county: 'Alameda',
    entityType: 'llc',
    taxType: 'CA Form 568',
    currentDueDate: isoDate(20),
    newDueDate: isoDate(50),
    status: 'pending',
    matchStatus: 'already_applied',
    reason: null,
  },
  {
    obligationId: obligationId('a0000006', 6),
    clientId: obligationId('c0000006', 6),
    clientName: 'Bayview Yoga Studio',
    state: 'CA',
    county: 'San Francisco',
    entityType: 's_corp',
    taxType: 'CA Form 100S',
    currentDueDate: isoDate(15),
    newDueDate: isoDate(45),
    status: 'pending',
    matchStatus: 'already_applied',
    reason: null,
  },
]

const APPLIED_ALERT: PulseAlertPublic = {
  id: ALERT_IDS.applied,
  pulseId: PULSE_IDS.applied,
  status: 'applied',
  sourceStatus: 'approved',
  title: 'CA FTB extends franchise-tax payment deadline (Notice 2026-12)',
  source: 'CA FTB',
  sourceUrl: 'https://www.ftb.ca.gov/notice-mock-2026-12',
  changeKind: 'deadline_shift',
  actionMode: 'due_date_overlay',
  summary:
    'California Franchise Tax Board pushes franchise-tax payment deadline by 30 days for storm-affected entities in Alameda and San Francisco counties.',
  publishedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 26).toISOString(),
  matchedCount: 2,
  needsReviewCount: 0,
  applyReadiness: { status: 'ready', missing: [] },
  duplicateSourceSnapshotCount: 0,
  confidence: 0.82,
  isSample: true,
  jurisdiction: 'CA',
}

const APPLIED_DETAIL: PulseDetail = {
  alert: APPLIED_ALERT,
  jurisdiction: 'CA',
  counties: ['Alameda', 'San Francisco'],
  forms: ['100S', '568'],
  entityTypes: ['llc', 's_corp', 'c_corp'],
  originalDueDate: isoDate(15),
  newDueDate: isoDate(45),
  effectiveFrom: isoDate(-1),
  effectiveUntil: null,
  affectedRuleIds: [],
  structuredChange: null,
  sourceExcerpt:
    'The Franchise Tax Board extends the franchise-tax payment due date for the 2025 taxable year by 30 days for entities with a principal place of business in the affected counties.',
  reviewedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 2).toISOString(),
  applyReadiness: { status: 'ready', missing: [] },
  affectedClients: APPLIED_AFFECTED,
}

// --- Alert 4: dismissed (closed view) -------------------------------------

const DISMISSED_ALERT: PulseAlertPublic = {
  id: ALERT_IDS.dismissed,
  pulseId: PULSE_IDS.dismissed,
  status: 'dismissed',
  sourceStatus: 'approved',
  title: 'NY DTF clarifies pass-through entity tax election window',
  source: 'NY DTF',
  sourceUrl: 'https://www.tax.ny.gov/notice-mock-pte-2026',
  changeKind: 'form_instruction',
  actionMode: 'review_only',
  summary:
    'No matching clients in this practice - informational notice only. Dismissed by Sarah on 2026-04-28.',
  publishedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 48).toISOString(),
  matchedCount: 0,
  needsReviewCount: 0,
  applyReadiness: { status: 'not_applicable', missing: [] },
  duplicateSourceSnapshotCount: 0,
  confidence: 0.58,
  isSample: true,
  jurisdiction: 'NY',
}

const DISMISSED_DETAIL: PulseDetail = {
  alert: DISMISSED_ALERT,
  jurisdiction: 'NY',
  counties: [],
  forms: ['IT-204', 'CT-3'],
  entityTypes: ['partnership', 'c_corp'],
  originalDueDate: isoDate(60),
  newDueDate: isoDate(60),
  effectiveFrom: null,
  effectiveUntil: null,
  affectedRuleIds: [],
  structuredChange: {
    note: 'PTET election reminder only.',
  },
  sourceExcerpt:
    'The Department of Taxation and Finance reminds taxpayers that the PTET election for tax year 2026 must be made by March 15, 2026.',
  reviewedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 24).toISOString(),
  applyReadiness: { status: 'not_applicable', missing: [] },
  affectedClients: [],
}

// --- Alert 5: very low confidence -------------------------------------------

const VERY_LOW_ALERT: PulseAlertPublic = {
  id: ALERT_IDS.veryLow,
  pulseId: PULSE_IDS.veryLow,
  status: 'matched',
  sourceStatus: 'approved',
  title: 'FL DOR posts corporate income-tax deadline bulletin',
  source: 'FL DOR',
  sourceUrl: 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx',
  changeKind: 'applicability_scope',
  actionMode: 'review_only',
  summary:
    'Very-low-confidence extraction: deadline details depend on entity status, fiscal year, and extension election.',
  publishedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 72).toISOString(),
  matchedCount: 0,
  needsReviewCount: 0,
  applyReadiness: { status: 'not_applicable', missing: [] },
  duplicateSourceSnapshotCount: 0,
  confidence: 0.46,
  isSample: true,
  jurisdiction: 'FL',
}

const VERY_LOW_DETAIL: PulseDetail = {
  alert: VERY_LOW_ALERT,
  jurisdiction: 'FL',
  counties: [],
  forms: ['F-1120'],
  entityTypes: ['c_corp'],
  originalDueDate: isoDate(12),
  newDueDate: isoDate(32),
  effectiveFrom: null,
  effectiveUntil: null,
  affectedRuleIds: [],
  structuredChange: {
    note: 'Applicability depends on fiscal year and extension election.',
  },
  sourceExcerpt:
    'Corporate income tax filing dates may depend on entity status, fiscal year, and extension election.',
  reviewedAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 36).toISOString(),
  applyReadiness: { status: 'not_applicable', missing: [] },
  affectedClients: [],
}

// --- Index ----------------------------------------------------------------

const ALERTS: PulseAlertPublic[] = [
  MATCHED_ALERT,
  NEEDS_DETAILS_ALERT,
  APPLIED_ALERT,
  DISMISSED_ALERT,
  VERY_LOW_ALERT,
]

const DETAILS: PulseDetail[] = [
  MATCHED_DETAIL,
  NEEDS_DETAILS_DETAIL,
  APPLIED_DETAIL,
  DISMISSED_DETAIL,
  VERY_LOW_DETAIL,
]

const SOURCE_HEALTH: PulseSourceHealth[] = [
  {
    sourceId: 'irs.disaster',
    label: 'IRS Disaster Relief',
    tier: 'T1',
    jurisdiction: 'federal',
    enabled: true,
    healthStatus: 'healthy',
    lastCheckedAt: '2026-04-29T00:00:00.000Z',
    lastSuccessAt: '2026-04-29T00:00:00.000Z',
    nextCheckAt: '2026-04-29T01:00:00.000Z',
    consecutiveFailures: 0,
    lastError: null,
  },
  {
    sourceId: 'ca.ftb.newsroom',
    label: 'CA FTB Newsroom',
    tier: 'T1',
    jurisdiction: 'CA',
    enabled: true,
    healthStatus: 'healthy',
    lastCheckedAt: '2026-04-30T16:00:00.000Z',
    lastSuccessAt: '2026-04-30T16:00:00.000Z',
    nextCheckAt: '2026-04-30T17:00:00.000Z',
    consecutiveFailures: 0,
    lastError: null,
  },
  {
    sourceId: 'ny.dtf.press',
    label: 'NY DTF Press',
    tier: 'T1',
    jurisdiction: 'NY',
    enabled: true,
    healthStatus: 'healthy',
    lastCheckedAt: '2026-04-29T15:00:00.000Z',
    lastSuccessAt: '2026-04-29T15:00:00.000Z',
    nextCheckAt: '2026-04-29T17:00:00.000Z',
    consecutiveFailures: 0,
    lastError: null,
  },
  {
    sourceId: 'fl.dor.tips',
    label: 'FL DOR Tax Tips',
    tier: 'T1',
    jurisdiction: 'FL',
    enabled: true,
    healthStatus: 'healthy',
    lastCheckedAt: '2026-04-28T14:00:00.000Z',
    lastSuccessAt: '2026-04-28T14:00:00.000Z',
    nextCheckAt: '2026-04-28T16:00:00.000Z',
    consecutiveFailures: 0,
    lastError: null,
  },
]

// --- Public API -----------------------------------------------------------

export function seedPulseMock(queryClient: QueryClient): void {
  // Pin the mock seed: `setQueryData` alone is shadowed the moment a
  // live `useQuery` for the same key fires and returns from the server
  // (typically `[]`). Setting `staleTime: Infinity` + disabling refetch
  // on the pulse query key keeps the seeded alerts sticky for the whole
  // session. Reviewers want the cards to STAY visible regardless of
  // what the dev backend has — this is mock-driven, not server-driven.
  queryClient.setQueryDefaults(orpc.pulse.key(), {
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  queryClient.setQueryData(orpc.firms.listMine.queryKey({ input: undefined }), [MOCK_FIRM])

  // Call sites read listAlerts with different limits — seed each shape.
  queryClient.setQueryData(orpc.pulse.listAlerts.queryKey({ input: undefined }), { alerts: ALERTS })
  queryClient.setQueryData(orpc.pulse.listAlerts.queryKey({ input: { limit: 5 } }), {
    alerts: ALERTS.slice(0, 5),
  })
  queryClient.setQueryData(orpc.pulse.listAlerts.queryKey({ input: { limit: 20 } }), {
    alerts: ALERTS,
  })
  queryClient.setQueryData(orpc.pulse.listAlerts.queryKey({ input: { limit: 50 } }), {
    alerts: ALERTS,
  })
  queryClient.setQueryData(orpc.pulse.listHistory.queryKey({ input: { limit: 50 } }), {
    alerts: ALERTS,
  })
  queryClient.setQueryData(orpc.pulse.listSourceHealth.queryKey({ input: undefined }), {
    sources: SOURCE_HEALTH,
  })

  for (const detail of DETAILS) {
    queryClient.setQueryData(
      orpc.pulse.getDetail.queryKey({ input: { alertId: detail.alert.id } }),
      detail,
    )
  }

  // Audit P1-4: also seed the batch endpoint so /clients + /clients/[id]
  // (which switched from N+1 per-alert queries to a single batch fetch)
  // pick up the mock dataset in dev. The cache key is the exact ids
  // list those routes will request — sorted to match the route's
  // useMemo input shape.
  const allAlertIds = ALERTS.map((alert) => alert.id)
  queryClient.setQueryData(
    orpc.pulse.getDetailsBatch.queryKey({ input: { alertIds: allAlertIds } }),
    { details: DETAILS },
  )

  // eslint-disable-next-line no-console
  console.info(
    '[mock-pulse] seeded %d alerts. Open /rules/pulse or the dashboard banner to verify.',
    ALERTS.length,
  )
}

export function shouldInstallMockPulse(search: string): boolean {
  return new URLSearchParams(search).get('mockPulse') === '1'
}

export function installMockPulse(queryClient: QueryClient): void {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  if (!shouldInstallMockPulse(window.location.search)) return
  seedPulseMock(queryClient)
}
