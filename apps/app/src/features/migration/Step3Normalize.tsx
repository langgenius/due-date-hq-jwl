import { useMemo, useState, type ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, CheckCircle2Icon, ChevronDownIcon, ShieldCheckIcon } from 'lucide-react'

import type { MappingRow } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAppHotkey } from '@/components/patterns/keyboard-shell'
import { ConceptLabel } from '@/features/concepts/concept-help'

import type { NormalizeState } from './state'
import type { MatrixApplicationView } from './matrix-view'
import {
  buildMatrixSummary,
  buildNormalizationSummary,
  type NormalizationValueGroup,
} from './migration-summary-view-model'

interface Step3Props {
  normalize: NormalizeState
  matrix: MatrixApplicationView[]
  rawText?: string | undefined
  mappings?: readonly MappingRow[] | undefined
  onToggleApplyToAll: (key: string, value: boolean) => void
}

/**
 * Step 3 now treats normalization as an AI-prepared import draft.
 *
 * The ordinary path shows grouped outcomes and exceptions. The previous
 * per-value/table controls remain available behind explicit review affordances
 * so large imports do not become one-row-at-a-time cleanup work.
 */
export function Step3Normalize({
  normalize,
  matrix,
  rawText,
  mappings,
  onToggleApplyToAll,
}: Step3Props) {
  const [valueDetailsOpen, setValueDetailsOpen] = useState(false)
  const [matrixDetailsOpen, setMatrixDetailsOpen] = useState(false)
  const normalizationSummary = useMemo(
    () =>
      buildNormalizationSummary({
        normalizations: normalize.rows,
        rawText,
        mappings,
      }),
    [mappings, normalize.rows, rawText],
  )
  const matrixSummary = useMemo(() => buildMatrixSummary(matrix), [matrix])

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary">
          <Trans>AI cleaned your values</Trans>
        </h2>
        <p className="text-sm text-text-secondary">
          <Trans>
            Your uploaded file stays unchanged. DueDateHQ will use this clean import draft only
            after you import.
          </Trans>
        </p>
      </div>

      {normalize.errorBanner ? (
        <Alert role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>Couldn&apos;t organize some values</Trans>
          </AlertTitle>
          <AlertDescription>{normalize.errorBanner}</AlertDescription>
        </Alert>
      ) : null}

      {normalize.status === 'loading' ? (
        <div className="grid gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric
              label={<Trans>Value groups</Trans>}
              value={
                <Plural
                  value={normalizationSummary.totalGroups}
                  _0="None"
                  one="# group"
                  other="# groups"
                />
              }
            />
            <SummaryMetric
              label={<Trans>Ready</Trans>}
              value={
                <Plural
                  value={normalizationSummary.readyGroups}
                  _0="None"
                  one="# group"
                  other="# groups"
                />
              }
            />
            <SummaryMetric
              label={<Trans>Needs review</Trans>}
              value={
                <Plural
                  value={normalizationSummary.exceptionGroups}
                  _0="None"
                  one="# group"
                  other="# groups"
                />
              }
            />
            <SummaryMetric
              label={<Trans>Clients affected</Trans>}
              value={
                <Plural
                  value={normalizationSummary.affectedExceptionClients}
                  _0="None"
                  one="# client"
                  other="# clients"
                />
              }
            />
          </div>

          {normalizationSummary.exceptionGroups > 0 ? (
            <Alert role="status" aria-live="polite">
              <AlertTitle>
                <Plural
                  value={normalizationSummary.exceptionGroups}
                  one="# value group needs review"
                  other="# value groups need review"
                />
              </AlertTitle>
              <AlertDescription>
                <Plural
                  value={normalizationSummary.affectedExceptionClients}
                  one="# client is affected by a safe fallback."
                  other="# clients are affected by safe fallbacks."
                />
              </AlertDescription>
            </Alert>
          ) : null}

          <ValueGroupsSection
            groups={normalizationSummary.groups}
            expanded={valueDetailsOpen}
            onToggle={() => setValueDetailsOpen((open) => !open)}
          />
          <MatrixSummarySection
            matrix={matrix}
            summary={matrixSummary}
            expanded={matrixDetailsOpen}
            applyToAll={normalize.applyToAll}
            onToggleExpanded={() => setMatrixDetailsOpen((open) => !open)}
            onToggleApplyToAll={onToggleApplyToAll}
          />
        </>
      )}
    </div>
  )
}

function SummaryMetric({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="min-h-20 rounded-lg border border-divider-regular bg-background-section px-3 py-2">
      <div className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  )
}

