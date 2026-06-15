import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon } from 'lucide-react'

import {
  DueDateLogicSchema,
  type RuleDiff,
  type RuleFieldDiff,
  type RuleReviewTaskReason,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'

import { humanizeDueDateLogic } from './rules-console-model'

/**
 * RuleYearDiff — the year-over-year review context shown above the
 * accept/reject decision. Calls `rules.diffAgainstPredecessor` and renders
 * the changed fields (before → after) plus a classification badge so a
 * reviewer can tell at a glance whether a year-stamped rule is a routine
 * date carry-forward or a substantive logic change — instead of reviewing
 * every new annual template cold.
 *
 * Quiet by design: silent while loading / on error (a supporting panel,
 * not a blocking one — mirrors `previewRuleImpact`). When there is no
 * prior-year equivalent (first cohort, or no authored predecessor) it says
 * so rather than fabricating a diff.
 */
export function RuleYearDiff({
  ruleId,
  expectedVersion,
  reason,
  bare = false,
}: {
  ruleId: string
  expectedVersion: number
  reason?: RuleReviewTaskReason
  /** Drop the box chrome (border/fill/padding) so the check reads as a flat
      row inside a parent gate (TkpJG) rather than a nested card. */
  bare?: boolean
}) {
  const diffQuery = useQuery({
    ...orpc.rules.diffAgainstPredecessor.queryOptions({
      input: { ruleId, expectedVersion },
    }),
    staleTime: 60_000,
  })

  const diff = diffQuery.data
  if (!diff) return null

  return (
    <section
      className={cn(
        'flex flex-col gap-2',
        !bare && 'rounded-lg border border-divider-subtle bg-background-subtle px-3 py-2.5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-semibold text-text-secondary">
          <Trans>Year-over-year</Trans>
        </h5>
        <div className="flex items-center gap-1.5">
          {reason ? <ReviewReasonBadge reason={reason} /> : null}
          <ClassificationBadge classification={diff.classification} />
        </div>
      </div>
      {diff.hasPredecessor ? (
        diff.fields.length > 0 ? (
          <DiffFieldList fields={diff.fields} />
        ) : (
          <p className="text-xs text-text-tertiary">
            <Trans>Identical to last year — no field changes.</Trans>
          </p>
        )
      ) : (
        <p className="text-xs text-text-tertiary">
          <Trans>No prior-year equivalent — review cold.</Trans>
        </p>
      )}
    </section>
  )
}

function ClassificationBadge({ classification }: { classification: RuleDiff['classification'] }) {
  if (classification === 'date_only') {
    return (
      <Badge variant="success" size="sm">
        <Trans>Date-only</Trans>
      </Badge>
    )
  }
  if (classification === 'substantive') {
    return (
      <Badge variant="warning" size="sm">
        <Trans>Awaiting review</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" size="sm">
      <Trans>New</Trans>
    </Badge>
  )
}

function ReviewReasonBadge({ reason }: { reason: RuleReviewTaskReason }) {
  const { t } = useLingui()
  // Same `t`-in-a-Record idiom as coverage-tab's skipReasonLabels — exhaustive
  // over the reason union, so a new reason forces a label here.
  const labels: Record<RuleReviewTaskReason, string> = {
    new_template: t`New template`,
    source_changed: t`Source changed`,
    pulse_signal: t`Flagged by an alert`,
    custom_edit: t`Custom edit`,
    annual_review: t`Annual catalog refresh`,
  }
  return (
    <Badge variant="outline" size="sm">
      {labels[reason]}
    </Badge>
  )
}

function DiffFieldList({ fields }: { fields: readonly RuleFieldDiff[] }) {
  return (
    <ul className="flex flex-col divide-y divide-divider-subtle">
      {fields.map((field) => (
        <li
          key={field.field}
          className="grid grid-cols-[minmax(0,8rem)_1fr] items-baseline gap-x-3 gap-y-0.5 py-1.5"
        >
          <span className="truncate text-xs font-medium text-text-secondary">
            {fieldLabel(field.field)}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
            <span className="text-text-tertiary line-through">
              {formatFieldValue(field.field, field.before)}
            </span>
            <ArrowRightIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
            <span
              className={cn(
                'min-w-0 text-text-primary',
                field.kind === 'substantive' && 'font-medium text-text-warning',
              )}
            >
              {formatFieldValue(field.field, field.after)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// Field labels are engineer-facing rule terminology (mirrors the un-localized
// rule ids / form names elsewhere on this surface), kept in plain English.
const FIELD_LABELS: Record<string, string> = {
  dueDateLogic: 'Due date',
  extensionPolicy: 'Extension',
  jurisdiction: 'Jurisdiction',
  formName: 'Form',
  eventType: 'Event',
  taxType: 'Tax type',
  entityApplicability: 'Applies to',
  isFiling: 'Filing',
  isPayment: 'Payment',
  ruleTier: 'Tier',
  riskLevel: 'Risk',
  requiresApplicabilityReview: 'Applicability review',
  applicableYear: 'Filing year',
  taxYear: 'Tax year',
  version: 'Version',
  nextReviewOn: 'Next review',
  verifiedAt: 'Verified',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatFieldValue(field: string, value: unknown): string {
  if (field === 'dueDateLogic') {
    const parsed = DueDateLogicSchema.safeParse(value)
    if (parsed.success) return humanizeDueDateLogic(parsed.data)
  }
  return formatGenericValue(value)
}

function formatGenericValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value.length > 0 ? value : '—'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((entry) => formatGenericValue(entry)).join(', ') : '—'
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${formatGenericValue(entry)}`)
      .join(' · ')
  }
  // Unreachable for JSON rule data (all cases handled above); dash-fallback
  // for any non-serializable leftover keeps oxlint's no-base-to-string happy.
  return '—'
}
