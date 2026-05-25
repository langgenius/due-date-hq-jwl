#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { listPenaltyFormulaCatalog } from '../packages/core/src/penalty/index.ts'
import {
  announcementItemsFromSnapshot,
  type AnnouncementSourceConfig,
} from '../packages/ingest/src/announcements.ts'
import {
  isCoveredTemporaryAnnouncementSource,
  listObligationRules,
  listRequiredSourceCoverage,
  listTemporaryAnnouncementSourceCoverage,
  RULE_SOURCE_DOMAINS,
  RULE_SOURCES,
  sourceCoversRuleDomain,
  sourceDomainsForRule,
  type RuleSource,
} from '../packages/core/src/rules/index.ts'

type CheckedMethod = 'HEAD' | 'GET'

type RuleSourceHealthResult =
  | {
      sourceId: string
      status: 'ok'
      httpStatus: number
      checkedUrl: string
      checkedMethod: CheckedMethod
    }
  | {
      sourceId: string
      status: 'failed'
      httpStatus: number | null
      checkedUrl: string
      checkedMethod: CheckedMethod
      reason: string
    }
  | {
      sourceId: string
      status: 'skipped'
      httpStatus: null
      checkedUrl: string
      checkedMethod: null
      reason: string
    }

const SOURCE_FETCH_HEADERS = {
  accept: 'text/html,application/pdf,application/json;q=0.9,*/*;q=0.8',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
} as const

const OFFICIAL_NON_GOV_HOSTS = new Set([
  'floridarevenue.com',
  'adol.alabama.gov',
  'www.adol.alabama.gov',
  'www.floridajobs.org',
  'www.laworks.net',
  'www.marylandtaxes.gov',
  'www.jobsnd.com',
  'www.revenue.state.mn.us',
  'workforcewv.org',
  'uimn.org',
])

function isOfficialHost(host: string): boolean {
  return (
    host === 'irs.gov' ||
    host.endsWith('.irs.gov') ||
    host.endsWith('.gov') ||
    host.endsWith('.us') ||
    OFFICIAL_NON_GOV_HOSTS.has(host)
  )
}

function runCurl(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('curl', args, { encoding: 'utf8' }, (error: Error | null, stdout: string) => {
      if (error) {
        reject(error)
        return
      }

      resolve(stdout)
    })
  })
}

async function curlStatus(
  url: string,
  method: CheckedMethod,
  headers: 'browser' | 'plain' = 'browser',
): Promise<number> {
  const args = [
    '-L',
    '--silent',
    '--show-error',
    '--max-time',
    '20',
    '--output',
    '/dev/null',
    '--write-out',
    '%{http_code}',
  ]

  if (headers === 'browser') {
    args.push(
      '-A',
      SOURCE_FETCH_HEADERS['user-agent'],
      '-H',
      `Accept: ${SOURCE_FETCH_HEADERS.accept}`,
    )
  }

  if (method === 'HEAD') args.push('-I')
  args.push(url)

  return Number((await runCurl(args)).trim())
}

async function curlText(
  url: string,
  headers: 'browser' | 'plain' = 'browser',
): Promise<{ status: number; body: string }> {
  const args = [
    '-L',
    '--silent',
    '--show-error',
    '--max-time',
    '20',
    '--write-out',
    '\n%{http_code}',
  ]

  if (headers === 'browser') {
    args.push(
      '-A',
      SOURCE_FETCH_HEADERS['user-agent'],
      '-H',
      `Accept: ${SOURCE_FETCH_HEADERS.accept}`,
    )
  }

  args.push(url)
  const output = await runCurl(args)
  const statusBreak = output.lastIndexOf('\n')
  if (statusBreak === -1) return { status: 0, body: output }
  return {
    body: output.slice(0, statusBreak),
    status: Number(output.slice(statusBreak + 1).trim()),
  }
}

function sourceFetchUrl(source: RuleSource): string {
  return source.feedUrl ?? source.url
}

function announcementSourceConfig(source: RuleSource): AnnouncementSourceConfig {
  return {
    id: source.id,
    title: source.title,
    url: sourceFetchUrl(source),
    jurisdiction: source.jurisdiction,
  }
}

