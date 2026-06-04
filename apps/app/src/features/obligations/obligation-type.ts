import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { ObligationType } from '@duedatehq/contracts/shared/enums'
import type { ObligationQueueDetailTab } from '@duedatehq/contracts/obligation-queue'

// Type-aware drawer affordances. Per PDF §3.1 + product PRD §3.1 the
// product models six obligation types; not every tab applies to every
// type. A `payment` obligation has no e-file authorization workflow;
// a `client_action` obligation has no penalty calculation. Surfacing
// every tab to every type creates empty "—" cells everywhere, which
// is the legacy of the filing-only product (PRD §3.1 "implication").
//
// Order matters — the array is the visible tab order, and the first
// entry is the default-on tab when the URL doesn't pin one.
//
// 2026-05-25 (Yuqi Deadlines #30): `summary` is now the default-
// first tab for every type that has a meaningful milestone story
// (filing / payment / deposit / information). Internal-review +
// client-action rows skip Summary because their milestone chevron
// is trivial (1-2 stages).
const DEFAULT_TABS = [
  'summary',
  'readiness',
  'extension',
  'risk',
  'evidence',
  'audit',
] as const satisfies readonly ObligationQueueDetailTab[]

const TABS_BY_TYPE: Record<ObligationType, readonly ObligationQueueDetailTab[]> = {
  // Filing returns drive the full workflow: summary milestone strip,
  // client readiness, extension decision, deadline readiness, evidence
  // trail, full audit log.
  filing: DEFAULT_TABS,
  // Payment obligations skip readiness (no client doc collection) and
  // extension (Form 4868/7004 extends filing only — anti-pattern #1).
  payment: ['summary', 'risk', 'evidence', 'audit'],
  // Payroll deposits have no client checklist, no extension, no
  // penalty-calc surface today; just summary + an audit trail.
  deposit: ['summary', 'evidence', 'audit'],
  // Information returns (W-2, 1099, K-1) need readiness (third-party
  // data) and evidence/audit; no extension, no payment penalty.
  information: ['summary', 'readiness', 'evidence', 'audit'],
  // Firm-set client-action items: readiness checklist + audit only —
  // milestone story too thin for a Summary tab.
  client_action: ['readiness', 'audit'],
  // Internal review items: just the audit trail.
  internal_review: ['audit'],
}

function tabsForObligationType(
  obligationType: ObligationType | null | undefined,
): readonly ObligationQueueDetailTab[] {
  if (!obligationType) return DEFAULT_TABS
  return TABS_BY_TYPE[obligationType] ?? DEFAULT_TABS
}

function isTabVisibleForType(
  tab: ObligationQueueDetailTab,
  obligationType: ObligationType | null | undefined,
): boolean {
  return tabsForObligationType(obligationType).includes(tab)
}

type ObligationTypeLabels = Record<ObligationType, string>

function useObligationTypeLabels(): ObligationTypeLabels {
  const { t } = useLingui()
  return useMemo(
    () => ({
      // 2026-06-03 (Yuqi /critique pass — Reviewer panel finding P0
      // "three-fil collision"): user-facing label for the canonical
      // type renamed `Filing` → `Return`. DB enum value stays
      // `'filing'` (canonical per PDF §3.1 — same pattern as DB
      // `obligation` vs UI `Deadline`). CPAs say "this is a 1065
      // return" not "this is a filing"; renaming the label also
      // removes the head-on collision with the `Filed` status pill
      // and (when wired) a `Form` column showing "1120-S".
      filing: t`Return`,
      payment: t`Payment`,
      deposit: t`Deposit`,
      information: t`Information return`,
      client_action: t`Client action`,
      internal_review: t`Internal review`,
    }),
    [t],
  )
}

export { isTabVisibleForType, tabsForObligationType, useObligationTypeLabels }
export type { ObligationTypeLabels }
