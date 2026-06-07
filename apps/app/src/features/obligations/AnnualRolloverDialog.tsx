import { type ReactNode, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, InfoIcon, RepeatIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@duedatehq/ui/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

// Maps the Pencil `c7xPK` — /deadlines annual rollover modal. This is a
// NET-NEW surface: there is no `rollover` contract, RPC, or route in the
// codebase today (verified by searching contracts/ for rollover/taxYear).
// The dialog is rendered against a static fallback preview so the layout,
// copy, and disposition taxonomy match the design exactly; every value that
// the server would supply is flagged with TODO(data) below.

type RolloverDisposition = 'will_update' | 'requires_review' | 'no_verified_rule'

// TODO(data): replace with the rollover preview row contract once it exists.
// Shape mirrors what the engine would return per obligation: the matched
// next-year rule lookup + disposition.
interface RolloverPreviewRow {
  obligationId: string
  client: string
  form: string
  currentDue: string
  nextDue: string
  ruleChange: string | null
  disposition: RolloverDisposition
}

interface RolloverPreview {
  fromTaxYear: number
  toTaxYear: number
  totalCount: number
  willUpdateCount: number
  requiresReviewCount: number
  noVerifiedRuleCount: number
  blockedCount: number
  rows: readonly RolloverPreviewRow[]
}

// TODO(data): static fallback preview. Wire to
// orpc.obligations.previewAnnualRollover (or similar) once the contract
// lands. Counts + rows below come straight from the Pencil mock.
const FALLBACK_PREVIEW: RolloverPreview = {
  fromTaxYear: 2026,
  toTaxYear: 2027,
  totalCount: 142,
  willUpdateCount: 128,
  requiresReviewCount: 10,
  noVerifiedRuleCount: 4,
  blockedCount: 12,
  rows: [
    {
      obligationId: 'hudson-wells-1040',
      client: 'Hudson Wells',
      form: 'Form 1040',
      currentDue: 'Apr 15',
      nextDue: 'Apr 15',
      ruleChange: null,
      disposition: 'will_update',
    },
    {
      obligationId: 'aspen-capital-1065',
      client: 'Aspen Capital',
      form: 'Form 1065',
      currentDue: 'Mar 17',
      nextDue: 'Mar 16',
      ruleChange: '§6072 amended',
      disposition: 'requires_review',
    },
    {
      obligationId: 'brightline-st100',
      client: 'Brightline LLC',
      form: 'ST-100',
      currentDue: 'Apr 30',
      nextDue: 'Apr 30',
      ruleChange: null,
      disposition: 'will_update',
    },
    {
      obligationId: 'northstar-1120s',
      client: 'Northstar',
      form: 'Form 1120-S',
      currentDue: 'Mar 17',
      nextDue: 'Mar 16',
      ruleChange: '§6072 amended',
      disposition: 'requires_review',
    },
    {
      obligationId: 'riverside-1099nec',
      client: 'Riverside',
      form: '1099-NEC',
      currentDue: 'Jan 31',
      nextDue: 'Feb 2',
      ruleChange: null,
      disposition: 'no_verified_rule',
    },
  ],
}

function DispositionBadge({ disposition }: { disposition: RolloverDisposition }) {
  const variant =
    disposition === 'will_update'
      ? 'info'
      : disposition === 'requires_review'
        ? 'warning'
        : 'secondary'
  return (
    <Badge variant={variant} className="font-mono text-[10px] font-bold">
      {disposition}
    </Badge>
  )
}

function SummaryCard({
  value,
  label,
  caption,
  tone,
}: {
  value: ReactNode
  label: ReactNode
  caption: ReactNode
  tone: 'accent' | 'warning' | 'neutral'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 rounded-lg p-4',
        tone === 'accent' && 'bg-state-accent-hover',
        tone === 'warning' && 'bg-state-warning-hover',
        tone === 'neutral' && 'bg-background-section',
      )}
    >
      <span
        className={cn(
          'text-[28px] leading-none font-bold tracking-tight tabular-nums',
          tone === 'accent' && 'text-text-accent',
          tone === 'warning' && 'text-text-warning',
          tone === 'neutral' && 'text-text-secondary',
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'text-[10px] font-bold tracking-wider uppercase',
          tone === 'accent' && 'text-text-accent',
          tone === 'warning' && 'text-text-warning',
          tone === 'neutral' && 'text-text-secondary',
        )}
      >
        {label}
      </span>
      <span className="text-caption text-text-tertiary">{caption}</span>
    </div>
  )
}

interface AnnualRolloverDialogProps {
  // TODO(data): preview will be fetched server-side; accept it as a prop so
  // the trigger owner can pass a real preview once the contract exists.
  preview?: RolloverPreview
}

