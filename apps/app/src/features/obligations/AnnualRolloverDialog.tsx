import { type ReactNode, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, InfoIcon, Loader2Icon, RepeatIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { AnnualRolloverDisposition, AnnualRolloverRow } from '@duedatehq/contracts'
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

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDate } from '@/lib/utils'

// Pencil `c7xPK` — /deadlines annual rollover modal, wired to the real
// rollover engine (`obligations.previewAnnualRollover` /
// `createAnnualRollover`). Preview runs when the dialog opens; the apply
// actions create next-year obligations (safe-only filters to clients whose
// rows all map to a verified rule).
//
// TODO(data): the engine row exposes the NEW (target-year) due date +
// review reasons but not the source obligation's due date, so the "TY {from}
// due" reference cell renders an em-dash. Threading sourceDueDate through the
// engine buckets would make it fully populated.

// Map the engine's six dispositions onto the three Pencil summary buckets.
function dispositionBucket(
  disposition: AnnualRolloverDisposition,
): 'will_update' | 'requires_review' | 'skipped' {
  if (disposition === 'will_create') return 'will_update'
  if (disposition === 'review') return 'requires_review'
  return 'skipped'
}

function DispositionBadge({ disposition }: { disposition: AnnualRolloverDisposition }) {
  const bucket = dispositionBucket(disposition)
  const variant =
    bucket === 'will_update' ? 'info' : bucket === 'requires_review' ? 'warning' : 'secondary'
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
  value: number
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

function ruleChangeText(row: AnnualRolloverRow): string | null {
  const reasons = row.preview?.reviewReasons ?? []
  return reasons.length > 0 ? reasons.join(' · ') : null
}

export function AnnualRolloverDialog({ sourceFilingYear }: { sourceFilingYear?: number }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  // Default to the just-completed filing year → next. The engine validates
  // target === source + 1 and returns the authoritative years in the summary.
  const fromYear = sourceFilingYear ?? new Date().getFullYear()
  const toYear = fromYear + 1

  const previewQuery = useQuery(
    orpc.obligations.previewAnnualRollover.queryOptions({
      input: { sourceFilingYear: fromYear, targetFilingYear: toYear },
      enabled: open,
      staleTime: 60_000,
    }),
  )

  const createMutation = useMutation(
    orpc.obligations.createAnnualRollover.mutationOptions({
      onSuccess: (result) => {
        toast.success(t`Rolled over ${result.summary.createdCount} deadlines into ${toYear}`)
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void previewQuery.refetch()
        setOpen(false)
      },
      onError: (err) => {
        toast.error(t`Couldn't roll over deadlines`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  const data = previewQuery.data
  const summary = data?.summary
  const rows = useMemo(() => data?.rows ?? [], [data])

  // Clients whose rows all map to a verified next-year rule — the "safe" set.
  const safeClientIds = useMemo(() => {
    if (rows.length === 0) return []
    const byClient = new Map<string, boolean>()
    for (const row of rows) {
      const safe = row.disposition === 'will_create'
      byClient.set(row.clientId, (byClient.get(row.clientId) ?? true) && safe)
    }
    return [...byClient.entries()].filter(([, safe]) => safe).map(([clientId]) => clientId)
  }, [rows])

  function formatDueDate(value: string | null | undefined): string {
    return value ? formatDate(value) : '—'
  }

  const pending = createMutation.isPending
  const totalCount = summary?.seedObligationCount ?? 0
  const willUpdateCount = summary?.willCreateCount ?? 0
  const requiresReviewCount = summary?.reviewCount ?? 0
  const skippedCount = summary?.skippedCount ?? 0
  const headerFrom = summary?.sourceFilingYear ?? fromYear
  const headerTo = summary?.targetFilingYear ?? toYear

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
        className="max-w-[min(1040px,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-divider-regular px-6 py-4">
          <RepeatIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
          <h2 className="text-lg leading-none font-semibold text-text-primary">
            <Trans>
              Annual rollover · tax year {headerFrom} → {headerTo}
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
          {previewQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-secondary">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              <Trans>Looking up next year's rules…</Trans>
            </div>
          ) : previewQuery.isError ? (
            <div className="rounded-[10px] bg-background-default p-4 text-sm text-text-destructive">
              {rpcErrorMessage(previewQuery.error) ?? (
                <Trans>Couldn't build the rollover preview.</Trans>
              )}
            </div>
          ) : totalCount === 0 ? (
            <div className="rounded-[10px] bg-background-default p-8 text-center text-sm text-text-secondary">
              <Trans>
                No filed {headerFrom} deadlines are eligible to roll into {headerTo} yet.
              </Trans>
            </div>
          ) : (
            <>
              {/* Intro */}
              <div className="flex items-start gap-2.5 rounded-[10px] bg-background-default p-4">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-text-secondary" aria-hidden />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-description font-semibold text-text-primary">
                    <Trans>
                      You're rolling over {totalCount} obligations from tax year {headerFrom} into{' '}
                      {headerTo}.
                    </Trans>
                  </p>
                  <p className="text-caption leading-relaxed text-text-tertiary">
                    <Trans>
                      For each obligation we look up the matching rule for next year. Items where
                      the rule changed get flagged for your review.
                    </Trans>
                  </p>
                </div>
              </div>

              {/* Disposition summary */}
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <SummaryCard
                  tone="accent"
                  value={willUpdateCount}
                  label={<Trans>Will update</Trans>}
                  caption={<Trans>Rule unchanged · safe to roll</Trans>}
                />
                <SummaryCard
                  tone="warning"
                  value={requiresReviewCount}
                  label={<Trans>Requires review</Trans>}
                  caption={<Trans>Rule changed — your eyes needed</Trans>}
                />
                <SummaryCard
                  tone="neutral"
                  value={skippedCount}
                  label={<Trans>No verified rule</Trans>}
                  caption={<Trans>Skipped — no rule for {headerTo} yet</Trans>}
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
                        <Trans>TY {headerFrom} due</Trans>
                      </TableHead>
                      <TableHead className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                        <Trans>TY {headerTo} due</Trans>
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
                    {rows.map((row) => {
                      const ruleChange = ruleChangeText(row)
                      const form = row.preview?.formName ?? row.taxType
                      return (
                        <TableRow key={`${row.clientId}:${row.taxType}`}>
                          <TableCell className="font-semibold text-text-primary">
                            {row.clientName} · {form}
                          </TableCell>
                          <TableCell className="text-caption tabular-nums text-text-tertiary">
                            {/* TODO(data): source-year due not in the engine row. */}—
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-caption tabular-nums',
                              ruleChange ? 'font-bold text-text-warning' : 'text-text-primary',
                            )}
                          >
                            {formatDueDate(row.preview?.dueDate)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-caption',
                              ruleChange ? 'text-text-warning' : 'text-text-tertiary italic',
                            )}
                          >
                            {ruleChange ?? <Trans>unchanged</Trans>}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-divider-regular px-6 py-3.5">
          <DialogClose render={<Button variant="ghost" size="sm" />}>
            <Trans>Cancel</Trans>
          </DialogClose>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            disabled={pending || willUpdateCount === 0 || safeClientIds.length === 0}
            onClick={() =>
              createMutation.mutate({
                sourceFilingYear: headerFrom,
                targetFilingYear: headerTo,
                clientIds: safeClientIds,
              })
            }
          >
            <Trans>Apply {willUpdateCount} safe items only</Trans>
          </Button>
          <Button
            size="sm"
            disabled={pending || totalCount === 0}
            onClick={() =>
              createMutation.mutate({
                sourceFilingYear: headerFrom,
                targetFilingYear: headerTo,
              })
            }
          >
            {pending ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            <Trans>
              Roll over all {totalCount} (review {requiresReviewCount})
            </Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
