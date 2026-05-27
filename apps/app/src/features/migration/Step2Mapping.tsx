import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useState, type ReactNode } from 'react'
import {
  Astroid,
  ChevronDownIcon,
  CircleHelpIcon,
  ListChecksIcon,
  RefreshCwIcon,
  StarIcon,
} from 'lucide-react'

import {
  MappingTargetSchema,
  type MappingRow,
  type MappingTarget,
  type MigrationError,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  formatMigrationErrorMessage,
  getAlphabetizedMappingTargets,
  useMappingTargetLabels,
} from './mapping-target-labels'
import { buildMappingSummary } from './migration-summary-view-model'
import type { MapperState } from './state'
import { SummaryMetric } from './SummaryMetric'

interface Step2Props {
  mapping: MapperState
  /** Sample row data → header → first cell content for the Sample column. */
  sampleByHeader: Record<string, string>
  /**
   * Mapping-stage bad rows (EIN_INVALID / EMPTY_NAME / etc). Surfaced in a
   * collapsible panel so the user can see "good rows still flow through" at
   * the moment the AI mapper finishes (Day 3 acceptance).
   */
  errors?: MigrationError[]
  onUserEdit: (rows: MappingRow[]) => void
  onRerun: () => void
}

/**
 * Step 2 AI Mapping.
 *
 * The main path is a summary of the AI-prepared draft. The editable column
 * table stays available on demand for advanced review and fallback recovery.
 */
export function Step2Mapping({ mapping, sampleByHeader, errors, onUserEdit, onRerun }: Step2Props) {
  const targetLabels = useMappingTargetLabels()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const summary = buildMappingSummary(mapping.rows, errors ?? [])
  const allIgnoreFallback =
    mapping.status === 'fallback' &&
    mapping.fallback === 'all_ignore' &&
    summary.hasOnlyIgnoredColumns

  function updateRow(idx: number, patch: Partial<MappingRow>) {
    const next = mapping.rows.map((row, i) =>
      i === idx ? { ...row, ...patch, userOverridden: true } : row,
    )
    onUserEdit(next)
  }

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">
            <Trans>AI prepared your columns</Trans>
          </h2>
          <MappingCapabilityBadge mapping={mapping} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-base text-text-secondary">
            <Trans>
              DueDateHQ matched the upload to import fields. Open details only if something looks
              off.
            </Trans>
          </p>
          {/* 2026-05-26 (Step 7 onboarding audit F6-14): the
              override-label "Re-run AI with my overrides"
              implies a stronger guarantee than the server gives
              (overrides are passed as hints, not guaranteed
              preserved). Softened to "Re-run AI (keep my
              changes)" so the verb is clear and the parenthetical
              describes the intent, not a contract. */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRerun}
            disabled={mapping.status === 'loading'}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {mapping.rows.some((r) => r.userOverridden) ? (
              <Trans>Re-run AI (keep my changes)</Trans>
            ) : (
              <Trans>Re-run AI</Trans>
            )}
          </Button>
        </div>
      </div>

      {mapping.status === 'loading' ? null : <MappingSummaryGrid summary={summary} />}

      {mapping.status === 'fallback' ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          {/* 2026-05-25 (Wizard #40 copy polish): alert titles
              should be punchy — the AlertDescription below
              already explains the fallback. */}
          <AlertTitle>
            <Trans>AI mapping unavailable</Trans>
          </AlertTitle>
          <AlertDescription>
            {mapping.fallback === 'preset' ? (
              <Trans>
                Automatic field matching is unavailable. We used the selected import template and
                kept the import draft editable.
              </Trans>
            ) : (
              <Trans>
                We couldn&apos;t reach AI and no preset was selected. Please map columns manually
                before continuing.
              </Trans>
            )}
            {allIgnoreFallback ? (
              <span className="mt-2 block font-medium text-text-primary">
                <Plural
                  value={summary.ignoredColumns}
                  one="# column is currently ignored."
                  other="# columns are currently ignored."
                />
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {mapping.errorBanner ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>Couldn't map columns</Trans>
          </AlertTitle>
          <AlertDescription>{mapping.errorBanner}</AlertDescription>
        </Alert>
      ) : null}

      {summary.lowConfidenceColumns > 0 ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Plural
              value={summary.lowConfidenceColumns}
              one="# column needs review"
              other="# columns need review"
            />
          </AlertTitle>
          <AlertDescription>
            <Trans>
              These columns are still included in the import draft. Open details to adjust them.
            </Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {errors && errors.length > 0 ? (
        <BadRowsPanel errors={errors} targetLabels={targetLabels} />
      ) : null}

      {mapping.status === 'loading' ? (
        <div className="grid gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
        </div>
      ) : (
        <section className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-background-section p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                <Trans>Column details</Trans>
              </h3>
              <p className="text-sm text-text-secondary">
                <Trans>
                  The import draft is ready. Details stay available for advanced review.
                </Trans>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? (
                <Trans>Hide column details</Trans>
              ) : (
                <Trans>Review column details</Trans>
              )}
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          </div>
          {detailsOpen ? (
            <MappingDetailsTable
              rows={mapping.rows}
              sampleByHeader={sampleByHeader}
              targetLabels={targetLabels}
              onChange={updateRow}
            />
          ) : null}
        </section>
      )}
    </div>
  )
}

function MappingSummaryGrid({ summary }: { summary: ReturnType<typeof buildMappingSummary> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryMetric
        label={<Trans>Columns used</Trans>}
        value={<Plural value={summary.mappedColumns} one="# column" other="# columns" />}
      />
      <SummaryMetric
        label={<Trans>Ignored</Trans>}
        value={<Plural value={summary.ignoredColumns} one="# column" other="# columns" />}
      />
      <SummaryMetric
        label={<Trans>Confidence</Trans>}
        value={summary.averageConfidence === null ? '—' : `${summary.averageConfidence}%`}
      />
      {/* 2026-05-27 (Step 7 onboarding audit F6-13): the EIN
          "Found / Not found" card had visual prominence
          (its own slot in a 5-up grid) but no explanation. A
          first-time user couldn't tell why EIN deserved its own
          card. Added a tooltip + visible help marker on the
          label so the reason ("EIN drives penalty risk
          forecasting") is one hover away. The SummaryMetric
          primitive is shared across multiple steps, so the
          help affordance lives inside the `label` slot here
          rather than wrapping the whole tile. */}
      <SummaryMetric
        label={
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  aria-label="EIN — required for penalty risk forecasting"
                >
                  <span>
                    <Trans>EIN</Trans>
                  </span>
                  <CircleHelpIcon className="size-3 text-text-tertiary" aria-hidden />
                </button>
              }
            />
            <TooltipContent className="max-w-[260px] whitespace-normal">
              <Trans>Required for penalty risk forecasting.</Trans>
            </TooltipContent>
          </Tooltip>
        }
        value={summary.einDetected ? <Trans>Found</Trans> : <Trans>Not found</Trans>}
      />
      <SummaryMetric
        label={<Trans>Exceptions</Trans>}
        value={
          <Plural
            value={summary.lowConfidenceColumns + summary.badRows}
            _0="None"
            one="# item"
            other="# items"
          />
        }
      />
    </div>
  )
}