async function checkAnnouncementAdapterSource(source: RuleSource): Promise<RuleSourceHealthResult> {
  const checkedUrl = sourceFetchUrl(source)
  let response: { status: number; body: string } | null = null
  let fetchError: string | null = null
  try {
    response = await curlText(checkedUrl)
  } catch (error) {
    fetchError = error instanceof Error ? error.message : 'Unknown adapter smoke curl error'
  }
  if (!response || response.status < 200 || response.status >= 400) {
    try {
      response = await curlText(checkedUrl, 'plain')
    } catch (error) {
      const plainError = error instanceof Error ? error.message : 'Unknown plain curl error'
      return {
        sourceId: source.id,
        status: 'skipped',
        httpStatus: null,
        checkedUrl,
        checkedMethod: null,
        reason: fetchError ? `${fetchError}; ${plainError}` : plainError,
      }
    }
  }

  if (response.status < 200 || response.status >= 400) {
    if (response.status === 403 || response.status === 429 || response.status === 503) {
      return {
        sourceId: source.id,
        status: 'skipped',
        httpStatus: null,
        checkedUrl,
        checkedMethod: null,
        reason: `adapter smoke fetch returned HTTP ${response.status}`,
      }
    }
    return {
      sourceId: source.id,
      status: 'failed',
      httpStatus: response.status,
      checkedUrl,
      checkedMethod: 'GET',
      reason: `adapter smoke fetch returned HTTP ${response.status}`,
    }
  }

  const candidates = announcementItemsFromSnapshot(
    announcementSourceConfig(source),
    {
      body: response.body,
      fetchedAt: new Date(),
    },
    { fallbackToSourceSnapshot: false },
  )
  if (candidates.length === 0) {
    return {
      sourceId: source.id,
      status: 'skipped',
      httpStatus: null,
      checkedUrl,
      checkedMethod: null,
      reason: 'adapter smoke parsed no announcement candidates',
    }
  }

  return {
    sourceId: source.id,
    status: 'ok',
    httpStatus: response.status,
    checkedUrl,
    checkedMethod: 'GET',
  }
}

