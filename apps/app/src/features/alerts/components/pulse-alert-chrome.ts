import type { PulseAlertPublic } from '@duedatehq/contracts'

import { alertImpactLevel } from '../lib/impact-level'

/**
 * # Canonical TABLE / LIST chrome guideline
 *
 * 2026-06-04 round 84 (Yuqi "apply table design guideline and rules
 * to Alert and Deadlines"): codifying the per-cell + per-row token
 * combos so any new tabular surface knows the canonical recipe.
 * Source of truth: `/today` `ActionsTable` (the round-23 canonical).
 *
 * ## Outer card frame
 *   `rounded-[12px] border border-divider-regular bg-background-default`
 *   - Drop `overflow-hidden` unless the surface needs to clip
 *     (round 84 #1 dropped it on PulseAlertList).
 *
 * ## Subgroup divider band / day-group header
 *   `bg-background-subtle px-5 py-2`
 *   `text-[12px] font-semibold tracking-[0.5px] text-text-secondary uppercase`
 *   - 12/secondary (round 79 + round 84) — readable but quiet.
 *   - Same tokens on ActionsTable's subgroup divider AND
 *     PulseAlertList's day-group header.
 *
 * ## Row body padding / text
 *   `px-5 py-3` cells (`[&_td]:py-3` on TableRow)
 *   Body 13px (ActionsTable). /alerts uses 15/medium title + 13
 *   summary because alerts are event-driven and need a louder lede.
 *   /deadlines body is 14 due to dense queue width.
 *
 * ## Pill primitives (canonical across every alert surface)
 *   - Form code: `<TaxCodeBadge>` (no className override on
 *     /alerts, `text-text-muted` on /today card)
 *   - State: circular 16px `<StateBadge>` motif + 12/700 mono code
 *     (no bg, no padding)
 *   - Severity: HIGH-only, `h-[22px] rounded-[4px] px-2 text-[11px]
 *     font-bold tracking-[0.7px] uppercase` + colors from
 *     `impactBadgeFromAlert`
 *   - Action pill (change-action amber, separate from status):
 *     `bg #FFFBEB`, `color #92400E`, `rounded-md px-[10px] py-[4px]`,
 *     mono ACTION label 10/700 + body 12/500 (same amber)
 *
 * ## Hover / focus
 *   `hover:bg-state-base-hover` (canonical via TableRow primitive)
 *   `focus-visible:bg-state-base-hover focus-visible:outline-none`
 *
 * Anything that diverges from the above is intentional (e.g.
 * dense-queue text bump on /deadlines, motif-only state in map
 * tiles) and MUST be documented inline with a `Round NN intentional
 * divergence:` comment so future audits can tell signal from noise.
 *
 * ---
 *
 * Shared chrome helpers for `AlertCard` + `PulseFormRevisedCard`
 * + any future alert-card variant — they all share the jykZH meta
 * vocabulary so the helpers below stay in one place.
 *
 * (Naming note: file + helper prefix stayed `pulse-alert-chrome` /
 * `pulse-alert-*` after the Pulse → Alert product rename because
 * the JSX components renamed but the chrome vocabulary the helpers
 * encode still tracks the original Pencil specs. The legacy
 * `PulseAlertCard` was renamed to `AlertCard` in the merge with PR
 * #61; comments below predating that rename were updated in place.)
 *
 * 2026-06-04 round 31 (Yuqi screenshot — "did you do any changes
 * and updates? dumb"): the previous round's restyle only applied
 * to PulseFormRevisedCard, which never rendered because no demo
 * alerts have changeKind === 'form_instruction'. The generic
 * AlertCard was still on the old layout. This module extracts
 * the data-mapping helpers so both cards can share the jykZH
 * chrome — severity / action / status / change-kind labels — and
 * be wired to real alert data.
 */

/**
 * Map an alert to its impact-badge tier + colors. The tier is REAL
 * client impact — the magnitude of impacted obligations
 * (`matchedCount + needsReviewCount`) — derived via the canonical
 * `alertImpactLevel` so the badge and the "Highest impact" sort share
 * one threshold table (lib/impact-level.ts: low 0–1 / medium 2–4 /
 * high 5+).
 *
 * 2026-06-06: this is the SINGLE badge mapper for every alert surface
 * — AlertCard, PulseFormRevisedCard, NeedsAttentionCard (/today),
 * PulseAlertRow, AlertDetailDrawer. It replaced `severityFromConfidence`,
 * which mislabeled INVERTED AI confidence as impact (low confidence →
 * "HIGH IMPACT"), conflating model uncertainty with client impact.
 * Confidence still drives its own surfaces (pulsing-dot tone, drawer
 * confidence pill, low-confidence banner, AlertConfidencePill) — it
 * just no longer masquerades as impact.
 *
 * Colors (round 47 + round 58 X3j4nt): HIGH keeps the amber
 * (`#ffe3d6` / `#92400E`) — "watch out" without crossing into the
 * destructive register reserved for errors / overdue. MEDIUM / LOW
 * stay neutral gray; in practice every surface gates the pill to HIGH
 * only, so the gray tiers render nothing — absence IS the signal.
 */
export type SeverityId = 'low' | 'medium' | 'high'
export function impactBadgeFromAlert(
  alert: Pick<PulseAlertPublic, 'matchedCount' | 'needsReviewCount'>,
): { id: SeverityId; bg: string; text: string } {
  const level = alertImpactLevel(alert)
  if (level === 'high') return { id: 'high', bg: '#ffe3d6', text: '#92400E' }
  if (level === 'medium') return { id: 'medium', bg: '#f2f4f7', text: '#475467' }
  return { id: 'low', bg: '#f2f4f7', text: '#475467' }
}

/**
 * Action-status pill at the top-right of the card.
 *   • Terminal (applied/dismissed/revert)  → "Closed"  (neutral gray)
 *   • needsReviewCount > 0                 → "Needs Review" (neutral)
 *   • matched / partially_applied          → "Needs Action" (destructive)
 *   • Otherwise                            → null (no pill rendered)
 */
export type ActionPillId = 'needs-action' | 'needs-review' | 'closed'
export function actionPillFromAlert(
  alert: PulseAlertPublic,
): { id: ActionPillId; bg: string; text: string } | null {
  if (alert.status === 'dismissed' || alert.status === 'applied' || alert.status === 'reverted') {
    return { id: 'closed', bg: '#f2f4f7', text: '#354052' }
  }
  if (alert.needsReviewCount > 0) {
    return { id: 'needs-review', bg: '#f2f4f7', text: '#354052' }
  }
  if (alert.status === 'matched' || alert.status === 'partially_applied') {
    return { id: 'needs-action', bg: '#fef3f2', text: '#d92d20' }
  }
  return null
}

/**
 * Right-side muted status text on the title row. Pencil renders this
 * as 20/500 `#98a2b2`. `matched` → "Open", everything else maps to
 * its workflow label.
 */
export type OpenStatusId = 'open' | 'applied' | 'dismissed' | 'partial' | 'reverted'
export function openStatusFromAlert(status: PulseAlertPublic['status']): OpenStatusId {
  if (status === 'matched') return 'open'
  if (status === 'applied') return 'applied'
  if (status === 'dismissed') return 'dismissed'
  if (status === 'partially_applied') return 'partial'
  return 'reverted'
}
