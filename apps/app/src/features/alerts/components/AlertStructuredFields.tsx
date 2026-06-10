import type { ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { PulseDetail } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatDate, formatDatePretty } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'

import { changeKindLabel } from './PulseChangeKindChip'

interface AlertStructuredFieldsProps {
  detail: PulseDetail
}

interface ProtectiveClaimFacts {
  actionDeadline: string | null
  claimTaxYears: string[]
  affectedTaxActs: string[]
  evidenceNeeded: string[]
  legalUncertainty: string | null
  authorityRefs: string[]
}

// AI-extracted facts for deadline-shift alerts, read from the freeform
// `structuredChange.deadlineShift` block. All fields are optional — OLD
// alerts carry no `deadlineShift`, so the reader returns null and the
// grid falls back to the generic cells.
interface DeadlineShiftFacts {
  reliefType: string | null
  deadlineTypes: Array<'filing' | 'payment'>
  optInRequired: boolean | null
  penaltyRelief: boolean | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compactText(value: unknown): string | null {
  if (typeof value === 'string') {
    const text = value.trim()
    return text.length > 0 ? text : null
  }
  if (typeof value === 'number') return String(value)
  if (!isRecord(value)) return null
  const title = compactText(value.title)
  const section = compactText(value.section)
  const url = compactText(value.url)
  return [title, section, url].filter(Boolean).join(' · ') || null
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(compactText).filter((item): item is string => item !== null)
  }
  const text = compactText(value)
  return text ? [text] : []
}

function protectiveClaimFacts(detail: PulseDetail): ProtectiveClaimFacts | null {
  if (detail.alert.changeKind !== 'protective_claim_window') return null
  if (!isRecord(detail.structuredChange)) return null
  const actionDeadline = compactText(detail.structuredChange.actionDeadline)
  const legalUncertainty = compactText(detail.structuredChange.legalUncertainty)
  const facts = {
    actionDeadline,
    claimTaxYears: textList(detail.structuredChange.claimTaxYears),
    affectedTaxActs: textList(detail.structuredChange.affectedTaxActs),
    evidenceNeeded: textList(detail.structuredChange.evidenceNeeded),
    legalUncertainty,
    authorityRefs: textList(detail.structuredChange.authorityRefs),
  }
  const hasAnyFact =
    facts.actionDeadline ||
    facts.claimTaxYears.length > 0 ||
    facts.affectedTaxActs.length > 0 ||
    facts.evidenceNeeded.length > 0 ||
    facts.legalUncertainty ||
    facts.authorityRefs.length > 0
  return hasAnyFact ? facts : null
}

function deadlineTypeList(value: unknown): Array<'filing' | 'payment'> {
  if (!Array.isArray(value)) return []
  const seen = new Set<'filing' | 'payment'>()
  for (const item of value) {
    if (item === 'filing' || item === 'payment') seen.add(item)
  }
  // Stable filing-before-payment order so "Filing + Payment" reads consistently.
  return (['filing', 'payment'] as const).filter((kind) => seen.has(kind))
}

function optionalBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

// Mirror of `protectiveClaimFacts`. Reads the AI-extracted
// `deadlineShift` block from the freeform `structuredChange` for
// `deadline_shift` alerts. Returns null when the alert isn't a deadline
// shift or carries no deadlineShift facts (every OLD alert) — the grid
// then keeps its generic cells, so nothing breaks or renders empty. The
// block is conventionally nested under `structuredChange.deadlineShift`;
// we also tolerate the keys being written at the top level of
// `structuredChange`.
function deadlineShiftFacts(detail: PulseDetail): DeadlineShiftFacts | null {
  if (detail.alert.changeKind !== 'deadline_shift') return null
  if (!isRecord(detail.structuredChange)) return null
  const block = isRecord(detail.structuredChange.deadlineShift)
    ? detail.structuredChange.deadlineShift
    : detail.structuredChange
  const facts: DeadlineShiftFacts = {
    reliefType: compactText(block.reliefType),
    deadlineTypes: deadlineTypeList(block.deadlineTypes),
    optInRequired: optionalBool(block.optInRequired),
    penaltyRelief: optionalBool(block.penaltyRelief),
  }
  const hasAnyFact =
    facts.reliefType !== null ||
    facts.deadlineTypes.length > 0 ||
    facts.optInRequired !== null ||
    facts.penaltyRelief !== null
  return hasAnyFact ? facts : null
}

