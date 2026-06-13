import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { listRuleSources, type RuleSource } from '@duedatehq/core/rules'
import { hashText } from '@duedatehq/ingest/http'
import PostalMime, { type Email } from 'postal-mime'
import type { Env } from '../../env'
import { dispatchOpsAlert, type OpsAlertEnv } from '../ops-alerts'
import { buildEmailArchiveArtifact, buildEmailCanonicalText } from './email-artifact'
import { archivePulseRaw, type PulseExtractQueueMessage } from './ingest'
import { recordPulseMetric } from './metrics'

interface InboundEmailMessage {
  from: string
  to: string
  headers: Headers
  raw: ReadableStream<Uint8Array>
}

type InboundEmailRuleSource = RuleSource & { inboundEmail: NonNullable<RuleSource['inboundEmail']> }

const UNMATCHED_SOURCE_ID = 'govdelivery.inbound.unmatched'
const FALLBACK_LOCAL_PARTS = new Set(['pulse-ingest'])
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const AUTH_RESULT_HEADER_NAMES = ['authentication-results', 'arc-authentication-results'] as const
const CLOUDFLARE_AUTH_RESULT_RE = /\bmx\.cloudflare\.net\b/

type ParsedEmailHeader = Email['headers'][number]

const STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
])

function cadenceMs(source: Pick<RuleSource, 'cadence'>): number {
  const day = 24 * 60 * 60 * 1000
  if (source.cadence === 'daily') return day
  if (source.cadence === 'weekly') return 7 * day
  if (source.cadence === 'monthly') return 30 * day
  if (source.cadence === 'quarterly') return 90 * day
  return 14 * day
}

function tierForSource(source: Pick<RuleSource, 'priority'>): string {
  if (source.priority === 'critical' || source.priority === 'high') return 'T1'
  if (source.priority === 'medium') return 'T2'
  return 'T3'
}

function sourceNeedsMonitoringBaseline(state: {
  monitoringBaselineAt?: Date | null
  baselineMode?: string
}): boolean {
  return state.monitoringBaselineAt === null && state.baselineMode !== 'backfill'
}

function extractSubject(headers: Headers): string {
  return headers.get('subject')?.trim() || 'GovDelivery regulatory signal'
}

function extractExternalId(headers: Headers, fallback: string): string {
  return headers.get('message-id')?.trim() || fallback
}

function cleanUrl(value: string): string {
  return value.replace(/[.,;:!?)\]}]+$/g, '')
}

function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"')]+/g) ?? []).map(cleanUrl)
}

function extractFirstUrl(text: string): string {
  return extractUrls(text)[0] ?? 'https://public.govdelivery.com/'
}

function inferJurisdiction(text: string): string {
  const match = text
    .toUpperCase()
    .match(/\b[A-Z]{2}\b/g)
    ?.find((code) => STATE_CODES.has(code))
  return match ?? 'US'
}

function inboundEmailSources(): InboundEmailRuleSource[] {
  return listRuleSources().filter(
    (source): source is InboundEmailRuleSource => source.inboundEmail !== undefined,
  )
}

function verifiedInboundEmailSources(): InboundEmailRuleSource[] {
  return inboundEmailSources().filter(
    (source) => source.inboundEmail.verificationStatus === 'verified_official',
  )
}

function headerValues(headers: Headers, names: readonly string[]): string[] {
  return names
    .map((name) => headers.get(name)?.trim())
    .filter((value): value is string => Boolean(value))
}

function extractEmailAddresses(values: readonly string[]): string[] {
  return values.flatMap((value) => value.match(EMAIL_RE) ?? [])
}

function localPart(address: string): string | null {
  const at = address.indexOf('@')
  if (at <= 0) return null
  return address.slice(0, at).toLowerCase()
}

function messageLocalParts(message: InboundEmailMessage): string[] {
  return extractEmailAddresses([
    message.to,
    ...headerValues(message.headers, ['to', 'delivered-to', 'x-original-to']),
  ])
    .map(localPart)
    .filter((value): value is string => value !== null)
}

function addressDomains(values: readonly string[]): string[] {
  return extractEmailAddresses(values)
    .map((address) => address.split('@')[1]?.toLowerCase())
    .filter((value): value is string => Boolean(value))
}

function hostMatches(candidate: string, allowed: string): boolean {
  return candidate === allowed || candidate.endsWith(`.${allowed}`)
}

