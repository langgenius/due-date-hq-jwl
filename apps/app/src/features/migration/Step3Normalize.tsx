import { useMemo, useState, type ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'
import {
  TriangleAlertIcon,
  ArrowUpRightIcon,
  CircleCheckIcon,
  ChevronDownIcon,
  LockIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import type { MappingRow } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Switch } from '@duedatehq/ui/components/ui/switch'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

import { useAppHotkey } from '@/components/patterns/keyboard-shell'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
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
 * Step 3 renders the AI-prepared import draft as a small set of named
 * **categories** — Entity types, States, Tax types — each with a hero
 * count and inline banner rows. Categories auto-open when something
 * inside needs review and stay collapsed when fully matched, routing
 * attention without a wall of equal-weight rows.
 *
 * Tax type defaults sit visually one notch up (`bg-background-default`
 * over the section gray of the value categories) to signal a firm-level
 * "saved default" lean-back preference vs the lean-in per-row review
 * above. Per the design brief: no border-stripe or category color
 * accent is used — elevation/surface tone only.
 */
export function Step3Normalize({
  normalize,
  matrix,
  rawText,
  mappings,
  onToggleApplyToAll,
}: Step3Props) {
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
  const categories = useMemo(
    () => buildCategories(normalizationSummary.groups),
    [normalizationSummary.groups],
  )

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="flex flex-col gap-2">
        {/* "Standardized" (not "cleaned") is neutral and matches the step's
            own name ("Normalize") with no value judgment — "cleaned" implies
            the source data was dirty.

            Step h2 is text-base; the wizard frame title "Import clients" is
            text-lg (master), and step h2s sit one notch down as sub-sections.
            See Step 2 + WizardShell for the same rationale. */}
        <h2 className="text-base font-semibold text-text-primary">
          <Trans>AI standardized your values</Trans>
        </h2>
        {/* The file-stays-unchanged reassurance is a privacy claim ("we don't
            mutate your source data") — same role and shape as Step 1's
            SSN-block chip, so privacy reassurance reads consistently across
            the wizard. Privacy is information, not status — quiet inline line
            with a small lock icon, no chip surface. */}
        <p className="inline-flex w-fit items-center gap-1.5 text-sm text-text-tertiary">
          <LockIcon className="size-3.5 shrink-0" aria-hidden />
          <Trans>
            Your uploaded file stays unchanged — this standardized version is used only when you
            import.
          </Trans>
        </p>
      </div>

      {/* The happy path draws a flat FIELD/BEFORE/AFTER/STATUS table. We
          deliberately keep the collapsible category model (entity / state /
          tax types), which auto-opens categories needing review and stays
          collapsed when fully matched — this routes attention without a wall
          of equal-weight rows and is asserted by Step3Normalize.test.tsx
          (auto-expand, grouped rows, status copy "Using Other" / "No state
          deadlines"). The at-a-glance split is the NormalizePillStrip, the
          matrix toggle the MatrixDefaultsCard (Switch + "Edit defaults"), and
          the reassurance line below.
          TODO(data): an inline Step-3 "Re-run AI" (mirroring handleStep2Rerun
          against runNormalizerMutation) is not wired — surfaced in the
          report. */}
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
          {/* Prose readout kept sr-only (the chips + the category bar below are
              the visible count); stays in the DOM for a11y + tests so the screen
              isn't triple-counting the same "N values · all matched". */}
          <div className="sr-only">
            <SummaryReadout
              totalValues={countTotalValues(normalizationSummary.groups)}
              categoryCount={categories.length}
              needsReview={normalizationSummary.exceptionGroups}
              affectedClients={normalizationSummary.affectedExceptionClients}
            />
          </div>

          {/* At-a-glance count chips — the visible split. */}
          {categories.length > 0 || matrixSummary.enabledCells > 0 ? (
            <NormalizePillStrip
              autoNormalized={Math.max(
                0,
                countTotalValues(normalizationSummary.groups) -
                  normalizationSummary.exceptionGroups,
              )}
              confirm={normalizationSummary.exceptionGroups}
              defaultMatrix={matrixSummary.enabledCells}
            />
          ) : null}

          <CategoryList categories={categories} />

          <MatrixDefaultsCard
            matrix={matrix}
            summary={matrixSummary}
            applyToAll={normalize.applyToAll}
            onToggleApplyToAll={onToggleApplyToAll}
          />

          {/* Reassurance line — identical sentence to Step 2 (2026-06-12 polish):
              references the renamed final step ("confirm"), drops the
              "normalization" jargon, consistent across both steps. */}
          <p className="inline-flex w-fit items-center gap-1.5 text-sm text-text-tertiary">
            <ShieldCheckIcon className="size-3.5 shrink-0 text-text-success" aria-hidden />
            <Trans>
              Nothing&apos;s applied until you confirm — every change is logged and reversible for
              24 hours.
            </Trans>
          </p>
        </>
      )}
    </div>
  )
}

