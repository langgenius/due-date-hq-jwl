import {
  isTemporaryAnnouncementSource,
  listHiddenPolicyWatchSources,
  listRuleSources,
  policyWatchAutomationStatusForSource,
  type PolicyWatchSource,
  type RuleSource,
} from '@duedatehq/core/rules'
import { announcementItemsFromSnapshot } from '@duedatehq/ingest'
import { fetchTextSnapshot, stableExternalId, textExcerpt } from '@duedatehq/ingest/http'
import { livePulseAdapters } from '@duedatehq/ingest/adapters'
import { stripHtml } from '@duedatehq/ingest/selectors'
import type { ParsedItem, SourceAdapter } from '@duedatehq/ingest/types'

const EXISTING_ADAPTER_IDS = new Set(livePulseAdapters.map((adapter) => adapter.id))
const SOURCE_INDEX_IDS = new Set([
  'fed.irs_disaster_relief',
  'fed.fema_disaster_declarations',
  'ca.ftb_emergency_tax_relief',
  'ca.ftb_tax_news',
  'ny.email_services',
  'fl.tips',
  'wa.news',
])
const PULSE_BASIS_SOURCE_TYPES = new Set<RuleSource['sourceType']>([
  'publication',
  'instructions',
  'due_dates',
  'calendar',
  'emergency_relief',
  'form',
])
const AUTOMATED_RULE_SOURCE_METHODS = new Set<RuleSource['acquisitionMethod']>(['html_watch'])
const TEMPORARY_ANNOUNCEMENT_ADAPTER_METHODS = new Set<RuleSource['acquisitionMethod']>([
  'api_watch',
])

function sourceFetchUrl(source: RuleSource): string {
  return source.feedUrl ?? source.url
}

function policyWatchFetchUrl(source: PolicyWatchSource): string {
  return source.feedUrl ?? source.url
}

function intervalForCadence(cadence: RuleSource['cadence']): number {
  const hour = 60 * 60 * 1000
  const day = 24 * hour
  switch (cadence) {
    case 'daily':
      return day
    case 'weekly':
      return 7 * day
    case 'monthly':
      return 30 * day
    case 'quarterly':
      return 90 * day
    case 'pre_season':
      return 14 * day
  }
  return 14 * day
}

function tierForPriority(priority: RuleSource['priority']): SourceAdapter['tier'] {
  if (priority === 'critical' || priority === 'high') return 'T1'
  if (priority === 'medium') return 'T2'
  return 'T3'
}

function sourceSnapshotTitle(source: RuleSource): string {
  return `${source.title} official source snapshot`
}

function parsedItemForSourceSnapshot(
  source: RuleSource,
  body: string,
  fetchedAt: Date,
): ParsedItem {
  const text = textExcerpt(stripHtml(body))
  return {
    sourceId: source.id,
    externalId: stableExternalId(source.url),
    title: sourceSnapshotTitle(source),
    publishedAt: fetchedAt,
    officialSourceUrl: source.url,
    rawText: text || sourceSnapshotTitle(source),
    jurisdiction: source.jurisdiction,
  }
}

export function isRuleSourcePulsePromoted(source: RuleSource): boolean {
  return (
    source.jurisdiction !== 'FED' &&
    AUTOMATED_RULE_SOURCE_METHODS.has(source.acquisitionMethod) &&
    PULSE_BASIS_SOURCE_TYPES.has(source.sourceType) &&
    (source.priority === 'critical' || source.priority === 'high')
  )
}

export function createRuleSourceAdapter(source: RuleSource): SourceAdapter {
  return {
    id: source.id,
    tier: tierForPriority(source.priority),
    cronIntervalMs: intervalForCadence(source.cadence),
    jurisdiction: source.jurisdiction,
    async fetch(ctx) {
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: source.url })]
    },
    async parse(snapshot) {
      if (snapshot.notModified) return []
      return [parsedItemForSourceSnapshot(source, snapshot.body, snapshot.fetchedAt)]
    },
  }
}

export function createTemporaryAnnouncementAdapter(source: RuleSource): SourceAdapter {
  return {
    id: source.id,
    tier: tierForPriority(source.priority),
    cronIntervalMs: intervalForCadence(source.cadence),
    jurisdiction: source.jurisdiction,
    fetcher: 'browserless',
    async fetch(ctx) {
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: sourceFetchUrl(source) })]
    },
    async parse(snapshot) {
      if (snapshot.notModified) return []
      return announcementItemsFromSnapshot({ ...source, url: sourceFetchUrl(source) }, snapshot, {
        fallbackToSourceSnapshot: true,
      })
    },
  }
}