function senderMatchesSource(
  source: InboundEmailRuleSource,
  message: InboundEmailMessage,
): boolean {
  const domains = addressDomains([message.from, ...headerValues(message.headers, ['from'])])
  return domains.some((domain) =>
    source.inboundEmail.senderDomains.some((allowed) => hostMatches(domain, allowed)),
  )
}

export interface EmailAuthVerdicts {
  present: boolean
  dkimPass: boolean
  spfPass: boolean
  dmarcFail: boolean
}

function authResultHeaderValues(
  headers: Headers,
  parsedHeaders: readonly ParsedEmailHeader[],
): string[] {
  const runtimeValue = headers.get('authentication-results')?.trim()
  if (runtimeValue) return [runtimeValue]

  for (const key of AUTH_RESULT_HEADER_NAMES) {
    const values = parsedHeaders
      .filter((header) => header.key === key)
      .map((header) => header.value.trim())
      .filter((value) => CLOUDFLARE_AUTH_RESULT_RE.test(value.toLowerCase()))
    if (values.length > 0) return values
  }

  return []
}

/**
 * Read the Authentication-Results verdicts Cloudflare Email Routing adds.
 * Cloudflare rejects mail failing BOTH SPF and DKIM and enforces the sender's
 * DMARC policy at the edge — but a no-DMARC domain with a spoofed From: still
 * reaches the worker, so the verdicts must be read per message. Some real Email
 * Routing deliveries expose these verdicts only in message.raw, so the raw
 * RFC822 headers are the fallback after the runtime Headers object.
 */
export function readAuthVerdicts(
  headers: Headers,
  parsedHeaders: readonly ParsedEmailHeader[] = [],
): EmailAuthVerdicts {
  const value = authResultHeaderValues(headers, parsedHeaders).join('\n').toLowerCase()
  return {
    present: value.length > 0,
    dkimPass: /\bdkim=pass\b/.test(value),
    spfPass: /\bspf=pass\b/.test(value),
    dmarcFail: /\bdmarc=fail\b/.test(value),
  }
}

/**
 * Transport-level attribution gate for a MATCHED official source: the From /
 * envelope domain must be one of the source's registered sender domains (body
 * signals — account codes, canonical URLs, plus-addresses — are attacker-
 * controlled and can no longer attribute alone), and when
 * PULSE_EMAIL_REQUIRE_AUTH is on (default) the message must carry a passing
 * DKIM or SPF verdict and no DMARC failure. Failing mail is demoted to the
 * unmatched bucket (stored ignored, never queued) instead of dropped, so a
 * header-format change degrades to silence-with-evidence, not data loss.
 */
function emailAttributionTrusted(input: {
  source: InboundEmailRuleSource
  message: InboundEmailMessage
  parsedHeaders: readonly ParsedEmailHeader[]
  requireAuth: boolean
}): { trusted: boolean; reason: string | null } {
  if (!senderMatchesSource(input.source, input.message)) {
    return { trusted: false, reason: 'sender_domain_mismatch' }
  }
  const verdicts = readAuthVerdicts(input.message.headers, input.parsedHeaders)
  if (verdicts.dmarcFail) return { trusted: false, reason: 'dmarc_fail' }
  if (input.requireAuth) {
    if (!verdicts.present) return { trusted: false, reason: 'auth_results_missing' }
    if (!verdicts.dkimPass && !verdicts.spfPass) {
      return { trusted: false, reason: 'no_passing_auth_verdict' }
    }
  }
  return { trusted: true, reason: null }
}

function listIdMatchesSource(source: InboundEmailRuleSource, headers: Headers): boolean {
  const listId = headers.get('list-id')?.toLowerCase() ?? ''
  if (!listId) return false
  return source.inboundEmail.listIdPatterns.some((pattern) =>
    listId.includes(pattern.toLowerCase()),
  )
}

function urlMatchesSource(source: InboundEmailRuleSource, url: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase()
    return source.inboundEmail.canonicalUrlHosts.some((allowed) => hostMatches(host, allowed))
  } catch {
    return false
  }
}

function firstCanonicalSourceUrl(source: InboundEmailRuleSource, rawText: string): string | null {
  return extractUrls(rawText).find((url) => urlMatchesSource(source, url)) ?? null
}

