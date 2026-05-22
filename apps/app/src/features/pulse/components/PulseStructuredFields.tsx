import { Trans, useLingui } from '@lingui/react/macro'
import { CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { PulseDetail } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { formatDate } from '@/lib/utils'

interface PulseStructuredFieldsProps {
  detail: PulseDetail
}

export function PulseStructuredFields({ detail }: PulseStructuredFieldsProps) {
  const { t } = useLingui()

  const copySourceExcerpt = () => {
    void navigator.clipboard.writeText(detail.sourceExcerpt).then(
      () => toast.success(t`Source excerpt copied`),
      () => toast.error(t`Couldn't copy source excerpt`),
    )
  }

  return (
    <section className="grid gap-4 rounded-lg border border-divider-subtle bg-background-section p-4">
      <div className="grid gap-3">
        <SectionLabel>
          <Trans>Source context</Trans>
        </SectionLabel>
        <FieldRow label={<Trans>Authority</Trans>}>
          <span className="font-medium text-text-primary">{detail.alert.source}</span>
        </FieldRow>
        <FieldRow label={<Trans>Issued</Trans>}>
          <span className="font-mono tabular-nums text-text-secondary">
            {formatDate(detail.alert.publishedAt)}
          </span>
        </FieldRow>
        {detail.effectiveFrom ? (
          <FieldRow label={<Trans>Effective</Trans>}>
            <span className="font-mono tabular-nums text-text-secondary">
              {formatDate(detail.effectiveFrom)}
            </span>
          </FieldRow>
        ) : null}
        {detail.effectiveUntil ? (
          <FieldRow label={<Trans>Expires</Trans>}>
            <span className="font-mono tabular-nums text-text-secondary">
              {formatDate(detail.effectiveUntil)}
            </span>
          </FieldRow>
        ) : null}
        {detail.alert.actionMode === 'due_date_overlay' ? (
          <FieldRow label={<Trans>Deadline shift</Trans>}>
            <span className="font-mono tabular-nums text-text-primary">
              {detail.originalDueDate ? formatDate(detail.originalDueDate) : t`Unknown`}
              {' -> '}
              <span className="font-semibold">
                {detail.newDueDate ? formatDate(detail.newDueDate) : t`Unknown`}
              </span>
            </span>
          </FieldRow>
        ) : (
          <FieldRow label={<Trans>Action mode</Trans>}>
            <span className="font-medium text-text-primary">
              <Trans>Review only</Trans>
            </span>
          </FieldRow>
        )}
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<a href={detail.alert.sourceUrl} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            <Trans>Read official source</Trans>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-t border-divider-subtle pt-4">
        <SectionLabel>
          <Trans>Parsed scope</Trans>
        </SectionLabel>
        <FieldRow label={<Trans>Jurisdiction</Trans>}>
          <Badge variant="outline" className="font-mono tabular-nums">
            {detail.jurisdiction}
          </Badge>
        </FieldRow>
        {detail.counties.length > 0 ? (
          <FieldRow label={<Trans>Counties</Trans>}>
            <div className="flex flex-wrap justify-end gap-1">
              {detail.counties.map((county) => (
                <Badge key={county} variant="secondary" className="font-mono">
                  {county}
                </Badge>
              ))}
            </div>
          </FieldRow>
        ) : null}
        <FieldRow label={<Trans>Forms</Trans>}>
          <div className="flex flex-wrap justify-end gap-1">
            {detail.forms.length > 0 ? (
              detail.forms.map((form) => (
                <Badge key={form} variant="outline" className="font-mono tabular-nums">
                  {form}
                </Badge>
              ))
            ) : (
              <span className="text-text-tertiary">
                <Trans>None</Trans>
              </span>
            )}
          </div>
        </FieldRow>
        <FieldRow label={<Trans>Entity types</Trans>}>
          <div className="flex flex-wrap justify-end gap-1">
            {detail.entityTypes.length > 0 ? (
              detail.entityTypes.map((entity) => (
                <Badge key={entity} variant="secondary" className="font-mono uppercase">
                  {entity}
                </Badge>
              ))
            ) : (
              <span className="text-text-tertiary">
                <Trans>None</Trans>
              </span>
            )}
          </div>
        </FieldRow>
        {detail.affectedRuleIds.length > 0 ? (
          <FieldRow label={<Trans>Base rules</Trans>}>
            <div className="flex flex-wrap justify-end gap-1">
              {detail.affectedRuleIds.map((ruleId) => (
                <Badge key={ruleId} variant="outline" className="font-mono tabular-nums">
                  {ruleId}
                </Badge>
              ))}
            </div>
          </FieldRow>
        ) : null}
        {detail.alert.actionMode === 'review_only' ? (
          <div className="rounded-md bg-background-default p-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              <Trans>Structured change</Trans>
            </span>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
              {formatStructuredChange(detail.structuredChange, t`No structured fields.`)}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="grid gap-1 rounded-md bg-background-default p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Source excerpt</Trans>
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Copy source excerpt`}
                  onClick={copySourceExcerpt}
                >
                  <CopyIcon className="size-3.5" aria-hidden />
                </Button>
              }
            />
            <TooltipContent>
              <Trans>Copy source excerpt</Trans>
            </TooltipContent>
          </Tooltip>
        </div>
        <blockquote className="break-words text-md italic text-text-secondary">
          “{detail.sourceExcerpt}”
        </blockquote>
      </div>
    </section>
  )
}

function formatStructuredChange(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{children}</h3>
  )
}

function FieldRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-sm font-medium text-text-tertiary">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1 break-words text-right sm:max-w-[60%]">
        {children}
      </div>
    </div>
  )
}
