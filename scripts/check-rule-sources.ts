#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { listPenaltyFormulaCatalog } from '../packages/core/src/penalty/index.ts'
import {
  listObligationRules,
  listRequiredSourceCoverage,
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

async function curlStatus(url: string, method: CheckedMethod): Promise<number> {
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
    '-A',
    SOURCE_FETCH_HEADERS['user-agent'],
    '-H',
    `Accept: ${SOURCE_FETCH_HEADERS.accept}`,
  ]

  if (method === 'HEAD') args.push('-I')
  args.push(url)

  return Number((await runCurl(args)).trim())
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
    return {
      sourceId: source.id,
      status: 'skipped',
      httpStatus: null,
      checkedUrl: source.url,
      checkedMethod: null,
      reason: 'api_watch source is checked by its adapter, not the generic URL checker.',
    }
  }

  try {
    const headStatus = await curlStatus(source.url, 'HEAD')
    if (headStatus >= 200 && headStatus < 400) {
      return {
        sourceId: source.id,
        status: 'ok',
        httpStatus: headStatus,
        checkedUrl: source.url,
        checkedMethod: 'HEAD',
      }
    }

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

    return {
      sourceId: source.id,
      status: 'failed',
      httpStatus: getStatus,
      checkedUrl: source.url,
      checkedMethod: 'GET',
      reason: `HTTP ${getStatus}`,
    }
  } catch (error) {
    return {
      sourceId: source.id,
      status: 'failed',
      httpStatus: null,
      checkedUrl: source.url,
      checkedMethod: 'GET',
      reason: error instanceof Error ? error.message : 'Unknown curl error',
    }
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function checkWithRetry(source: RuleSource): Promise<RuleSourceHealthResult> {
  const first = await checkRuleSource(source)
  if (first.status !== 'failed' || first.httpStatus !== null) return first

  await wait(500)
  return checkRuleSource(source)
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
