import { useEffect, useRef } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  CircleAlertIcon,
  SparklesIcon,
  BriefcaseIcon,
  Building2Icon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { highlightCitations } from '@/components/primitives/legal-typography'
import { SeverityChip } from '@/components/primitives/severity-chip'
import { JurisdictionChip } from '@/components/primitives/state-badge'
import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { formatTaxCode } from '@/lib/tax-codes'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { scrollIntoViewMotionSafe } from '@/lib/motion'

import { AlertConfidencePill } from './AlertConfidencePill'
import { AlertReadinessChip } from './AlertReadinessStatus'
import { AlertSourceBadge } from './AlertSourceBadge'
import { AlertSourceStatusBadge } from './AlertSourceStatusBadge'
import { AlertStatusBadge } from './AlertStatusBadge'
import { changeKindLabel } from './PulseChangeKindChip'
import { PulseAlertActionsRow } from './PulseAlertActionsRow'
import {
  actionPillFromAlert,
  impactBadgeFromAlert,
  openStatusFromAlert,
} from './pulse-alert-chrome'

const VISIBLE_CLIENT_NAMES = 3
const EMPTY_AFFECTED_CLIENTS: PulseAffectedClient[] = []

interface AlertCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  /**
   * Affected-client rows for THIS alert, batch-loaded by the parent
   * (AlertsListPage) in a single `getDetailsBatch` request and passed down
   * instead of each card fetching its own `pulse.getDetail`. Defaults to empty
   * so the card renders fine before the batch resolves (or in isolation).
   */
  affectedClients?: PulseAffectedClient[]
  // Archive/Dismiss handlers drive the hover-revealed
  // PulseAlertActionsRow on the impact row. All optional — callers that only
  // need a read-only card (or rely on the drawer for actions) omit them and
  // the actions row simply renders nothing.
  onDismiss?: (() => void) | undefined
  // "archive" action always available even on terminal-state alerts —
  // archive is the no-reason move-to-history verb; when a card already
  // lives in the history view this is a no-op.
  onArchive?: (() => void) | undefined
  /** Inline actions are hidden when the card is rendered as a folded "more" entry. */
  compact?: boolean
  /**
   * When the right panel is open the list column is narrower (~560px).
   * Pass `true` to truncate affected-client name chips at a fixed 140px
   * so a long client name (e.g. "Hudson & Wells LLC") doesn't push the
   * chip row into wrapping/overflow.
   */
  compactClients?: boolean
  /**
   * History/archive rows have already been reviewed, applied, dismissed, or
   * otherwise closed. Hide readiness there so the footer doesn't say "Ready to
   * apply" next to an Applied/Reviewed status.
   */
  showReadiness?: boolean
  /**
   * When this card is the one currently being viewed in the right-hand
   * panel, render a left border + brighter background so the user can
   * quickly find the active row in the list. Parent (AlertsListPage)
   * passes `active={alert.id === openAlertId}`.
   */
  active?: boolean
}

