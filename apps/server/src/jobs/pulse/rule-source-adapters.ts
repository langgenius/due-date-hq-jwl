import {
  MVP_RULE_JURISDICTIONS,
  isCoveredTemporaryAnnouncementSource,
  isTemporaryAnnouncementSource,
  isParserBackedRuleSource,
  listHiddenPolicyWatchSources,
  listRuleSources,
  parserBackedAdapterKindForSource,
  policyWatchAutomationStatusForSource,
  resolveAnnouncementYearUrl,
  ruleSourceFetchUrl,
  type AlertSourcePurpose,
  type PolicyWatchSource,
  type RuleSource,
  type RuleJurisdiction,
  type SourceAdapterKind,
} from '@duedatehq/core/rules'
import { announcementItemsFromSnapshotWithPdfLinks } from '@duedatehq/ingest'
import {
  fetchTextSnapshot,
  normalizeSourceText,
  stableExternalId,
  textExcerpt,
} from '@duedatehq/ingest/http'
import { livePulseAdapters } from '@duedatehq/ingest/adapters'
import { stripHtml } from '@duedatehq/ingest/selectors'
import type { IngestCtx, ParsedItem, SourceAdapter } from '@duedatehq/ingest/types'

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
export type AlertSourceCoverageLevel = 'missing' | 'standard' | 'comprehensive'
export type AlertSourceParserStatus = 'web_primary' | 'email_signal_only' | 'missing_source'
export type AlertSourceCoverageRoleStatus = 'covered' | 'missing' | 'not_available_verified'
export type AlertSourceCoverageRole =
  | 'primary_web_news'
  | 'guidance_notice'
  | 'email_signal'
  | 'rule_source_watch'
  | 'tax_type_sources'
  | 'relief_or_disaster_signal'
  | 'rights_window_signal'
  | 'multi_agency_sources'

export interface AlertSourceCoverageRoleDetail {
  role: AlertSourceCoverageRole
  status: AlertSourceCoverageRoleStatus
  sourceIds: readonly string[]
  reason: string | null
}

export interface AlertSourceAdapterMetadata {
  sourceId: string
  label: string
  jurisdiction: string
  purpose: AlertSourcePurpose
  tier: SourceAdapter['tier']
  primaryWeb: boolean
  relatedSourceIds: readonly string[]
}

export interface AlertSourceCoverage {
  jurisdiction: RuleJurisdiction
  status: AlertSourceCoverageStatus
  coverageLevel: AlertSourceCoverageLevel
  parserStatus: AlertSourceParserStatus
  requiredRoles: readonly AlertSourceCoverageRole[]
  coveredRoles: readonly AlertSourceCoverageRole[]
  missingRoles: readonly AlertSourceCoverageRole[]
  roleDetails: readonly AlertSourceCoverageRoleDetail[]
  explicitLiveSourceIds: readonly string[]
  primaryWebSourceIds: readonly string[]
  emailSignalSourceIds: readonly string[]
  ruleSourceWatchIds: readonly string[]
  guidanceNoticeSourceIds: readonly string[]
  taxTypeSourceIds: readonly string[]
  reliefOrDisasterSourceIds: readonly string[]
  rightsWindowSourceIds: readonly string[]
  multiAgencySourceIds: readonly string[]
  hiddenPolicyWatchSourceIds: readonly string[]
  sourceIds: readonly string[]
  missingReason: string | null
}

export interface AlertSourceCatalogEntry {
  id: string
  jurisdiction: RuleJurisdiction
  roles: readonly AlertSourceCoverageRole[]
  agency: string
  title: string
  url: string
  sourceType: string
  acquisitionMethod: string
  adapterKind: string | null
  verificationStatus: 'verified' | 'manual_verification_required' | 'not_available_verified'
  verifiedOn: string
  notes: string | null
  inboundEmail: {
    localParts: readonly string[]
    senderDomains: readonly string[]
    listIdPatterns: readonly string[]
    canonicalUrlHosts: readonly string[]
    accountCodes: readonly string[]
    verificationStatus: 'verified_official' | 'routing_only'
    subscriptionUrl: string | null
  } | null
}

const BASE_COMPREHENSIVE_ALERT_SOURCE_ROLES = [
  'primary_web_news',
  'guidance_notice',
  'email_signal',
  'rule_source_watch',
  'tax_type_sources',
  'relief_or_disaster_signal',
] as const satisfies readonly AlertSourceCoverageRole[]

const MULTI_AGENCY_REQUIRED_JURISDICTIONS = new Set<RuleJurisdiction>([
  'CA',
  'TX',
  'WA',
  'NY',
  'FL',
  'MA',
])

