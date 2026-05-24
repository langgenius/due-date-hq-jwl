import type { ReactNode } from 'react'
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

/**
 * Structured-fields panel inside the Pulse drawer body.
 *
 * 2026-05-25 (Yuqi review #11, #20, #21, #22, #23): rebuilt as a
 * three-column grid with sentence-case copy. Earlier version used
 * vertical FieldRows with label-left / value-right; the user's eye
 * had to ping-pong across an 880px-wide drawer to read each fact,
 * and the section labels were `text-xs uppercase tracking-wider`
 * which made them invisible against the body copy at the same size.
 *
 * New shape:
 *  - Two clearly-headed sections ("Source" and "Scope"), each as a
 *    titled card with a small accent rule under the heading. The
 *    heading is `text-sm font-semibold` (not the old caption-size
 *    eyebrow) so it reads as a section title, not row chrome.
 *  - Inside each card, facts live in a `grid-cols-2 md:grid-cols-3`
 *    arrangement — labels stack ABOVE their values, so the eye
 *    scans top-to-bottom across columns instead of zigzagging.
 *  - Source excerpt stays at the bottom as a distinct block (it's
 *    long-form text, not a key/value).
 *  - "Read official source" button lives at the top of the Source
 *    card next to the heading so it's discoverable without
 *    scrolling.
 */
