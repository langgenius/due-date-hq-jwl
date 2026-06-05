import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import type { Db } from '../client'
import { client } from '../schema/clients'
import { obligationInstance, type ObligationStatus } from '../schema/obligations'
import type {
  WorkloadLoadInput,
  WorkloadLoadResult,
  WorkloadOwnerRow,
  WorkloadSummary,
} from '@duedatehq/ports/workload'
import type { WorkloadOwnerKind } from '@duedatehq/ports/shared'

const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES] satisfies ObligationStatus[]
const DEFAULT_WINDOW_DAYS = 7
const MAX_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface WorkloadRawRow {
  obligationId: string
  currentDueDate: Date
  status: ObligationStatus
  assigneeName: string | null
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysBetween(dueDate: Date, asOfDate: string): number {
  return Math.floor(
    (parseDateOnly(toDateOnly(dueDate)).getTime() - parseDateOnly(asOfDate).getTime()) / DAY_MS,
  )
}

function normalizeAssigneeName(name: string | null): string | null {
  const trimmed = (name ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

function emptySummary(): WorkloadSummary {
  return {
    open: 0,
    dueSoon: 0,
    overdue: 0,
    waiting: 0,
    review: 0,
    unassigned: 0,
  }
}

function emptyOwnerRow(input: {
  id: string
  ownerLabel: string
  assigneeName: string | null
  kind: WorkloadOwnerKind
}): WorkloadOwnerRow {
  return {
    ...input,
    open: 0,
    dueSoon: 0,
    overdue: 0,
    waiting: 0,
    review: 0,
    loadScore: 0,
  }
}

function ownerId(kind: WorkloadOwnerKind, assigneeName: string | null): string {
  return kind === 'unassigned'
    ? 'unassigned'
    : `assignee:${Buffer.from(assigneeName ?? '', 'utf8').toString('base64url')}`
}

export function composeWorkloadLoad(
  rawRows: WorkloadRawRow[],
  input: WorkloadLoadInput = {},
): WorkloadLoadResult {
  const asOfDate = input.asOfDate ?? todayDateOnly()
  const windowDays = Math.min(Math.max(input.windowDays ?? DEFAULT_WINDOW_DAYS, 1), MAX_WINDOW_DAYS)
  const summary = emptySummary()
  const rowsByKey = new Map<string, WorkloadOwnerRow>()

  for (const rawRow of rawRows) {
    const assigneeName = normalizeAssigneeName(rawRow.assigneeName)
    const kind: WorkloadOwnerKind = assigneeName ? 'assignee' : 'unassigned'
    const id = ownerId(kind, assigneeName)
    const ownerLabel = assigneeName ?? 'Unassigned'
    let row = rowsByKey.get(id)
    if (!row) {
      row = emptyOwnerRow({ id, ownerLabel, assigneeName, kind })
      rowsByKey.set(id, row)
    }

    const days = daysBetween(rawRow.currentDueDate, asOfDate)
    row.open += 1
    summary.open += 1

    if (kind === 'unassigned') summary.unassigned += 1
    if (days < 0) {
      row.overdue += 1
      summary.overdue += 1
    }
    if (days >= 0 && days <= windowDays) {
      row.dueSoon += 1
      summary.dueSoon += 1
    }
    if (rawRow.status === 'waiting_on_client') {
      row.waiting += 1
      summary.waiting += 1
    }
    if (rawRow.status === 'review') {
      row.review += 1
      summary.review += 1
    }
  }

  const assignedRows = Array.from(rowsByKey.values()).filter((row) => row.kind === 'assignee')
  const maxAssignedOpen = Math.max(...assignedRows.map((row) => row.open), 0)
  const rows = Array.from(rowsByKey.values())
  for (const row of rows) {
    row.loadScore =
      row.kind === 'unassigned'
        ? row.open > 0
          ? 100
          : 0
        : maxAssignedOpen > 0
          ? Math.round((row.open / maxAssignedOpen) * 100)
          : 0
  }

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'assignee' ? -1 : 1
    const overdueDelta = b.overdue - a.overdue
    if (overdueDelta !== 0) return overdueDelta
    const dueSoonDelta = b.dueSoon - a.dueSoon
    if (dueSoonDelta !== 0) return dueSoonDelta
    const openDelta = b.open - a.open
    if (openDelta !== 0) return openDelta
    return a.ownerLabel.localeCompare(b.ownerLabel)
  })

  return { asOfDate, windowDays, summary, rows }
}

export function makeWorkloadRepo(db: Db, firmId: string) {
  return {
    firmId,

    async load(input: WorkloadLoadInput = {}): Promise<WorkloadLoadResult> {
      const rawRows = await db
        .select({
          obligationId: obligationInstance.id,
          currentDueDate: obligationInstance.currentDueDate,
          status: obligationInstance.status,
          assigneeName: client.assigneeName,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            inArray(obligationInstance.status, OPEN_STATUSES),
            isNull(obligationInstance.supersededAt),
          ),
        )
        .orderBy(asc(client.assigneeName), asc(obligationInstance.currentDueDate))

      return composeWorkloadLoad(rawRows, input)
    },
  }
}

export type WorkloadRepo = ReturnType<typeof makeWorkloadRepo>