function MappingDetailsTable({
  rows,
  sampleByHeader,
  targetLabels,
  onChange,
}: {
  rows: readonly MappingRow[]
  sampleByHeader: Record<string, string>
  targetLabels: Record<MappingTarget, string>
  onChange: (idx: number, patch: Partial<MappingRow>) => void
}) {
  const { t } = useLingui()

  return (
    <div
      className="overflow-hidden rounded-lg border border-divider-regular"
      data-slot="step2-column-details"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">{t`Your column`}</TableHead>
            <TableHead aria-hidden className="w-[24px]">
              →
            </TableHead>
            <TableHead className="w-[180px]">{t`DueDateHQ field`}</TableHead>
            <TableHead className="w-[120px]">{t`Confidence`}</TableHead>
            <TableHead>{t`Sample`}</TableHead>
            <TableHead className="w-[88px]" aria-hidden />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const tier = confidenceTier(row.confidence, row.targetField)
            const sample = sampleByHeader[row.sourceHeader] ?? '—'
            return (
              <TableRow
                key={row.sourceHeader}
                className={cn('h-9', tier === 'low' && 'bg-components-badge-bg-warning-soft')}
              >
                <TableCell className="font-medium">{row.sourceHeader}</TableCell>
                <TableCell aria-hidden className="text-text-tertiary">
                  →
                </TableCell>
                <TableCell className="text-xs font-medium text-text-primary">
                  <span className="inline-flex items-center gap-1">
                    {row.targetField === 'IGNORE' ? (
                      <span className="italic text-text-tertiary">{targetLabels.IGNORE}</span>
                    ) : (
                      <>
                        {targetLabels[row.targetField]}
                        {row.targetField === 'client.ein' ? (
                          <StarIcon className="size-3 text-text-accent" aria-label="EIN" />
                        ) : null}
                      </>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  {/* Step 9 F-012: when a user overrides the AI mapping
                      for a row, show "Overridden" chip instead of the
                      confidence pill so an AI re-run can't silently
                      clobber their work. (HEAD's name for the badge
                      is `MappingConfidenceTier`, not `ConfidenceBadge`
                      which is the name Step 9 used.) */}
                  {row.userOverridden ? (
                    <span className="inline-flex h-5 items-center rounded-md border border-state-accent-active-alt bg-state-accent-hover px-1.5 text-xs font-medium uppercase tracking-wide text-text-accent">
                      <Trans>Overridden</Trans>
                    </span>
                  ) : (
                    <MappingConfidenceTier tier={tier} confidence={row.confidence} />
                  )}
                </TableCell>
                <TableCell className="max-w-[120px] font-mono text-xs tabular-nums wrap-break-word whitespace-normal text-text-secondary">
                  {sample}
                </TableCell>
                <TableCell>
                  <EditPopover
                    current={row.targetField}
                    sourceHeader={row.sourceHeader}
                    targetLabels={targetLabels}
                    onChange={(target) => onChange(idx, { targetField: target })}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

type Tier = 'high' | 'medium' | 'low' | 'none'

function MappingCapabilityBadge({ mapping }: { mapping: MapperState }) {
  const { t } = useLingui()

  // 2026-05-26 (Step 7 onboarding audit F6-11): every variant
  // here was `variant="destructive"` — including the success
  // case ("AI Mapper"). All three states therefore rendered in
  // the same red/orange tone, so the badge encoded zero state
  // information visually. Mapped each state to its semantic
  // variant: AI success → outline (calm, not destructive),
  // template-fallback → outline (informational), all-ignore
  // (manual) → destructive (genuine warning, action required).

  if (mapping.status === 'fallback' && mapping.fallback === 'preset') {
    return (
      <MappingCapabilityHelp
        label={t`Explain import template suggestions`}
        title={t`Import template suggestions mean AI was unavailable and the selected import template filled defaults.`}
        badge={
          <Badge variant="outline">
            <ListChecksIcon data-icon="inline-start" />
            <Trans>Import template</Trans>
          </Badge>
        }
      >
        <Trans>
          Import template suggestions mean AI was unavailable and the selected import template
          filled defaults.
        </Trans>
      </MappingCapabilityHelp>
    )
  }

  if (mapping.status === 'fallback' && mapping.fallback === 'all_ignore') {
    return (
      <MappingCapabilityHelp
        label={t`Explain Manual mapping`}
        title={t`Manual mapping means no AI or import template result was available.`}
        badge={
          <Badge variant="destructive">
            <BadgeStatusDot tone="error" />
            <Trans>Manual mapping</Trans>
          </Badge>
        }
      >
        <Trans>Manual mapping means no AI or import template result was available.</Trans>
      </MappingCapabilityHelp>
    )
  }

  return (
    <MappingCapabilityHelp
      label={t`Explain AI Mapper`}
      title={t`AI Mapper means AI suggested the fields.`}
      badge={
        // Step 9 F-001/F-014: SparklesIcon → canonical Astroid AI
        // provenance icon. Sparkles reserved for billing/opportunities.
        // Variant kept at `outline` (HEAD) instead of Step 9's
        // `destructive` — destructive = red in this design system,
        // which would falsely flag AI mapping as an error per the
        // Step 7 audit's similar fix on MappingCapabilityBadge.
        <Badge variant="outline">
          <Astroid data-icon="inline-start" />
          <Trans>AI Mapper</Trans>
        </Badge>
      }
    >
      <Trans>AI Mapper means AI suggested the fields.</Trans>
    </MappingCapabilityHelp>
  )
}

function MappingCapabilityHelp({
  badge,
  label,
  title,
  children,
}: {
  badge: ReactNode
  label: string
  title: string
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={label}
              title={title}
              // 2026-05-25 (info-icon audit recolor): the help
              // icon's `text-text-destructive` belonged to the
              // adjacent "Manual mapping" badge, not to the
              // "click to learn what this means" affordance.
              // Standardized to the same tertiary-tone hit
              // area the canonical ConceptHelp uses elsewhere.
              // The tooltip body keeps its warning tone — that's
              // the "you should look at this" context, separate
              // from the icon's calm affordance.
              className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <CircleHelpIcon className="size-3.5" aria-hidden />
            </button>
          }
        />
        {/* 2026-05-26 (Step 7 onboarding audit F6-12): tooltip
            body was `text-text-destructive` — applied to every
            capability state including the success case. Tooltip
            now uses default body text; the badge variant
            (destructive vs outline, set by the caller) carries
            the state signal. */}
        <TooltipContent className="max-w-[280px] whitespace-normal">{children}</TooltipContent>
      </Tooltip>
    </span>
  )
}

function confidenceTier(c: number | null, target: MappingTarget): Tier {
  if (target === 'IGNORE') return 'none'
  if (c === null) return 'none'
  if (c >= 0.95) return 'high'
  if (c >= 0.8) return 'medium'
  return 'low'
}

function MappingConfidenceTier({ tier, confidence }: { tier: Tier; confidence: number | null }) {
  if (tier === 'none' || confidence === null) {
    return <span className="text-xs text-text-tertiary">—</span>
  }
  const pct = Math.round(confidence * 100)
  const styles: Record<Exclude<Tier, 'none'>, string> = {
    high: 'bg-state-accent-hover-alt text-text-accent border-state-accent-active',
    medium: 'bg-background-subtle text-text-secondary border-divider-regular',
    low: 'bg-components-badge-bg-warning-soft text-text-primary border-divider-regular',
  }
  // 2026-05-26 (Step 7 onboarding audit F6-10): the bracketed
  // `[H]/[M]/[L]` tier letter was redundant with the percentage
  // and color and read as a code label, not a tier signal. A
  // CPA user already gets the tier from the percent + color;
  // the letter was duplicate cognitive load. Dropped from the
  // visual; kept as `title` for hover + AT exposure.
  const tierTitle: Record<Exclude<Tier, 'none'>, string> = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  }
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md border px-1.5 font-mono text-xs tabular-nums',
        styles[tier],
      )}
      title={tierTitle[tier]}
    >
      <span>{pct}%</span>
    </span>
  )
}

