import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  internalDeadlineFromBaseDueDate,
} from '@duedatehq/core/deadlines'
import { deriveOverlayDueDateMap } from '@duedatehq/core/overlay'
import type { Db } from '../client'
import { firmProfile } from '../schema/firm'
import { exceptionRule, obligationExceptionApplication } from '../schema/overlay'

const OVERLAY_READ_BATCH_SIZE = 90

export async function listActiveOverlayDueDates(
  db: Db,
  firmId: string,
  obligationIds: readonly string[],
): Promise<Map<string, Date>> {
  const uniqueIds = Array.from(new Set(obligationIds))
  if (uniqueIds.length === 0) return new Map()

  const chunks = []
  for (let i = 0; i < uniqueIds.length; i += OVERLAY_READ_BATCH_SIZE) {
    chunks.push(uniqueIds.slice(i, i + OVERLAY_READ_BATCH_SIZE))
  }

  const rowGroups = await Promise.all(
    chunks.map((chunk) =>
      db
        .select({
          obligationId: obligationExceptionApplication.obligationInstanceId,
          overrideDueDate: exceptionRule.overrideDueDate,
          appliedAt: obligationExceptionApplication.appliedAt,
        })
        .from(obligationExceptionApplication)
        .innerJoin(
          exceptionRule,
          eq(obligationExceptionApplication.exceptionRuleId, exceptionRule.id),
        )
        .where(
          and(
            eq(obligationExceptionApplication.firmId, firmId),
            inArray(obligationExceptionApplication.obligationInstanceId, chunk),
            isNull(obligationExceptionApplication.revertedAt),
            inArray(exceptionRule.status, ['verified', 'applied']),
          ),
        )
        .orderBy(desc(obligationExceptionApplication.appliedAt)),
    ),
  )

  return deriveOverlayDueDateMap(
    rowGroups
      .flat()
      .filter((row): row is typeof row & { overrideDueDate: Date } => Boolean(row.overrideDueDate))
      .map((row) => ({
        obligationId: row.obligationId,
        overrideDueDate: row.overrideDueDate,
        appliedAt: row.appliedAt,
      })),
  )
}

export async function listActiveOverlayInternalDeadlines(
  db: Db,
  firmId: string,
  obligationIds: readonly string[],
): Promise<Map<string, Date>> {
  const statutoryDueDates = await listActiveOverlayDueDates(db, firmId, obligationIds)
  if (statutoryDueDates.size === 0) return new Map()
  const [policy] = await db
    .select({ internalDeadlineOffsetDays: firmProfile.internalDeadlineOffsetDays })
    .from(firmProfile)
    .where(eq(firmProfile.id, firmId))
    .limit(1)
  const offsetDays = policy?.internalDeadlineOffsetDays ?? DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS
  return new Map(
    [...statutoryDueDates.entries()].map(([obligationId, statutoryDueDate]) => [
      obligationId,
      internalDeadlineFromBaseDueDate(statutoryDueDate, offsetDays),
    ]),
  )
}
