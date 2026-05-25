import {
  FEDERAL_TAX_DUE_SOURCES,
  FORMULA_RULES,
  GENERIC_STATE_TAX_TYPE_RE,
  IRS_FAILURE_TO_FILE,
  IRS_FAILURE_TO_PAY,
  KNOWN_STATE_TAX_TYPES,
  STATE_UNSUPPORTED_REASON,
  type FormulaRule,
  type PenaltySourceRef,
} from './catalog'

export {
  listPenaltyFormulaCatalog,
  type PenaltyFormulaCatalogEntry,
  type PenaltySourceRef,
} from './catalog'

export type PenaltyExposureStatus = 'ready' | 'needs_input' | 'unsupported'

export const PENALTY_FORMULA_VERSION = 'penalty-v3-allstates-2026q2'
export const PENALTY_FACTS_VERSION = 'penalty-facts-v1'
export const DEFAULT_EXPOSURE_HORIZON_DAYS = 90

export interface PenaltyInstallmentFact {
  dueDate?: string | null
  requiredPaymentCents?: number | null
  paidCents?: number | null
  paidDate?: string | null
  annualRateBps?: number | null
}

export interface PenaltyFacts {
  taxDueCents?: number | null
  paymentsAndCreditsCents?: number | null
  filingDate?: string | null
  paymentDate?: string | null
  extensionFiled?: boolean | null
  extensionValid?: boolean | null
  returnFiled?: boolean | null
  periodStart?: string | null
  periodEnd?: string | null
  filingFrequency?: string | null
  installments?: PenaltyInstallmentFact[] | null
  memberCount?: number | null
  partnerCount?: number | null
  shareholderCount?: number | null
  grossReceiptsCents?: number | null
  receiptsBand?: string | null
  annualReportNoTaxDueStatus?: boolean | null
  waSubtotalMinusCreditsCents?: number | null
  txPriorYearFranchiseTaxCents?: number | null
  txCurrentYearFranchiseTaxCents?: number | null
  flTentativeTaxCents?: number | null
  nyPtetElectionMade?: boolean | null
  nyPtetPaymentsCents?: number | null
  withholdingReportCount?: number | null
  uiWageReportCount?: number | null
  informationReportCount?: number | null
}

export interface PenaltyFactsEnvelope {
  version: typeof PENALTY_FACTS_VERSION
  facts: PenaltyFacts
}

export interface PenaltyEngineInput {
  jurisdiction?: string | null | undefined
  taxType: string
  entityType?: string | null | undefined
  dueDate: string | Date
  asOfDate?: string | Date | undefined
  penaltyFactsJson?: unknown
  penaltyFacts?: PenaltyFacts | null | undefined
  estimatedTaxLiabilityCents?: number | null | undefined
  estimatedTaxDueCents?: number | null | undefined
  equityOwnerCount?: number | null | undefined
  horizonDays?: number | undefined
}

export interface PenaltyBreakdownItem {
  key: string
  label: string
  amountCents: number
  formula: string
  inputs?: Record<string, string | number | boolean | null>
  sourceRefs?: PenaltySourceRef[]
}