export function AnnualRolloverDialog({ preview = FALLBACK_PREVIEW }: AnnualRolloverDialogProps) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <RepeatIcon data-icon="inline-start" />
            <Trans>Annual rollover</Trans>
          </Button>
        }
      />
      <DialogContent
        showCloseButton={false}
        // Pencil modal is 1040px wide; cap to the viewport on small screens.
        className="max-w-[min(1040px,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-divider-regular px-6 py-4">
          <RepeatIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
          <h2 className="text-lg leading-none font-semibold text-text-primary">
            <Trans>
              Annual rollover · tax year {preview.fromTaxYear} → {preview.toTaxYear}
            </Trans>
          </h2>
          <div className="flex-1" />
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={t`Close`} />} />
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-2 border-b border-divider-regular px-6 py-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-state-accent-solid px-3 py-1.5 text-xs font-bold text-text-inverted">
            <span aria-hidden>1</span>
            <Trans>Preview</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-3 py-1.5 text-xs font-semibold text-text-secondary">
            <span aria-hidden className="text-text-muted">
              2
            </span>
            <Trans>Apply</Trans>
          </span>
        </div>

        {/* Body */}
        <div className="flex max-h-[min(680px,calc(100vh-16rem))] flex-col gap-3.5 overflow-y-auto bg-background-section px-6 py-5">
          {/* Intro */}
          <div className="flex items-start gap-2.5 rounded-[10px] bg-background-default p-4">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-text-secondary" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-description font-semibold text-text-primary">
                <Trans>
                  You're rolling over {preview.totalCount} obligations from tax year{' '}
                  {preview.fromTaxYear} into {preview.toTaxYear}.
                </Trans>
              </p>
              <p className="text-caption leading-relaxed text-text-tertiary">
                <Trans>
                  For each obligation we look up the matching rule for next year. Items where the
                  rule changed get flagged for your review.
                </Trans>
              </p>
            </div>
          </div>

          {/* Disposition summary */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <SummaryCard
              tone="accent"
              value={preview.willUpdateCount}
              label={<Trans>Will update</Trans>}
              caption={<Trans>Rule unchanged · safe to roll</Trans>}
            />
            <SummaryCard
              tone="warning"
              value={preview.requiresReviewCount}
              label={<Trans>Requires review</Trans>}
              caption={<Trans>Rule changed — your eyes needed</Trans>}
            />
            <SummaryCard
              tone="neutral"
              value={preview.noVerifiedRuleCount}
              label={<Trans>No verified rule</Trans>}
              caption={<Trans>Skipped — no rule for {preview.toTaxYear} yet</Trans>}
            />
          </div>

          {/* Per-obligation table */}
          <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
            <Table>
              <TableHeader>
                <TableRow className="bg-background-section">
                  <TableHead className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <Trans>Client · Form</Trans>
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <Trans>TY {preview.fromTaxYear} due</Trans>
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <Trans>TY {preview.toTaxYear} due</Trans>
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <Trans>Rule change</Trans>
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <Trans>Disposition</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row) => {
                  const dateChanged = row.currentDue !== row.nextDue
                  return (
                    <TableRow key={row.obligationId}>
                      <TableCell className="font-semibold text-text-primary">
                        {row.client} · {row.form}
                      </TableCell>
                      <TableCell className="text-caption tabular-nums text-text-tertiary">
                        {row.currentDue}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-caption tabular-nums',
                          dateChanged ? 'font-bold text-text-warning' : 'text-text-primary',
                        )}
                      >
                        {row.nextDue}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-caption',
                          row.ruleChange ? 'text-text-warning' : 'text-text-tertiary italic',
                        )}
                      >
                        {row.ruleChange ?? <Trans>unchanged</Trans>}
                      </TableCell>
                      <TableCell>
                        <DispositionBadge disposition={row.disposition} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-divider-regular px-6 py-3.5">
          <DialogClose render={<Button variant="ghost" size="sm" />}>
            <Trans>Cancel</Trans>
          </DialogClose>
          <div className="flex-1" />
          {/* TODO(data): both actions are no-ops until the rollover mutation
              exists. "Apply safe items only" rolls the will_update set;
              "Roll over all" also opens the review queue for the changed rules. */}
          <Button variant="outline" size="sm">
            <Trans>Apply {preview.willUpdateCount} safe items only</Trans>
          </Button>
          <Button size="sm">
            <CheckIcon data-icon="inline-start" />
            <Trans>
              Roll over all {preview.totalCount} (review {preview.requiresReviewCount})
            </Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
