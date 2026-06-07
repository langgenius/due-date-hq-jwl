import type { ClassificationRecomputeRow } from '@duedatehq/contracts/clients'

export function currentTaxYearForDate(today = new Date()): number {
  return today.getFullYear() - 1
}

export function hasUnconfirmedCurrentTaxYearConfirmations({
  rows,
  confirmedOrphanIds,
  currentTaxYear,
}: {
  rows: readonly ClassificationRecomputeRow[]
  confirmedOrphanIds: ReadonlySet<string>
  currentTaxYear: number
}): boolean {
  return rows.some(
    (row) =>
      row.disposition === 'orphan_needs_confirmation' &&
      row.obligationId !== null &&
      row.taxYear === currentTaxYear &&
      !confirmedOrphanIds.has(row.obligationId),
  )
}