export interface PenaltyEngineResult {
  status: PenaltyExposureStatus
  estimatedExposureCents: number | null
  estimatedTaxDueCents: number | null
  breakdown: PenaltyBreakdownItem[]
  formulaVersion: string
  missingInputs: string[]
  missingPenaltyFacts: string[]
  penaltySourceRefs: PenaltySourceRef[]
  penaltyFormulaLabel: string | null
  penaltyFactsVersion: string | null
  unsupportedReason: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_OWNER_MONTHS = 12
const MAX_FAILURE_TO_FILE_PERCENT = 0.25
const MAX_FAILURE_TO_PAY_PERCENT = 0.25
type TaxDueMonthlyConfig = NonNullable<NonNullable<FormulaRule['calculation']>['taxDueMonthly']>
type OwnerMonthConfig = NonNullable<NonNullable<FormulaRule['calculation']>['ownerMonth']>

export function estimateLegacyPenaltyAmount(
  input: PenaltyEngineInput,
  options: { horizonDays?: number } = {},
): PenaltyEngineResult {
  const horizonDays =
    positiveInteger(options.horizonDays) ??
    positiveInteger(input.horizonDays) ??
    DEFAULT_EXPOSURE_HORIZON_DAYS
  const dueDate = parseDateOnly(input.dueDate)
  return estimatePenalty(input, {
    lateMonths: monthsForHorizonDays(horizonDays),
    daysLate: horizonDays,
    calculationDate: addDays(dueDate, horizonDays),
  })
}

export function estimateAccruedPenalty(
  input: PenaltyEngineInput,
  options: { asOfDate?: string | Date } = {},
): PenaltyEngineResult {
  const asOfDate = options.asOfDate ?? input.asOfDate ?? new Date()
  return estimatePenalty(input, {
    lateMonths: monthsLate(input.dueDate, asOfDate),
    daysLate: daysLate(input.dueDate, asOfDate),
    calculationDate: parseDateOnly(asOfDate),
  })
}

export function buildPenaltyFactsFromLegacy(input: {
  taxType: string
  estimatedTaxLiabilityCents?: number | null
  estimatedTaxDueCents?: number | null
  equityOwnerCount?: number | null
  periodStart?: string | null
  periodEnd?: string | null
}): PenaltyFactsEnvelope {
  const facts: PenaltyFacts = {}
  const taxDueCents = nonNegativeCents(
    input.estimatedTaxDueCents ?? input.estimatedTaxLiabilityCents,
  )
  const ownerCount = positiveInteger(input.equityOwnerCount)

  if (taxDueCents !== null) {
    facts.taxDueCents = taxDueCents
    facts.paymentsAndCreditsCents = 0
  }
  if (input.periodStart) facts.periodStart = input.periodStart
  if (input.periodEnd) facts.periodEnd = input.periodEnd
  if (ownerCount !== null) {
    if (input.taxType === 'federal_1065' || input.taxType.includes('partnership')) {
      facts.partnerCount = ownerCount
    } else if (input.taxType === 'federal_1120s' || input.taxType.includes('100s')) {
      facts.shareholderCount = ownerCount
    } else if (input.taxType.includes('llc')) {
      facts.memberCount = ownerCount
    } else {
      facts.partnerCount = ownerCount
      facts.shareholderCount = ownerCount
      facts.memberCount = ownerCount
    }
  }

  return { version: PENALTY_FACTS_VERSION, facts }
}

function estimatePenalty(
  input: PenaltyEngineInput,
  timing: { lateMonths: number; daysLate: number; calculationDate: Date },
): PenaltyEngineResult {
  const rule = lookupFormulaRule(input)
  if (!rule) {
    return unsupported({
      reason: `No verified penalty formula for ${input.taxType}.`,
      label: null,
      sourceRefs: [],
      factsVersion: factsEnvelopeFromInput(input).version,
    })
  }
  if (rule.kind === 'unsupported') {
    return unsupported({
      reason: rule.unsupportedReason ?? `No verified penalty formula for ${input.taxType}.`,
      label: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: factsEnvelopeFromInput(input).version,
    })
  }

  const envelope = factsEnvelopeFromInput(input)
  const facts = envelope.facts
  const missingFacts = missingRequiredFacts(rule, facts)
  if (missingFacts.length > 0) {
    return needsInput({
      missingFacts,
      estimatedTaxDueCents: unpaidTaxCents(facts),
      label: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (
    timing.lateMonths <= 0 &&
    rule.kind !== 'federal_corp_estimated_tax' &&
    rule.kind !== 'installment_underpayment'
  ) {
    return ready({
      amount: 0,
      taxDueCents: unpaidTaxCents(facts),
      breakdown: [
        {
          key: 'not-late',
          label: 'No accrued penalty',
          amountCents: 0,
          formula: 'current due date has not passed as of the selected date',
          sourceRefs: [...rule.sourceRefs],
        },
      ],
      label: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'federal_partnership_owner_month') {
    return ownerMonthPenalty({
      label: 'Late partnership return',
      countLabel: 'partner',
      ownerCount: positiveInteger(facts.partnerCount)!,
      dueDate: input.dueDate,
      lateMonths: timing.lateMonths,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'federal_s_corp_shareholder_month') {
    const ownerPenalty = ownerMonthPenalty({
      label: 'Late S corporation return',
      countLabel: 'shareholder',
      ownerCount: positiveInteger(facts.shareholderCount)!,
      dueDate: input.dueDate,
      lateMonths: timing.lateMonths,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
    const taxDueCents = unpaidTaxCents(facts)
    if (!rule.supportsOptionalTaxDue || taxDueCents === null || taxDueCents <= 0) {
      return ownerPenalty
    }

    const taxDuePenalty = taxDueReturnPenalty({
      taxDueCents,
      dueDate: input.dueDate,
      lateMonths: timing.lateMonths,
      daysLate: timing.daysLate,
      formulaLabel: rule.label,
      sourceRefs: FEDERAL_TAX_DUE_SOURCES,
      factsVersion: envelope.version,
    })
    if (taxDuePenalty.status !== 'ready' || taxDuePenalty.estimatedExposureCents === null) {
      return ownerPenalty
    }
    return ready({
      amount: (ownerPenalty.estimatedExposureCents ?? 0) + taxDuePenalty.estimatedExposureCents,
      taxDueCents,
      breakdown: [...ownerPenalty.breakdown, ...taxDuePenalty.breakdown],
      label: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'federal_corp_estimated_tax') {
    return federalEstimatedTaxPenalty({
      facts,
      calculationDate: timing.calculationDate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'installment_underpayment') {
    return federalEstimatedTaxPenalty({
      facts,
      calculationDate: timing.calculationDate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'tax_due_monthly') {
    return taxDueMonthlyPenalty({
      facts,
      lateMonths: timing.lateMonths,
      daysLate: timing.daysLate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
      config: rule.calculation?.taxDueMonthly,
    })
  }

  if (rule.kind === 'owner_month') {
    return ownerMonthRulePenalty({
      facts,
      lateMonths: timing.lateMonths,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
      config: rule.calculation?.ownerMonth,
    })
  }

  if (rule.kind === 'owner_month_plus_tax_due_monthly') {
    return ownerMonthPlusTaxDueMonthlyPenalty({
      facts,
      lateMonths: timing.lateMonths,
      daysLate: timing.daysLate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
      ownerConfig: rule.calculation?.ownerMonth,
      taxDueConfig: rule.calculation?.taxDueMonthly,
    })
  }

  if (rule.kind === 'fixed_percent_unpaid_tax') {
    return fixedPercentUnpaidTaxPenalty({
      facts,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
      rate: rule.calculation?.fixedPercentRate,
    })
  }

  if (rule.kind === 'tx_franchise_report') {
    return texasFranchiseReportPenalty({
      facts,
      daysLate: timing.daysLate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'tx_franchise_extension') {
    return texasFranchiseExtensionPenalty({
      facts,
      daysLate: timing.daysLate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'wa_excise_late_payment') {
    return washingtonExciseLatePaymentPenalty({
      facts,
      dueDate: input.dueDate,
      calculationDate: timing.calculationDate,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'fl_cit_return') {
    return floridaCorporateLateReturnPenalty({
      facts,
      lateMonths: timing.lateMonths,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  if (rule.kind === 'fixed_late_report') {
    return fixedLateReportPenalty({
      amountCents: rule.calculation?.fixedReportPenaltyCents ?? 0,
      formulaLabel: rule.label,
      sourceRefs: rule.sourceRefs,
      factsVersion: envelope.version,
    })
  }

  return taxDueReturnPenalty({
    taxDueCents: unpaidTaxCents(facts)!,
    dueDate: input.dueDate,
    lateMonths: timing.lateMonths,
    daysLate: timing.daysLate,
    formulaLabel: rule.label,
    sourceRefs: rule.sourceRefs,
    factsVersion: envelope.version,
  })
}

function lookupFormulaRule(input: Pick<PenaltyEngineInput, 'taxType' | 'jurisdiction'>) {
  const direct = FORMULA_RULES[input.taxType]
  if (direct) return direct
  if (KNOWN_STATE_TAX_TYPES.has(input.taxType) || GENERIC_STATE_TAX_TYPE_RE.test(input.taxType)) {
    const jurisdiction = normalizeJurisdiction(input.jurisdiction, input.taxType)
    return {
      kind: 'unsupported',
      label: `${jurisdiction} state penalty formula`,
      jurisdiction,
      taxTypeAliases: [input.taxType],
      requiredFacts: [],
      sourceRefs: [],
      unsupportedReason: STATE_UNSUPPORTED_REASON,
    } satisfies FormulaRule
  }
  return undefined
}

function ownerMonthPenalty(input: {
  label: string
  countLabel: string
  ownerCount: number
  dueDate: string | Date
  lateMonths: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const months = Math.min(MAX_OWNER_MONTHS, Math.max(0, input.lateMonths))
  const rate = passThroughMonthlyPenaltyCents(input.dueDate)
  const amount = rate * input.ownerCount * months
  return ready({
    amount,
    taxDueCents: null,
    breakdown: [
      {
        key: 'owner-months',
        label: input.label,
        amountCents: amount,
        formula: `${formatDollars(rate)} x ${input.ownerCount} ${input.countLabel}(s) x ${months} month(s)`,
        inputs: {
          [`${input.countLabel}Count`]: input.ownerCount,
          penaltyMonths: months,
          monthlyRateCents: rate,
        },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function taxDueReturnPenalty(input: {
  taxDueCents: number
  dueDate: string | Date
  lateMonths: number
  daysLate: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const taxDueCents = nonNegativeCents(input.taxDueCents)
  if (taxDueCents === null) {
    return needsInput({
      missingFacts: ['taxDueCents', 'paymentsAndCreditsCents'],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }

  const failureToFilePercent = Math.min(MAX_FAILURE_TO_FILE_PERCENT, 0.05 * input.lateMonths)
  const failureToFileGross = Math.round(taxDueCents * failureToFilePercent)
  const minimumLateFile =
    input.daysLate > 60 ? Math.min(taxDueCents, minimumLateFilePenaltyCents(input.dueDate)) : 0
  const failureToFileBeforeOffset = Math.max(failureToFileGross, minimumLateFile)
  const overlapMonths = Math.min(input.lateMonths, 5)
  const failureToPayOffset = Math.min(
    failureToFileBeforeOffset,
    Math.round(taxDueCents * 0.005 * overlapMonths),
  )
  const failureToFile = Math.max(0, failureToFileBeforeOffset - failureToPayOffset)
  const failureToPayPercent = Math.min(MAX_FAILURE_TO_PAY_PERCENT, 0.005 * input.lateMonths)
  const failureToPay = Math.round(taxDueCents * failureToPayPercent)
  const amount = failureToFile + failureToPay
  const breakdown: PenaltyBreakdownItem[] = [
    {
      key: 'failure-to-file',
      label: 'Late filing penalty estimate',
      amountCents: failureToFile,
      formula:
        minimumLateFile > 0
          ? `max(${formatPercent(failureToFilePercent)} x unpaid tax, min(unpaid tax, ${formatDollars(minimumLateFilePenaltyCents(input.dueDate))})) - same-month failure-to-pay offset`
          : `${formatPercent(failureToFilePercent)} x unpaid tax - same-month failure-to-pay offset`,
      inputs: {
        unpaidTaxCents: taxDueCents,
        penaltyMonths: input.lateMonths,
        daysLate: input.daysLate,
      },
      sourceRefs: [IRS_FAILURE_TO_FILE],
    },
    {
      key: 'failure-to-pay',
      label: 'Late payment penalty estimate',
      amountCents: failureToPay,
      formula: `${formatPercent(failureToPayPercent)} x unpaid tax`,
      inputs: {
        unpaidTaxCents: taxDueCents,
        penaltyMonths: input.lateMonths,
      },
      sourceRefs: [IRS_FAILURE_TO_PAY],
    },
  ]

  if (failureToPayOffset > 0) {
    breakdown.splice(1, 0, {
      key: 'failure-to-pay-offset',
      label: 'Failure-to-file offset',
      amountCents: failureToPayOffset,
      formula: `${formatPercent(0.005)} x unpaid tax x ${overlapMonths} overlapping month(s)`,
      inputs: {
        unpaidTaxCents: taxDueCents,
        overlappingMonths: overlapMonths,
      },
      sourceRefs: [IRS_FAILURE_TO_PAY],
    })
  }

  return ready({
    amount,
    taxDueCents,
    breakdown,
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function federalEstimatedTaxPenalty(input: {
  facts: PenaltyFacts
  calculationDate: Date
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const installments = input.facts.installments ?? []
  const missingFacts: string[] = []

  installments.forEach((installment, index) => {
    const prefix = `installments[${index}]`
    if (!installment.dueDate) missingFacts.push(`${prefix}.dueDate`)
    if (nonNegativeCents(installment.requiredPaymentCents) === null) {
      missingFacts.push(`${prefix}.requiredPaymentCents`)
    }
    if (nonNegativeCents(installment.paidCents) === null) {
      missingFacts.push(`${prefix}.paidCents`)
    }
    if (positiveInteger(installment.annualRateBps) === null) {
      missingFacts.push(`${prefix}.annualRateBps`)
    }
  })

  if (installments.length === 0) missingFacts.push('installments')
  if (missingFacts.length > 0) {
    return needsInput({
      missingFacts,
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }

  const breakdown = installments.map((installment, index): PenaltyBreakdownItem => {
    const required = nonNegativeCents(installment.requiredPaymentCents)!
    const paid = nonNegativeCents(installment.paidCents)!
    const underpayment = Math.max(0, required - paid)
    const rateBps = positiveInteger(installment.annualRateBps)!
    const paidThrough = installment.paidDate
      ? parseDateOnly(installment.paidDate)
      : input.calculationDate
    const daysUnderpaid = daysLate(installment.dueDate!, paidThrough)
    const amount = Math.round(underpayment * (rateBps / 10_000) * (daysUnderpaid / 365))
    return {
      key: `estimated-tax-installment-${index + 1}`,
      label: `Estimated tax installment ${index + 1}`,
      amountCents: amount,
      formula: `underpayment x annual underpayment rate x days underpaid / 365`,
      inputs: {
        requiredPaymentCents: required,
        paidCents: paid,
        underpaymentCents: underpayment,
        annualRateBps: rateBps,
        daysUnderpaid,
      },
      sourceRefs: [...input.sourceRefs],
    }
  })

  return ready({
    amount: breakdown.reduce((sum, item) => sum + item.amountCents, 0),
    taxDueCents: null,
    breakdown,
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function taxDueMonthlyPenalty(input: {
  facts: PenaltyFacts
  lateMonths: number
  daysLate: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
  config: TaxDueMonthlyConfig | undefined
}): PenaltyEngineResult {
  const config = input.config
  const unpaid = unpaidTaxCents(input.facts)
  if (!config || unpaid === null) {
    return needsInput({
      missingFacts: ['taxDueCents', 'paymentsAndCreditsCents'],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }

  const lateFilingPercent = Math.min(
    config.lateFilingCapRate ?? Number.POSITIVE_INFINITY,
    (config.lateFilingMonthlyRate ?? 0) * input.lateMonths,
  )
  const minimumLateFiling =
    config.minimumAfterDays && input.daysLate > config.minimumAfterDays.daysLate
      ? Math.min(unpaid, config.minimumAfterDays.amountCents)
      : 0
  const lateFiling = Math.max(Math.round(unpaid * lateFilingPercent), minimumLateFiling)
  const paymentMonths = Math.min(config.latePaymentMaxMonths ?? input.lateMonths, input.lateMonths)
  const latePaymentPercentBeforeCap =
    (config.latePaymentInitialRate ?? 0) + (config.latePaymentMonthlyRate ?? 0) * paymentMonths
  const latePaymentPercent = Math.min(
    config.latePaymentCapRate ?? Number.POSITIVE_INFINITY,
    latePaymentPercentBeforeCap,
  )
  const latePayment = Math.round(unpaid * latePaymentPercent)
  const uncappedAmount = lateFiling + latePayment
  const monthlyCap =
    config.combinedMonthlyCapRate === undefined
      ? Number.POSITIVE_INFINITY
      : Math.round(unpaid * config.combinedMonthlyCapRate * input.lateMonths)
  const totalCap =
    config.combinedCapRate === undefined
      ? Number.POSITIVE_INFINITY
      : Math.round(unpaid * config.combinedCapRate)
  const amount = Math.min(uncappedAmount, monthlyCap, totalCap)
  const breakdown: PenaltyBreakdownItem[] = []

  if (config.lateFilingMonthlyRate !== undefined || minimumLateFiling > 0) {
    breakdown.push({
      key: 'state-late-filing',
      label: 'Late filing penalty estimate',
      amountCents: lateFiling,
      formula:
        minimumLateFiling > 0
          ? `max(${formatPercent(lateFilingPercent)} x unpaid tax, ${formatDollars(minimumLateFiling)})`
          : `${formatPercent(lateFilingPercent)} x unpaid tax`,
      inputs: {
        unpaidTaxCents: unpaid,
        penaltyMonths: input.lateMonths,
        daysLate: input.daysLate,
      },
      sourceRefs: [...input.sourceRefs],
    })
  }
  if (config.latePaymentInitialRate !== undefined || config.latePaymentMonthlyRate !== undefined) {
    breakdown.push({
      key: 'state-late-payment',
      label: 'Late payment penalty estimate',
      amountCents: latePayment,
      formula: `${formatPercent(latePaymentPercent)} x unpaid tax`,
      inputs: {
        unpaidTaxCents: unpaid,
        penaltyMonths: paymentMonths,
      },
      sourceRefs: [...input.sourceRefs],
    })
  }
  if (amount < uncappedAmount) {
    breakdown.push({
      key: 'state-combined-cap',
      label: 'Combined penalty cap',
      amountCents: uncappedAmount - amount,
      formula: 'state combined cap applied to late filing and late payment penalties',
      inputs: {
        uncappedPenaltyCents: uncappedAmount,
        cappedPenaltyCents: amount,
      },
      sourceRefs: [...input.sourceRefs],
    })
  }

  return ready({
    amount,
    taxDueCents: unpaid,
    breakdown,
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function ownerMonthRulePenalty(input: {
  facts: PenaltyFacts
  lateMonths: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
  config: OwnerMonthConfig | undefined
}): PenaltyEngineResult {
  const config = input.config
  if (!config) {
    return needsInput({
      missingFacts: [],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }
  const count = positiveInteger(ownerCountFact(input.facts, config.countFact))
  if (count === null) {
    return needsInput({
      missingFacts: [config.countFact],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }
  const months = Math.min(config.maxMonths, Math.max(0, input.lateMonths))
  const amount = config.monthlyPenaltyCents * count * months
  return ready({
    amount,
    taxDueCents: null,
    breakdown: [
      {
        key: 'state-owner-months',
        label: `Late return per-${config.countLabel} penalty`,
        amountCents: amount,
        formula: `${formatDollars(config.monthlyPenaltyCents)} x ${count} ${config.countLabel}(s) x ${months} month(s)`,
        inputs: {
          [`${config.countLabel}Count`]: count,
          penaltyMonths: months,
        },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function ownerMonthPlusTaxDueMonthlyPenalty(input: {
  facts: PenaltyFacts
  lateMonths: number
  daysLate: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
  ownerConfig: OwnerMonthConfig | undefined
  taxDueConfig: TaxDueMonthlyConfig | undefined
}): PenaltyEngineResult {
  const ownerPenalty = ownerMonthRulePenalty({
    facts: input.facts,
    lateMonths: input.lateMonths,
    formulaLabel: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
    config: input.ownerConfig,
  })
  const unpaid = unpaidTaxCents(input.facts)
  if (ownerPenalty.status !== 'ready' || unpaid === null || unpaid <= 0 || !input.taxDueConfig) {
    return ownerPenalty
  }

  const taxDuePenalty = taxDueMonthlyPenalty({
    facts: input.facts,
    lateMonths: input.lateMonths,
    daysLate: input.daysLate,
    formulaLabel: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
    config: input.taxDueConfig,
  })
  if (taxDuePenalty.status !== 'ready' || taxDuePenalty.estimatedExposureCents === null) {
    return ownerPenalty
  }

  return ready({
    amount: (ownerPenalty.estimatedExposureCents ?? 0) + taxDuePenalty.estimatedExposureCents,
    taxDueCents: unpaid,
    breakdown: [...ownerPenalty.breakdown, ...taxDuePenalty.breakdown],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function fixedPercentUnpaidTaxPenalty(input: {
  facts: PenaltyFacts
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
  rate: number | undefined
}): PenaltyEngineResult {
  const unpaid = unpaidTaxCents(input.facts)
  if (unpaid === null || input.rate === undefined) {
    return needsInput({
      missingFacts: ['taxDueCents', 'paymentsAndCreditsCents'],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }
  const amount = Math.round(unpaid * input.rate)
  return ready({
    amount,
    taxDueCents: unpaid,
    breakdown: [
      {
        key: 'fixed-percent-underpayment',
        label: 'Underpayment penalty estimate',
        amountCents: amount,
        formula: `${formatPercent(input.rate)} x unpaid amount`,
        inputs: { unpaidTaxCents: unpaid },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function texasFranchiseReportPenalty(input: {
  facts: PenaltyFacts
  daysLate: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const unpaid = unpaidTaxCents(input.facts)
  if (unpaid === null) {
    return needsInput({
      missingFacts: ['taxDueCents', 'paymentsAndCreditsCents'],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }
  const taxPenaltyRate = unpaid > 0 ? (input.daysLate > 30 ? 0.1 : 0.05) : 0
  const taxPenalty = Math.round(unpaid * taxPenaltyRate)
  const reportPenalty = 5_000
  return ready({
    amount: reportPenalty + taxPenalty,
    taxDueCents: unpaid,
    breakdown: [
      {
        key: 'texas-late-report',
        label: 'Late report penalty',
        amountCents: reportPenalty,
        formula: '$50 per late report',
        sourceRefs: [...input.sourceRefs],
      },
      {
        key: 'texas-late-tax-payment',
        label: 'Late tax payment penalty',
        amountCents: taxPenalty,
        formula: `${formatPercent(taxPenaltyRate)} x unpaid tax`,
        inputs: {
          unpaidTaxCents: unpaid,
          daysLate: input.daysLate,
        },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function texasFranchiseExtensionPenalty(input: {
  facts: PenaltyFacts
  daysLate: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const priorYear = nonNegativeCents(input.facts.txPriorYearFranchiseTaxCents)
  const currentYear = nonNegativeCents(input.facts.txCurrentYearFranchiseTaxCents)
  const paid = nonNegativeCents(input.facts.paymentsAndCreditsCents)
  const missingFacts: string[] = []
  if (priorYear === null) missingFacts.push('txPriorYearFranchiseTaxCents')
  if (currentYear === null) missingFacts.push('txCurrentYearFranchiseTaxCents')
  if (paid === null) missingFacts.push('paymentsAndCreditsCents')
  if (missingFacts.length > 0) {
    return needsInput({
      missingFacts,
      estimatedTaxDueCents: currentYear,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }

  const safeHarbor = Math.min(priorYear!, Math.round(currentYear! * 0.9))
  const requiredCurrentYearPayment = Math.round(currentYear! * 0.9)
  const underpayment = paid! >= safeHarbor ? 0 : Math.max(0, requiredCurrentYearPayment - paid!)
  const rate = underpayment > 0 ? (input.daysLate > 30 ? 0.1 : 0.05) : 0
  const amount = Math.round(underpayment * rate)

  return ready({
    amount,
    taxDueCents: underpayment,
    breakdown: [
      {
        key: 'texas-extension-underpayment',
        label: 'Extension underpayment penalty',
        amountCents: amount,
        formula: 'penalty rate x max(0, 90% current-year franchise tax - timely extension payment)',
        inputs: {
          priorYearFranchiseTaxCents: priorYear!,
          currentYearFranchiseTaxCents: currentYear!,
          paymentsAndCreditsCents: paid!,
          safeHarborCents: safeHarbor,
          underpaymentCents: underpayment,
          penaltyRate: rate,
        },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function washingtonExciseLatePaymentPenalty(input: {
  facts: PenaltyFacts
  dueDate: string | Date
  calculationDate: Date
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const taxBase = nonNegativeCents(input.facts.waSubtotalMinusCreditsCents)
  if (taxBase === null) {
    return needsInput({
      missingFacts: ['waSubtotalMinusCreditsCents'],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }
  if (taxBase === 0) {
    return ready({
      amount: 0,
      taxDueCents: 0,
      breakdown: [
        {
          key: 'washington-no-tax-due',
          label: 'No late-payment penalty',
          amountCents: 0,
          formula: 'no Washington excise penalty when subtotal minus credits is $0',
          inputs: { waSubtotalMinusCreditsCents: 0 },
          sourceRefs: [...input.sourceRefs],
        },
      ],
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }

  const due = parseDateOnly(input.dueDate)
  const firstEscalation = lastDayOfMonth(addCalendarMonths(due, 1))
  const secondEscalation = lastDayOfMonth(addCalendarMonths(due, 2))
  const calculationTime = input.calculationDate.getTime()
  const rate =
    calculationTime > secondEscalation.getTime()
      ? 0.29
      : calculationTime > firstEscalation.getTime()
        ? 0.19
        : 0.09
  const amount = Math.max(500, Math.round(taxBase * rate))

  return ready({
    amount,
    taxDueCents: taxBase,
    breakdown: [
      {
        key: 'washington-late-payment',
        label: 'Late payment penalty',
        amountCents: amount,
        formula: `max($5, ${formatPercent(rate)} x subtotal minus credits)`,
        inputs: {
          waSubtotalMinusCreditsCents: taxBase,
          penaltyRate: rate,
        },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function floridaCorporateLateReturnPenalty(input: {
  facts: PenaltyFacts
  lateMonths: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  const unpaid = unpaidTaxCents(input.facts)
  if (unpaid === null) {
    return needsInput({
      missingFacts: ['taxDueCents', 'paymentsAndCreditsCents'],
      estimatedTaxDueCents: null,
      label: input.formulaLabel,
      sourceRefs: input.sourceRefs,
      factsVersion: input.factsVersion,
    })
  }
  const amount =
    unpaid > 0
      ? Math.round(unpaid * Math.min(0.5, 0.1 * input.lateMonths))
      : Math.min(30_000, 5_000 * input.lateMonths)
  return ready({
    amount,
    taxDueCents: unpaid,
    breakdown: [
      {
        key: 'florida-cit-late-return',
        label: 'Late return penalty',
        amountCents: amount,
        formula:
          unpaid > 0
            ? `${formatPercent(Math.min(0.5, 0.1 * input.lateMonths))} x unpaid tax`
            : `$50 x ${input.lateMonths} month(s), capped at $300`,
        inputs: {
          unpaidTaxCents: unpaid,
          penaltyMonths: input.lateMonths,
        },
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function fixedLateReportPenalty(input: {
  amountCents: number
  formulaLabel: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  return ready({
    amount: input.amountCents,
    taxDueCents: null,
    breakdown: [
      {
        key: 'fixed-late-report',
        label: 'Late report penalty',
        amountCents: input.amountCents,
        formula: `${formatDollars(input.amountCents)} per late report`,
        sourceRefs: [...input.sourceRefs],
      },
    ],
    label: input.formulaLabel,
    sourceRefs: input.sourceRefs,
    factsVersion: input.factsVersion,
  })
}

function ready(input: {
  amount: number
  taxDueCents: number | null
  breakdown: PenaltyBreakdownItem[]
  label: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  return {
    status: 'ready',
    estimatedExposureCents: Math.max(0, Math.round(input.amount)),
    estimatedTaxDueCents: input.taxDueCents,
    breakdown: input.breakdown,
    formulaVersion: PENALTY_FORMULA_VERSION,
    missingInputs: [],
    missingPenaltyFacts: [],
    penaltySourceRefs: [...input.sourceRefs],
    penaltyFormulaLabel: input.label,
    penaltyFactsVersion: input.factsVersion,
    unsupportedReason: null,
  }
}

function needsInput(input: {
  missingFacts: string[]
  estimatedTaxDueCents: number | null
  label: string
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  return {
    status: 'needs_input',
    estimatedExposureCents: null,
    estimatedTaxDueCents: input.estimatedTaxDueCents,
    breakdown: [],
    formulaVersion: PENALTY_FORMULA_VERSION,
    missingInputs: input.missingFacts,
    missingPenaltyFacts: input.missingFacts,
    penaltySourceRefs: [...input.sourceRefs],
    penaltyFormulaLabel: input.label,
    penaltyFactsVersion: input.factsVersion,
    unsupportedReason: null,
  }
}

function unsupported(input: {
  reason: string
  label: string | null
  sourceRefs: readonly PenaltySourceRef[]
  factsVersion: string | null
}): PenaltyEngineResult {
  return {
    status: 'unsupported',
    estimatedExposureCents: null,
    estimatedTaxDueCents: null,
    breakdown: [],
    formulaVersion: PENALTY_FORMULA_VERSION,
    missingInputs: [],
    missingPenaltyFacts: [],
    penaltySourceRefs: [...input.sourceRefs],
    penaltyFormulaLabel: input.label,
    penaltyFactsVersion: input.factsVersion,
    unsupportedReason: input.reason,
  }
}

function missingRequiredFacts(rule: FormulaRule, facts: PenaltyFacts): string[] {
  const missing: string[] = []
  for (const key of rule.requiredFacts) {
    if (key === 'taxDueCents' && nonNegativeCents(facts.taxDueCents) === null) {
      missing.push(key)
    } else if (
      key === 'paymentsAndCreditsCents' &&
      nonNegativeCents(facts.paymentsAndCreditsCents) === null
    ) {
      missing.push(key)
    } else if (key === 'partnerCount' && positiveInteger(facts.partnerCount) === null) {
      missing.push(key)
    } else if (key === 'shareholderCount' && positiveInteger(facts.shareholderCount) === null) {
      missing.push(key)
    } else if (key === 'installments') {
      if (!Array.isArray(facts.installments) || facts.installments.length === 0) {
        missing.push(key)
      }
    } else if (key === 'memberCount' && positiveInteger(facts.memberCount) === null) {
      missing.push(key)
    } else if (
      key === 'waSubtotalMinusCreditsCents' &&
      nonNegativeCents(facts.waSubtotalMinusCreditsCents) === null
    ) {
      missing.push(key)
    } else if (
      key === 'txPriorYearFranchiseTaxCents' &&
      nonNegativeCents(facts.txPriorYearFranchiseTaxCents) === null
    ) {
      missing.push(key)
    } else if (
      key === 'txCurrentYearFranchiseTaxCents' &&
      nonNegativeCents(facts.txCurrentYearFranchiseTaxCents) === null
    ) {
      missing.push(key)
    }
  }
  return missing
}

function unpaidTaxCents(facts: PenaltyFacts): number | null {
  const taxDue = nonNegativeCents(facts.taxDueCents)
  const paymentsAndCredits = nonNegativeCents(facts.paymentsAndCreditsCents)
  if (taxDue === null || paymentsAndCredits === null) return null
  return Math.max(0, taxDue - paymentsAndCredits)
}

function ownerCountFact(
  facts: PenaltyFacts,
  key: 'memberCount' | 'partnerCount' | 'shareholderCount',
): number | null | undefined {
  if (key === 'memberCount') return facts.memberCount
  if (key === 'partnerCount') return facts.partnerCount
  return facts.shareholderCount
}

function factsEnvelopeFromInput(input: PenaltyEngineInput): {
  version: string | null
  facts: PenaltyFacts
} {
  const direct = input.penaltyFacts
  if (direct && typeof direct === 'object') {
    return { version: PENALTY_FACTS_VERSION, facts: direct }
  }
  const value = input.penaltyFactsJson
  if (!isRecord(value)) return { version: null, facts: {} }
  if (isRecord(value.facts)) {
    return {
      version: typeof value.version === 'string' ? value.version : null,
      facts: value.facts,
    }
  }
  return {
    version: typeof value.version === 'string' ? value.version : PENALTY_FACTS_VERSION,
    facts: value,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonNegativeCents(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value)
}

function positiveInteger(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.floor(value)
}

function monthsForHorizonDays(days: number): number {
  return Math.max(0, Math.ceil(days / 30))
}

function daysLate(dueDate: string | Date, asOfDate: string | Date): number {
  const due = parseDateOnly(dueDate)
  const asOf = parseDateOnly(asOfDate)
  return Math.max(0, Math.floor((asOf.getTime() - due.getTime()) / DAY_MS))
}

function monthsLate(dueDate: string | Date, asOfDate: string | Date): number {
  const due = parseDateOnly(dueDate)
  const asOf = parseDateOnly(asOfDate)
  if (asOf.getTime() <= due.getTime()) return 0

  let months = 1
  while (months < 50 && asOf.getTime() > addCalendarMonths(due, months).getTime()) {
    months += 1
  }
  return months
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = date.getUTCDate()
  const candidate = new Date(Date.UTC(year, month, 1))
  const lastDay = new Date(
    Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0),
  ).getUTCDate()
  candidate.setUTCDate(Math.min(day, lastDay))
  return candidate
}

function lastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function passThroughMonthlyPenaltyCents(dueDate: string | Date): number {
  const due = parseDateOnly(dueDate)
  if (due >= parseDateOnly('2026-01-01')) return 25_500
  if (due >= parseDateOnly('2025-01-01')) return 24_500
  if (due >= parseDateOnly('2024-01-01')) return 23_500
  if (due >= parseDateOnly('2023-01-01')) return 22_000
  if (due >= parseDateOnly('2021-01-01')) return 21_000
  if (due >= parseDateOnly('2020-01-01')) return 20_500
  if (due >= parseDateOnly('2018-01-01')) return 20_000
  return 19_500
}

function minimumLateFilePenaltyCents(dueDate: string | Date): number {
  const due = parseDateOnly(dueDate)
  if (due >= parseDateOnly('2026-01-01')) return 52_500
  if (due >= parseDateOnly('2025-01-01')) return 51_000
  if (due >= parseDateOnly('2024-01-01')) return 48_500
  if (due >= parseDateOnly('2023-01-01')) return 45_000
  if (due >= parseDateOnly('2020-01-01')) return 43_500
  if (due >= parseDateOnly('2018-01-01')) return 21_000
  if (due >= parseDateOnly('2016-01-01')) return 20_500
  return 13_500
}

function normalizeJurisdiction(value: string | null | undefined, taxType: string): string {
  const direct = value?.trim().toUpperCase()
  if (direct && /^(?:[A-Z]{2}|FED)$/.test(direct)) return direct
  const prefix = taxType.slice(0, 2).toUpperCase()
  return /^[A-Z]{2}$/.test(prefix) ? prefix : 'STATE'
}

function formatPercent(value: number): string {
  return `${Number((value * 100).toFixed(2))}%`
}

function formatDollars(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`)
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}
