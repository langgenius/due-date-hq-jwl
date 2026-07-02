import type { WorkloadOwnerRow } from '@duedatehq/contracts'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'

// Workload counts OPEN deadlines only (see packages/db/src/repo/workload.ts),
// so every deep-link out of the page must carry the same status set — a
// "5 open" stat that lands on 7 rows (open + closed) breaks the number's
// meaning mid-hop. nuqs parseAsArrayOf encodes arrays comma-separated.
const OPEN_STATUS_PARAM = OPEN_OBLIGATION_STATUSES.join(',')

// RESIDUAL (2026-07-02 ux-flow audit): assignee deep-links are keyed by
// display NAME because that is all the pipeline supports end-to-end — the
// /deadlines `assignee`/`assignees` params map to `assigneeName(s)` in the
// queue contract, and the DB filter matches the denormalized
// `clients.assignee_name` text column (packages/db/src/repo/
// obligation-queue.ts). There is no id-keyed filter param, and
// WorkloadOwnerRow carries no assigneeId either. Until the contract + repo
// grow an assigneeId filter, every producer of these links MUST go through
// the helpers below so the name-keying lives in exactly one place — a
// member rename then breaks one helper, not N scattered URLs.

/** Canonical /deadlines link for one teammate's deadlines (all statuses). */
export function assigneeDeadlinesHref(assigneeName: string): string {
  return obligationQueueHref({ assignee: assigneeName })
}

export function obligationQueueHref(
  params: Record<string, string | number | null | undefined>,
): string {
  const url = new URL('/deadlines', 'https://duedatehq.local')
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return `${url.pathname}${url.search}`
}

export function workloadRowHref(row: WorkloadOwnerRow, status: string = OPEN_STATUS_PARAM): string {
  return obligationQueueHref({
    ...(row.kind === 'unassigned'
      ? { owner: 'unassigned' }
      : { assignee: row.assigneeName ?? row.ownerLabel }),
    status,
  })
}

export function workloadRowDueSoonHref(
  row: WorkloadOwnerRow,
  asOfDate: string,
  windowDays: number,
): string {
  return obligationQueueHref({
    ...(row.kind === 'unassigned'
      ? { owner: 'unassigned' }
      : { assignee: row.assigneeName ?? row.ownerLabel }),
    status: OPEN_STATUS_PARAM,
    dueWithin: windowDays,
    asOf: asOfDate,
  })
}

export function workloadRowOverdueHref(row: WorkloadOwnerRow, asOfDate: string): string {
  return obligationQueueHref({
    ...(row.kind === 'unassigned'
      ? { owner: 'unassigned' }
      : { assignee: row.assigneeName ?? row.ownerLabel }),
    status: OPEN_STATUS_PARAM,
    due: 'overdue',
    asOf: asOfDate,
  })
}
