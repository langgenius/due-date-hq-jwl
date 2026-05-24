import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { StateBadge } from '@/components/primitives/state-badge'

import { PulseConfidenceBadge } from './PulseConfidenceBadge'
import { PulseSourceBadge } from './PulseSourceBadge'
import { PulseSourceStatusBadge } from './PulseSourceStatusBadge'

interface PulseAlertCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  onDismiss?: (() => void) | undefined
  onSnooze?: (() => void) | undefined
  /** Background breathing is reserved for the top actionable row in dense lists. */
  breathing?: boolean
  /** Inline actions are hidden when the card is rendered as a folded "more" entry. */
  compact?: boolean
}

// Single Pulse alert row used by /rules/pulse (Alerts).
//
// 2026-05-25 (Yuqi Alerts #4, #5, #6, #11):
//   • Dropped the leading PulsingDot. Yuqi flagged repeatedly that
//     the coloured dots don't communicate meaning to a CPA — the
//     status badge ("New"/"Applied"/"Snoozed"), confidence badge
//     ("AI 46%" with destructive tone for very-low), and the change-
//     kind label already carry every signal the dot was trying to
//     encode.
//   • Leading StateBadge so the jurisdiction (CA / TX / FL) reads
//     at a glance — same recognition the chip strip above uses.
//   • Added `alert.summary` as a body line under the title. The
//     model's one-sentence explanation of the source change ("AI
//     explains what is happening" per Yuqi #6) lets the CPA decide
//     whether to open the drawer without reading the title back to
//     themselves.
//   • PulseSourceBadge promoted from the footer to the header next
//     to the source name. It's already a real link to the official
//     source — promoting it lets the CPA jump out to the source
//     without opening the drawer (Yuqi #6).
//   • Dropped the separate "Low AI confidence" warning line. The
//     PulseConfidenceBadge already renders in the destructive tone
//     when confidence < 0.7; doubling the cue was redundant (Yuqi
//     #11). The drawer still surfaces the explicit one-paragraph
//     warning + reason copy.
export function PulseAlertCard({
  alert,
  onReview,
  onDismiss,
  onSnooze,
  breathing = false,
  compact = false,
}: PulseAlertCardProps) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount

  return (
    <article
      role="region"
      aria-label={t`Pulse alert: ${alert.title}`}
      className={cn(
        // T4: neutral card surface in all states. Severity is carried
        // by the in-card badges (LOW CONFIDENCE, etc.) — never the
        // card background.
        'flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-default p-3 transition-colors hover:border-divider-regular',
        breathing && 'pulse-strip-breathing',
        compact && 'p-2.5',
      )}
      data-breathing={breathing || undefined}
    >
      <header className="flex flex-wrap items-center gap-2">
        <StateBadge code={alert.jurisdiction} size="xs" aria-hidden />
        {/* Source name + direct external link as one unit. The badge
            wraps an `<a target="_blank">` so the CPA can open the
            official source from this row without touching the
            drawer. */}
        <PulseSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
        <span aria-hidden className="text-text-tertiary">
          ·
        </span>
        <h3
          className="min-w-0 flex-1 truncate text-md font-medium text-text-primary"
          title={alert.title}
        >
          {alert.title}
        </h3>
        <Badge variant="outline" className="hidden shrink-0 text-caption sm:inline-flex">
          {changeKindLabel(alert.changeKind)}
        </Badge>
        <PulseConfidenceBadge confidence={alert.confidence} />
        <PulseSourceStatusBadge status={alert.sourceStatus} />
      </header>

      {/* AI summary — only render when meaningfully different from
          the title (many alerts have a summary that just rewords
          their title). Same logic the drawer uses for the
          SheetDescription. */}
      {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
        <p className="line-clamp-2 text-sm text-text-secondary">{alert.summary}</p>
      ) : null}

      <p className="text-sm text-text-secondary">
        {alert.actionMode === 'review_only' ? (
          <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
        ) : impacted === 0 ? (
          <Trans>No matching clients in this practice.</Trans>
        ) : (
          <>
            <span className="font-mono tabular-nums text-text-primary">
              <Plural value={impacted} one="# client" other="# clients" />
            </span>{' '}
            <Trans>may be affected.</Trans>
            {alert.needsReviewCount > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums text-text-warning">
                  <Trans>{alert.needsReviewCount} need review</Trans>
                </span>
              </>
            ) : null}
          </>
        )}
      </p>

      {compact ? null : (
        <footer className="flex items-center justify-end gap-1">
          {/* Canonical action order per docs/Design/pulse-vocabulary.md:
            Snooze (softer secondary) → Dismiss (destructive-ish secondary)
            → Review (primary, rightmost). Both Snooze and Dismiss are
            audit-logged and require a reason — the parent owns the prompt.
            Snooze/Dismiss only render for `status === 'matched'` (open
            alerts); on terminal states (applied/dismissed/reverted/
            snoozed) the parent omits the handlers — the visual
            asymmetry Yuqi flagged in #7 is the canonical signal that
            "this alert is closed; only Review is meaningful."
            Reinforced by the `title` attribute on Review describing
            the terminal-state case. */}
          {onSnooze ? (
            <Button variant="ghost" size="sm" onClick={onSnooze}>
              <Trans>Snooze</Trans>
            </Button>
          ) : null}
          {onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <Trans>Dismiss</Trans>
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={onReview}
            title={
              onSnooze || onDismiss
                ? t`Open the alert drawer`
                : t`Open the closed-alert drawer (read-only)`
            }
          >
            <Trans>Review</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </footer>
      )}
    </article>
  )
}

// 2026-05-25 (Yuqi Alerts #8): the chip labels were single nouns
// ("Scope", "Form", "Deadline") that don't tell the CPA what
// ACTUALLY changed. Renamed to verb-phrase or noun-phrase forms
// that name the thing AND say it shifted: "Deadline shifted",
// "Scope narrowed", "Form updated", etc. Reads as a sentence
// fragment from a hover sweep.
function changeKindLabel(kind: PulseAlertPublic['changeKind']) {
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline shifted</Trans>
    case 'filing_requirement':
      return <Trans>Filing rule changed</Trans>
    case 'applicability_scope':
      return <Trans>Who it applies to</Trans>
    case 'form_instruction':
      return <Trans>Form updated</Trans>
    case 'source_status':
      return <Trans>Source status</Trans>
    case 'new_obligation':
      return <Trans>New rule added</Trans>
    case 'other':
      return <Trans>Other change</Trans>
  }
  return kind
}
