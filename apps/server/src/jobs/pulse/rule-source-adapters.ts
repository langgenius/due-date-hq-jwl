import {
  MVP_RULE_JURISDICTIONS,
  isCoveredTemporaryAnnouncementSource,
  isTemporaryAnnouncementSource,
  isParserBackedRuleSource,
  listHiddenPolicyWatchSources,
  listRuleSources,
  parserBackedAdapterKindForSource,
  policyWatchAutomationStatusForSource,
  type AlertSourcePurpose,
  type PolicyWatchSource,
  type RuleSource,
  type RuleJurisdiction,
  type SourceAdapterKind,
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
const TEMPORARY_ANNOUNCEMENT_ADAPTER_METHODS = new Set<RuleSource['acquisitionMethod']>([
  'html_watch',
  'pdf_watch',
  'api_watch',
])

export type AlertSourceCoverageStatus = 'covered' | 'missing_source'
export type AlertSourceParserStatus = 'web_primary' | 'fallback_only' | 'missing_source'

export interface AlertSourceAdapterMetadata {
  sourceId: string
  label: string
  jurisdiction: string
  purpose: AlertSourcePurpose
  tier: SourceAdapter['tier']
  primaryWeb: boolean
  fallbackForSourceIds: readonly string[]
}

export interface AlertSourceCoverage {
  jurisdiction: RuleJurisdiction
  status: AlertSourceCoverageStatus
  parserStatus: AlertSourceParserStatus
  explicitLiveSourceIds: readonly string[]
  primaryWebSourceIds: readonly string[]
  fallbackEmailSourceIds: readonly string[]
  ruleSourceWatchIds: readonly string[]
  hiddenPolicyWatchSourceIds: readonly string[]
  sourceIds: readonly string[]
  missingReason: string | null
}

const EXPLICIT_LIVE_ADAPTER_LABELS: Record<string, string> = {
  'irs.disaster': 'IRS Disaster Relief',
  'irs.newsroom': 'IRS Newsroom',
  'irs.guidance': 'IRS Guidance',
  'irs.tips': 'IRS Tax Tips',
  'ca.ftb.newsroom': 'CA FTB Newsroom',
  'ca.ftb.tax_news': 'CA FTB Tax News',
  'ca.cdtfa.news': 'CA CDTFA News',
  'tx.cpa.rss': 'TX Comptroller News',
  'fl.dor.tips': 'FL DOR Tax Information Publications',
  'wa.dor.news': 'WA DOR News Releases',
  'wa.dor.whats_new': 'WA DOR What’s New',
  'ma.dor.press': 'MA DOR Press',
  'fema.declarations': 'FEMA Disaster Declarations',
}

const FEDERAL_EXPLICIT_LIVE_ADAPTER_IDS = new Set([
  'irs.disaster',
  'irs.newsroom',
  'irs.guidance',
  'irs.tips',
  'fema.declarations',
])

const FALLBACK_EMAIL_SOURCE_IDS = new Set(
  listRuleSources()
    .filter((source) => source.alertPurpose === 'email_fallback' || source.inboundEmail)
    .map((source) => source.id),
)

function normalizeJurisdiction(jurisdiction: SourceAdapter['jurisdiction']): string {
  return jurisdiction === 'federal' ? 'FED' : jurisdiction
}

function sourceIsPrimaryWeb(source: Pick<RuleSource, 'acquisitionMethod'>): boolean {
  return (
    source.acquisitionMethod === 'html_watch' ||
    source.acquisitionMethod === 'pdf_watch' ||
    source.acquisitionMethod === 'api_watch'
  )
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

function uniqueAdapters(adapters: readonly SourceAdapter[]): SourceAdapter[] {
  const seen = new Set<string>()
  return adapters.filter((adapter) => {
    if (seen.has(adapter.id)) return false
    seen.add(adapter.id)
    return true
  })
}

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

function fetcherForParserKind(kind: SourceAdapterKind | null): SourceAdapter['fetcher'] {
  if (kind === 'html_due_date_page' || kind === 'html_announcement_list') return 'browserless'
  if (kind === 'email_inbound') return 'govdelivery'
  return undefined
}

function sourceConfigForRuleSource(source: RuleSource): {
  id: string
  title: string
  url: string
  jurisdiction: string
} {
  return {
    id: source.id,
    title: source.title,
    url: sourceFetchUrl(source),
    jurisdiction: source.jurisdiction,
  }
}

function parsedItemsForRuleSourceSnapshot(
  source: RuleSource,
  adapterKind: SourceAdapterKind | null,
  body: string,
  fetchedAt: Date,
): ParsedItem[] {
  const isAnnouncementIndex =
    adapterKind === 'rss_or_announcement_list' ||
    adapterKind === 'html_announcement_list' ||
    adapterKind === 'pdf_index'
  if (isAnnouncementIndex) {
    return announcementItemsFromSnapshot(
      sourceConfigForRuleSource(source),
      { body, fetchedAt },
      {
        fallbackToSourceSnapshot: false,
      },
    )
  }

  return [parsedItemForSourceSnapshot(source, body, fetchedAt)]
}

export function isRuleSourcePulsePromoted(source: RuleSource): boolean {
  return (
    source.jurisdiction !== 'FED' &&
    policyWatchAutomationStatusForSource({ ...source, families: ['baseline_rule'] }) ===
      'automated' &&
    PULSE_BASIS_SOURCE_TYPES.has(source.sourceType) &&
    (source.priority === 'critical' || source.priority === 'high')
  )
}

export function createRuleSourceAdapter(source: RuleSource): SourceAdapter {
  const adapterKind = parserBackedAdapterKindForSource({ ...source, families: ['baseline_rule'] })
  const fetcher = fetcherForParserKind(adapterKind)
  return {
    id: source.id,
    tier: tierForPriority(source.priority),
    cronIntervalMs: intervalForCadence(source.cadence),
    jurisdiction: source.jurisdiction,
    ...(fetcher ? { fetcher } : {}),
    async fetch(ctx) {
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: sourceFetchUrl(source) })]
    },
    async parse(snapshot) {
      if (snapshot.notModified) return []
      return parsedItemsForRuleSourceSnapshot(
        source,
        adapterKind,
        snapshot.body,
        snapshot.fetchedAt,
      )
    },
  }
}

