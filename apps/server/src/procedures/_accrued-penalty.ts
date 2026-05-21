import { estimateAccruedPenalty } from '@duedatehq/core/penalty'
import { statutoryPenaltyDueDate } from '@duedatehq/core/deadlines'

interface ClientPenaltyFacts {
  id: string
  entityType?: string | null
  state?: string | null
  estimatedTaxLiabilityCents?: number | null
  equityOwnerCount?: number | null
}

interface ObligationPenaltyFacts {
  id: string
  taxType: string
  jurisdiction?: string | null
  filingDueDate?: Date | null
  paymentDueDate?: Date | null
  baseDueDate?: Date | null
  currentDueDate: Date
  penaltyFactsJson?: unknown
  penaltyFactsVersion?: string | null
}

export function calculateAccruedPenalty(
  client: ClientPenaltyFacts,
  obligation: ObligationPenaltyFacts,
  asOfDate: string | Date,
) {
  const result = estimateAccruedPenalty(
    {
      jurisdiction: obligation.jurisdiction ?? client.state,
      taxType: obligation.taxType,
      entityType: client.entityType,
      dueDate: statutoryPenaltyDueDate(obligation),
      asOfDate,
      penaltyFactsJson: obligation.penaltyFactsJson,
    },
    { asOfDate },
  )
  return {
    accruedPenaltyCents: result.estimatedExposureCents,
    accruedPenaltyStatus: result.status,
    accruedPenaltyBreakdown: result.breakdown,
    penaltyAsOfDate: asOfDate instanceof Date ? asOfDate.toISOString().slice(0, 10) : asOfDate,
  }
}
