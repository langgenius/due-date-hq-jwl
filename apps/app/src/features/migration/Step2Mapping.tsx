import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Astroid,
  ChevronDownIcon,
  CircleHelpIcon,
  ListChecksIcon,
  RefreshCwIcon,
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

import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'

import {
  formatMigrationErrorMessage,
  getAlphabetizedMappingTargets,
  useMappingTargetLabels,
  type MappingTargetLabels,
} from './mapping-target-labels'
import { buildMappingSummary } from './migration-summary-view-model'
import type { MapperState } from './state'

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
 * Step 2 — Mapping.
 *
 * 2026-05-27 (Yuqi banner-row redesign): every mapping row is a single
 * clickable banner. Tap the row to expand inline samples + data type.
 * The destination field has an always-visible inline "Change" text link;
 * confidence is plain text (no traffic-light dots / badges). Rows
 * needing attention (unmapped / low confidence) float to the top so
 * the user works the small set before scrolling past the auto-mapped
 * majority. The old "Review column details" toggle is gone — every
 * row is already its own review affordance.
 */
export function Step2Mapping({ mapping, sampleByHeader, errors, onUserEdit, onRerun }: Step2Props) {
  const { t } = useLingui()
  const targetLabels = useMappingTargetLabels()
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

  // Stable indices so onUserEdit dispatch still references the original
  // mapping.rows position after we sort attention-first for display.
  const orderedRows = useMemo(() => {
    return mapping.rows
      .map((row, idx) => ({ row, idx }))
      .toSorted((a, b) => {
        const priorityA = attentionPriority(a.row)
        const priorityB = attentionPriority(b.row)
        if (priorityA !== priorityB) return priorityA - priorityB
        return a.idx - b.idx
      })
  }, [mapping.rows])

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* 2026-05-29 (Yuqi — wizard title hierarchy): step h2 from
              text-lg → text-base. The wizard frame title "Import
              clients" above is the MASTER for this card; each step's
              h2 (here, on Step 3, and on Step 4) describes the
              current step's outcome — child of the master. Sized
              one notch down so the master title wins the visual
              weight and the step h2 reads as a sub-section. */}
          <h2 className="text-base font-semibold text-text-primary">
            <Trans>AI prepared your columns</Trans>
          </h2>
          <MappingCapabilityBadge mapping={mapping} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-secondary tabular-nums">
            <MappingHeadline summary={summary} status={mapping.status} />
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

      {errors && errors.length > 0 ? (
        <BadRowsPanel errors={errors} targetLabels={targetLabels} />
      ) : null}

      {mapping.status === 'loading' ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-3/4" />
        </div>
      ) : (
        <ul
          aria-label={t`Column mappings`}
          className="flex flex-col gap-1.5"
          data-slot="step2-mapping-rows"
        >
          {orderedRows.map(({ row, idx }) => (
            <MappingBannerRow
              key={row.sourceHeader}
              row={row}
              sample={sampleByHeader[row.sourceHeader] ?? null}
              targetLabels={targetLabels}
              onChange={(target) => updateRow(idx, { targetField: target })}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Single-sentence headline that replaces the old 5-tile SummaryMetric grid.
 *
 * 2026-05-27 (Yuqi): five tall colored tiles ("Columns used / Ignored /
 * Confidence / EIN / Exceptions") were the loudest thing on the step and
 * none of them were what the user needed to act on. Collapsed to one
 * quiet text-tertiary readout in the step header. The exact counts live
 * inside each banner row.
 */
function MappingHeadline({
  summary,
  status,
}: {
  summary: ReturnType<typeof buildMappingSummary>
  status: MapperState['status']
}) {
  if (status === 'loading') {
    return <Trans>Matching your columns to DueDateHQ fields…</Trans>
  }

  const needsReview = summary.lowConfidenceColumns
  const ignored = summary.ignoredColumns
  const mapped = summary.mappedColumns

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className="font-medium text-text-primary">
        <Plural value={mapped} one="# column mapped" other="# columns mapped" />
      </span>
      <span aria-hidden className="text-text-tertiary">
        ·
      </span>
      <span className={needsReview > 0 ? 'text-text-primary' : 'text-text-secondary'}>
        <Plural value={needsReview} _0="0 need review" one="# needs review" other="# need review" />
      </span>
      <span aria-hidden className="text-text-tertiary">
        ·
      </span>
      <span className="text-text-secondary">
        <Plural value={ignored} _0="0 ignored" one="# ignored" other="# ignored" />
      </span>
    </span>
  )
}

/**
 * Banner row — the new shape of a mapping. Each row is a full-width,
 * ≥56px tall, click-to-expand banner. The header reads:
 *
 *   [Source column]  →  [DueDateHQ field]  [Change →]  [Auto-mapped · 95%]  [▾]
 *
 * Expanded body shows: 5 source-value samples + destination data type.
 */
function MappingBannerRow({
  row,
  sample,
  targetLabels,
  onChange,
}: {
  row: MappingRow
  sample: string | null
  targetLabels: MappingTargetLabels
  onChange: (next: MappingTarget) => void
}) {
  const { t } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const tier = confidenceTier(row.confidence, row.targetField)
  const needsAttention = tier === 'low' || row.targetField === 'IGNORE'
  const destinationLabel =
    row.targetField === 'IGNORE' ? targetLabels.IGNORE : targetLabels[row.targetField]
  const samples = parseSamples(sample)

  return (
    <li
      className={cn(
        'overflow-hidden rounded-lg border border-divider-regular bg-background-surface transition-colors',
        needsAttention && 'border-divider-strong bg-background-section',
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-h-14 items-center gap-3 px-3 py-2 text-left outline-none transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
          {row.sourceHeader}
        </span>
        <span aria-hidden className="text-sm text-text-tertiary">
          →
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {row.targetField === 'IGNORE' ? (
            <span className="truncate text-sm italic text-text-tertiary">{destinationLabel}</span>
          ) : (
            <span className="truncate text-sm font-medium text-text-primary">
              {destinationLabel}
            </span>
          )}
          {/* Inline "Change" text link — always visible, no icon. */}
          <ChangeDestinationLink
            current={row.targetField}
            sourceHeader={row.sourceHeader}
            targetLabels={targetLabels}
            onChange={onChange}
          />
        </span>
        <ConfidenceText row={row} tier={tier} />
        <ChevronDownIcon
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-text-tertiary transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] },
            }}
            className="overflow-hidden border-t border-divider-subtle"
          >
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Sample values</Trans>
                </span>
                {samples.length > 0 ? (
                  <ul className="flex flex-col gap-0.5 font-mono text-xs tabular-nums text-text-secondary">
                    {dedupeSamples(samples).map((value) => (
                      <li key={value} className="truncate">
                        {value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-tertiary">
                    <Trans>No sample values available.</Trans>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 sm:items-end">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Data type</Trans>
                </span>
                <span className="text-xs text-text-secondary">
                  {destinationDataTypeLabel(row.targetField, t)}
                </span>
                {row.userOverridden ? (
                  <span className="text-xs text-text-accent">
                    <Trans>You changed this mapping.</Trans>
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  )
}

/**
 * "Change →" inline text link that opens a dropdown to repick the
 * destination field. Plain text, no icon — see the design brief.
 */
function ChangeDestinationLink({
  current,
  sourceHeader,
  targetLabels,
  onChange,
}: {
  current: MappingTarget
  sourceHeader: string
  targetLabels: MappingTargetLabels
  onChange: (next: MappingTarget) => void
}) {
  const alphabetizedTargets = getAlphabetizedMappingTargets(targetLabels)

  function handleValueChange(next: unknown) {
    const parsed = MappingTargetSchema.safeParse(next)
    if (parsed.success) onChange(parsed.data)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            // Click on the inline "Change" must not toggle the parent
            // banner's expanded state — that would either dismiss the
            // dropdown immediately or hide the row body the user just
            // opened. Stop propagation at the trigger.
            onClick={(event) => event.stopPropagation()}
            className="shrink-0 rounded-sm px-1 text-xs font-medium text-text-accent outline-none transition-colors hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Change →</Trans>
          </button>
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

/**
 * Confidence rendered as PLAIN TEXT — no dot, no traffic-light badge.
 * "Auto-mapped · 95%" / "Low match · 62%" / "Overridden" / "Ignored".
 *
 * Tone is carried by `text-text-tertiary` vs `text-text-primary`, never
 * by a colored chip.
 */
function ConfidenceText({ row, tier }: { row: MappingRow; tier: Tier }) {
  if (row.userOverridden) {
    return (
      <span className="shrink-0 text-xs text-text-accent tabular-nums">
        <Trans>Overridden</Trans>
      </span>
    )
  }
  if (row.targetField === 'IGNORE') {
    return (
      <span className="shrink-0 text-xs text-text-tertiary">
        <Trans>Ignored</Trans>
      </span>
    )
  }
  if (row.confidence === null) {
    return (
      <span className="shrink-0 text-xs text-text-tertiary">
        <Trans>Unmapped</Trans>
      </span>
    )
  }
  const pct = Math.round(row.confidence * 100)
  if (tier === 'low') {
    return (
      <span className="shrink-0 text-xs text-text-primary tabular-nums">
        <Trans>Low match · {pct}%</Trans>
      </span>
    )
  }
  return (
    <span className="shrink-0 text-xs text-text-tertiary tabular-nums">
      <Trans>Auto-mapped · {pct}%</Trans>
    </span>
  )
}

type Tier = 'high' | 'medium' | 'low' | 'none'

function confidenceTier(c: number | null, target: MappingTarget): Tier {
  if (target === 'IGNORE') return 'none'
  if (c === null) return 'none'
  if (c >= 0.95) return 'high'
  if (c >= 0.8) return 'medium'
  return 'low'
}

/** Sort key: lower = higher in list. Unmapped + low-confidence float up. */
function attentionPriority(row: MappingRow): number {
  if (row.targetField === 'IGNORE') return 2 // ignored mid-pack: not urgent, not "done"
  if (row.confidence === null) return 0 // unmapped — top priority
  if (row.confidence < 0.8) return 1 // low confidence — needs review
  return 3 // auto-mapped, high confidence — quiet
}

/**
 * Parse the sample-by-header value (which today is a single string —
 * the first cell) into up to 5 lines, splitting on `\n` or `, ` so a
 * pre-joined sample list still renders nicely.
 */
function parseSamples(sample: string | null): string[] {
  if (sample === null || sample === '' || sample === '—') return []
  const parts = sample
    .split(/\n|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.slice(0, 5)
}

/** Stable key dedupe for the sample list — keeps first occurrence. */
function dedupeSamples(samples: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of samples) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

/**
 * Quiet, plain-language data-type hint. Used inside the expanded
 * banner body. No icons. The goal is to confirm the user's mental
 * model ("I'm mapping a name field, this expects text").
 */
function destinationDataTypeLabel(
  target: MappingTarget,
  t: ReturnType<typeof useLingui>['t'],
): ReactNode {
  // 2026-06-01: route the IGNORE em-dash through the canonical
  // EmptyCellMark primitive so screen readers announce "Ignored column"
  // instead of "dash".
  if (target === 'IGNORE') return <EmptyCellMark label={t`Ignored column`} />

  if (target === 'client.ein') return <Trans>EIN · ##-#######</Trans>
  if (target === 'client.state') return <Trans>US state code · 2 letters</Trans>
  if (target === 'client.filing_states') return <Trans>List of US state codes</Trans>
  if (target === 'client.entity_type') return <Trans>Entity type · enum</Trans>
  if (target === 'client.tax_types') return <Trans>Tax types · list</Trans>
  if (target === 'client.postal_code') return <Trans>ZIP / postal code</Trans>
  if (target === 'client.email' || target === 'client.primary_contact_email') {
    return <Trans>Email address</Trans>
  }
  if (target === 'client.primary_phone') return <Trans>Phone number</Trans>
  if (target === 'client.fiscal_year_end') return <Trans>Date · MM-DD</Trans>
  if (target.startsWith('penalty.') && target.endsWith('_count')) {
    return <Trans>Whole number</Trans>
  }
  if (
    target === 'penalty.tax_due' ||
    target === 'penalty.payments_and_credits' ||
    target === 'penalty.gross_receipts' ||
    target === 'penalty.installments' ||
    target === 'penalty.wa_subtotal_minus_credits' ||
    target === 'penalty.tx_prior_year_franchise_tax' ||
    target === 'penalty.tx_current_year_franchise_tax' ||
    target === 'penalty.fl_tentative_tax' ||
    target === 'penalty.ny_ptet_payments' ||
    target === 'client.estimated_tax_liability'
  ) {
    return <Trans>Currency · number</Trans>
  }
  if (target === 'penalty.period_start' || target === 'penalty.period_end') {
    return <Trans>Date · YYYY-MM-DD</Trans>
  }
  if (target === 'penalty.annual_report_no_tax_due' || target === 'penalty.ny_ptet_election_made') {
    return <Trans>Yes / no</Trans>
  }
  return <Trans>Free text</Trans>
}

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
              className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <CircleHelpIcon className="size-3.5" aria-hidden />
            </button>
          }
        />
        <TooltipContent className="max-w-[280px] whitespace-normal">{children}</TooltipContent>
      </Tooltip>
    </span>
  )
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
  targetLabels: MappingTargetLabels
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