function ValueGroupsSection({
  groups,
  expanded,
  onToggle,
}: {
  groups: readonly NormalizationValueGroup[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-background-section p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            <Trans>Cleaned value groups</Trans>
          </h3>
          <p className="text-sm text-text-secondary">
            <Trans>Repeated values are grouped, so large imports stay reviewable.</Trans>
          </p>
        </div>
        {groups.length > 0 ? (
          <Button variant="outline" size="sm" aria-expanded={expanded} onClick={onToggle}>
            {expanded ? <Trans>Show fewer groups</Trans> : <Trans>Review all groups</Trans>}
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-secondary">
          <Trans>No values needed cleanup for this import.</Trans>
        </p>
      ) : expanded ? (
        <ul className="flex flex-col divide-y divide-divider-regular">
          {groups.map((group) => (
            <ValueGroupRow
              key={`${group.field}:${group.normalizedValue ?? 'none'}:${group.rawValues.join('|')}`}
              group={group}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function ValueGroupRow({ group }: { group: NormalizationValueGroup }) {
  const { t } = useLingui()
  const fallback = group.usesFallback

  return (
    <li
      className={cn(
        'flex flex-col gap-2 py-3',
        fallback && 'bg-components-badge-bg-warning-soft -mx-3 px-3',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
          {formatFieldLabel(group.field, t)}
        </span>
        <span className="text-text-tertiary">·</span>
        <span className="text-xs text-text-secondary">
          <Plural value={group.affectedClientCount} one="# client" other="# clients" />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs tabular-nums text-text-primary">
          {formatRawValueList(group.rawValues)}
        </span>
        <span aria-hidden className="text-text-tertiary">
          →
        </span>
        <span className="inline-flex min-h-7 min-w-[120px] max-w-[260px] items-center rounded-md border border-divider-regular bg-background-body px-2 text-xs text-text-primary">
          {formatNormalizedValue(group)}
        </span>
        <EvidenceChip
          model={group.model}
          confidence={group.confidence}
          promptVersion={group.promptVersion}
        />
        <GroupStatus group={group} />
      </div>
    </li>
  )
}

function MatrixSummarySection({
  matrix,
  summary,
  expanded,
  applyToAll,
  onToggleExpanded,
  onToggleApplyToAll,
}: {
  matrix: readonly MatrixApplicationView[]
  summary: ReturnType<typeof buildMatrixSummary>
  expanded: boolean
  applyToAll: Record<string, boolean>
  onToggleExpanded: () => void
  onToggleApplyToAll: (key: string, value: boolean) => void
}) {
  const { t } = useLingui()
  if (matrix.length === 0) return null

  return (
    <section
      role="group"
      aria-label={t`Tax type defaults`}
      className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-background-section p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            <ConceptLabel concept="defaultMatrix">
              <Trans>Tax type defaults</Trans>
            </ConceptLabel>
          </h3>
          <p className="text-sm text-text-secondary">
            <Trans>Default tax types are ready for clients without tax types.</Trans>
          </p>
        </div>
        <Button variant="outline" size="sm" aria-expanded={expanded} onClick={onToggleExpanded}>
          {expanded ? (
            <Trans>Hide tax type defaults</Trans>
          ) : (
            <Trans>Adjust tax type defaults</Trans>
          )}
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric
          label={<Trans>Suggestions</Trans>}
          value={<Plural value={summary.enabledCells} one="# group" other="# groups" />}
        />
        <SummaryMetric
          label={<Trans>Clients covered</Trans>}
          value={<Plural value={summary.clientsCovered} one="# client" other="# clients" />}
        />
        <SummaryMetric
          label={<Trans>State review</Trans>}
          value={<Plural value={summary.reviewCells} _0="None" one="# group" other="# groups" />}
        />
        <SummaryMetric
          label={<Trans>Disabled</Trans>}
          value={<Plural value={summary.disabledCells} _0="None" one="# group" other="# groups" />}
        />
      </div>

      {summary.reviewCells > 0 ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Plural
              value={summary.reviewCells}
              one="# tax type group needs rule review"
              other="# tax type groups need rule review"
            />
          </AlertTitle>
          <AlertDescription>
            <Plural
              value={summary.reviewClients}
              one="# client will carry state-review context into the preview."
              other="# clients will carry state-review context into the preview."
            />
          </AlertDescription>
        </Alert>
      ) : null}

      {expanded ? (
        <MatrixControls matrix={matrix} applyToAll={applyToAll} onToggle={onToggleApplyToAll} />
      ) : null}
    </section>
  )
}

function MatrixControls({
  matrix,
  applyToAll,
  onToggle,
}: {
  matrix: readonly MatrixApplicationView[]
  applyToAll: Record<string, boolean>
  onToggle: (key: string, value: boolean) => void
}) {
  const { t } = useLingui()
  useAppHotkey(
    'A',
    () => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return
      const target = active.closest<HTMLElement>('[data-apply-to-all-key]')
      const key = target?.dataset.applyToAllKey
      if (!key) return
      onToggle(key, !(applyToAll[key] ?? true))
    },
    {
      requireReset: true,
      ignoreInputs: true,
      meta: {
        id: 'wizard.apply-to-all',
        name: 'Toggle suggested filings for this group',
        description: 'Toggle suggested filings for the focused tax type group in Step 3.',
        category: 'wizard',
        scope: 'overlay',
      },
    },
  )

  return (
    <div role="group" aria-label={t`Adjust tax type defaults`} className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-divider-regular">
        {matrix.map((cell) => {
          const key = `${cell.entityType}::${cell.state}`
          const checked = applyToAll[key] ?? true
          return (
            <li key={key} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-md text-text-primary">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                    {cell.entityType} × {cell.state}
                  </span>
                  <span className="text-text-tertiary">·</span>
                  <Plural value={cell.appliedClientCount} one="# client" other="# clients" />
                </span>
                <label
                  className="inline-flex cursor-pointer items-center gap-2 text-xs text-text-secondary"
                  data-apply-to-all-key={key}
                  aria-keyshortcuts="A"
                >
                  <Checkbox checked={checked} onCheckedChange={(value) => onToggle(key, value)} />
                  <Trans>Use suggested filings</Trans>
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {cell.taxTypes.map((taxType) => (
                  <span
                    key={taxType}
                    className="inline-flex h-5 items-center rounded-md border border-divider-regular bg-components-panel-bg px-1.5 font-mono tabular-nums text-text-secondary"
                  >
                    {taxType}
                  </span>
                ))}
                <EvidenceChip
                  model={null}
                  confidence={cell.confidence}
                  promptVersion={`matrix@${cell.matrixVersion}`}
                />
                {cell.needsReview ? (
                  <span className="inline-flex h-5 items-center gap-1 rounded-md border border-divider-regular bg-components-badge-bg-warning-soft px-1.5 text-xs text-text-primary">
                    <AlertTriangleIcon className="size-3" aria-hidden />
                    <Trans>Needs review</Trans>
                  </span>
                ) : (
                  <span
                    className="inline-flex h-5 items-center gap-1 rounded-md border border-divider-regular bg-background-subtle px-1.5 text-xs text-text-success"
                    aria-hidden
                  >
                    <ShieldCheckIcon className="size-3" />
                    <Trans>Verified</Trans>
                  </span>
                )}
                {cell.applicationMode === 'federal_return_type_plus_state' ? (
                  <span className="inline-flex h-5 items-center rounded-md border border-divider-regular bg-background-subtle px-1.5 text-xs text-text-secondary">
                    <Trans>State context added</Trans>
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GroupStatus({ group }: { group: NormalizationValueGroup }) {
  if (!group.usesFallback) {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-md border border-divider-regular bg-background-subtle px-1.5 text-xs text-text-success">
        <CheckCircle2Icon className="size-3" aria-hidden />
        <Trans>Ready</Trans>
      </span>
    )
  }
  return (
    <span
      className="inline-flex h-5 items-center gap-1 rounded-md border border-divider-regular bg-components-badge-bg-warning-soft px-1.5 text-xs text-text-primary"
      role="status"
    >
      <AlertTriangleIcon className="size-3" aria-hidden />
      <FallbackStatus group={group} />
    </span>
  )
}

function FallbackStatus({ group }: { group: NormalizationValueGroup }) {
  if (group.normalizedValue === null && group.field === 'state') {
    return <Trans>No state deadlines</Trans>
  }
  if (group.normalizedValue === null) {
    return <Trans>Not used</Trans>
  }
  if (group.field === 'entity_type' && group.normalizedValue === 'other') {
    return <Trans>Using Other</Trans>
  }
  return <Trans>Best match</Trans>
}

function formatFieldLabel(field: string, t: ReturnType<typeof useLingui>['t']): string {
  if (field === 'entity_type') return t`Entity type`
  if (field === 'state') return t`State`
  if (field === 'tax_types') return t`Tax types`
  return field
}

function formatRawValueList(values: readonly string[]): string {
  const visible = values.slice(0, 3).map((value) => `"${value}"`)
  const hidden = values.length - visible.length
  return hidden > 0 ? `${visible.join(' / ')} / +${hidden}` : visible.join(' / ')
}

function formatNormalizedValue(group: NormalizationValueGroup): string {
  if (!group.normalizedValue) return group.field === 'state' ? 'No state match' : 'Not recognized'
  if (group.field === 'entity_type') return formatEntityTypeLabel(group.normalizedValue)
  if (group.field === 'tax_types') return formatTaxTypes(group.normalizedValue)
  return group.normalizedValue
}

function formatTaxTypes(value: string): string {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      const values = parsed.filter((item): item is string => typeof item === 'string')
      if (values.length > 0) return values.join(', ')
    }
  } catch {
    return value
  }
  return value
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
    case 'other':
      return 'Other'
    default:
      return entityType
  }
}

function EvidenceChip({
  model,
  confidence,
  promptVersion,
}: {
  model: string | null
  confidence: number | null
  promptVersion: string | null
}) {
  if (!promptVersion && model === null && confidence === null) return null
  const isAi = model !== null
  const label = isAi ? 'AI' : 'Rules'
  return (
    <span
      className="inline-flex h-5 items-center gap-1 rounded-md border border-divider-regular bg-transparent px-1.5 font-mono text-xs tabular-nums text-text-secondary"
      title={label}
    >
      <span>{label}</span>
    </span>
  )
}