export function PulseStructuredFields({ detail }: PulseStructuredFieldsProps) {
  const { t } = useLingui()

  const copySourceExcerpt = () => {
    void navigator.clipboard.writeText(detail.sourceExcerpt).then(
      () => toast.success(t`Source excerpt copied`),
      () => toast.error(t`Couldn't copy source excerpt`),
    )
  }

  // Source card facts — chronology + the actual deadline shift if
  // this is a due-date overlay. Listed in scan order: where it came
  // from, when it was published, when it takes effect, when it
  // expires, then the change itself.
  const sourceFacts: Array<{ key: string; label: ReactNode; value: ReactNode }> = []
  sourceFacts.push({
    key: 'authority',
    label: <Trans>Authority</Trans>,
    value: <span className="font-medium text-text-primary">{detail.alert.source}</span>,
  })
  sourceFacts.push({
    key: 'issued',
    label: <Trans>Issued</Trans>,
    value: (
      <span className="font-mono tabular-nums text-text-primary">
        {formatDate(detail.alert.publishedAt)}
      </span>
    ),
  })
  if (detail.effectiveFrom) {
    sourceFacts.push({
      key: 'effective',
      label: <Trans>Effective</Trans>,
      value: (
        <span className="font-mono tabular-nums text-text-primary">
          {formatDate(detail.effectiveFrom)}
        </span>
      ),
    })
  }
  if (detail.effectiveUntil) {
    sourceFacts.push({
      key: 'expires',
      label: <Trans>Expires</Trans>,
      value: (
        <span className="font-mono tabular-nums text-text-primary">
          {formatDate(detail.effectiveUntil)}
        </span>
      ),
    })
  }
  if (detail.alert.actionMode === 'due_date_overlay') {
    sourceFacts.push({
      key: 'shift',
      label: <Trans>Deadline shift</Trans>,
      value: (
        <span className="font-mono tabular-nums text-text-primary">
          {detail.originalDueDate ? formatDate(detail.originalDueDate) : t`Unknown`}
          {' → '}
          <span className="font-semibold">
            {detail.newDueDate ? formatDate(detail.newDueDate) : t`Unknown`}
          </span>
        </span>
      ),
    })
  } else {
    sourceFacts.push({
      key: 'mode',
      label: <Trans>Action mode</Trans>,
      value: (
        <span className="font-medium text-text-primary">
          <Trans>Review only</Trans>
        </span>
      ),
    })
  }

  // Scope card facts — who/what the alert applies to. Jurisdiction
  // first (most CPAs filter by state first), then counties, forms,
  // entity types, base rules.
  const scopeFacts: Array<{ key: string; label: ReactNode; value: ReactNode }> = []
  scopeFacts.push({
    key: 'jurisdiction',
    label: <Trans>Jurisdiction</Trans>,
    value: (
      <Badge variant="outline" className="font-mono tabular-nums">
        {detail.jurisdiction}
      </Badge>
    ),
  })
  if (detail.counties.length > 0) {
    scopeFacts.push({
      key: 'counties',
      label: <Trans>Counties</Trans>,
      value: (
        <div className="flex flex-wrap gap-1">
          {detail.counties.map((county) => (
            <Badge key={county} variant="secondary" className="font-mono">
              {county}
            </Badge>
          ))}
        </div>
      ),
    })
  }
  scopeFacts.push({
    key: 'forms',
    label: <Trans>Forms</Trans>,
    value:
      detail.forms.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {detail.forms.map((form) => (
            <Badge key={form} variant="outline" className="font-mono tabular-nums">
              {form}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-text-tertiary">
          <Trans>None</Trans>
        </span>
      ),
  })
  scopeFacts.push({
    key: 'entityTypes',
    label: <Trans>Entity types</Trans>,
    value:
      detail.entityTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {detail.entityTypes.map((entity) => (
            <Badge key={entity} variant="secondary" className="font-mono uppercase">
              {entity}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-text-tertiary">
          <Trans>None</Trans>
        </span>
      ),
  })
  if (detail.affectedRuleIds.length > 0) {
    scopeFacts.push({
      key: 'rules',
      label: <Trans>Base rules</Trans>,
      value: (
        <div className="flex flex-wrap gap-1">
          {detail.affectedRuleIds.map((ruleId) => (
            <Badge key={ruleId} variant="outline" className="font-mono tabular-nums">
              {ruleId}
            </Badge>
          ))}
        </div>
      ),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <FactCard
        title={<Trans>Source</Trans>}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<a href={detail.alert.sourceUrl} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            <Trans>Open official source</Trans>
          </Button>
        }
      >
        <FactGrid facts={sourceFacts} />
      </FactCard>

      <FactCard title={<Trans>Scope</Trans>}>
        <FactGrid facts={scopeFacts} />
        {detail.alert.actionMode === 'review_only' ? (
          <div className="mt-3 rounded-md border border-divider-subtle bg-background-soft p-3 text-sm text-text-secondary">
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              <Trans>Structured change</Trans>
            </span>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
              {formatStructuredChange(detail.structuredChange, t`No structured fields.`)}
            </pre>
          </div>
        ) : null}
      </FactCard>

      <FactCard
        title={<Trans>Source excerpt</Trans>}
        action={
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
        }
      >
        <blockquote className="break-words text-sm italic leading-relaxed text-text-secondary">
          “{detail.sourceExcerpt}”
        </blockquote>
      </FactCard>
    </div>
  )
}

function formatStructuredChange(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

// Visible card wrapper around a logical section. Header is a real
// `text-sm font-semibold` so it actually reads as a heading — the
// old `text-xs uppercase tracking-wider` blended with content at the
// same size + color (Yuqi #22).
function FactCard({
  title,
  action,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-md border border-divider-subtle bg-background-default">
      <header className="flex items-center justify-between gap-3 border-b border-divider-subtle px-4 py-2.5">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

// 3-column fact grid. Each cell stacks the label above the value so
// the eye scans top-to-bottom within a column, not left-right across
// the full drawer width (Yuqi #20, #21). Collapses to 2-column on
// narrow widths and 1-column on mobile so values never get cramped.
function FactGrid({
  facts,
}: {
  facts: ReadonlyArray<{ key: string; label: ReactNode; value: ReactNode }>
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.key} className="flex flex-col gap-1 min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {fact.label}
          </dt>
          <dd className="text-sm text-text-primary min-w-0">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
