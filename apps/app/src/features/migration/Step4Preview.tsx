import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, CheckCircle2Icon, PlayIcon, ShieldCheckIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DryRunSummary } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'

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
  const skipped = summary?.skippedRows ?? 0
  const ruleReviewWarnings = summary?.ruleReviewWarnings ?? []
  const ruleReviewStates = uniqueStrings(ruleReviewWarnings.map((warning) => warning.state))
  const affectedReviewClients = ruleReviewWarnings.reduce(
    (sum, warning) => sum + warning.affectedClientCount,
    0,
  )
  const ruleReviewHref = buildRuleReviewHref(ruleReviewStates)

  return (
    <div className="flex flex-col gap-5 py-5">
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

      <ul className="flex flex-col gap-1.5 text-md">
        <li className="flex items-center gap-2 font-mono tabular-nums">
          <PlayIcon className="size-3 text-text-accent" aria-hidden />
          <Plural value={clientCount} one="# client" other="# clients" />
        </li>
        <li className="flex items-center gap-2 font-mono tabular-nums">
          <PlayIcon className="size-3 text-text-accent" aria-hidden />
          <Plural
            value={obligationCount}
            one="# deadline (full tax year)"
            other="# deadlines (full tax year)"
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
      </ul>

      <section
        aria-label={t`Safety`}
        className="flex flex-col gap-2 rounded-lg border border-divider-regular bg-background-section p-3"
      >
        <h3 className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
          <Trans>Safety</Trans>
        </h3>
        <ul className="flex flex-col gap-1.5 text-md text-text-primary">
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
            <Trans>Review rules before some state deadlines can be generated</Trans>
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>
                <Plural
                  value={affectedReviewClients}
                  one="# client has state tax types that need active practice rules before those state deadlines can be generated."
                  other="# clients have state tax types that need active practice rules before those state deadlines can be generated."
                />
              </p>
              <ul className="flex flex-col gap-1 text-sm text-text-primary">
                {ruleReviewWarnings.map((warning) => (
                  <li key={`${warning.state}:${warning.entityType}:${warning.reason}`}>
                    <span className="font-mono text-xs tabular-nums">{warning.state}</span>
                    <span> · {warning.entityType}</span>
                    <span> · </span>
                    <Plural value={warning.affectedClientCount} one="# client" other="# clients" />
                    <span> · {warning.taxTypes.join(', ')}</span>
                  </li>
                ))}
              </ul>
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                className="w-fit"
                render={<Link to={ruleReviewHref} />}
              >
                <Trans>Review rules</Trans>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {summary && summary.errors.length > 0 ? (
        <section
          className="flex flex-col gap-2 rounded-lg border border-divider-regular bg-components-badge-bg-red-soft p-3"
          data-slot="step4-bad-rows"
        >
          <h3 className="text-xs font-medium tracking-[0.08em] text-text-destructive uppercase">
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
          </h3>
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
          <ul className="flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1 text-md text-text-primary">
            {summary.errors.map((err) => (
              <li key={err.id} className="flex items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-text-secondary">
                  <Trans>Row {err.rowIndex + 1}</Trans>
                </span>
                <span className="text-sm">{formatMigrationErrorMessage(err, targetLabels)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function buildRuleReviewHref(states: readonly string[]): string {
  const params = new URLSearchParams({ view: 'rules', library: 'pending_review' })
  if (states.length === 1) params.set('jur', states[0]!)
  return `/rules/library?${params.toString()}`
}