interface EditPopoverProps {
  current: MappingTarget
  sourceHeader: string
  targetLabels: Record<MappingTarget, string>
  onChange: (next: MappingTarget) => void
}

/**
 * Bad-rows panel for Step 2.
 *
 * Reads the `migration_error` rows the server already persists for the
 * deterministic checks (EIN_INVALID, EMPTY_NAME). Surfacing them here
 * makes the "bad rows do not block good rows" invariant visible at the
 * mapping step instead of hiding it until Step 4.
 */
function BadRowsPanel({
  errors,
  targetLabels,
}: {
  errors: MigrationError[]
  targetLabels: Record<MappingTarget, string>
}) {
  return (
    <details
      className="overflow-hidden rounded-lg border border-divider-regular bg-background-section"
      data-slot="step2-bad-rows"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-text-primary">
        <span className="flex items-center gap-2">
          <Plural value={errors.length} one="# row needs attention" other="# rows need attention" />
        </span>
        <span className="text-xs text-text-tertiary">
          <Trans>Open</Trans>
        </span>
      </summary>
      {/* 2026-05-26 (Yuqi scrollbar audit): dropped
          `max-h-[280px] overflow-y-auto`. The bad-rows table
          was nested inside the WizardShell body's own
          overflow-y-auto, so capping it forced a second
          scrollbar 280px tall whenever the list was longer.
          The whole point of opening the `<details>` is to
          scan errors — letting them flow into the wizard
          body's scroll lets the user use one scroll wheel
          for the whole step. */}
      <div className="border-t border-divider-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">
                <Trans>Row</Trans>
              </TableHead>
              <TableHead>
                <Trans>Reason</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((err) => (
              <TableRow key={err.id}>
                <TableCell className="font-mono text-xs tabular-nums">{err.rowIndex + 1}</TableCell>
                <TableCell className="text-text-secondary">
                  {formatMigrationErrorMessage(err, targetLabels)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  )
}

function EditPopover({ current, sourceHeader, targetLabels, onChange }: EditPopoverProps) {
  const alphabetizedTargets = getAlphabetizedMappingTargets(targetLabels)

  // Base UI types `onValueChange` as `(value: any) => void`; validate the
  // payload at runtime to keep the public API strictly typed.
  function handleValueChange(next: unknown) {
    const parsed = MappingTargetSchema.safeParse(next)
    if (parsed.success) onChange(parsed.data)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="xs">
            <Trans>Edit</Trans>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-60" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <Trans>Map &quot;{sourceHeader}&quot; to…</Trans>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup value={current} onValueChange={handleValueChange}>
          {alphabetizedTargets.map((target) => (
            <DropdownMenuRadioItem key={target} value={target} className="text-sm">
              {targetLabels[target]}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="IGNORE" className="text-sm">
            {targetLabels.IGNORE}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
