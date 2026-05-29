import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, CheckCircle2Icon, PlayIcon, ShieldCheckIcon } from 'lucide-react'

import type { DryRunSummary } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'

import { formatMigrationErrorMessage, useMappingTargetLabels } from './mapping-target-labels'

interface Step4Props {
  summary: DryRunSummary | null
}

/**
 * Step 4 Dry-Run preview per [02-ux §7].
 *
 * The Import CTA is rendered in the WizardShell footer; this body owns the
 * counts, skipped-row visibility, and safety checks before `migration.apply`.
 */
export function Step4Preview({ summary }: Step4Props) {
  const { t } = useLingui()
  const targetLabels = useMappingTargetLabels()
  const clientCount = summary?.clientsToCreate ?? 0
  const obligationCount = summary?.obligationsToCreate ?? 0
  const historicalDeadlinesSkipped = summary?.historicalDeadlinesSkipped ?? 0
  const skipped = summary?.skippedRows ?? 0
  const ruleReviewWarnings = summary?.ruleReviewWarnings ?? []
  const ruleReviewStateSummaries = buildRuleReviewStateSummaries(ruleReviewWarnings)
  const affectedReviewClients = ruleReviewStateSummaries.reduce(
    (sum, stateSummary) => sum + stateSummary.affectedClientCount,
    0,
  )

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary">
          <Trans>Ready to import</Trans>
        </h2>
        {/* 2026-05-25 (Wizard #40 copy polish): added terminal
            colon — sentence was trailing off into the list below
            with no punctuation. */}
        <p className="text-sm text-text-secondary">
          <Trans>You&apos;re about to create:</Trans>
        </p>
      </div>

      {/* 2026-05-26 (Step 7 onboarding audit F6-19): the list
          was `font-mono tabular-nums` on the whole item, so the
          "X clients" / "X deadlines" copy read as a build log.
          Step 4 is the user's commit moment — they want a
          human-readable summary, not terminal output. Kept
          `tabular-nums` for the numeral itself (alignment) but
          dropped `font-mono` from the row so the surrounding
          words look like prose. Step 1-5 reaudit canonicalized
          `text-md` → `text-base` (same 14px). */}
      <ul className="flex flex-col gap-1.5 text-base">
        <li className="flex items-center gap-2 tabular-nums">
          <PlayIcon className="size-3 text-text-accent" aria-hidden />
          <Plural value={clientCount} one="# client" other="# clients" />
        </li>
        <li className="flex items-center gap-2 tabular-nums">
          <PlayIcon className="size-3 text-text-accent" aria-hidden />
          <Plural
            value={obligationCount}
            one="# deadline to monitor"
            other="# deadlines to monitor"
          />
        </li>
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
              one="# historical deadline before monitoring start will be skipped"
              other="# historical deadlines before monitoring start will be skipped"
            />
          </li>
        ) : null}
      </ul>

      {/* 2026-05-26 (Step 7 onboarding audit F6-20): heading was
          "Safety" — so abstract it read as throat-clearing.
          The three bullets are concrete reassurances ("undo
          for 24h", "audit captures every AI decision", "no
          emails sent"). Heading now names the moment ("Before
          you import") so the bullets land as preconditions
          rather than as a generic safety footer. */}
      <section
        aria-label={t`Before you import`}
        className="flex flex-col gap-2 rounded-lg border border-divider-regular bg-background-section p-3"
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
            <Trans>This import can be undone for 24 hours and keeps an audit record</Trans>
          </li>
          {/* 2026-05-25 (info-icon audit): unwrapped — the
              bullet text already paraphrases the concept;
              audit-trail detail belongs on the audit page,
              not in a passing safety bullet. */}
          <li className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-text-success" aria-hidden />
            <Trans>Audit log captures every AI decision</Trans>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-text-success" aria-hidden />
            <Trans>No emails will be sent automatically</Trans>
          </li>
        </ul>
      </section>

      {/* 2026-05-25 (Wizard #40 length fix): two trims here.
          Title: "your deadline list" → "deadlines" (the CTA right
          below this alert already says "Import & Generate", so
          "your deadline list" is two redundant words).
          Body: the original alert ran 38 words across two
          sentences threading mappings, suggestions, rules, AND
          listing every output type. Cut to one sentence naming
          what `Import & Generate` produces — the user already
          confirmed the inputs in Steps 2-3, restating them here
          is noise. */}
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
                  one="# client has state deadlines that need reviewed practice rules first."
                  other="# clients have state deadlines that need reviewed practice rules first."
                />
              </p>
              <p className="text-sm text-text-tertiary">
                <Trans>
                  Federal deadlines and state deadlines with active rules will still be generated.
                </Trans>
              </p>
              <ul className="divide-y divide-divider-subtle rounded-md border border-divider-regular text-sm text-text-primary">
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
        /* 2026-05-26 (step-1.5 reaudit): hand-rolled <section> with
           `bg-components-badge-bg-red-soft` replaced with the canonical
           `<Alert variant="destructive">` primitive. Visual delta is
           the Alert primitive's leading destructive icon + the
           components-badge → components-alert background swap. The
           previous auditor's `848727dd` (C-deeper) ran exactly this
           migration for 2 hand-rolled error blocks in obligations.tsx
           but missed this third sibling in the migration wizard. */
        <Alert variant="destructive" data-slot="step4-bad-rows">
          <AlertTriangleIcon />
          <AlertTitle>
            {/* 2026-05-25 (Wizard #40 cross-step polish): aligned
                with the canonical "needs review" phrase used in
                Step 2 + Step 3. "Needs attention" was the lone
                outlier across 4 steps that all describe the same
                concept. */}
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
          {/* 2026-05-25 (Wizard #40 i18n bug): row marker was a
              bare English `row N` <span> that never went through
              Trans. Step 2's BadRowsPanel renders `Row`
              (capitalised, Trans-wrapped) — aligning here so
              both surfaces match. */}
          {/* 2026-05-26 (Yuqi scrollbar audit): dropped
              `max-h-[320px] overflow-y-auto pr-1`. Nested
              inside the WizardShell body scroll — the inner
              cap forced a second scrollbar with a 4px right
              inset. Letting the ul flow into the wizard
              body's scroll means one scroll wheel for the
              whole step. The list is still inside a section
              the user has to scroll to reach, so it's not in
              the way at the top of the step. */}
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