/**
 * Count chips per design JCrwD — Auto-normalized / Confirm / Default
 * Matrix split + "Audit logged" hint. Reuses Badge (success / warning /
 * outline) so tone is carried by canonical tokens.
 */
function NormalizePillStrip({
  autoNormalized,
  confirm,
  defaultMatrix,
}: {
  autoNormalized: number
  confirm: number
  defaultMatrix: number
}) {
  return (
    // Only the positive "Auto-normalized" count always shows; the Confirm /
    // Tax-type-defaults chips appear only when there's a non-zero count to act
    // on (a "· 0" chip is noise). "Audit logged" was dropped — the reassurance
    // line below already says every change is logged.
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="success" className="tabular-nums">
        <Trans>Auto-normalized · {autoNormalized}</Trans>
      </Badge>
      {confirm > 0 ? (
        <Badge variant="warning" className="tabular-nums">
          <Trans>Confirm · {confirm}</Trans>
        </Badge>
      ) : null}
      {defaultMatrix > 0 ? (
        <Badge variant="secondary" className="tabular-nums">
          {/* "Tax type defaults", not "Default Matrix" — names the same thing
              its own card below is titled (2026-06-12: "Matrix" is jargon). */}
          <Trans>Tax type defaults · {defaultMatrix}</Trans>
        </Badge>
      ) : null}
    </div>
  )
}

/**
 * Quiet one-sentence readout replacing the previous 4-tile
 * SummaryMetric grid. Numbers are tabular-nums and modest weight —
 * the hero numbers live inside each category card, not here.
 */
function SummaryReadout({
  totalValues,
  categoryCount,
  needsReview,
  affectedClients,
}: {
  totalValues: number
  categoryCount: number
  needsReview: number
  affectedClients: number
}) {
  if (categoryCount === 0) {
    return (
      <p className="text-sm text-text-secondary">
        <Trans>No values needed changes for this import.</Trans>
      </p>
    )
  }

  return (
    <p role="status" aria-live="polite" className="text-sm text-text-secondary tabular-nums">
      {needsReview > 0 ? (
        <Trans>
          <span className="font-medium text-text-primary">{totalValues}</span> values across{' '}
          <span className="font-medium text-text-primary">{categoryCount}</span> categories ·{' '}
          <span className="font-medium text-text-warning">{needsReview}</span> need review (
          <Plural value={affectedClients} one="# client" other="# clients" /> affected)
        </Trans>
      ) : (
        <Trans>
          <span className="font-medium text-text-primary">{totalValues}</span> values across{' '}
          <span className="font-medium text-text-primary">{categoryCount}</span> categories · all
          matched
        </Trans>
      )}
    </p>
  )
}

interface NormalizationCategory {
  field: string
  groups: NormalizationValueGroup[]
  totalValues: number
  needsReview: number
  totalClients: number
}

