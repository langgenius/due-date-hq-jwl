import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { listRuleSources, type RuleSource } from '@duedatehq/core/rules'
import { hashText } from '@duedatehq/ingest/http'
import type { Env } from '../../env'
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

function trustSignalMatchesSource(
  source: InboundEmailRuleSource,
  message: InboundEmailMessage,
  rawText: string,
): boolean {
  return (
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
  const localParts = messageLocalParts(message)
  const directMatches = sources.filter((source) =>
    source.inboundEmail.localParts.some((part) => localParts.includes(part.toLowerCase())),
  )
  const trustedDirectMatches = directMatches.filter((source) =>
    trustSignalMatchesSource(source, message, rawText),
  )
  const fallbackAddressed = localParts.some((part) => FALLBACK_LOCAL_PARTS.has(part))
  const listIdMatches = sources.filter((source) => listIdMatchesSource(source, message.headers))
  const urlMatches = sources.filter((source) => firstCanonicalSourceUrl(source, rawText) !== null)
  const senderMatches = sources.filter((source) => senderMatchesSource(source, message))
  const fallbackSource =
    listIdMatches.length === 1
      ? listIdMatches[0]
      : listIdMatches.length === 0 && urlMatches.length === 1
        ? urlMatches[0]
        : listIdMatches.length === 0 && urlMatches.length === 0 && senderMatches.length === 1
          ? senderMatches[0]
          : null
  const matchedSource =
    trustedDirectMatches.length === 1
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
  env: Pick<Env, 'DB' | 'R2_PULSE' | 'PULSE_QUEUE'>,
  message: InboundEmailMessage,
): Promise<{ inserted: boolean; matched: boolean; queued: boolean; snapshotId: string }> {
  const rawText = await new Response(message.raw).text()
  const now = new Date()
  const subject = extractSubject(message.headers)
  const contentHash = await hashText(rawText)
  const externalId = extractExternalId(message.headers, `govdelivery:${contentHash.slice(0, 24)}`)
  const resolution = resolveInboundEmailSource(message, rawText)
  const archived = await archivePulseRaw(env, {
    sourceId: resolution.sourceId,
    externalId,
    fetchedAt: now,
    body: rawText,
    contentType: 'message/rfc822',
  })
  const repo = makePulseOpsRepo(createDb(env.DB))
  const result = await repo.createSourceSnapshot({
    sourceId: resolution.sourceId,
    externalId,
    title: subject,
    officialSourceUrl: resolution.officialSourceUrl,
    publishedAt: now,
    fetchedAt: now,
    contentHash: archived.contentHash,
    rawR2Key: archived.r2Key,
  })
  const queued = result.inserted && resolution.matched
  if (result.inserted && !resolution.matched) {
    await repo.updateSourceSnapshotStatus(result.snapshot.id, {
      parseStatus: 'ignored',
      failureReason: 'unmatched_inbound_email',
    })
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