/**
 * The design's flat fact GRID — a 4-column (2 on narrow) matrix of
 * hairline-divided cells, each an uppercase mono label over a `13/600`
 * value.
 *
 * The mock's exact cells include RELIEF TYPE / DEADLINE TYPES / OPT-IN,
 * which the contract doesn't carry. Rather than fabricate them, the
 * grid maps each slot to the real `PulseDetail` field nearest the
 * design's intent (Change type, Entity types, Apply mode) so every
 * value is true to the record while the layout matches 1:1.
 */
export function AlertStructuredFields({ detail }: AlertStructuredFieldsProps) {
  const { t } = useLingui()

  const copySourceExcerpt = () => {
    void navigator.clipboard.writeText(detail.sourceExcerpt).then(
      () => toast.success(t`Source excerpt copied`),
      () => toast.error(t`Couldn't copy source excerpt`),
    )
  }

  const stateName = RULE_JURISDICTION_LABELS[detail.jurisdiction] ?? detail.jurisdiction
  const effectiveValue = detail.effectiveFrom
    ? new Date(`${detail.effectiveFrom}T00:00:00.000Z`).getTime() <= Date.now()
      ? t`Immediate`
      : formatDate(detail.effectiveFrom)
    : '—'
  const formsValue =
    detail.forms.length > 0 ? detail.forms.map((form) => formatTaxCode(form)).join(' · ') : '—'
  const jurisdictionValue =
    detail.counties.length > 0
      ? `${detail.counties.join(', ')} · ${detail.jurisdiction}`
      : stateName
  const entityValue =
    detail.entityTypes.length > 0 ? detail.entityTypes.join(' · ') : t`All entity types`
  const applyModeValue =
    detail.alert.actionMode === 'due_date_overlay' ? t`Auto-applied` : t`Review only`
  const protectiveFacts = protectiveClaimFacts(detail)
  const deadlineFacts = deadlineShiftFacts(detail)

  // For deadline-shift alerts that carry AI-extracted relief facts, the
  // three trailing slots show RELIEF TYPE / DEADLINE TYPES / OPT-IN
  // instead of the generic Change type / Entity types / Apply mode. When
  // those facts are ABSENT (every OLD alert), the generic cells keep the
  // grid from showing empty. Each AI-derived cell stays under the
  // section's "AI parsed — verify before Apply" subtitle.
  const deadlineTypesValue =
    deadlineFacts && deadlineFacts.deadlineTypes.length > 0
      ? deadlineFacts.deadlineTypes
          .map((kind) => (kind === 'filing' ? t`Filing` : t`Payment`))
          .join(' + ')
      : null
  const reliefCell = deadlineFacts?.reliefType
    ? {
        key: 'reliefType',
        label: <Trans>Relief type</Trans>,
        value: deadlineFacts.reliefType,
      }
    : {
        key: 'change',
        label: <Trans>Change type</Trans>,
        value: changeKindLabel(detail.alert.changeKind),
      }
  const deadlineTypesCell = deadlineTypesValue
    ? { key: 'deadlineTypes', label: <Trans>Deadline types</Trans>, value: deadlineTypesValue }
    : { key: 'entities', label: <Trans>Entity types</Trans>, value: entityValue }
  const optInCell =
    deadlineFacts && deadlineFacts.optInRequired !== null
      ? {
          key: 'optIn',
          label: <Trans>Opt-in</Trans>,
          value: deadlineFacts.optInRequired ? t`Required` : t`Not required`,
        }
      : { key: 'apply', label: <Trans>Apply mode</Trans>, value: applyModeValue }

  const cells: Array<{ key: string; label: ReactNode; value: ReactNode }> = [
    { key: 'authority', label: <Trans>Authority</Trans>, value: detail.alert.source },
    { key: 'effective', label: <Trans>Effective</Trans>, value: effectiveValue },
    { key: 'forms', label: <Trans>Affected forms</Trans>, value: formsValue },
    reliefCell,
    { key: 'jurisdiction', label: <Trans>Jurisdiction</Trans>, value: jurisdictionValue },
    {
      key: 'published',
      label: <Trans>Published</Trans>,
      value: formatDate(detail.alert.publishedAt),
    },
    deadlineTypesCell,
    optInCell,
  ]

  return (
    <div className="flex flex-col gap-3">
      {detail.alert.duplicateSourceSnapshotCount > 0 ? (
        <div className="rounded-lg border border-divider-subtle bg-background-soft px-3 py-2 text-xs text-text-secondary">
          <Plural
            value={detail.alert.duplicateSourceSnapshotCount}
            one="# similar source update was merged into this alert."
            other="# similar source updates were merged into this alert."
          />
        </div>
      ) : null}

      {/* 2026-06-08 (Yuqi alert-detail feedback #16 "remove"): the
          right-aligned source link above the fact grid is dropped — the
          source is already named in the header meta, the Provenance section,
          and the Authority cell, so this was a redundant fourth instance. */}

      {/* Pencil ibEoz `noWOa`: the fact grid keeps its OWN 1px border +
          radius-8 inside the section (the section itself is borderless;
          the surrounding panel + dividers carry the outer structure). */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-divider-subtle bg-divider-subtle sm:grid-cols-4">
        {cells.map((cell) => (
          // 2026-06-10 (Yuqi — Pencil `b4syg` ExtractedFacts cell): padding
          // [10,20] (px-5 py-2.5), 11/600 uppercase tertiary label over a
          // 13/normal primary value. The grid's gap-px + divider bg draw the
          // right-/row-hairlines the Pencil shows between cells.
          <div key={cell.key} className="flex flex-col gap-1 bg-background-default px-5 py-2.5">
            <span className="text-xs font-semibold tracking-[0.5px] text-text-tertiary uppercase">
              {cell.label}
            </span>
            <span className="min-w-0 truncate text-base font-normal text-text-primary">
              {cell.value}
            </span>
          </div>
        ))}
      </div>

      {detail.alert.changeKind === 'threshold_advisory' ? (
        <div className="rounded-lg border border-divider-subtle bg-background-soft px-4 py-3">
          <p className="text-sm leading-relaxed text-text-secondary">
            <Trans>
              This alert points to the official IRS Revenue Procedure and asserts no specific
              threshold figures. Review the source before advising clients.
            </Trans>
          </p>
        </div>
      ) : null}

      {protectiveFacts ? (
        <div className="rounded-lg border border-divider-subtle bg-background-soft px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {protectiveFacts.actionDeadline ? (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-caption-xs font-bold tracking-[0.6px] text-text-muted uppercase">
                  <Trans>Action deadline</Trans>
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {formatDatePretty(protectiveFacts.actionDeadline, { alwaysShowYear: true })}
                </span>
              </div>
            ) : null}
            {protectiveFacts.claimTaxYears.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-caption-xs font-bold tracking-[0.6px] text-text-muted uppercase">
                  <Trans>Affected years</Trans>
                </span>
                <span className="break-words text-sm font-semibold text-text-primary">
                  {protectiveFacts.claimTaxYears.join(' · ')}
                </span>
              </div>
            ) : null}
            {protectiveFacts.affectedTaxActs.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-caption-xs font-bold tracking-[0.6px] text-text-muted uppercase">
                  <Trans>Affected tax acts</Trans>
                </span>
                <span className="break-words text-sm font-semibold text-text-primary">
                  {protectiveFacts.affectedTaxActs.join(' · ')}
                </span>
              </div>
            ) : null}
            {protectiveFacts.evidenceNeeded.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-caption-xs font-bold tracking-[0.6px] text-text-muted uppercase">
                  <Trans>Evidence to gather</Trans>
                </span>
                <span className="break-words text-sm font-semibold text-text-primary">
                  {protectiveFacts.evidenceNeeded.join(' · ')}
                </span>
              </div>
            ) : null}
          </div>
          {protectiveFacts.legalUncertainty ? (
            <div className="mt-3 flex flex-col gap-1">
              <span className="font-mono text-caption-xs font-bold tracking-[0.6px] text-text-muted uppercase">
                <Trans>Legal uncertainty</Trans>
              </span>
              <p className="text-sm leading-relaxed text-text-secondary">
                {protectiveFacts.legalUncertainty}
              </p>
            </div>
          ) : null}
          {protectiveFacts.authorityRefs.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1">
              <span className="font-mono text-caption-xs font-bold tracking-[0.6px] text-text-muted uppercase">
                <Trans>Authority refs</Trans>
              </span>
              <p className="break-words text-sm leading-relaxed text-text-secondary">
                {protectiveFacts.authorityRefs.join(' · ')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Source excerpt — flush bordered blockquote with copy affordance. */}
      <div className="group/excerpt relative rounded-lg border border-divider-subtle bg-background-soft px-4 py-3">
        <blockquote className="break-words pr-8 text-sm italic leading-relaxed text-text-secondary">
          &ldquo;{detail.sourceExcerpt}&rdquo;
        </blockquote>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t`Copy source excerpt`}
                onClick={copySourceExcerpt}
                className={cn(
                  'absolute right-2 top-2 opacity-0 transition-opacity',
                  'group-hover/excerpt:opacity-100 focus-visible:opacity-100',
                )}
              >
                <CopyIcon aria-hidden />
              </Button>
            }
          />
          <TooltipContent>
            <Trans>Copy source excerpt</Trans>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