export function createTemporaryAnnouncementAdapter(source: RuleSource): SourceAdapter {
  return {
    id: source.id,
    tier: tierForPriority(source.priority),
    cronIntervalMs: intervalForCadence(source.cadence),
    jurisdiction: source.jurisdiction,
    allowEmptyParse: true,
    fetcher: 'browserless',
    async fetch(ctx) {
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: sourceFetchUrl(source) })]
    },
    async parse(snapshot) {
      if (snapshot.notModified) return []
      return announcementItemsFromSnapshot({ ...source, url: sourceFetchUrl(source) }, snapshot, {
        fallbackToSourceSnapshot: false,
      })
    },
  }
}

export function createPolicyWatchAdapter(source: PolicyWatchSource): SourceAdapter {
  const isAutomatedAlertSource = isPolicyWatchPulsePromoted(source)
  const adapterKind = parserBackedAdapterKindForSource(source)
  const isAnnouncementIndex =
    adapterKind === 'rss_or_announcement_list' ||
    adapterKind === 'html_announcement_list' ||
    adapterKind === 'pdf_index'
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
        { fallbackToSourceSnapshot: !isAutomatedAlertSource && !isAnnouncementIndex },
      )
    },
  }
}

export function isPolicyWatchPulsePromoted(source: PolicyWatchSource): boolean {
  return policyWatchAutomationStatusForSource(source) === 'automated'
}

export function isPolicyWatchAdapterEligible(source: PolicyWatchSource): boolean {
  const automationStatus = policyWatchAutomationStatusForSource(source)
  if (parserBackedAdapterKindForSource(source) === 'email_inbound') return false
  return automationStatus !== 'manual_review' && automationStatus !== 'blocked'
}

