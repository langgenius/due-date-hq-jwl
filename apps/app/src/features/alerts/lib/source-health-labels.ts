import type { PulseSourceHealth } from '@duedatehq/contracts'

const DEFAULT_MAX_SOURCE_LABELS = 5

type AlertSourceHealthLabelInput = Pick<
  PulseSourceHealth,
  'enabled' | 'healthStatus' | 'label' | 'lastCheckedAt' | 'sourceId'
> & {
  tier?: PulseSourceHealth['tier']
}

export function summarizeAlertSources(
  sources: readonly AlertSourceHealthLabelInput[],
  options: { emptyLabel?: string; maxLabels?: number } = {},
): string {
  const emptyLabel = options.emptyLabel ?? 'configured sources'
  const maxLabels = options.maxLabels ?? DEFAULT_MAX_SOURCE_LABELS
  const labels = uniqueSourceLabels(sources)

  if (labels.length === 0) return emptyLabel
  if (labels.length <= maxLabels) return labels.join(' + ')

  return `${labels.slice(0, maxLabels).join(' + ')} + ${labels.length - maxLabels} more`
}

export function enabledAlertSourceCount(sources: readonly AlertSourceHealthLabelInput[]): number {
  return sources.filter((source) => source.enabled && source.healthStatus !== 'paused').length
}

export function sourcesNeedingAttention<T extends AlertSourceHealthLabelInput>(
  sources: readonly T[],
): T[] {
  void sources
  return []
}

export function reviewableSourcesNeedingAttention<T extends AlertSourceHealthLabelInput>(
  sources: readonly T[],
): T[] {
  return sourcesNeedingAttention(sources).filter(isReviewableAlertSource)
}

export function passiveSourcesNeedingAttention<T extends AlertSourceHealthLabelInput>(
  sources: readonly T[],
): T[] {
  return sourcesNeedingAttention(sources).filter((source) => !isReviewableAlertSource(source))
}

function isReviewableAlertSource(source: AlertSourceHealthLabelInput): boolean {
  return source.tier === 'T1'
}

function uniqueSourceLabels(sources: readonly AlertSourceHealthLabelInput[]): string[] {
  return sources
    .filter((source) => source.enabled && source.healthStatus !== 'paused')
    .map(sourceDisplayLabel)
    .filter((label, index, labels) => labels.indexOf(label) === index)
}

function sourceDisplayLabel(source: AlertSourceHealthLabelInput): string {
  if (source.sourceId.startsWith('irs.')) return 'IRS'
  if (source.sourceId.startsWith('ca.ftb.')) return 'CA FTB'
  if (source.sourceId.startsWith('ca.cdtfa.')) return 'CA CDTFA'
  if (source.sourceId === 'ny.dtf.press') return 'NY DTF'
  if (source.sourceId === 'tx.cpa.rss') return 'TX Comptroller'
  if (source.sourceId === 'fl.dor.tips') return 'FL DOR'
  if (source.sourceId.startsWith('wa.dor.')) return 'WA DOR'
  if (source.sourceId === 'ma.dor.press') return 'MA DOR'
  if (source.sourceId === 'fema.declarations') return 'FEMA'

  const stateIncomeTaxMatch = /^([a-z]{2}|dc)\.income_tax$/.exec(source.sourceId)
  const stateIncomeTaxCode = stateIncomeTaxMatch?.[1]
  if (stateIncomeTaxCode) return `${stateIncomeTaxCode.toUpperCase()} income tax`

  return source.label
}
