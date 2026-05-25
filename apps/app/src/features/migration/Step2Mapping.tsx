import { Plural, Trans, useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import {
  ChevronDownIcon,
  CircleHelpIcon,
  ListChecksIcon,
  RefreshCwIcon,
  SparklesIcon,
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
 * Step 2 AI Mapping — pixel-perfect per [02-ux §5].
 *
 * Columns: Your column → DueDateHQ field · Confidence · Sample · Edit
 * EIN star is permanent, confidence three tiers (H/M/L), low-confidence rows
 * tinted, fallback banner up top.
 */
export function Step2Mapping({ mapping, sampleByHeader, errors, onUserEdit, onRerun }: Step2Props) {
  const { t } = useLingui()
  const targetLabels = useMappingTargetLabels()

  const lowConfCount = mapping.rows.filter(
    (r) => typeof r.confidence === 'number' && r.confidence < 0.8 && r.targetField !== 'IGNORE',
  ).length

  const avgConfidence =
    mapping.rows.length > 0
      ? Math.round(
          (mapping.rows
            .filter((r) => typeof r.confidence === 'number')
            .reduce((sum, r) => sum + (r.confidence ?? 0), 0) /
            Math.max(1, mapping.rows.filter((r) => typeof r.confidence === 'number').length)) *
            100,
        )
      : null

  const einDetected = mapping.rows.some(
    (r) =>
      r.targetField === 'client.ein' && typeof r.confidence === 'number' && r.confidence >= 0.8,
  )
  const ignoredCount = mapping.rows.filter((r) => r.targetField === 'IGNORE').length
  const allIgnoreFallback =
    mapping.status === 'fallback' && mapping.fallback === 'all_ignore' && ignoredCount > 0

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
          {/* 2026-05-25 (Wizard #40 copy polish): dropped
              "and confirm" — that's the Continue button's job
              one row down. Heading should name the action,
              not the action+commit. */}
          <h2 className="text-lg font-semibold text-text-primary">
            <Trans>Review the column mapping</Trans>
          </h2>
          <MappingCapabilityBadge mapping={mapping} />
        </div>
        <div className="flex items-center justify-between gap-3">
          {/* 2026-05-25 (Wizard #40 copy polish): leads with the
              number (the actual signal), drops "Average" which
              just delays it. EIN detection collapsed from a
              binary 100% / 0% (which reads like a real percentage)
              to a simple "EIN found" tag shown only when true. */}
          <p className="text-md text-text-secondary">
            {avgConfidence !== null ? (
              <Trans>
                <span className="font-mono tabular-nums">{avgConfidence}%</span> average confidence
                {einDetected ? ' · EIN found' : null}
              </Trans>
            ) : (
              <Trans>Run the mapper to see confidence stats.</Trans>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRerun}
            disabled={mapping.status === 'loading'}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {mapping.rows.some((r) => r.userOverridden) ? (
              <Trans>Re-run AI with my overrides</Trans>
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
                We couldn&apos;t reach AI. Using your selected import template — review and edit as
                needed.
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
                  value={ignoredCount}
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

      {lowConfCount > 0 ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            {/* 2026-05-25 (Wizard #40 cross-step polish): dropped
                "your" — canonical phrase across all 4 steps is
                bare "needs review" (Step 3 dropped "human",
                Step 4 will drop "attention"). */}
            <Plural
              value={lowConfCount}
              one="# column needs review"
              other="# columns need review"
            />
          </AlertTitle>
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
        <div className="overflow-hidden rounded-lg border border-divider-regular">
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
              {mapping.rows.map((row, idx) => {
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
                      <ConfidenceBadge tier={tier} confidence={row.confidence} />
                    </TableCell>
                    <TableCell className="max-w-[120px] font-mono text-xs tabular-nums wrap-break-word whitespace-normal text-text-secondary">
                      {sample}
                    </TableCell>
                    <TableCell>
                      <EditPopover
                        current={row.targetField}
                        sourceHeader={row.sourceHeader}
                        targetLabels={targetLabels}
                        onChange={(target) => updateRow(idx, { targetField: target })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

type Tier = 'high' | 'medium' | 'low' | 'none'

function MappingCapabilityBadge({ mapping }: { mapping: MapperState }) {
  const { t } = useLingui()

  if (mapping.status === 'fallback' && mapping.fallback === 'preset') {
    return (
      <MappingCapabilityHelp
        label={t`Explain import template suggestions`}
        title={t`Import template suggestions mean AI was unavailable and the selected import template filled defaults.`}
        badge={
          <Badge variant="destructive">
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
        <Badge variant="destructive">
          <SparklesIcon data-icon="inline-start" />
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
        <TooltipContent className="max-w-[280px] text-text-destructive whitespace-normal">
          {children}
        </TooltipContent>
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

function ConfidenceBadge({ tier, confidence }: { tier: Tier; confidence: number | null }) {
  if (tier === 'none' || confidence === null) {
    return <span className="text-xs text-text-tertiary">—</span>
  }
  const pct = Math.round(confidence * 100)
  const styles: Record<Exclude<Tier, 'none'>, string> = {
    high: 'bg-state-accent-hover-alt text-text-accent border-state-accent-active',
    medium: 'bg-background-subtle text-text-secondary border-divider-regular',
    low: 'bg-components-badge-bg-warning-soft text-text-primary border-divider-regular',
  }
  const label: Record<Exclude<Tier, 'none'>, string> = {
    high: 'H',
    medium: 'M',
    low: 'L',
  }
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md border px-1.5 font-mono text-xs tabular-nums',
        styles[tier],
      )}
    >
      <span>{pct}%</span>
      <span className="font-semibold">[{label[tier]}]</span>
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
      <div className="max-h-[280px] overflow-y-auto border-t border-divider-subtle">
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