// Single Alert row used by /alerts (Alerts).
//
// The card body is a single vertical stack — a top meta row (severity pill + source +
// timestamp + action-status pill), a title row (StateBadge pill +
// title + workflow status word), the AI summary, and a 4-column
// facts panel — followed by the impact row (clients-affected count,
// Review, hover-revealed action buttons) and the functional footer
// (official source, source health, workflow status, readiness,
// duplicate count, confidence). The footer + impact data stay wired
// to the batch-loaded `affectedClients` prop and the canonical
// readiness / confidence primitives so the list page renders without
// a per-card detail fetch.
export function AlertCard({
  alert,
  onReview,
  affectedClients = EMPTY_AFFECTED_CLIENTS,
  onDismiss,
  onArchive,
  compact = false,
  active = false,
  compactClients = false,
  showReadiness = true,
}: AlertCardProps) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount

  // LIST the actual affected-client names on the card instead of a bare
  // "5 clients may be affected" summary. The rows are batch-loaded by
  // the parent (AlertsListPage) via a single `getDetailsBatch` call and
  // passed in as a prop, so a 50-alert list doesn't open 50 parallel
  // `getDetail` requests on render.
  const allAffectedNames = affectedClients
  // Collect each unique client's name AND whether the alert flags them
  // for review. Needs-review clients sort to the FRONT of the visible list so
  // the row matching the trailing "N flagged for review" count is
  // the first one the CPA sees. Eligible / already-applied
  // clients trail.
  const uniqueClients: Array<{ name: string; needsReview: boolean }> = []
  const seen = new Set<string>()
  for (const row of allAffectedNames) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      uniqueClients.push({
        name: row.clientName,
        needsReview: row.matchStatus === 'needs_review',
      })
    }
  }
  uniqueClients.sort((a, b) => Number(b.needsReview) - Number(a.needsReview))
  const visibleClients = uniqueClients.slice(0, VISIBLE_CLIENT_NAMES)
  const overflowNames = Math.max(uniqueClients.length - visibleClients.length, 0)
  // 3-tier qualitative confidence (LOW / MEDIUM / HIGH) instead of
  // numeric AI XX%. Card background tone follows the level: LOW gets the
  // destructive tint (review urgency), MEDIUM gets a faint warning tint,
  // HIGH stays clean. Thresholds are sourced from the canonical
  // `aiConfidenceTier` helper so every surface in the product agrees on
  // the same 0.5 / 0.85 ladder.
  const confidenceLevel = aiConfidenceTier(alert.confidence)
  const lowConfidence = confidenceLevel === 'low'
  const mediumConfidence = confidenceLevel === 'medium'
  const showReadinessChip = showReadiness && alert.status === 'matched'
  // The alert-level `forms` list rides on PulseAlertPublic (plumbed
  // through toAlert / toAlertPublic), so the "Affecting" cell renders
  // the first parsed form (human label via formatTaxCode) plus an "(N
  // more)" overflow when the change touches several forms — no per-card
  // detail fetch. Empty forms fall back to the `—` placeholder.
  const firstForm = alert.forms[0]
  const moreFormsCount = Math.max(alert.forms.length - 1, 0)

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onReview()
    }
  }
  // When the user lands on /alerts with a pre-selected alertId (e.g.
  // clicked a /today NeedsAttentionCard → DrawerProvider navigates to
  // ?alert=<id>), the matching card receives `active={true}` and the
  // selected chrome paints. The alert may be far down the list — scroll
  // it into view automatically on first activate so the wayfinding loop
  // closes.
  const cardRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!active) return
    scrollIntoViewMotionSafe(cardRef.current, { block: 'center' })
  }, [active])
  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={t`Alert: ${alert.title}`}
      aria-pressed={active}
      onClick={onReview}
      onKeyDown={handleCardKeyDown}
      className={cn(
        // Asymmetric padding — vertical `py-3` (12px), horizontal `px-5`
        // (20px). rounded-xl, no resting border (the white card defines
        // its own edge against the gray page wash via the bg inversion
        // below). Outer flex gap-0 since the body is a single child
        // column.
        'group/alert-card relative flex cursor-pointer items-start gap-0 rounded-xl px-5 py-3 transition-[opacity,background-color,border-color]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        active
          ? // Active uses the lighter blue tint (`state-accent-hover`)
            // plus a 1px accent-blue inset ring as the "this row is
            // open in the panel" cue. Inset ring (not a border) avoids
            // a 1px layout shift when toggling active.
            'bg-state-accent-hover shadow-[inset_0_0_0_1px_var(--color-state-accent-active-alt)]'
          : cn(
              // Resting: white card, no border, no ring. Hover paints a
              // subtle inset ring on the same white bg. White card gains
              // a quiet edge on hover; inset ring avoids the 1px layout
              // shift.
              'bg-background-default hover:ring-1 hover:ring-inset hover:ring-divider-regular',
              compactClients && 'opacity-70 hover:opacity-100',
            ),
        compact && 'p-2.5',
      )}
    >
      {/* The card body is a single vertical stack with gap-2. Top meta
          row, title row, summary, and facts panel render from the IIFE
          below (they share the severity / action / open-status helpers);
          the impact row and functional footer follow. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {(() => {
          const severity = impactBadgeFromAlert(alert)
          const actionPill = actionPillFromAlert(alert)
          const openId = openStatusFromAlert(alert.status)
          const severityLabel =
            severity.id === 'high'
              ? t`HIGH IMPACT`
              : severity.id === 'medium'
                ? t`MEDIUM IMPACT`
                : t`LOW IMPACT`
          const actionLabel = actionPill
            ? actionPill.id === 'needs-action'
              ? t`Needs Action`
              : actionPill.id === 'needs-review'
                ? t`Needs Review`
                : t`Closed`
            : null
          const openLabel =
            openId === 'open'
              ? t`Open`
              : openId === 'applied'
                ? t`Applied`
                : openId === 'dismissed'
                  ? t`Dismissed`
                  : openId === 'partial'
                    ? t`Partially applied`
                    : t`Reverted`
          return (
            <>
              {/* Top meta row — severity pill + source on the left,
                  timestamp + action-status pill on the right. */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {/* Severity gated to HIGH only (LOW / MEDIUM render nothing;
                      absence IS the signal). NEUTRAL tone (2026-06-18): client
                      reach sits on a different axis from urgency, so it reads as
                      a quiet tag, never an amber alarm — red/amber stay on the
                      priority + action pills. Shared <SeverityChip>. */}
                  {severity.id === 'high' ? (
                    <SeverityChip level="neutral">{severityLabel}</SeverityChip>
                  ) : null}
                  {/* Source size pinned to `text-base` — sits refined
                      between the 11px timestamp/facts and the 18px title. */}
                  <span className="truncate text-base font-medium text-text-secondary">
                    {alert.source}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-text-tertiary">
                    {formatRelativeTime(alert.publishedAt)}
                  </span>
                  {actionPill && actionLabel ? (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                        // Tone-keyed semantic tokens (no raw inline colors):
                        // needs-action carries the destructive tint, review +
                        // closed stay on the neutral base wash.
                        actionPill.id === 'needs-action'
                          ? 'bg-state-destructive-hover text-text-destructive'
                          : 'bg-state-base-hover text-text-secondary',
                      )}
                    >
                      {actionLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Title row — the StateBadge flag motif and the two-letter
                  code are wrapped in ONE bordered pill (gap-1) so the flag
                  reads as the icon and the code as the label. Title 18/600;
                  the workflow status word ("Open"/"Applied"/…) follows
                  via a flex-1 spacer. */}
              <div className="flex items-center gap-2">
                {/* Canonical framed seal+code chip (2026-07-22 sweep — was a
                    hand-rolled cluster whose comment claimed parity it no
                    longer had). */}
                <JurisdictionChip code={alert.jurisdiction} className="shrink-0" />
                <h3
                  className="line-clamp-1 min-w-0 text-xl leading-tight font-semibold tracking-title text-text-primary"
                  title={alert.title}
                >
                  {/* Alert titles occasionally carry inline citations (e.g.
                      "IRS modifies § 199A QBI deduction limits"). When
                      present, the § XXXX matches render in Citation
                      typography; otherwise the title passes through. */}
                  {highlightCitations(alert.title)}
                </h3>
                <span className="shrink-0 text-base leading-tight font-medium text-text-tertiary">
                  {openLabel}
                </span>
                <span className="flex-1" aria-hidden />
              </div>

              {/* AI summary — only render when meaningfully different
                  from the title. Leading SparklesIcon icon marks it as
                  AI-generated (Step 9 AI Visibility Audit F-010). */}
              {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
                <p className="line-clamp-1 max-w-[700px] text-sm text-text-secondary">
                  <SparklesIcon
                    className="mr-1 inline size-3 shrink-0 align-[-1px] text-text-tertiary"
                    aria-label={t`AI-generated summary`}
                  />
                  {highlightCitations(alert.summary)}
                </p>
              ) : null}

              {/* Facts panel R2kul — 3 columns WHAT CHANGED / AFFECTING /
                  PUBLISHED.
                  • WHAT CHANGED → changeKindLabel(alert.changeKind)
                  • AFFECTING    → first parsed form (human label) + "(N more)"
                    overflow; `—` when the alert carries no form scope.
                  • PUBLISHED    → source bulletin's publish date (absolute;
                    the meta row above carries the relative "Nmo ago"). */}
              <div className="grid grid-cols-[5fr_5fr_3fr] overflow-hidden rounded-lg bg-background-section">
                <div className="flex flex-col gap-1 px-3 py-2">
                  <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                    <Trans>What changed</Trans>
                  </CapsFieldLabel>
                  <span className="truncate text-xs font-medium text-text-secondary">
                    {changeKindLabel(alert.changeKind)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2">
                  <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                    <Trans>Affecting</Trans>
                  </CapsFieldLabel>
                  <span className="truncate text-xs font-medium text-text-secondary">
                    {firstForm ? (
                      <>
                        {formatTaxCode(firstForm)}
                        {moreFormsCount > 0 ? ` (${moreFormsCount} more)` : ''}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2">
                  <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                    <Trans>Published</Trans>
                  </CapsFieldLabel>
                  <span className="truncate text-xs font-medium text-text-secondary tabular-nums">
                    {formatDate(alert.publishedAt)}
                  </span>
                </div>
              </div>
            </>
          )
        })()}

        {/* Impact content — the impact
            line LISTS the affected client names instead of collapsing
            them to a count. Up to 3 names render as chips inline; the
            tail folds to `+N more`. Falls back to a review-only sentence
            or a no-current-match empty state for terminal alerts where
            the client list isn't useful. Wired to the batch-loaded
            `affectedClients` prop (see uniqueClients above). */}
        {alert.actionMode === 'review_only' ? (
          <p className="flex items-center gap-1.5 text-sm text-text-secondary">
            <BriefcaseIcon className="size-3 shrink-0" aria-hidden />
            <span>
              <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
            </span>
          </p>
        ) : alert.firmImpact === 'no_current_match' ? (
          <p className="text-sm text-text-secondary">
            <Trans>
              No matching open deadlines in this practice. Review and confirm no action.
            </Trans>
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-text-tertiary">
            <UsersIcon className="size-[13px] shrink-0 text-text-tertiary" aria-hidden />
            <span>
              {impacted === 1 ? (
                <Trans>1 client may be affected</Trans>
              ) : (
                <Trans>{impacted} clients may be affected</Trans>
              )}
              {visibleClients.length > 0 ? ':' : '.'}
            </span>
            {visibleClients.map((client) => {
              // Client chip leads with an entity icon — `Building2Icon` for business
              // clients (LLC / Inc / Corp / Co / Ltd suffixes),
              // `UserRoundIcon` for individuals. Needs-review clients get a
              // trailing CircleAlertIcon so the "needs your attention" signal
              // sits directly on the chip.
              const EntityIcon = isEnterpriseClientName(client.name) ? Building2Icon : UserRoundIcon
              return (
                <span
                  key={client.name}
                  title={client.name}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-sm border border-divider-subtle bg-background-default px-1.5 py-0.5 text-xs text-text-secondary',
                    // When the panel is open the list column is narrow,
                    // so each client chip caps at a fixed 140px and
                    // truncates. Tooltip shows the full name on hover.
                    compactClients && 'w-[140px]',
                  )}
                >
                  <EntityIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
                  <span className={cn('min-w-0', compactClients && 'truncate')}>{client.name}</span>
                  {client.needsReview ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            className="inline-flex shrink-0 cursor-help rounded-sm text-text-warning outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                            tabIndex={0}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <CircleAlertIcon className="size-3" aria-hidden />
                          </span>
                        }
                      />
                      <TooltipContent>
                        <Trans>This client needs review</Trans>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </span>
              )
            })}
            {overflowNames > 0 ? (
              <span className="text-text-tertiary">+{overflowNames} more</span>
            ) : null}
          </p>
        )}

        {/* Footer row — official source + source status PLUS the
            workflow status pill, readiness, duplicate count, and the
            confidence pill. All status-class signals (workflow / source
            identity / source health / readiness / AI confidence) live
            together at the bottom of the card, wired to the canonical
            primitives so the surfaces stay in sync. */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-divider-subtle pt-2 text-sm">
          <AlertSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
          <AlertSourceStatusBadge status={alert.sourceStatus} />
          <AlertStatusBadge status={alert.status} />
          {showReadinessChip ? (
            <AlertReadinessChip readiness={alert.applyReadiness} firmImpact={alert.firmImpact} />
          ) : null}
          {alert.duplicateSourceSnapshotCount > 0 ? (
            <span className="text-xs text-text-tertiary">
              <Plural
                value={alert.duplicateSourceSnapshotCount}
                one="Merged # similar source update"
                other="Merged # similar source updates"
              />
            </span>
          ) : null}
          <AlertConfidencePill
            confidence={lowConfidence ? 'low' : mediumConfidence ? 'medium' : 'high'}
          />
          <span className="flex-1" aria-hidden />
          {/* Review + hover-revealed Archive/Dismiss anchor the
              footer's right edge. Hover-revealed so the action chrome
              doesn't claim resting-state weight (visible when the card
              is active / focused-within for keyboard users). */}
          <TextLink
            variant="accent"
            onClick={(event) => {
              event.stopPropagation()
              onReview()
            }}
            className={cn(
              'font-medium transition-opacity focus-visible:underline',
              active
                ? 'opacity-100'
                : 'pointer-events-none opacity-0 group-hover/alert-card:pointer-events-auto group-hover/alert-card:opacity-100 group-focus-within/alert-card:pointer-events-auto group-focus-within/alert-card:opacity-100',
            )}
          >
            <Trans>Review →</Trans>
          </TextLink>
          {!compact ? (
            <div
              className={cn(
                'shrink-0 transition-opacity',
                active
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0 group-hover/alert-card:pointer-events-auto group-hover/alert-card:opacity-100 group-focus-within/alert-card:pointer-events-auto group-focus-within/alert-card:opacity-100',
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <PulseAlertActionsRow
                alertTitle={alert.title}
                onArchive={onArchive}
                onDismiss={onDismiss}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// Until the server adds `entityKind` to PulseAffectedClient, classify
// business vs. individual by the canonical legal-suffix patterns in the name.
// Word-boundaried matching + case-insensitive — "Hudson & Wells LLC"
// → enterprise; "John Smith" → individual; "Acme Corp" → enterprise.
// Punctuation tolerated for `Co.` and `P.C.`. False negatives
// (e.g. "Beta Holdings" without a legal suffix) still read as
// individual; that's the safer wrong answer than the inverse.
const ENTERPRISE_NAME_RE =
  /\b(llc|inc|corp(?:oration)?|co|ltd|llp|plc|gmbh|p\.?c|s\.?a|holdings?|industries|associates|partners|group)\b\.?/i
function isEnterpriseClientName(name: string): boolean {
  return ENTERPRISE_NAME_RE.test(name)
}