export function createPolicyWatchAdapter(source: PolicyWatchSource): SourceAdapter {
  const isAutomatedAlertSource = isPolicyWatchPulsePromoted(source)
  return {
    id: source.id,
    tier: tierForPriority(source.priority),
    cronIntervalMs: intervalForCadence(source.cadence),
    jurisdiction: source.jurisdiction,
    allowEmptyParse: true,
    fetcher: 'browserless',
    async fetch(ctx) {
      return [
        await fetchTextSnapshot(ctx, {
          sourceId: source.id,
          url: policyWatchFetchUrl(source),
        }),
      ]
    },
    async parse(snapshot) {
      if (snapshot.notModified) return []
      return announcementItemsFromSnapshot(
        {
          id: source.id,
          title: source.title,
          url: policyWatchFetchUrl(source),
          jurisdiction: source.jurisdiction,
        },
        snapshot,
        { fallbackToSourceSnapshot: !isAutomatedAlertSource },
      )
    },
  }
}

export function isPolicyWatchPulsePromoted(source: PolicyWatchSource): boolean {
  return policyWatchAutomationStatusForSource(source) === 'automated'
}

export function isPolicyWatchAdapterEligible(source: PolicyWatchSource): boolean {
  const automationStatus = policyWatchAutomationStatusForSource(source)
  return automationStatus !== 'manual_review' && automationStatus !== 'blocked'
}

export function isRuleSourceAdapterEligible(source: RuleSource): boolean {
  if (!source.notificationChannels.includes('practice_rule_review')) return false
  if (!AUTOMATED_RULE_SOURCE_METHODS.has(source.acquisitionMethod)) return false
  if (source.authorityRole !== 'basis') return false
  if (EXISTING_ADAPTER_IDS.has(source.id)) return false
  return !SOURCE_INDEX_IDS.has(source.id)
}

export function isTemporaryAnnouncementAdapterEligible(source: RuleSource): boolean {
  if (!isTemporaryAnnouncementSource(source)) return false
  if (!TEMPORARY_ANNOUNCEMENT_ADAPTER_METHODS.has(source.acquisitionMethod)) return false
  if (source.adapterKind !== 'rss_or_announcement_list') return false
  if (EXISTING_ADAPTER_IDS.has(source.id)) return false
  return true
}

export const ruleSourceAdapters = listRuleSources()
  .filter(isRuleSourceAdapterEligible)
  .map(createRuleSourceAdapter)

export const temporaryAnnouncementSourceAdapters = listRuleSources()
  .filter(isTemporaryAnnouncementAdapterEligible)
  .map(createTemporaryAnnouncementAdapter)

export const hiddenPolicyWatchAdapters = listHiddenPolicyWatchSources()
  .filter(isPolicyWatchAdapterEligible)
  .map(createPolicyWatchAdapter)

export const hiddenPolicyWatchSourceIds = new Set(
  hiddenPolicyWatchAdapters.map((adapter) => adapter.id),
)

export const reviewOnlyPulseSourceIds = new Set([
  'fema.declarations',
  'govdelivery.inbound',
  ...listRuleSources()
    .filter(isRuleSourceAdapterEligible)
    .filter((source) => !isRuleSourcePulsePromoted(source))
    .map((source) => source.id),
  ...listHiddenPolicyWatchSources()
    .filter(isPolicyWatchAdapterEligible)
    .filter((source) => policyWatchAutomationStatusForSource(source) === 'signal_only')
    .map((source) => source.id),
])

export function isHiddenPolicyWatchSourceId(sourceId: string): boolean {
  return hiddenPolicyWatchSourceIds.has(sourceId)
}

export function requiresReviewOnlyPulseAlert(sourceId: string): boolean {
  return reviewOnlyPulseSourceIds.has(sourceId)
}

export const visibleRegulatorySourceAdapters = [
  ...livePulseAdapters,
  ...ruleSourceAdapters,
  ...temporaryAnnouncementSourceAdapters,
] as const

export const liveRegulatorySourceAdapters = [
  ...visibleRegulatorySourceAdapters,
  ...hiddenPolicyWatchAdapters,
] as const
