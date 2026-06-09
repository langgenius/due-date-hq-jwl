import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from 'react-router'
import { ArrowRightIcon, ExternalLinkIcon, TriangleAlertIcon } from 'lucide-react'

import type { PulseRuleMatch } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'

import { formatDate } from '@/lib/utils'

// How many matched pulses to render inline before linking out to /alerts. A
// rule rarely has more than one active deadline-change alert, but cap so the
// block can never dominate the dialog.
const MAX_VISIBLE = 3

function alertHref(alertId: string): string {
  return `/alerts?alert=${encodeURIComponent(alertId)}`
}

/**
 * Additive "proposed change" block shown at the top of the rule-review dialog
 * when an approved Pulse alert affects the open rule. It NEVER replaces the
 * catalog evidence/date — it surfaces the pending change (before → after) with
 * a deep-link to the alert, so the CPA can decide to apply it. Accepting the
 * rule still uses the rule's own due-date logic; applying the overlay stays a
 * manual action on the alert.
 */
export function MatchedPulseBlock({ matches }: { matches: readonly PulseRuleMatch[] }) {
  if (matches.length === 0) return null
  const visible = matches.slice(0, MAX_VISIBLE)
  const hiddenCount = matches.length - visible.length
  return (
    <section className="flex flex-col gap-2 rounded-md border border-state-accent-active-alt bg-background-default px-3 py-3">
      <div className="flex items-center gap-2">
        <TriangleAlertIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
        <h3 className="text-sm font-semibold text-text-primary">
          <Trans>Pending regulatory change for this rule</Trans>
        </h3>
      </div>
      <p className="text-xs text-text-secondary">
        <Trans>
          An approved alert affects this rule. Accepting generates deadlines from the rule's date
          below — review the change and apply it from the alert if it should take effect.
        </Trans>
      </p>
      <ul className="flex flex-col gap-2">
        {visible.map((match) => (
          <MatchedPulseRow key={match.alert.id} match={match} />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <TextLink variant="accent" render={<Link to="/alerts" />}>
          <Trans>+{hiddenCount} more in Alerts</Trans>
        </TextLink>
      ) : null}
    </section>
  )
}

function MatchedPulseRow({ match }: { match: PulseRuleMatch }) {
  const { t } = useLingui()
  const isOverlay = match.alert.actionMode === 'due_date_overlay'
  const hasDiff = isOverlay && match.newDueDate !== null
  return (
    <li className="flex flex-col gap-1.5 rounded-md border border-divider-subtle bg-background-default px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{match.alert.title}</span>
        <Badge variant="outline" className="shrink-0 text-text-tertiary">
          {isOverlay ? <Trans>Deadline change</Trans> : <Trans>Review</Trans>}
        </Badge>
      </div>
      {hasDiff ? (
        <span className="inline-flex items-center gap-2 tabular-nums">
          <span className="text-xs text-text-tertiary">
            {match.originalDueDate ? formatDate(match.originalDueDate) : t`Unknown`}
          </span>
          <ArrowRightIcon className="size-3.5 text-text-warning" aria-hidden />
          <span className="text-xs font-semibold text-text-warning">
            {match.newDueDate ? formatDate(match.newDueDate) : t`Unknown`}
          </span>
        </span>
      ) : null}
      {match.sourceExcerpt ? (
        <blockquote className="line-clamp-2 border-l border-divider-strong pl-2 text-xs text-text-secondary italic">
          “{match.sourceExcerpt}”
        </blockquote>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-tertiary">
          {t`${Math.round(match.alert.confidence * 100)}% confidence`}
        </span>
        <TextLink variant="accent" render={<Link to={alertHref(match.alert.id)} />}>
          <Trans>View alert</Trans>
          <ExternalLinkIcon className="size-3" aria-hidden />
        </TextLink>
      </div>
    </li>
  )
}