function buildCategories(groups: readonly NormalizationValueGroup[]): NormalizationCategory[] {
  const byField = new Map<string, NormalizationCategory>()
  for (const group of groups) {
    const existing = byField.get(group.field)
    if (existing) {
      existing.groups.push(group)
      existing.totalValues += group.valueCount
      existing.totalClients += group.affectedClientCount
      if (group.usesFallback) existing.needsReview += 1
    } else {
      byField.set(group.field, {
        field: group.field,
        groups: [group],
        totalValues: group.valueCount,
        needsReview: group.usesFallback ? 1 : 0,
        totalClients: group.affectedClientCount,
      })
    }
  }

  return Array.from(byField.values()).toSorted((a, b) => {
    // Categories needing review float to the top, then by client count.
    if (a.needsReview > 0 !== b.needsReview > 0) return a.needsReview > 0 ? -1 : 1
    return b.totalClients - a.totalClients || a.field.localeCompare(b.field)
  })
}

function countTotalValues(groups: readonly NormalizationValueGroup[]): number {
  return groups.reduce((sum, group) => sum + group.valueCount, 0)
}

function CategoryList({ categories }: { categories: NormalizationCategory[] }) {
  if (categories.length === 0) return null
  return (
    <ul className="flex flex-col gap-2" role="list">
      {categories.map((category) => (
        <li key={category.field}>
          <CategoryCard category={category} />
        </li>
      ))}
    </ul>
  )
}