function govDeliveryAccountCodes(headers: Headers, text: string): string[] {
  const values = [
    ...headerValues(headers, ['x-accountcode', 'x-account-code', 'list-unsubscribe']),
    text,
  ]
  const codes: string[] = []
  for (const value of values) {
    const headerCode = value.match(/\b[A-Z]{2,}[A-Z0-9_-]*\b/g) ?? []
    const urlCodes = Array.from(
      value.matchAll(/https?:\/\/(?:content|public)\.govdelivery\.com\/accounts\/([^/\s?"')]+)/gi),
    ).map((match) => match[1] ?? '')
    codes.push(...headerCode)
    codes.push(...urlCodes)
  }
  return Array.from(new Set(codes.map((code) => code.toUpperCase()).filter(Boolean)))
}

function accountCodeMatchesSource(
  source: InboundEmailRuleSource,
  message: InboundEmailMessage,
  rawText: string,
): boolean {
  const configured = source.inboundEmail.accountCodes
  if (!configured || configured.length === 0) return false
  const codes = new Set(govDeliveryAccountCodes(message.headers, rawText))
  return configured.some((code) => codes.has(code.toUpperCase()))
}

function trustSignalMatchesSource(
  source: InboundEmailRuleSource,
  message: InboundEmailMessage,
  rawText: string,
): boolean {
  return (
    accountCodeMatchesSource(source, message, rawText) ||
    senderMatchesSource(source, message) ||
    listIdMatchesSource(source, message.headers) ||
    firstCanonicalSourceUrl(source, rawText) !== null
  )
}

function resolveInboundEmailSource(
  message: InboundEmailMessage,
  rawText: string,
): {
  source: InboundEmailRuleSource | null
  sourceId: string
  officialSourceUrl: string
  jurisdiction: string
  matched: boolean
} {
  const sources = inboundEmailSources()
  const verifiedSources = verifiedInboundEmailSources()
  const localParts = messageLocalParts(message)
  const accountCodeMatches = verifiedSources.filter((source) =>
    accountCodeMatchesSource(source, message, rawText),
  )
  const directMatches = sources.filter((source) =>
    source.inboundEmail.localParts.some((part) => localParts.includes(part.toLowerCase())),
  )
  const trustedDirectMatches = directMatches.filter((source) =>
    trustSignalMatchesSource(source, message, rawText),
  )
  const fallbackAddressed = localParts.some((part) => FALLBACK_LOCAL_PARTS.has(part))
  const listIdMatches = verifiedSources.filter((source) =>
    listIdMatchesSource(source, message.headers),
  )
  const urlMatches = verifiedSources.filter(
    (source) => firstCanonicalSourceUrl(source, rawText) !== null,
  )
  const senderMatches = verifiedSources.filter((source) => senderMatchesSource(source, message))
  const fallbackSource =
    listIdMatches.length === 1
      ? listIdMatches[0]
      : listIdMatches.length === 0 && urlMatches.length === 1
        ? urlMatches[0]
        : listIdMatches.length === 0 && urlMatches.length === 0 && senderMatches.length === 1
          ? senderMatches[0]
          : null
  const matchedSource =
    accountCodeMatches.length === 1
      ? accountCodeMatches[0]
      : trustedDirectMatches.length === 1
        ? trustedDirectMatches[0]
        : directMatches.length === 0 || fallbackAddressed
          ? fallbackSource
          : null

  if (matchedSource) {
    return {
      source: matchedSource,
      sourceId: matchedSource.id,
      officialSourceUrl: firstCanonicalSourceUrl(matchedSource, rawText) ?? matchedSource.url,
      jurisdiction: matchedSource.jurisdiction,
      matched: true,
    }
  }

  return {
    source: null,
    sourceId: UNMATCHED_SOURCE_ID,
    officialSourceUrl: extractFirstUrl(rawText),
    jurisdiction: inferJurisdiction(`${extractSubject(message.headers)}\n${rawText}`),
    matched: false,
  }
}

export async function ingestGovDeliveryEmail(
  env: Pick<Env, 'DB' | 'R2_PULSE' | 'PULSE_QUEUE' | 'PULSE_EMAIL_REQUIRE_AUTH'> & OpsAlertEnv,
  message: InboundEmailMessage,
): Promise<{ inserted: boolean; matched: boolean; queued: boolean; snapshotId: string }> {
  const rawBuffer = await new Response(message.raw).arrayBuffer()
  const rawText = new TextDecoder().decode(rawBuffer)
  const parsedEmail = await PostalMime.parse(rawBuffer)
  const fallbackSubject = extractSubject(message.headers)
  const canonicalText = buildEmailCanonicalText({
    parsed: parsedEmail,
    rawText,
    envelopeFrom: message.from,
    envelopeTo: message.to,
    fallbackSubject,
  })
  const archivedBody = buildEmailArchiveArtifact({ canonicalText, rawText })
  const now = new Date()
  const subject = parsedEmail.subject?.trim() || fallbackSubject
  const contentHash = await hashText(archivedBody)
  const externalId = extractExternalId(message.headers, `govdelivery:${contentHash.slice(0, 24)}`)
  let resolution = resolveInboundEmailSource(message, canonicalText)
  if (resolution.matched && resolution.source) {
    const trust = emailAttributionTrusted({
      source: resolution.source,
      message,
      parsedHeaders: parsedEmail.headers,
      // Default ON: opt out only by setting the var to "false".
      requireAuth: env.PULSE_EMAIL_REQUIRE_AUTH !== 'false',
    })
    if (!trust.trusted) {
      // Visible evidence for spoof attempts (and for legitimate mail broken by
      // an upstream header change — the failure mode the 06-08 stall taught us
      // to never leave silent).
      await dispatchOpsAlert(env, 'pulse.email.auth_reject', {
        sourceId: resolution.source.id,
        from: message.from,
        reason: trust.reason ?? 'unknown',
      })
      recordPulseMetric('pulse.govdelivery.auth_reject', {
        sourceId: resolution.source.id,
        reason: trust.reason ?? 'unknown',
      })
      resolution = {
        source: null,
        sourceId: UNMATCHED_SOURCE_ID,
        officialSourceUrl: extractFirstUrl(canonicalText),
        jurisdiction: inferJurisdiction(`${fallbackSubject}\n${canonicalText}`),
        matched: false,
      }
    }
  }
  const archived = await archivePulseRaw(env, {
    sourceId: resolution.sourceId,
    externalId,
    fetchedAt: now,
    body: archivedBody,
    contentType: 'text/plain; charset=utf-8',
  })
  const repo = makePulseOpsRepo(createDb(env.DB))
  const sourceState = resolution.source
    ? await repo.ensureSourceState({
        sourceId: resolution.source.id,
        tier: tierForSource(resolution.source),
        jurisdiction: resolution.source.jurisdiction,
        cadenceMs: cadenceMs(resolution.source),
        now,
      })
    : null
  const establishingBaseline = sourceState ? sourceNeedsMonitoringBaseline(sourceState) : false
  const result = await repo.createSourceSnapshot({
    sourceId: resolution.sourceId,
    externalId,
    title: subject,
    officialSourceUrl: resolution.officialSourceUrl,
    publishedAt: now,
    fetchedAt: now,
    contentHash: archived.contentHash,
    rawR2Key: archived.r2Key,
    ingestMethod: 'inbound_email',
  })
  const queued = result.inserted && resolution.matched && !establishingBaseline
  if (result.inserted && !resolution.matched) {
    await repo.updateSourceSnapshotStatus(result.snapshot.id, {
      parseStatus: 'ignored',
      failureReason: 'unmatched_inbound_email',
    })
  }
  if (result.inserted && establishingBaseline) {
    await repo.updateSourceSnapshotStatus(result.snapshot.id, {
      parseStatus: 'ignored',
      failureReason: 'monitoring_baseline_established',
    })
  }
  if (establishingBaseline && resolution.source) {
    await repo.establishSourceBaseline({ sourceId: resolution.source.id, baselineAt: now })
  }
  if (queued) {
    await env.PULSE_QUEUE.send({
      type: 'pulse.extract',
      snapshotId: result.snapshot.id,
    } satisfies PulseExtractQueueMessage)
  }
  recordPulseMetric('pulse.govdelivery.inbound_snapshot', {
    inserted: result.inserted,
    sourceId: result.snapshot.sourceId,
    jurisdiction: resolution.jurisdiction,
    matched: resolution.matched,
    queued,
  })
  return {
    inserted: result.inserted,
    matched: resolution.matched,
    queued,
    snapshotId: result.snapshot.id,
  }
}