async function checkRuleSource(source: RuleSource): Promise<RuleSourceHealthResult> {
  if (source.acquisitionMethod === 'manual_review') {
    return {
      sourceId: source.id,
      status: 'skipped',
      httpStatus: null,
      checkedUrl: source.url,
      checkedMethod: null,
      reason: 'manual_review source is not expected to be machine-fetched.',
    }
  }
  if (source.acquisitionMethod === 'api_watch') {
    if (source.adapterKind === 'rss_or_announcement_list') {
      return checkAnnouncementAdapterSource(source)
    }
    return {
      sourceId: source.id,
      status: 'skipped',
      httpStatus: null,
      checkedUrl: source.url,
      checkedMethod: null,
      reason: 'api_watch source is checked by its adapter, not the generic URL checker.',
    }
  }

  let headStatus: number | null = null
  let headError: string | null = null

  try {
    headStatus = await curlStatus(source.url, 'HEAD')
  } catch (error) {
    headError = error instanceof Error ? error.message : 'Unknown HEAD curl error'
  }

  if (headStatus !== null && headStatus >= 200 && headStatus < 400) {
    return {
      sourceId: source.id,
      status: 'ok',
      httpStatus: headStatus,
      checkedUrl: source.url,
      checkedMethod: 'HEAD',
    }
  }

  try {
    const getStatus = await curlStatus(source.url, 'GET')
    if (getStatus >= 200 && getStatus < 400) {
      return {
        sourceId: source.id,
        status: 'ok',
        httpStatus: getStatus,
        checkedUrl: source.url,
        checkedMethod: 'GET',
      }
    }

    const plainGetStatus = await curlStatus(source.url, 'GET', 'plain')
    if (plainGetStatus >= 200 && plainGetStatus < 400) {
      return {
        sourceId: source.id,
        status: 'ok',
        httpStatus: plainGetStatus,
        checkedUrl: source.url,
        checkedMethod: 'GET',
      }
    }

    return {
      sourceId: source.id,
      status: 'failed',
      httpStatus: getStatus,
      checkedUrl: source.url,
      checkedMethod: 'GET',
      reason: `HTTP ${getStatus}`,
    }
  } catch (error) {
    const getError = error instanceof Error ? error.message : 'Unknown GET curl error'
    return {
      sourceId: source.id,
      status: 'failed',
      httpStatus: headStatus,
      checkedUrl: source.url,
      checkedMethod: 'GET',
      reason: headError ? `${headError}; ${getError}` : getError,
    }
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function isNetworkProbeError(reason: string): boolean {
  return /SSL_ERROR_SYSCALL|Connection timed out|Could not resolve host|Failed to connect|Operation timed out|Recv failure|Empty reply from server/i.test(
    reason,
  )
}

function skippedNetworkProbeFailure(result: Extract<RuleSourceHealthResult, { status: 'failed' }>) {
  return {
    sourceId: result.sourceId,
    status: 'skipped',
    httpStatus: null,
    checkedUrl: result.checkedUrl,
    checkedMethod: null,
    reason: `network probe unavailable: ${result.reason}`,
  } satisfies RuleSourceHealthResult
}

async function checkWithRetry(source: RuleSource): Promise<RuleSourceHealthResult> {
  const first = await checkRuleSource(source)
  if (first.status !== 'failed' || first.httpStatus !== null) return first

  await wait(500)
  const second = await checkRuleSource(source)
  if (
    second.status === 'failed' &&
    second.httpStatus === null &&
    isNetworkProbeError(second.reason)
  ) {
    return skippedNetworkProbeFailure(second)
  }
  return second
}

const results = await Promise.all(RULE_SOURCES.map(checkWithRetry))
const penaltyCatalog = listPenaltyFormulaCatalog()
const penaltySourceFailures: string[] = []
const sourceCoverageFailures: string[] = []
const knownDomains = new Set<string>(RULE_SOURCE_DOMAINS)
const sourceById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
const COMPLETED_SOURCE_PACK_JURISDICTIONS = [
  'AL',
  'CA',
  'NY',
  'TX',
  'FL',
  'WA',
  'GA',
  'IL',
  'MA',
  'NJ',
  'PA',
  'NC',
  'VA',
  'AZ',
  'CO',
  'MI',
  'OH',
  'OR',
  'SC',
  'TN',
  'UT',
  'WI',
  'AK',
  'AR',
  'CT',
  'DE',
  'DC',
  'HI',
  'ID',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NM',
  'ND',
  'OK',
  'RI',
  'SD',
  'VT',
  'WV',
  'WY',
] as const

for (const source of RULE_SOURCES) {
  if (source.domains.length === 0) {
    sourceCoverageFailures.push(`${source.id}: missing source domains`)
  }
  if (source.entityApplicability.length === 0) {
    sourceCoverageFailures.push(`${source.id}: missing entity applicability`)
  }
  for (const domain of source.domains) {
    if (!knownDomains.has(domain)) {
      sourceCoverageFailures.push(`${source.id}: unknown source domain ${domain}`)
    }
  }
}

for (const jurisdiction of COMPLETED_SOURCE_PACK_JURISDICTIONS) {
  for (const cell of listRequiredSourceCoverage(jurisdiction)) {
    if (cell.status === 'missing_source') {
      sourceCoverageFailures.push(
        `${jurisdiction}: missing required source for ${cell.domain}/${cell.entity}`,
      )
    }
  }
}

for (const cell of listTemporaryAnnouncementSourceCoverage()) {
  if (cell.status !== 'covered') {
    sourceCoverageFailures.push(
      `${cell.jurisdiction}: missing machine-watchable temporary announcement source (${cell.missingReason})`,
    )
    continue
  }
  for (const sourceId of cell.sourceIds) {
    const source = sourceById.get(sourceId)
    if (!source || !isCoveredTemporaryAnnouncementSource(source)) {
      sourceCoverageFailures.push(
        `${cell.jurisdiction}: invalid temporary announcement source ${sourceId}`,
      )
    }
  }
}

for (const rule of listObligationRules({ includeCandidates: true })) {
  if (rule.status !== 'candidate') continue
  if (sourceDomainsForRule(rule).length === 0) continue
  for (const sourceId of rule.sourceIds) {
    const source = sourceById.get(sourceId)
    if (!source) continue
    if (!sourceCoversRuleDomain(source, rule)) {
      sourceCoverageFailures.push(
        `${rule.id}: source ${sourceId} does not cover rule domain/entity`,
      )
    }
  }
}

for (const result of results) {
  const status =
    result.status === 'ok'
      ? `${result.status} ${result.httpStatus} ${result.checkedMethod}`
      : result.status === 'skipped'
        ? `${result.status} ${result.reason}`
        : `${result.status} ${result.httpStatus ?? 'no-status'} ${result.reason}`

  console.log(`${result.sourceId}\t${status}\t${result.checkedUrl}`)
}

for (const formula of penaltyCatalog) {
  if (formula.sourceRefs.length === 0) {
    penaltySourceFailures.push(`${formula.taxType}: missing source refs`)
    continue
  }

  for (const source of formula.sourceRefs) {
    const url = new URL(source.url)
    if (!isOfficialHost(url.host)) {
      penaltySourceFailures.push(`${formula.taxType}: unofficial penalty source ${source.url}`)
    }
    if (!source.sourceExcerpt.trim()) {
      penaltySourceFailures.push(`${formula.taxType}: missing source excerpt for ${source.label}`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.effectiveDate)) {
      penaltySourceFailures.push(`${formula.taxType}: invalid effective date for ${source.label}`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.lastReviewedDate)) {
      penaltySourceFailures.push(`${formula.taxType}: invalid review date for ${source.label}`)
    }
  }

  console.log(
    `${formula.taxType}\tpenalty-source-ok\t${formula.sourceRefs
      .map((source) => source.url)
      .join(',')}`,
  )
}

const failed = results.filter((result) => result.status === 'failed')

for (const failure of penaltySourceFailures) {
  console.error(failure)
}

for (const failure of sourceCoverageFailures) {
  console.error(failure)
}

if (failed.length > 0 || penaltySourceFailures.length > 0 || sourceCoverageFailures.length > 0) {
  process.exitCode = 1
}