function CategoryCard({ category }: { category: NormalizationCategory }) {
  const { t } = useLingui()
  // Default: collapsed when nothing needs review, expanded otherwise.
  // Routes attention to the categories that need a human glance.
  const [expanded, setExpanded] = useState<boolean>(category.needsReview > 0)
  const hero = formatCategoryHero(category.field, category.totalValues)
  const reviewLabel =
    category.needsReview > 0 ? (
      <Plural value={category.needsReview} one="# needs review" other="# need review" />
    ) : (
      <Trans>all matched</Trans>
    )

  return (
    <section
      className="rounded-lg border border-divider-subtle bg-background-section"
      aria-label={formatFieldLabel(category.field, t)}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-left outline-none transition-colors hover:bg-background-section-burn focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-semibold tabular-nums text-text-primary">
            {hero.count}
          </span>
          <span className="text-sm text-text-secondary">{hero.label}</span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span
            className={cn(
              'text-sm tabular-nums',
              category.needsReview > 0 ? 'font-medium text-text-warning' : 'text-text-secondary',
            )}
          >
            {reviewLabel}
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-text-tertiary transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="category-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: { duration: MOTION_DURATION.enter, ease: EASE_APPLE },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: MOTION_DURATION.exit, ease: EASE_APPLE },
            }}
            className="overflow-hidden"
          >
            <ul className="flex flex-col divide-y divide-divider-subtle border-t border-divider-subtle">
              {category.groups.map((group) => (
                <ValueGroupRow
                  key={`${group.field}:${group.normalizedValue ?? 'none'}:${group.rawValues.join('|')}`}
                  group={group}
                />
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

function ValueGroupRow({ group }: { group: NormalizationValueGroup }) {
  const fallback = group.usesFallback
  return (
    <li
      className={cn(
        'flex flex-col gap-1.5 px-4 py-3',
        fallback && 'bg-components-badge-bg-warning-soft',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs tabular-nums text-text-primary">
          {formatRawValueList(group.rawValues)}
        </span>
        <span aria-hidden className="text-text-tertiary">
          →
        </span>
        <span className="inline-flex min-h-7 min-w-[120px] max-w-[260px] items-center rounded-lg border border-divider-regular bg-background-default px-2 text-xs text-text-primary">
          {formatNormalizedValue(group)}
        </span>
        <GroupStatus group={group} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary tabular-nums">
        <span>
          <Plural value={group.affectedClientCount} one="# client" other="# clients" />
        </span>
        <EvidenceChip
          model={group.model}
          confidence={group.confidence}
          promptVersion={group.promptVersion}
        />
      </div>
    </li>
  )
}

/**
 * Tax-type defaults card. Visually one notch up from category cards
 * (white `bg-background-default` over their gray `bg-background-section`)
 * to signal a firm-level "saved default" vs lean-in per-row review.
 *
 * Per the design brief: NO border-stripe or accent color is used —
 * elevation/surface tone only.
 */
function MatrixDefaultsCard({
  matrix,
  summary,
  applyToAll,
  onToggleApplyToAll,
}: {
  matrix: readonly MatrixApplicationView[]
  summary: ReturnType<typeof buildMatrixSummary>
  applyToAll: Record<string, boolean>
  onToggleApplyToAll: (key: string, value: boolean) => void
}) {
  const [expanded, setExpanded] = useState<boolean>(summary.reviewCells > 0)
  if (matrix.length === 0) return null

  const reviewLabel =
    summary.reviewCells > 0 ? (
      <Plural value={summary.reviewCells} one="# needs review" other="# need review" />
    ) : (
      <Trans>all matched</Trans>
    )

  const headerId = 'matrix-defaults-header'
  const bodyId = 'matrix-defaults-body'

  return (
    <section
      role="group"
      aria-labelledby={headerId}
      className="rounded-lg border border-divider-regular bg-background-default"
    >
      {/*
        Header is a `div role="button"` not a `<button>` so it can host
        the `ConceptLabel` (which itself contains a help-popover
        trigger). Nested `<button>`s would be an a11y/HTML violation.
        Keyboard handling: Enter / Space toggle expanded, matching
        native button semantics.
      */}
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setExpanded((open) => !open)
          }
        }}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-left outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-2xl font-semibold tabular-nums text-text-primary">
              {summary.enabledCells}
            </span>
            <ConceptLabel concept="defaultMatrix">
              <span className="text-sm text-text-secondary">
                <Trans>Tax type defaults</Trans>
              </span>
            </ConceptLabel>
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
            <span
              className={cn(
                'text-sm tabular-nums',
                summary.reviewCells > 0 ? 'font-medium text-text-warning' : 'text-text-secondary',
              )}
            >
              {reviewLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-lg border border-divider-subtle bg-background-section px-1.5 text-xs text-text-tertiary">
              <Trans>Saved as default</Trans>
            </span>
            <span className="text-xs tabular-nums text-text-tertiary">
              <Plural
                value={summary.clientsCovered}
                one="# client covered"
                other="# clients covered"
              />
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* "Edit defaults" link to the firm's default-matrix settings.
              stopPropagation so the click doesn't toggle the card's expanded
              state. 2026-06-16 (audit): was a raw <a href> (full page reload
              mid-wizard); client-side <Link> preserves wizard state. */}
          <TextLink
            variant="accent"
            className="gap-0.5"
            onClick={(event) => event.stopPropagation()}
            render={<Link to="/settings" />}
          >
            <Trans>Edit defaults</Trans>
            <ArrowUpRightIcon className="size-3" aria-hidden />
          </TextLink>
          <ChevronDownIcon
            className={cn(
              'size-4 text-text-tertiary transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={bodyId}
            key="matrix-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: { duration: MOTION_DURATION.enter, ease: EASE_APPLE },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: MOTION_DURATION.exit, ease: EASE_APPLE },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-divider-subtle">
              <MatrixControls
                matrix={matrix}
                applyToAll={applyToAll}
                onToggle={onToggleApplyToAll}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
    <div role="group" aria-label={t`Adjust tax type defaults`}>
      <ul className="flex flex-col divide-y divide-divider-subtle">
        {matrix.map((cell) => {
          const key = `${cell.entityType}::${cell.state}`
          const checked = applyToAll[key] ?? true
          return (
            <li key={key} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-base text-text-primary">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                    {cell.entityType} × {cell.state}
                  </span>
                  <span className="text-text-tertiary">·</span>
                  <Plural value={cell.appliedClientCount} one="# client" other="# clients" />
                </span>
                {/* The title-attr hint says what unchecking means (skip these
                    defaults, manual deadlines later for these clients) — the
                    "Use suggested filings" label alone gives no consequence on
                    uncheck, which leaves the user toggling without a known
                    outcome. */}
                <label
                  className="inline-flex cursor-pointer items-center gap-2 text-xs text-text-secondary"
                  data-apply-to-all-key={key}
                  aria-keyshortcuts="A"
                  title={t`Uncheck to skip these tax-type defaults. You'll need to add deadlines manually for these clients.`}
                >
                  {/* Pill switch for the per-group apply toggle. */}
                  <Switch checked={checked} onCheckedChange={(value) => onToggle(key, value)} />
                  <Trans>Use suggested filings</Trans>
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {cell.taxTypes.map((taxType) => (
                  // Shared TaxCodeBadge primitive (compact density for the
                  // matrix) — human-readable label + tooltip instead of the
                  // raw snake_case code, and the same chip chrome as every
                  // other form badge in the app.
                  <TaxCodeBadge key={taxType} code={taxType} size="compact" />
                ))}
                <EvidenceChip
                  model={null}
                  confidence={cell.confidence}
                  promptVersion={`matrix@${cell.matrixVersion}`}
                />
                {cell.needsReview ? (
                  /* The "Needs review" badge uses a strengthened warning
                     treatment with a non-divider border so it reads as "you
                     should look at this" — it's an action requirement, unlike
                     the adjacent "Verified" badge which keeps the calmer
                     treatment as a passing reassurance. */
                  <span className="inline-flex h-5 items-center gap-1 rounded-lg border border-state-warning-hover-alt bg-components-badge-bg-warning-soft px-1.5 text-xs font-medium text-text-primary">
                    <TriangleAlertIcon className="size-3" aria-hidden />
                    <Trans>Needs review</Trans>
                  </span>
                ) : (
                  <span
                    className="inline-flex h-5 items-center gap-1 rounded-lg border border-divider-regular bg-background-subtle px-1.5 text-xs text-text-success"
                    aria-hidden
                  >
                    <ShieldCheckIcon className="size-3" />
                    <Trans>Verified</Trans>
                  </span>
                )}
                {cell.applicationMode === 'federal_return_type_plus_state' ? (
                  <span className="inline-flex h-5 items-center rounded-lg border border-divider-regular bg-background-subtle px-1.5 text-xs text-text-secondary">
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
      <span className="inline-flex h-5 items-center gap-1 rounded-lg border border-divider-regular bg-background-subtle px-1.5 text-xs text-text-success">
        <CircleCheckIcon className="size-3" aria-hidden />
        <Trans>Ready</Trans>
      </span>
    )
  }
  return (
    <span
      className="inline-flex h-5 items-center gap-1 rounded-lg border border-divider-regular bg-components-badge-bg-warning-soft px-1.5 text-xs text-text-primary"
      role="status"
    >
      <TriangleAlertIcon className="size-3" aria-hidden />
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

interface CategoryHero {
  count: number
  label: ReactNode
}

/**
 * Hero number + label per category. The count is rendered as a real
 * number so JSX can size it `text-2xl font-semibold tabular-nums`
 * with the supporting label `text-sm text-text-secondary` after.
 */
function formatCategoryHero(field: string, totalValues: number): CategoryHero {
  if (field === 'entity_type') {
    return {
      count: totalValues,
      label: <Plural value={totalValues} one="entity type" other="entity types" />,
    }
  }
  if (field === 'state') {
    return {
      count: totalValues,
      label: <Plural value={totalValues} one="state" other="states" />,
    }
  }
  if (field === 'tax_types') {
    return {
      count: totalValues,
      label: <Plural value={totalValues} one="tax type" other="tax types" />,
    }
  }
  return { count: totalValues, label: field }
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
      className="inline-flex h-5 items-center gap-1 rounded-lg border border-divider-regular bg-transparent px-1.5 font-mono text-xs tabular-nums text-text-secondary"
      title={label}
    >
      <span>{label}</span>
    </span>
  )
}
