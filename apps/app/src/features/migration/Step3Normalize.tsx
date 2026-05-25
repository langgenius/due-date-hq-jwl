import { useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ShieldCheckIcon } from 'lucide-react'

import type { NormalizationRow } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAppHotkey } from '@/components/patterns/keyboard-shell'
import { ConceptLabel } from '@/features/concepts/concept-help'

import type { NormalizeState } from './state'
import type { MatrixApplicationView } from './matrix-view'

interface Step3Props {
  normalize: NormalizeState
  matrix: MatrixApplicationView[]
  onUserEdit: (rows: NormalizationRow[]) => void
  onToggleApplyToAll: (key: string, value: boolean) => void
}

/**
 * Step 3 Normalize + Default Matrix — pixel-perfect per [02-ux §6].
 *
 * Three section blocks:
 *   - Entity types
 *   - States
 *   - Suggested tax types (matrix application)
 *
 * No conflict block in the Demo path because Step 2 doesn't surface
 * conflict candidates in real time; Day 4 commit handles "matches existing
 * client ID" as it lands.
 */
export function Step3Normalize({ normalize, matrix, onUserEdit, onToggleApplyToAll }: Step3Props) {
  const { t } = useLingui()

  const entityRows = useMemo(
    () => normalize.rows.filter((r) => r.field === 'entity_type'),
    [normalize.rows],
  )
  const stateRows = useMemo(
    () => normalize.rows.filter((r) => r.field === 'state'),
    [normalize.rows],
  )

  const needsReviewCount = normalize.rows.filter(
    (r) => typeof r.confidence === 'number' && r.confidence < 0.5,
  ).length

  return (
    <div className="flex flex-col gap-5 py-5">
      <div className="flex flex-col gap-1">
        {/* 2026-05-25 (Wizard #40 — plural fix): "values" was
            baked into the English template so n=1 read "1
            values". Wrapped in <Plural> so n=1 renders
            "We organized 1 value — review if needed". */}
        <h2 className="text-lg font-semibold text-text-primary">
          <Plural
            value={normalize.rows.length}
            one="We organized # value — review if needed"
            other="We organized # values — review if needed"
          />
        </h2>
        {needsReviewCount > 0 ? (
          <p className="text-sm text-text-secondary">
            {/* 2026-05-25 (Wizard #40 cross-step polish): dropped
                "human" — the audit found 4 different phrasings for
                "needs review" across steps; canonical phrase is
                bare "needs review" so Step 3 + Step 2 + Step 4 all
                read the same way. */}
            <Plural
              value={needsReviewCount}
              one="# value needs review"
              other="# values need review"
            />
          </p>
        ) : null}
      </div>

      {normalize.errorBanner ? (
        <Alert role="alert" aria-live="assertive">
          {/* 2026-05-25 (Wizard #40 cross-step polish): aligned
              with the rest of the wizard's "Couldn't…" error
              voice (Step 1 L595/L604, Step 2 L175, Wizard
              toasts). Was the lone "warning" tone in a wizard
              that's otherwise consistently "we couldn't do X". */}
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
          <Section
            title={t`Entity types`}
            rows={entityRows}
            onUserEdit={onUserEdit}
            all={normalize.rows}
          />
          <Section
            title={t`States`}
            rows={stateRows}
            onUserEdit={onUserEdit}
            all={normalize.rows}
          />
          <MatrixSection
            matrix={matrix}
            applyToAll={normalize.applyToAll}
            onToggle={onToggleApplyToAll}
          />
        </>
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  rows: NormalizationRow[]
  all: NormalizationRow[]
  onUserEdit: (rows: NormalizationRow[]) => void
}

function Section({ title, rows, all, onUserEdit }: SectionProps) {
  const { t } = useLingui()
  if (rows.length === 0) return null

  function updateRow(targetRow: NormalizationRow, value: string) {
    const next = all.map((r) =>
      r.id === targetRow.id ? { ...r, normalizedValue: value, userOverridden: true } : r,
    )
    onUserEdit(next)
  }

  return (
    <section
      role="group"
      aria-label={title}
      className="flex flex-col gap-2 rounded-lg border border-divider-regular bg-background-section p-3"
    >
      <h3 className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
        {title}
      </h3>
      <ul className="flex flex-col divide-y divide-divider-regular text-sm">
        {rows.map((row) => {
          const needsReview =
            row.normalizedValue === null ||
            (typeof row.confidence === 'number' && row.confidence < 0.5)
          return (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-3 py-2',
                needsReview && 'bg-components-badge-bg-warning-soft -mx-3 px-3',
              )}
            >
              <span className="font-mono text-xs tabular-nums text-text-primary">
                &quot;{row.rawValue}&quot;
              </span>
              <span aria-hidden className="text-text-tertiary">
                →
              </span>
              <input
                type="text"
                value={row.normalizedValue ?? ''}
                onChange={(e) => updateRow(row, e.target.value)}
                className="flex h-7 max-w-[160px] rounded-md border border-divider-regular bg-background-body px-2 font-mono text-xs tabular-nums text-text-primary focus-visible:border-state-accent-solid focus-visible:outline-none"
                placeholder="—"
                aria-label={t`Normalized value for ${row.rawValue}`}
              />
              <EvidenceChip
                model={row.model}
                confidence={row.confidence}
                promptVersion={row.promptVersion}
              />
              {needsReview ? (
                <span
                  className="ml-auto inline-flex h-5 items-center gap-1 rounded-md border border-divider-regular bg-components-badge-bg-warning-soft px-1.5 text-xs text-text-primary"
                  role="status"
                >
                  <AlertTriangleIcon className="size-3" aria-hidden />
                  <Trans>Needs review</Trans>
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface MatrixSectionProps {
  matrix: MatrixApplicationView[]
  applyToAll: Record<string, boolean>
  onToggle: (key: string, value: boolean) => void
}

function MatrixSection({ matrix, applyToAll, onToggle }: MatrixSectionProps) {
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
        name: 'Toggle apply to all',
        description: 'Toggle the focused Apply to all row in Step 3.',
        category: 'wizard',
        scope: 'overlay',
      },
    },
  )

  if (matrix.length === 0) return null
  return (
    <section
      role="group"
      aria-label={t`Suggested tax types`}
      className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-background-section p-3"
    >
      <h3 className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
        <ConceptLabel concept="defaultMatrix">
          <Trans>Suggested tax types (from entity × state matrix)</Trans>
        </ConceptLabel>
      </h3>
      {/* 2026-05-25 (Wizard #40 length fix): explainer paragraphs
          trimmed per audit. The default-tax-type sentence dropped
          half its length ("suggestions apply only where imported
          rows do not already include tax types" → "apply only to
          rows without tax types"). The 30-word penalty-readiness
          paragraph was removed entirely from this surface — it
          threaded three concepts (penalty readiness, estimated
          tax due, owner count) into a step body where users are
          deciding tax-type defaults, not reading penalty
          architecture. Penalty readiness already has its own
          concept popover and Step 4 surface; it doesn't belong
          here. */}
      <p className="text-sm text-text-secondary">
        <Trans>These defaults apply only to rows without tax types.</Trans>
      </p>
      <ul className="flex flex-col divide-y divide-divider-regular">
        {matrix.map((cell) => {
          const key = `${cell.entityType}::${cell.state}`
          const checked = applyToAll[key] ?? true
          return (
            <li key={key} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-3">
                {/* 2026-05-25 (Wizard #40 plural-form split): the
                    original baked the entity × state code INTO
                    the Plural one/other template strings via JS
                    template interpolation. Lingui extracts the
                    `<Plural>` one/other strings literally — the
                    interpolated entity/state expressions
                    (`cell.entityType.toUpperCase()` etc.) aren't
                    simple identifiers, so the catalog couldn't
                    represent them as named ICU placeholders.
                    Translators would have received a different
                    message per entity × state combination.

                    Split: the entity × state kicker renders as
                    data outside Plural; Plural carries only the
                    count + "client(s)" noun. Catalog message is
                    now a clean `{count, plural, one {# client}
                    other {# clients}}`. The visual reads:
                    "LLC × CA · 5 clients". */}
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
                  <Trans>Apply to all</Trans>
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {cell.taxTypes.map((tt) => (
                  <span
                    key={tt}
                    className="inline-flex h-5 items-center rounded-md border border-divider-regular bg-components-panel-bg px-1.5 font-mono tabular-nums text-text-secondary"
                  >
                    {tt}
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
    </section>
  )
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
