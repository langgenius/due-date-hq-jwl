import type { ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  Link2Icon,
  PlayIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import type { DryRunSummary, DuplicateHandling } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatMigrationErrorMessage, useMappingTargetLabels } from './mapping-target-labels'

interface Step4Props {
  summary: DryRunSummary | null
  duplicateHandling: DuplicateHandling
  onDuplicateHandlingChange: (next: DuplicateHandling) => void
  isUpdatingPreview?: boolean
}

/**
 * Step 4 Dry-Run preview per [02-ux §7].
 *
 * The Import CTA is rendered in the WizardShell footer; this body owns the
 * counts, skipped-row visibility, and safety checks before `migration.apply`.
 *
 * The dry-run modal body uses a gray (#f2f4f7 → bg-background-section) surface
 * with white cards. The step root full-bleeds a section-gray background over
 * the wizard body and renders each group as a white bordered card. The hero
 * uses an inline divided 3-metric grid; the dedup control is a segmented pill
 * (Skip duplicates / Import as new). The Applied-success surface is built in
 * Wizard.tsx as `SuccessModal`.
 */
export function Step4Preview({
  summary,
  duplicateHandling,
  onDuplicateHandlingChange,
  isUpdatingPreview = false,
}: Step4Props) {
  const { t } = useLingui()
  const targetLabels = useMappingTargetLabels()
  const clientCount = summary?.clientsToCreate ?? 0
  const obligationCount = summary?.obligationsToCreate ?? 0
  const historicalDeadlinesSkipped = summary?.historicalDeadlinesSkipped ?? 0
  const rolledForwardDeadlines = summary?.rolledForwardDeadlines ?? 0
  const skipped = summary?.skippedRows ?? 0
  const ruleReviewWarnings = summary?.ruleReviewWarnings ?? []
  const ruleReviewStateSummaries = buildRuleReviewStateSummaries(ruleReviewWarnings)
  const affectedReviewClients = ruleReviewStateSummaries.reduce(
    (sum, stateSummary) => sum + stateSummary.affectedClientCount,
    0,
  )
  const clientsPreview = summary?.clientsPreview ?? []
  const previewMoreCount = Math.max(0, clientCount - clientsPreview.length)
  const conflicts = summary?.clientConflicts ?? []

  return (
    // Full-bleed the section-gray body over the wizard's px-4 body padding so
    // the dry-run step reads as a gray surface with white cards.
    <div className="-mx-4 flex min-h-full flex-col gap-3.5 bg-background-section px-4 py-5">
      {/* Hero "READY TO IMPORT" eyebrow + an inline divided 3-metric grid
          (clients to create / already in list / deadlines to generate). */}
      <div className="flex flex-col gap-3 rounded-xl border border-divider-regular bg-background-default p-5">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 text-caption-xs font-semibold tracking-eyebrow text-text-success uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-state-success-solid" />
            <Trans>Ready to import</Trans>
          </span>
          <p className="text-item-title text-text-primary">
            <Trans>You&apos;re about to create:</Trans>
          </p>
        </div>
        {/* While a dedup-toggle re-run is in flight the counts below are stale.
            Dim + pulse the grid (and mark it aria-busy) so the numbers read as
            "refreshing" instead of silently snapping to new values when the
            dry-run returns. */}
        <div
          aria-busy={isUpdatingPreview}
          className={cn(
            'grid grid-cols-3 divide-x divide-divider-regular transition-opacity',
            isUpdatingPreview && 'animate-pulse opacity-50',
          )}
        >
          <HeroMetric
            value={clientCount}
            unit={<Trans>Clients</Trans>}
            sub={<Trans>to create</Trans>}
          />
          <HeroMetric
            value={conflicts.length}
            unit={<Trans>Already</Trans>}
            sub={<Trans>in your client list</Trans>}
            muted
          />
          <HeroMetric
            value={obligationCount}
            unit={<Trans>Deadlines</Trans>}
            sub={<Trans>to generate</Trans>}
          />
        </div>
      </div>

      {/* Secondary import facts (skipped / historical / rolled-forward) stay
          a quiet list below the hero metric grid. */}
      <ul className="flex flex-col gap-1.5 text-base empty:hidden">
        {skipped > 0 ? (
          <li className="flex items-center gap-2 text-text-tertiary">
            <PlayIcon className="size-3" aria-hidden />
            <Plural
              value={skipped}
              one="# row will be skipped (see errors)"
              other="# rows will be skipped (see errors)"
            />
          </li>
        ) : null}
        {historicalDeadlinesSkipped > 0 ? (
          <li className="flex items-center gap-2 text-text-tertiary">
            <PlayIcon className="size-3" aria-hidden />
            <Plural
              value={historicalDeadlinesSkipped}
              one="# historical deadline could not be created"
              other="# historical deadlines could not be created"
            />
          </li>
        ) : null}
        {rolledForwardDeadlines > 0 ? (
          <li className="flex items-center gap-2 text-text-tertiary">
            <PlayIcon className="size-3" aria-hidden />
            <Plural
              value={rolledForwardDeadlines}
              one="# past deadline will be created as the next monitoring deadline"
              other="# past deadlines will be created as next monitoring deadlines"
            />
          </li>
        ) : null}
      </ul>

      {/* Per-client preview — "confirm by outcome, not by schema". Shows the
          actual clients the import will create with their deadline counts, so
          a CPA verifies their client list rather than DueDateHQ's field map.
          Flows in the wizard-body scroll (no inner scrollbar, per the
          errors-list rationale below). */}
      {clientsPreview.length > 0 ? (
        <section
          aria-label={t`Clients to create`}
          className="flex flex-col gap-2 rounded-xl border border-divider-regular bg-background-default p-4"
        >
          <h3 className="text-xs font-medium tracking-eyebrow text-text-secondary uppercase">
            <Trans>Clients to create</Trans>
          </h3>
          <ul className="flex flex-col divide-y divide-divider-subtle text-sm">
            {clientsPreview.map((client) => (
              <li
                key={client.ein ?? client.name}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5"
              >
                <span className="font-medium text-text-primary">{client.name}</span>
                <span className="flex flex-wrap items-center gap-x-1.5 text-text-tertiary tabular-nums">
                  {client.entityType ? (
                    <span>{formatEntityTypeLabel(client.entityType)}</span>
                  ) : null}
                  {client.state ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{client.state}</span>
                    </>
                  ) : null}
                  {client.ein ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-mono">{client.ein}</span>
                    </>
                  ) : null}
                </span>
                <span className="ml-auto shrink-0 text-text-secondary tabular-nums">
                  <Plural value={client.obligationCount} one="# deadline" other="# deadlines" />
                </span>
              </li>
            ))}
          </ul>
          {previewMoreCount > 0 ? (
            <p className="text-xs text-text-tertiary tabular-nums">
              <Plural value={previewMoreCount} one="+ # more client" other="+ # more clients" />
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Re-import dedup: imported rows whose EIN matches an existing client.
          Default is Skip (no duplicates created); the user can switch to
          "Import as new", which re-runs the dry-run with the new counts. */}
      {conflicts.length > 0 ? (
        <section
          aria-label={t`Clients already in your list`}
          className="flex flex-col gap-2.5 rounded-xl border border-divider-regular bg-background-default p-4"
        >
          {/* Header row pairs the "Duplicates · N detected" title (copy icon)
              with the segmented dedup control on the trailing edge. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <CopyIcon className="size-3.5 text-text-secondary" aria-hidden />
              <Trans>Already in your client list</Trans>
            </h3>
            <DuplicateSegmentedControl
              value={duplicateHandling}
              disabled={isUpdatingPreview}
              onChange={onDuplicateHandlingChange}
            />
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {conflicts.map((conflict) => (
              <li
                key={conflict.ein || conflict.incomingName}
                className="flex flex-wrap items-center gap-1.5"
              >
                <Link2Icon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
                <span className="font-medium text-text-primary">{conflict.incomingName}</span>
                {conflict.ein ? (
                  <span className="font-mono text-text-tertiary tabular-nums">{conflict.ein}</span>
                ) : null}
                <span className="text-text-tertiary">
                  <Trans>matches {conflict.existingClientName}</Trans>
                </span>
              </li>
            ))}
          </ul>
          <span className="text-xs italic text-text-tertiary">
            {duplicateHandling === 'skip' ? (
              <Trans>Duplicates won&apos;t be imported.</Trans>
            ) : (
              <Trans>Duplicates will be created as new clients.</Trans>
            )}
          </span>
        </section>
      ) : null}

      {/* The heading "Before you import" names the moment so the three
          concrete reassurances ("undo for 24h", "audit captures every AI
          decision", "no emails sent") land as preconditions rather than as a
          generic safety footer. */}
      <section
        aria-label={t`Before you import`}
        className="flex flex-col gap-2 rounded-xl border border-divider-regular bg-background-default p-4"
      >
        {/* Step 7 onboarding F6-20: heading copy from "Safety" →
            "Before you import" so the bullets land as preconditions,
            not as a generic footer. Step 1-5 reaudit canonicalized
            tracking — keep `tracking-eyebrow` token, not arbitrary. */}
        <h3 className="text-xs font-medium tracking-eyebrow text-text-secondary uppercase">
          <Trans>Before you import</Trans>
        </h3>
        <ul className="flex flex-col gap-1.5 text-base text-text-primary">
          <li className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-text-success" aria-hidden />
            <Trans>Undo this import for 24 hours — the audit log records every change</Trans>
          </li>
          {/* No info-icon — the bullet text already paraphrases the concept;
              audit-trail detail belongs on the audit page, not in a passing
              safety bullet. */}
          <li className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-text-success" aria-hidden />
            <Trans>The audit log records every mapping and value change</Trans>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-text-success" aria-hidden />
            <Trans>No emails will be sent automatically</Trans>
          </li>
        </ul>
      </section>

      {/* One sentence naming what `Import & Generate` produces — the user
          already confirmed the inputs in Steps 2-3, so restating mappings /
          suggestions / rules here is noise. */}
      <Alert role="status" aria-live="polite">
        <AlertTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4" aria-hidden />
          <Trans>Ready to generate deadlines</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            Import &amp; Generate creates the clients, deadlines, evidence, and audit records listed
            above.
          </Trans>
        </AlertDescription>
      </Alert>

      {ruleReviewWarnings.length > 0 ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-4" aria-hidden />
            <Trans>Some state deadlines need rule review</Trans>
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-secondary">
                <Plural
                  value={affectedReviewClients}
                  one="# client has state deadlines waiting on rule review."
                  other="# clients have state deadlines waiting on rule review."
                />
              </p>
              <p className="text-sm text-text-tertiary">
                <Trans>
                  Federal deadlines and state deadlines with active rules will still be generated.
                </Trans>
              </p>
              <ul className="divide-y divide-divider-subtle rounded-lg border border-divider-regular text-sm text-text-primary">
                {ruleReviewStateSummaries.map((stateSummary) => (
                  <li
                    key={stateSummary.state}
                    className="grid gap-1 px-2 py-2 sm:grid-cols-[auto_1fr]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium tabular-nums">
                        {stateSummary.state}
                      </span>
                      <span className="text-text-secondary">
                        <Plural
                          value={stateSummary.affectedClientCount}
                          one="# client"
                          other="# clients"
                        />
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-secondary">
                      <span>{stateSummary.entityLabels.join(', ')}</span>
                      <span aria-hidden>·</span>
                      <span>
                        <Plural
                          value={stateSummary.taxTypeCount}
                          one="# state rule type"
                          other="# state rule types"
                        />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-text-tertiary">
                <Trans>
                  Review these states in Rule Library to unlock the remaining deadlines.
                </Trans>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {summary && summary.errors.length > 0 ? (
        <Alert variant="destructive" data-slot="step4-bad-rows">
          <AlertTriangleIcon />
          <AlertTitle>
            <Plural
              value={summary.errors.length}
              one="# row needs review"
              other="# rows need review"
            />
          </AlertTitle>
          {/*
            Day-3 acceptance: bad rows are listed in full so the user can
            audit "good rows still flow through" without leaving the wizard.
            Cap with max-height + scroll so 1000-row imports stay usable.
          */}
          {/* No inner scroll cap — letting the ul flow into the WizardShell
              body's scroll keeps a single scrollbar for the whole step. */}
          <AlertDescription>
            <ul className="flex flex-col gap-1 text-base text-text-primary">
              {summary.errors.map((err) => (
                <li key={err.id} className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    <Trans>Row {err.rowIndex + 1}</Trans>
                  </span>
                  <span className="text-sm">{formatMigrationErrorMessage(err, targetLabels)}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

/**
 * Inline hero metric (design xotna grid cell): big tabular value, uppercase
 * unit key, and a quiet supporting sub-label. Cells sit in a 3-col grid with
 * vertical dividers between them.
 */
function HeroMetric({
  value,
  unit,
  sub,
  muted = false,
}: {
  value: number
  unit: ReactNode
  sub: ReactNode
  muted?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
      <span
        className={cn(
          'text-2xl font-semibold leading-none tracking-tight tabular-nums',
          muted ? 'text-text-secondary' : 'text-text-primary',
        )}
      >
        {value}
      </span>
      <span className="text-caption-xs font-semibold tracking-eyebrow text-text-muted uppercase">
        {unit}
      </span>
      <span className="text-caption font-medium text-text-secondary">{sub}</span>
    </div>
  )
}

/**
 * Dedup control — the canonical `Segmented` primitive (flat track, white
 * active pill via fill + hairline border, no shadow, rounded-lg). Replaces a
 * prior hand-rolled `role="radio"` pill group that drifted to `rounded-full` +
 * `shadow-xs`. The option strings ("Skip duplicates" / "Import as new") are
 * unchanged so Step4Preview.test.tsx still matches.
 */
function DuplicateSegmentedControl({
  value,
  disabled,
  onChange,
}: {
  value: DuplicateHandling
  disabled: boolean
  onChange: (next: DuplicateHandling) => void
}) {
  const { t } = useLingui()
  return (
    <Segmented<DuplicateHandling>
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      size="sm"
      ariaLabel={t`How to handle duplicate clients`}
      options={[
        { value: 'skip', label: <Trans>Skip duplicates</Trans> },
        { value: 'import_as_new', label: <Trans>Import as new</Trans> },
      ]}
    />
  )
}

interface RuleReviewStateSummary {
  state: string
  affectedClientCount: number
  entityLabels: string[]
  taxTypeCount: number
}

function buildRuleReviewStateSummaries(
  warnings: NonNullable<DryRunSummary['ruleReviewWarnings']>,
): RuleReviewStateSummary[] {
  const byState = new Map<
    string,
    {
      entityCounts: Map<string, number>
      taxTypes: Set<string>
    }
  >()

  for (const warning of warnings) {
    const stateSummary = byState.get(warning.state) ?? {
      entityCounts: new Map<string, number>(),
      taxTypes: new Set<string>(),
    }
    const currentEntityCount = stateSummary.entityCounts.get(warning.entityType) ?? 0
    stateSummary.entityCounts.set(
      warning.entityType,
      Math.max(currentEntityCount, warning.affectedClientCount),
    )
    for (const taxType of warning.taxTypes) stateSummary.taxTypes.add(taxType)
    byState.set(warning.state, stateSummary)
  }

  return Array.from(byState.entries())
    .map(([state, summary]) => ({
      state,
      affectedClientCount: Array.from(summary.entityCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      entityLabels: Array.from(summary.entityCounts.keys())
        .map(formatEntityTypeLabel)
        .toSorted((a, b) => a.localeCompare(b)),
      taxTypeCount: summary.taxTypes.size,
    }))
    .toSorted((a, b) => a.state.localeCompare(b.state))
}

function formatEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case 'c_corp':
      return 'C corp'
    case 's_corp':
      return 'S corp'
    case 'partnership':
      return 'Partnership'
    case 'llc':
      return 'LLC'
    case 'individual':
      return 'Individual'
    case 'trust':
      return 'Trust'
    case 'sole_prop':
      return 'Sole prop'
    case 'nonprofit':
      return 'Nonprofit'
    default:
      return entityType
  }
}
