import {
  isTemporaryAnnouncementSource,
  listRuleSources,
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
    canCreatePulse: isRuleSourcePulsePromoted(source),
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
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: source.url })]
    },
    async parse(snapshot) {
      if (snapshot.notModified) return []
      return announcementItemsFromSnapshot(source, snapshot, { fallbackToSourceSnapshot: true })
    },
  }
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
  if (EXISTING_ADAPTER_IDS.has(source.id)) return false
  return true
}

export const ruleSourceAdapters = listRuleSources()
  .filter(isRuleSourceAdapterEligible)
  .map(createRuleSourceAdapter)

export const temporaryAnnouncementSourceAdapters = listRuleSources()
  .filter(isTemporaryAnnouncementAdapterEligible)
  .map(createTemporaryAnnouncementAdapter)

export const liveRegulatorySourceAdapters = [
  ...livePulseAdapters,
  ...ruleSourceAdapters,
  ...temporaryAnnouncementSourceAdapters,
] as const
