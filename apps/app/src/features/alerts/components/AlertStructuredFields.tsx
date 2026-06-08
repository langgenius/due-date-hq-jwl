import type { ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { PulseDetail } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatDate } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'

import { changeKindLabel } from './PulseChangeKindChip'

interface AlertStructuredFieldsProps {
  detail: PulseDetail
}

/**
 * 2026-06-08 (Pencil ibEoz/BbQAK `b4syg ExtractedFacts`): rebuilt from
 * the two stacked Source/Scope FactCards into the design's flat fact
 * GRID — a 4-column (2 on narrow) matrix of hairline-divided cells,
 * each an uppercase mono label over a `13/600` value.
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

  const cells: Array<{ key: string; label: ReactNode; value: ReactNode }> = [
    { key: 'authority', label: <Trans>Authority</Trans>, value: detail.alert.source },
    { key: 'effective', label: <Trans>Effective</Trans>, value: effectiveValue },
    { key: 'forms', label: <Trans>Affected forms</Trans>, value: formsValue },
    {
      key: 'change',
      label: <Trans>Change type</Trans>,
      value: changeKindLabel(detail.alert.changeKind),
    },
    { key: 'jurisdiction', label: <Trans>Jurisdiction</Trans>, value: jurisdictionValue },
    { key: 'published', label: <Trans>Published</Trans>, value: formatDate(detail.alert.publishedAt) },
    { key: 'entities', label: <Trans>Entity types</Trans>, value: entityValue },
    { key: 'apply', label: <Trans>Apply mode</Trans>, value: applyModeValue },
  ]

  return (
    <div className="flex flex-col gap-3">
      {detail.alert.duplicateSourceSnapshotCount > 0 ? (
        <div className="rounded-md border border-divider-subtle bg-background-soft px-3 py-2 text-xs text-text-secondary">
          <Plural
            value={detail.alert.duplicateSourceSnapshotCount}
            one="# similar source update was merged into this alert."
            other="# similar source updates were merged into this alert."
          />
        </div>
      ) : null}

      {/* Open-source affordance + fact grid (Pencil `b4syg`). */}
      {detail.alert.sourceUrl ? (
        <div className="flex justify-end">
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-6"
            render={<a href={detail.alert.sourceUrl} target="_blank" rel="noopener noreferrer" />}
          >
            {detail.alert.source}
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        </div>
      ) : null}

      {/* Pencil ibEoz `noWOa`: the fact grid keeps its OWN 1px border +
          radius-8 inside the section (the section itself is borderless;
          the surrounding panel + dividers carry the outer structure). */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-divider-subtle bg-divider-subtle sm:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.key} className="flex flex-col gap-1 bg-background-default px-4 py-3">
            <span className="font-mono text-[10px] font-bold tracking-[0.6px] text-text-muted uppercase">
              {cell.label}
            </span>
            <span className="min-w-0 truncate text-[13px] font-semibold tracking-[-0.1px] text-text-primary">
              {cell.value}
            </span>
          </div>
        ))}
      </div>

      {/* Source excerpt — flush bordered blockquote with copy affordance. */}
      <div className="group/excerpt relative rounded-md border border-divider-subtle bg-background-soft px-4 py-3">
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
