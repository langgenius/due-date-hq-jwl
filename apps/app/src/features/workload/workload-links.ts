import type { WorkloadOwnerRow } from '@duedatehq/contracts'

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

export function workloadRowHref(row: WorkloadOwnerRow): string {
  return obligationQueueHref(
    row.kind === 'unassigned'
      ? { owner: 'unassigned' }
      : { assignee: row.assigneeName ?? row.ownerLabel },
  )
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
    dueWithin: windowDays,
    asOf: asOfDate,
  })
}

export function workloadRowOverdueHref(row: WorkloadOwnerRow, asOfDate: string): string {
  return obligationQueueHref({
    ...(row.kind === 'unassigned'
      ? { owner: 'unassigned' }
      : { assignee: row.assigneeName ?? row.ownerLabel }),
    due: 'overdue',
    asOf: asOfDate,
  })
}