// Jurisdictions with no broad state income tax: disaster tax relief is driven by
// the federal FEMA/IRS process (already covered by the FED sources), and they
// publish no standing state relief page. relief_or_disaster_signal is therefore
// not required for their comprehensive coverage rather than reported as missing.
const RELIEF_FEDERAL_ONLY_JURISDICTIONS = new Set<RuleJurisdiction>(['AK', 'NV', 'NH', 'SD', 'WY'])

const TAX_TYPE_COVERAGE_DOMAINS = new Set([
  'business_income_return',
  'franchise_or_entity_tax',
  'individual_income_return',
  'pass_through_entity_return',
  'sales_use_tax',
  'ui_wage_report',
  'withholding',
])

const GUIDANCE_SOURCE_TYPES = new Set<RuleSource['sourceType']>([
  'calendar',
  'due_dates',
  'form',
  'instructions',
  'publication',
])

const FEDERAL_MULTI_AGENCY_SOURCE_IDS = new Set([
  'fema.declarations',
  'fed.fema_disaster_declarations',
  'fed.fincen_fbar_due_date',
])

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

const SOURCE_CATALOG_VERIFIED_ON = '2026-05-31'

const EXPLICIT_LIVE_SOURCE_CATALOG: Record<
  string,
  Omit<
    AlertSourceCatalogEntry,
    'id' | 'verificationStatus' | 'verifiedOn' | 'notes' | 'inboundEmail'
  >
