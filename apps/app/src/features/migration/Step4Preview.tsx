import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CheckCircle2Icon, PlayIcon, ShieldCheckIcon } from 'lucide-react'

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
  const skipped = summary?.skippedRows ?? 0

  return (
    <div className="flex flex-col gap-5 py-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary">
          <Trans>Ready to import</Trans>
        </h2>
        <p className="text-sm text-text-secondary">
          <Trans>You&apos;re about to create</Trans>
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

      <Alert role="status" aria-live="polite">
        <AlertTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4" aria-hidden />
          <Trans>Ready to generate your deadline list</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            The numbers above are computed from your confirmed mappings, tax type suggestions, and
            active practice rules. Import &amp; Generate will create clients, deadlines, evidence,
            and audit records.
          </Trans>
        </AlertDescription>
      </Alert>

      {summary && summary.errors.length > 0 ? (
        <section
          className="flex flex-col gap-2 rounded-lg border border-divider-regular bg-components-badge-bg-red-soft p-3"
          data-slot="step4-bad-rows"
        >
          <h3 className="text-xs font-medium tracking-[0.08em] text-text-destructive uppercase">
            <Plural
              value={summary.errors.length}
              one="# row needs attention"
              other="# rows need attention"
            />
          </h3>
          {/*
            Day-3 acceptance: bad rows are listed in full so the user can
            audit "good rows still flow through" without leaving the wizard.
            Cap with max-height + scroll so 1000-row imports stay usable.
          */}
          <ul className="flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1 text-md text-text-primary">
            {summary.errors.map((err) => (
              <li key={err.id} className="flex items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-text-secondary">
                  row {err.rowIndex + 1}
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