export function isRuleSourceAdapterEligible(source: RuleSource): boolean {
  if (!source.notificationChannels.includes('practice_rule_review')) return false
  if (source.authorityRole !== 'basis') return false
  if (!PULSE_BASIS_SOURCE_TYPES.has(source.sourceType)) return false
  if (!isParserBackedRuleSource(source)) return false
  if (EXISTING_ADAPTER_IDS.has(source.id)) return false
  return !SOURCE_INDEX_IDS.has(source.id)
}

export function isTemporaryAnnouncementAdapterEligible(source: RuleSource): boolean {
  if (!isTemporaryAnnouncementSource(source)) return false
  if (source.alertPurpose === 'email_fallback') return false
  if (!isCoveredTemporaryAnnouncementSource(source)) return false
  if (!TEMPORARY_ANNOUNCEMENT_ADAPTER_METHODS.has(source.acquisitionMethod)) return false
  if (
    source.acquisitionMethod === 'api_watch' &&
    source.adapterKind !== 'rss_or_announcement_list'
  ) {
    return false
  }
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

export function isHiddenPolicyWatchSourceId(sourceId: string): boolean {
  return hiddenPolicyWatchSourceIds.has(sourceId)
}

const ruleSourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
const hiddenPolicyWatchSourcesById = new Map(
  listHiddenPolicyWatchSources().map((source) => [source.id, source]),
)

function explicitLiveAdapterMetadata(adapter: SourceAdapter): AlertSourceAdapterMetadata {
  return {
    sourceId: adapter.id,
    label: EXPLICIT_LIVE_ADAPTER_LABELS[adapter.id] ?? adapter.id,
    jurisdiction: normalizeJurisdiction(adapter.jurisdiction),
    purpose: 'explicit_live_adapter',
    tier: adapter.tier,
    primaryWeb: true,
    fallbackForSourceIds: [],
  }
}

function ruleSourceAdapterMetadata(
  adapter: SourceAdapter,
  purpose: AlertSourcePurpose,
): AlertSourceAdapterMetadata {
  const source = ruleSourcesById.get(adapter.id)
  return {
    sourceId: adapter.id,
    label: source?.title ?? adapter.id,
    jurisdiction: source?.jurisdiction ?? normalizeJurisdiction(adapter.jurisdiction),
    purpose,
    tier: adapter.tier,
    primaryWeb: source ? sourceIsPrimaryWeb(source) : adapter.fetcher !== 'govdelivery',
    fallbackForSourceIds: source?.inboundEmail ? [source.id] : [],
  }
}

function hiddenPolicyWatchAdapterMetadata(adapter: SourceAdapter): AlertSourceAdapterMetadata {
  const source = hiddenPolicyWatchSourcesById.get(adapter.id)
  return {
    sourceId: adapter.id,
    label: source?.title ?? adapter.id,
    jurisdiction: source?.jurisdiction ?? normalizeJurisdiction(adapter.jurisdiction),
    purpose: 'hidden_policy_watch',
    tier: adapter.tier,
    primaryWeb: source ? source.acquisitionMethod !== 'email_subscription' : true,
    fallbackForSourceIds: source?.derivedFromSourceIds ?? [],
  }
}

export const alertSourceAdapterMetadata = [
  ...livePulseAdapters.map(explicitLiveAdapterMetadata),
  ...temporaryAnnouncementSourceAdapters.map((adapter) =>
    ruleSourceAdapterMetadata(adapter, 'temporary_announcements_or_news'),
  ),
  ...ruleSourceAdapters.map((adapter) => ruleSourceAdapterMetadata(adapter, 'rule_source_watch')),
  ...hiddenPolicyWatchAdapters.map(hiddenPolicyWatchAdapterMetadata),
] as const satisfies readonly AlertSourceAdapterMetadata[]

export const alertSourceAdapterMetadataById = new Map(
  alertSourceAdapterMetadata.map((metadata) => [metadata.sourceId, metadata]),
)

export const fallbackEmailAlertSourceIds = FALLBACK_EMAIL_SOURCE_IDS

export const reviewOnlyPulseSourceIds = new Set([
  'fema.declarations',
  'govdelivery.inbound',
  'govdelivery.inbound.unmatched',
])

export function requiresReviewOnlyPulseAlert(sourceId: string): boolean {
  return reviewOnlyPulseSourceIds.has(sourceId)
}

export function shouldForceReviewOnlyPulseAlert(input: {
  sourceId: string
  changeKind: string
}): boolean {
  if (requiresReviewOnlyPulseAlert(input.sourceId)) return true
  return input.changeKind !== 'deadline_shift'
}

export const explicitLiveRegulatorySourceAdapters = livePulseAdapters

export const alertWatchSourceAdapters = uniqueAdapters([
  ...livePulseAdapters,
  ...temporaryAnnouncementSourceAdapters,
] as const)

export const ruleSourceWatchAdapters = ruleSourceAdapters

export const visibleRegulatorySourceAdapters = uniqueAdapters([
  ...alertWatchSourceAdapters,
  ...ruleSourceWatchAdapters,
])

export const liveRegulatorySourceAdapters = uniqueAdapters([
  ...visibleRegulatorySourceAdapters,
  ...hiddenPolicyWatchAdapters,
])

function coverageSourceIdsForJurisdiction(
  jurisdiction: RuleJurisdiction,
  purpose: AlertSourcePurpose,
): string[] {
  return alertSourceAdapterMetadata
    .filter((source) => source.jurisdiction === jurisdiction && source.purpose === purpose)
    .map((source) => source.sourceId)
}

export function listAlertSourceCoverage(
  jurisdiction?: RuleJurisdiction,
): readonly AlertSourceCoverage[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  return jurisdictions.map((currentJurisdiction) => {
    const explicitLiveSourceIds =
      currentJurisdiction === 'FED'
        ? Array.from(FEDERAL_EXPLICIT_LIVE_ADAPTER_IDS)
        : coverageSourceIdsForJurisdiction(currentJurisdiction, 'explicit_live_adapter')
    const primaryWebSourceIds = alertSourceAdapterMetadata
      .filter(
        (source) =>
          source.jurisdiction === currentJurisdiction &&
          source.primaryWeb &&
          source.purpose !== 'rule_source_watch' &&
          source.purpose !== 'hidden_policy_watch',
      )
      .map((source) => source.sourceId)
    const fallbackEmailIds = listRuleSources(currentJurisdiction)
      .filter((source) => source.alertPurpose === 'email_fallback' || source.inboundEmail)
      .map((source) => source.id)
    const ruleSourceWatchIds = coverageSourceIdsForJurisdiction(
      currentJurisdiction,
      'rule_source_watch',
    )
    const hiddenPolicyWatchIds = coverageSourceIdsForJurisdiction(
      currentJurisdiction,
      'hidden_policy_watch',
    )
    const sourceIds = uniqueStrings([
      ...explicitLiveSourceIds,
      ...primaryWebSourceIds,
      ...fallbackEmailIds,
      ...ruleSourceWatchIds,
      ...hiddenPolicyWatchIds,
    ])
    const status = sourceIds.length > 0 ? 'covered' : 'missing_source'
    const parserStatus =
      primaryWebSourceIds.length > 0
        ? 'web_primary'
        : fallbackEmailIds.length > 0
          ? 'fallback_only'
          : 'missing_source'
    return {
      jurisdiction: currentJurisdiction,
      status,
      parserStatus,
      explicitLiveSourceIds,
      primaryWebSourceIds: uniqueStrings(primaryWebSourceIds),
      fallbackEmailSourceIds: fallbackEmailIds,
      ruleSourceWatchIds,
      hiddenPolicyWatchSourceIds: hiddenPolicyWatchIds,
      sourceIds,
      missingReason:
        status === 'covered'
          ? null
          : 'No official Alert source, rule-source watch, or email fallback is registered.',
    }
  })
}