> = {
  'irs.disaster': {
    jurisdiction: 'FED',
    roles: ['primary_web_news', 'relief_or_disaster_signal'],
    agency: 'IRS',
    title: 'IRS Disaster Relief',
    url: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'irs.newsroom': {
    jurisdiction: 'FED',
    roles: ['primary_web_news'],
    agency: 'IRS',
    title: 'IRS Newsroom',
    url: 'https://www.irs.gov/newsroom',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'irs.guidance': {
    jurisdiction: 'FED',
    roles: ['guidance_notice'],
    agency: 'IRS',
    title: 'IRS Guidance',
    url: 'https://www.irs.gov/newsroom/irs-guidance',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'irs.tips': {
    jurisdiction: 'FED',
    roles: ['guidance_notice'],
    agency: 'IRS',
    title: 'IRS Tax Tips',
    url: 'https://www.irs.gov/newsroom/irs-tax-tips',
    sourceType: 'early_warning',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'fema.declarations': {
    jurisdiction: 'FED',
    roles: ['relief_or_disaster_signal'],
    agency: 'FEMA',
    title: 'FEMA Disaster Declarations',
    url: 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries',
    sourceType: 'early_warning',
    acquisitionMethod: 'api_watch',
    adapterKind: null,
  },
  'ca.ftb.newsroom': {
    jurisdiction: 'CA',
    roles: ['primary_web_news'],
    agency: 'California Franchise Tax Board',
    title: 'CA FTB Newsroom',
    url: 'https://www.ftb.ca.gov/about-ftb/newsroom/index.html',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'ca.ftb.tax_news': {
    jurisdiction: 'CA',
    roles: ['primary_web_news', 'guidance_notice'],
    agency: 'California Franchise Tax Board',
    title: 'CA FTB Tax News',
    url: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'ca.cdtfa.news': {
    jurisdiction: 'CA',
    roles: ['primary_web_news'],
    agency: 'California Department of Tax and Fee Administration',
    title: 'CA CDTFA News',
    url: 'https://www.cdtfa.ca.gov/news/',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'ny.dtf.press': {
    jurisdiction: 'NY',
    roles: ['primary_web_news'],
    agency: 'New York Department of Taxation and Finance',
    title: 'NY Tax Department Press Office',
    url: 'https://www.tax.ny.gov/press/',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'tx.cpa.rss': {
    jurisdiction: 'TX',
    roles: ['primary_web_news'],
    agency: 'Texas Comptroller of Public Accounts',
    title: 'TX Comptroller News',
    url: 'https://comptroller.texas.gov/about/media-center/news/',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'fl.dor.tips': {
    jurisdiction: 'FL',
    roles: ['primary_web_news', 'guidance_notice'],
    agency: 'Florida Department of Revenue',
    title: 'FL DOR Tax Information Publications',
    url: 'https://floridarevenue.com/taxes/tips/Pages/default.aspx',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'wa.dor.news': {
    jurisdiction: 'WA',
    roles: ['primary_web_news'],
    agency: 'Washington Department of Revenue',
    title: 'WA DOR News Releases',
    url: 'https://dor.wa.gov/about/news-releases',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'wa.dor.whats_new': {
    jurisdiction: 'WA',
    roles: ['primary_web_news', 'guidance_notice'],
    agency: 'Washington Department of Revenue',
    title: 'WA DOR What’s New',
    url: 'https://dor.wa.gov/about/whats-new',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  'ma.dor.press': {
    jurisdiction: 'MA',
    roles: ['primary_web_news'],
    agency: 'Massachusetts Department of Revenue',
    title: 'MA DOR Press',
    url: 'https://www.mass.gov/info-details/dor-press-releases-and-reports',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
}

function sourceIsPrimaryWeb(source: Pick<RuleSource, 'acquisitionMethod'>): boolean {
  return (
    source.acquisitionMethod === 'html_watch' ||
    source.acquisitionMethod === 'pdf_watch' ||
    source.acquisitionMethod === 'api_watch'
  )
}

function sourceHasCoverageRole(source: RuleSource, role: AlertSourceCoverageRole): boolean {
  return source.alertCoverageRoles?.includes(role) ?? false
}

function isVerifiedEmailSignalSource(source: RuleSource): boolean {
  return source.inboundEmail?.verificationStatus === 'verified_official'
}

const EMAIL_SIGNAL_SOURCE_IDS = new Set(
  listRuleSources()
    .filter(isVerifiedEmailSignalSource)
    .map((source) => source.id),
)

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

function sourceHostRoot(source: Pick<RuleSource, 'url'>): string | null {
  try {
    const host = new URL(source.url).host.toLowerCase()
    return host.startsWith('www.') ? host.slice(4) : host
  } catch {
    return null
  }
}

function idsForGuidanceNoticeSources(sources: readonly RuleSource[]): string[] {
  return sources
    .filter(
      (source) =>
        sourceHasCoverageRole(source, 'guidance_notice') ||
        (source.authorityRole === 'basis' && GUIDANCE_SOURCE_TYPES.has(source.sourceType)),
    )
    .map((source) => source.id)
}

function idsForTaxTypeSources(sources: readonly RuleSource[]): string[] {
  return sources
    .filter(
      (source) =>
        source.authorityRole === 'basis' &&
        source.acquisitionMethod !== 'email_subscription' &&
        source.domains.some((domain) => TAX_TYPE_COVERAGE_DOMAINS.has(domain)),
    )
    .map((source) => source.id)
}

function idsForReliefOrDisasterSources(input: {
  sources: readonly RuleSource[]
  explicitLiveSourceIds: readonly string[]
}): string[] {
  const explicitReliefSourceIds = input.sources
    .filter((source) => {
      const value = `${source.id} ${source.title} ${source.url} ${source.sourceType}`.toLowerCase()
      return (
        sourceHasCoverageRole(source, 'relief_or_disaster_signal') ||
        source.sourceType === 'emergency_relief' ||
        value.includes('disaster') ||
        value.includes('emergency') ||
        value.includes('relief')
      )
    })
    .map((source) => source.id)
  const federalReliefIds = input.explicitLiveSourceIds.filter(
    (sourceId) => sourceId === 'irs.disaster' || sourceId === 'fema.declarations',
  )
  return uniqueStrings([...explicitReliefSourceIds, ...federalReliefIds])
}

function idsForRightsWindowSources(sources: readonly RuleSource[]): string[] {
  return sources
    .filter((source) => sourceHasCoverageRole(source, 'rights_window_signal'))
    .map((source) => source.id)
}

function idsForMultiAgencySources(
  sources: readonly RuleSource[],
  explicitLiveSourceIds: readonly string[],
): string[] {
  const sourcesByHost = new Map<string, string>()
  for (const source of sources) {
    const host = sourceHostRoot(source)
    if (host) sourcesByHost.set(host, source.id)
  }
  const sourceIds = Array.from(sourcesByHost.values())
  if (explicitLiveSourceIds.some((sourceId) => FEDERAL_MULTI_AGENCY_SOURCE_IDS.has(sourceId))) {
    return uniqueStrings([...sourceIds, ...explicitLiveSourceIds])
  }
  return sourceIds.length > 1 ? sourceIds : []
}

function coveredComprehensiveRoles(input: {
  primaryWebSourceIds: readonly string[]
  emailSignalSourceIds: readonly string[]
  ruleSourceWatchIds: readonly string[]
  guidanceNoticeSourceIds: readonly string[]
  taxTypeSourceIds: readonly string[]
  reliefOrDisasterSourceIds: readonly string[]
  rightsWindowSourceIds: readonly string[]
  multiAgencySourceIds: readonly string[]
}): AlertSourceCoverageRole[] {
  const roles: AlertSourceCoverageRole[] = []
  if (input.primaryWebSourceIds.length > 0) roles.push('primary_web_news')
  if (input.guidanceNoticeSourceIds.length > 0) roles.push('guidance_notice')
  if (input.emailSignalSourceIds.length > 0) roles.push('email_signal')
  if (input.ruleSourceWatchIds.length > 0) roles.push('rule_source_watch')
  if (input.taxTypeSourceIds.length > 0) roles.push('tax_type_sources')
  if (input.reliefOrDisasterSourceIds.length > 0) roles.push('relief_or_disaster_signal')
  if (input.rightsWindowSourceIds.length > 0) roles.push('rights_window_signal')
  if (input.multiAgencySourceIds.length > 0) roles.push('multi_agency_sources')
  return roles
}

function requiredRolesForJurisdiction(jurisdiction: RuleJurisdiction): AlertSourceCoverageRole[] {
  let roles: AlertSourceCoverageRole[] = [...BASE_COMPREHENSIVE_ALERT_SOURCE_ROLES]
  if (RELIEF_FEDERAL_ONLY_JURISDICTIONS.has(jurisdiction)) {
    roles = roles.filter((role) => role !== 'relief_or_disaster_signal')
  }
  if (jurisdiction === 'FED') {
    roles.push('rights_window_signal')
  }
  if (MULTI_AGENCY_REQUIRED_JURISDICTIONS.has(jurisdiction)) {
    roles.push('multi_agency_sources')
  }
  return roles
}

function roleSourceIds(
  role: AlertSourceCoverageRole,
  input: {
    primaryWebSourceIds: readonly string[]
    emailSignalSourceIds: readonly string[]
    ruleSourceWatchIds: readonly string[]
    guidanceNoticeSourceIds: readonly string[]
    taxTypeSourceIds: readonly string[]
    reliefOrDisasterSourceIds: readonly string[]
    rightsWindowSourceIds: readonly string[]
    multiAgencySourceIds: readonly string[]
  },
): readonly string[] {
  switch (role) {
    case 'primary_web_news':
      return input.primaryWebSourceIds
    case 'guidance_notice':
      return input.guidanceNoticeSourceIds
    case 'email_signal':
      return input.emailSignalSourceIds
    case 'rule_source_watch':
      return input.ruleSourceWatchIds
    case 'tax_type_sources':
      return input.taxTypeSourceIds
    case 'relief_or_disaster_signal':
      return input.reliefOrDisasterSourceIds
    case 'rights_window_signal':
      return input.rightsWindowSourceIds
    case 'multi_agency_sources':
      return input.multiAgencySourceIds
  }
  return []
}

function missingRoleReason(role: AlertSourceCoverageRole): string {
  switch (role) {
    case 'primary_web_news':
      return 'No verified official DOR/tax-agency news or announcement web source is registered.'
    case 'guidance_notice':
      return 'No verified official guidance, notice, bulletin, ruling, technical-info, or forms-update source is registered.'
    case 'email_signal':
      return 'No verified official email subscription, GovDelivery list, list archive, or subscription page is registered.'
    case 'rule_source_watch':
      return 'No parser-backed Rule Library source watch is registered for future rule/source changes.'
    case 'tax_type_sources':
      return 'No official tax-type basis sources are registered for covered entity/tax domains.'
    case 'relief_or_disaster_signal':
      return 'No verified official tax relief, emergency relief, or disaster relief source is registered.'
    case 'rights_window_signal':
      return 'No verified official rights/protective-claim signal source is registered.'
    case 'multi_agency_sources':
      return 'Required multi-agency coverage is missing; CA/TX/WA/NY/FL/MA must have sources from different agency hosts.'
  }
  return 'Required Alert source role is missing.'
}

function roleDetailsForCoverage(
  roles: readonly AlertSourceCoverageRole[],
  input: {
    primaryWebSourceIds: readonly string[]
    emailSignalSourceIds: readonly string[]
    ruleSourceWatchIds: readonly string[]
    guidanceNoticeSourceIds: readonly string[]
    taxTypeSourceIds: readonly string[]
    reliefOrDisasterSourceIds: readonly string[]
    rightsWindowSourceIds: readonly string[]
    multiAgencySourceIds: readonly string[]
  },
): AlertSourceCoverageRoleDetail[] {
  return roles.map((role) => {
    const sourceIds = roleSourceIds(role, input)
    return {
      role,
      status: sourceIds.length > 0 ? 'covered' : 'missing',
      sourceIds,
      reason: sourceIds.length > 0 ? null : missingRoleReason(role),
    }
  })
}

function uniqueAdapters(adapters: readonly SourceAdapter[]): SourceAdapter[] {
  const seen = new Set<string>()
  return adapters.filter((adapter) => {
    if (seen.has(adapter.id)) return false
    seen.add(adapter.id)
    return true
  })
}

// Collapse adapters that fetch the SAME official URL down to a single watcher.
// Many states register the same page under multiple ids — an explicit live
// adapter, a `*.temporary_announcements` rule source, and a hidden
// `policy-watch.*` source can all point at e.g. https://www.tax.ny.gov/press/.
// `uniqueAdapters` only dedups by id, so those would each fetch, archive to R2,
// and enqueue an AI extract for the identical page every cycle — wasted
// sub-requests that also strain the 30s/host polite-fetch budget. Dedup by the
// resolved fetch URL, keeping the FIRST adapter seen. Callers pass adapters in
// priority order (explicit > temporary-announcement > rule-source >
// policy-watch), so the most-precise hand-tuned watcher wins and the redundant
// copies drop. Adapters whose URL can't be resolved are never dropped.
function uniqueByFetchUrl(adapters: readonly SourceAdapter[]): SourceAdapter[] {
  const seenUrl = new Set<string>()
  return adapters.filter((adapter) => {
    const url = fetchUrlForAdapterId(adapter.id)
    if (!url) return true
    if (seenUrl.has(url)) return false
    seenUrl.add(url)
    return true
  })
}

// {year}-token resolution moved to @duedatehq/core/rules (resolveAnnouncementYearUrl /
// ruleSourceFetchUrl) so the adapters, the rules-scan and the offline checker share
// one implementation.
function sourceFetchUrl(source: RuleSource): string {
  return ruleSourceFetchUrl(source)
}

function policyWatchFetchUrl(source: PolicyWatchSource): string {
  return ruleSourceFetchUrl(source)
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
  const fullText = normalizeSourceText(stripHtml(body))
  const text = textExcerpt(fullText)
  return {
    sourceId: source.id,
    // externalId stays keyed on the registry url so the item's identity is
    // stable across year rollovers; officialSourceUrl is the RESOLVED page the
    // body actually came from (feedUrl {year} → current year), so alerts cite
    // the page that says what the alert says.
    externalId: stableExternalId(source.url),
    title: sourceSnapshotTitle(source),
    publishedAt: fetchedAt,
    officialSourceUrl: sourceFetchUrl(source),
    rawText: text || sourceSnapshotTitle(source),
    // Un-truncated page text for drift only — AI input and the contentHash
    // dedupe key stay on the 6000-char excerpt.
    ...(fullText.length > text.length ? { fullText } : {}),
    jurisdiction: source.jurisdiction,
  }
}

function fetcherForParserKind(kind: SourceAdapterKind | null): SourceAdapter['fetcher'] {
  // HTML sources default to direct (`cloudflare`) fetch. Routing them through
  // browserless was overloading it (429 quota) and tripping a workerd
  // "Illegal invocation" on 200-responses, while direct fetch with a browser
  // UA serves most state .gov pages a clean 200 (measured 2026-06-01). Sources
  // that genuinely need a headless browser opt in explicitly via the
  // PULSE_BROWSERLESS_SOURCE_IDS allowlist (resolveFetcherForAdapter).
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
  ctx: Pick<IngestCtx, 'fetch' | 'binaryFetch'>,
): Promise<ParsedItem[]> {
  const isAnnouncementIndex =
    adapterKind === 'rss_or_announcement_list' ||
    adapterKind === 'html_announcement_list' ||
    adapterKind === 'pdf_index'
  if (isAnnouncementIndex) {
    return announcementItemsFromSnapshotWithPdfLinks(
      sourceConfigForRuleSource(source),
      { body, fetchedAt },
      ctx,
      {
        fallbackToSourceSnapshot: false,
      },
    )
  }

  return Promise.resolve([parsedItemForSourceSnapshot(source, body, fetchedAt)])
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
    ...(source.initialBaselineMode ? { initialBaselineMode: source.initialBaselineMode } : {}),
    ...(fetcher ? { fetcher } : {}),
    async fetch(ctx) {
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: sourceFetchUrl(source) })]
    },
    async parse(snapshot, ctx) {
      if (snapshot.notModified) return []
      return parsedItemsForRuleSourceSnapshot(
        source,
        adapterKind,
        snapshot.body,
        snapshot.fetchedAt,
        ctx,
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
    ...(source.initialBaselineMode ? { initialBaselineMode: source.initialBaselineMode } : {}),
    allowEmptyParse: true,
    async fetch(ctx) {
      return [await fetchTextSnapshot(ctx, { sourceId: source.id, url: sourceFetchUrl(source) })]
    },
    async parse(snapshot, ctx) {
      if (snapshot.notModified) return []
      return announcementItemsFromSnapshotWithPdfLinks(
        { ...source, url: sourceFetchUrl(source) },
        snapshot,
        ctx,
        {
          fallbackToSourceSnapshot: false,
        },
      )
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
    async fetch(ctx) {
      return [
        await fetchTextSnapshot(ctx, {
          sourceId: source.id,
          url: policyWatchFetchUrl(source),
        }),
      ]
    },
    async parse(snapshot, ctx) {
      if (snapshot.notModified) return []
      return announcementItemsFromSnapshotWithPdfLinks(
        {
          id: source.id,
          title: source.title,
          url: policyWatchFetchUrl(source),
          jurisdiction: source.jurisdiction,
        },
        snapshot,
        ctx,
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
  if (source.alertPurpose === 'email_signal') return false
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

// Resolve the actual URL an adapter fetches, across all layers, for URL-level
// dedup (uniqueByFetchUrl). Explicit live adapters get their URL from the
// catalog; rule-source / temporary-announcement / hidden policy-watch adapters
// derive it from the registry source (feedUrl ?? url) with the same `{year}`
// resolution applied at fetch time. Returns null when the id maps to no known
// source, in which case the adapter is treated as unique (never dropped).
function fetchUrlForAdapterId(id: string): string | null {
  const explicit = EXPLICIT_LIVE_SOURCE_CATALOG[id]
  if (explicit) return resolveAnnouncementYearUrl(explicit.url)
  const source = ruleSourcesById.get(id) ?? hiddenPolicyWatchSourcesById.get(id)
  if (source) return ruleSourceFetchUrl(source)
  return null
}

// The host an adapter's polite fetch will hit — the grouping key for
// enqueuePulseIngestScans, so one host's due sources ride one queue message.
// `{year}` tokens only ever appear in the path, so the host is stable.
export function politeHostForAdapterId(id: string): string | null {
  const url = fetchUrlForAdapterId(id)
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

function explicitLiveAdapterMetadata(adapter: SourceAdapter): AlertSourceAdapterMetadata {
  return {
    sourceId: adapter.id,
    label: EXPLICIT_LIVE_ADAPTER_LABELS[adapter.id] ?? adapter.id,
    jurisdiction: adapter.jurisdiction,
    purpose: 'explicit_live_adapter',
    tier: adapter.tier,
    primaryWeb: true,
    relatedSourceIds: [],
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
    jurisdiction: source?.jurisdiction ?? adapter.jurisdiction,
    purpose,
    tier: adapter.tier,
    primaryWeb: source ? sourceIsPrimaryWeb(source) : adapter.fetcher !== 'govdelivery',
    relatedSourceIds: source?.inboundEmail ? [source.id] : [],
  }
}

function hiddenPolicyWatchAdapterMetadata(adapter: SourceAdapter): AlertSourceAdapterMetadata {
  const source = hiddenPolicyWatchSourcesById.get(adapter.id)
  return {
    sourceId: adapter.id,
    label: source?.title ?? adapter.id,
    jurisdiction: source?.jurisdiction ?? adapter.jurisdiction,
    purpose: 'hidden_policy_watch',
    tier: adapter.tier,
    primaryWeb: source ? source.acquisitionMethod !== 'email_subscription' : true,
    relatedSourceIds: source?.derivedFromSourceIds ?? [],
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

export const emailSignalAlertSourceIds = EMAIL_SIGNAL_SOURCE_IDS

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

// IRS annual inflation Revenue Procedure "pointer" advisory sources. Watched
// like any html_watch source, but their snapshots bypass AI extraction
// entirely: the pulse extract job emits a deterministic review_only
// `threshold_advisory` Alert with no asserted dollar amounts (the product
// never lets AI invent dollar figures — cf. client.estimatedTaxLiabilityCents).
// The CPA opens the official Rev. Proc. to read the figures. Year-stamped in
// RULE_SOURCES (…_2026, …_2027) and matched by prefix so each season's
// refreshed entry is covered without editing this gate.
const THRESHOLD_ADVISORY_SOURCE_ID_PREFIX = 'fed.irs_inflation_adjustments'
export function isThresholdAdvisorySource(sourceId: string): boolean {
  return sourceId.startsWith(THRESHOLD_ADVISORY_SOURCE_ID_PREFIX)
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

// The watcher set actually driven by cron. Hidden policy-watch sources are
// intentionally NOT included: each is a derived mirror of a state's
// temporary-announcement source (hiddenPolicyAnnouncementSource in
// @duedatehq/core picks one TA source per jurisdiction and re-ids it as
// `policy-watch.<jur>.announcements` with the same fetch URL). They share the
// TA URL by construction, so URL dedup already dropped every one of them to
// zero live watchers — appending them here only built 51 adapter objects that
// were discarded each module load. The hidden layer remains exported
// (hiddenPolicyWatchAdapters) and still feeds alertSourceAdapterMetadata /
// listAlertSourceCoverage as a coverage/audit concept; it is just not a cron
// fetch source. Still deduped by id and by resolved fetch URL so same-URL
// watchers within the visible layers (explicit > temporary-announcement >
// rule-source) collapse to the most-precise one.
export const liveRegulatorySourceAdapters = uniqueByFetchUrl(
  uniqueAdapters([...visibleRegulatorySourceAdapters]),
)

// Source ids the pulse ingest pipeline fetches AND extracts (excerpt-capped AI
// input, .full drift sibling, browserless + idle alerting). The rules-scan path
// (jobs/rules/reconcile.ts) must not touch them — it would double-fetch the
// same URL each cadence and double-pay AI extraction on every change, with a
// raw-HTML hash that also churns on markup noise. Ids dropped by
// uniqueByFetchUrl are deliberately ABSENT from this set: drift detection is
// keyed by snapshot.sourceId, so the rules-scan stays those ids' only
// sourceId-keyed watcher.
export const pulseManagedSourceIds: ReadonlySet<string> = new Set(
  liveRegulatorySourceAdapters.map((adapter) => adapter.id),
)

function coverageSourceIdsForJurisdiction(
  jurisdiction: RuleJurisdiction,
  purpose: AlertSourcePurpose,
): string[] {
  return alertSourceAdapterMetadata
    .filter((source) => source.jurisdiction === jurisdiction && source.purpose === purpose)
    .map((source) => source.sourceId)
}

function sourceRolesById(
  coverageRows: readonly AlertSourceCoverage[],
): Map<string, AlertSourceCoverageRole[]> {
  const rolesById = new Map<string, AlertSourceCoverageRole[]>()
  for (const row of coverageRows) {
    for (const detail of row.roleDetails) {
      for (const sourceId of detail.sourceIds) {
        const roles = rolesById.get(sourceId) ?? []
        if (!roles.includes(detail.role)) roles.push(detail.role)
        rolesById.set(sourceId, roles)
      }
    }
  }
  for (const [sourceId, entry] of Object.entries(EXPLICIT_LIVE_SOURCE_CATALOG)) {
    const roles = rolesById.get(sourceId) ?? []
    for (const role of entry.roles) {
      if (!roles.includes(role)) roles.push(role)
    }
    rolesById.set(sourceId, roles)
  }
  return rolesById
}

function agencyForSource(source: RuleSource): string {
  if (source.sourceAgency) return source.sourceAgency
  if (source.id.startsWith('ca.cdtfa')) return 'California Department of Tax and Fee Administration'
  if (source.id.startsWith('ca.edd')) return 'California Employment Development Department'
  if (source.id.startsWith('ca.')) return 'California Franchise Tax Board'
  if (source.id.startsWith('tx.ui') || source.url.includes('twc.texas.gov')) {
    return 'Texas Workforce Commission'
  }
  if (source.id.startsWith('tx.')) return 'Texas Comptroller of Public Accounts'
  if (source.id.startsWith('wa.esd') || source.url.includes('esd.wa.gov')) {
    return 'Washington Employment Security Department'
  }
  if (source.id.startsWith('wa.')) return 'Washington Department of Revenue'
  if (source.id.startsWith('ny.')) return 'New York Department of Taxation and Finance'
  if (source.id.startsWith('fl.')) return 'Florida Department of Revenue'
  if (source.id.startsWith('ma.ui')) return 'Massachusetts Department of Unemployment Assistance'
  if (source.id.startsWith('ma.')) return 'Massachusetts Department of Revenue'
  if (source.jurisdiction === 'FED') return 'IRS'
  return `${source.jurisdiction} tax agency`
}

function inboundEmailCatalog(source: RuleSource): AlertSourceCatalogEntry['inboundEmail'] {
  if (!source.inboundEmail) return null
  return {
    localParts: [...source.inboundEmail.localParts],
    senderDomains: [...source.inboundEmail.senderDomains],
    listIdPatterns: [...source.inboundEmail.listIdPatterns],
    canonicalUrlHosts: [...source.inboundEmail.canonicalUrlHosts],
    accountCodes: [...(source.inboundEmail.accountCodes ?? [])],
    verificationStatus: source.inboundEmail.verificationStatus ?? 'routing_only',
    subscriptionUrl: source.inboundEmail.subscriptionUrl ?? null,
  }
}

export function listAlertSourceCatalog(
  jurisdiction?: RuleJurisdiction,
): readonly AlertSourceCatalogEntry[] {
  const coverageRows = listAlertSourceCoverage(jurisdiction)
  const rolesById = sourceRolesById(coverageRows)
  const jurisdictions = new Set(coverageRows.map((row) => row.jurisdiction))
  const explicitEntries = Object.entries(EXPLICIT_LIVE_SOURCE_CATALOG)
    .filter(([, entry]) => jurisdictions.has(entry.jurisdiction))
    .map(
      ([id, entry]): AlertSourceCatalogEntry => ({
        id,
        jurisdiction: entry.jurisdiction,
        roles: entry.roles,
        agency: entry.agency,
        title: entry.title,
        url: entry.url,
        sourceType: entry.sourceType,
        acquisitionMethod: entry.acquisitionMethod,
        adapterKind: entry.adapterKind,
        verificationStatus: 'verified',
        verifiedOn: SOURCE_CATALOG_VERIFIED_ON,
        notes: 'Official live Alert adapter source.',
        inboundEmail: null,
      }),
    )
  const ruleEntries = listRuleSources()
    .filter((source) => jurisdictions.has(source.jurisdiction))
    .map(
      (source): AlertSourceCatalogEntry => ({
        id: source.id,
        jurisdiction: source.jurisdiction,
        roles: rolesById.get(source.id) ?? [],
        agency: agencyForSource(source),
        title: source.title,
        url: source.url,
        sourceType: source.sourceType,
        acquisitionMethod: source.acquisitionMethod,
        adapterKind: source.adapterKind ?? null,
        verificationStatus: source.verificationStatus ?? 'verified',
        verifiedOn: source.verifiedOn ?? SOURCE_CATALOG_VERIFIED_ON,
        notes: source.sourceNotes ?? source.inboundEmail?.verificationNotes ?? null,
        inboundEmail: inboundEmailCatalog(source),
      }),
    )
  return [...explicitEntries, ...ruleEntries].toSorted((a, b) => a.id.localeCompare(b.id))
}

export function listAlertSourceCoverage(
  jurisdiction?: RuleJurisdiction,
): readonly AlertSourceCoverage[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  return jurisdictions.map((currentJurisdiction) => {
    const jurisdictionSources = listRuleSources(currentJurisdiction)
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
    const emailSignalIds = jurisdictionSources
      .filter(isVerifiedEmailSignalSource)
      .map((source) => source.id)
    const ruleSourceWatchIds = coverageSourceIdsForJurisdiction(
      currentJurisdiction,
      'rule_source_watch',
    )
    const guidanceNoticeSourceIds = idsForGuidanceNoticeSources(jurisdictionSources)
    const taxTypeSourceIds = idsForTaxTypeSources(jurisdictionSources)
    const reliefOrDisasterSourceIds = idsForReliefOrDisasterSources({
      sources: jurisdictionSources,
      explicitLiveSourceIds,
    })
    const rightsWindowSourceIds = idsForRightsWindowSources(jurisdictionSources)
    const multiAgencySourceIds = idsForMultiAgencySources(
      jurisdictionSources,
      explicitLiveSourceIds,
    )
    const hiddenPolicyWatchIds = coverageSourceIdsForJurisdiction(
      currentJurisdiction,
      'hidden_policy_watch',
    )
    const sourceIds = uniqueStrings([
      ...explicitLiveSourceIds,
      ...primaryWebSourceIds,
      ...emailSignalIds,
      ...ruleSourceWatchIds,
      ...guidanceNoticeSourceIds,
      ...taxTypeSourceIds,
      ...reliefOrDisasterSourceIds,
      ...rightsWindowSourceIds,
      ...multiAgencySourceIds,
      ...hiddenPolicyWatchIds,
    ])
    const status = sourceIds.length > 0 ? 'covered' : 'missing_source'
    const requiredRoles = requiredRolesForJurisdiction(currentJurisdiction)
    const coveredRoles = coveredComprehensiveRoles({
      primaryWebSourceIds,
      emailSignalSourceIds: emailSignalIds,
      ruleSourceWatchIds,
      guidanceNoticeSourceIds,
      taxTypeSourceIds,
      reliefOrDisasterSourceIds,
      rightsWindowSourceIds,
      multiAgencySourceIds,
    })
    const missingRoles = requiredRoles.filter((role) => !coveredRoles.includes(role))
    const roleDetails = roleDetailsForCoverage(requiredRoles, {
      primaryWebSourceIds,
      emailSignalSourceIds: emailSignalIds,
      ruleSourceWatchIds,
      guidanceNoticeSourceIds,
      taxTypeSourceIds,
      reliefOrDisasterSourceIds,
      rightsWindowSourceIds,
      multiAgencySourceIds,
    })
    const coverageLevel =
      status === 'missing_source'
        ? 'missing'
        : missingRoles.length === 0
          ? 'comprehensive'
          : 'standard'
    const parserStatus =
      primaryWebSourceIds.length > 0
        ? 'web_primary'
        : emailSignalIds.length > 0
          ? 'email_signal_only'
          : 'missing_source'
    return {
      jurisdiction: currentJurisdiction,
      status,
      coverageLevel,
      parserStatus,
      requiredRoles,
      coveredRoles,
      missingRoles,
      roleDetails,
      explicitLiveSourceIds,
      primaryWebSourceIds: uniqueStrings(primaryWebSourceIds),
      emailSignalSourceIds: emailSignalIds,
      ruleSourceWatchIds,
      guidanceNoticeSourceIds,
      taxTypeSourceIds,
      reliefOrDisasterSourceIds,
      rightsWindowSourceIds,
      multiAgencySourceIds,
      hiddenPolicyWatchSourceIds: hiddenPolicyWatchIds,
      sourceIds,
      missingReason:
        status === 'covered'
          ? null
          : 'No official Alert source, rule-source watch, or email signal is registered.',
    }
  })
}
