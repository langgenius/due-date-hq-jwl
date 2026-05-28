import { createDb, makePulseOpsRepo } from '@duedatehq/db'
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

function extractFirstUrl(text: string): string {
  return text.match(/https?:\/\/[^\s<>"')]+/)?.[0] ?? 'https://public.govdelivery.com/'
}

function inferJurisdiction(text: string): string {
  const match = text
    .toUpperCase()
    .match(/\b[A-Z]{2}\b/g)
    ?.find((code) => STATE_CODES.has(code))
  return match ?? 'US'
}

export async function ingestGovDeliveryEmail(
  env: Pick<Env, 'DB' | 'R2_PULSE' | 'PULSE_QUEUE'>,
  message: InboundEmailMessage,
): Promise<{ inserted: boolean; snapshotId: string }> {
  const rawText = await new Response(message.raw).text()
  const now = new Date()
  const subject = extractSubject(message.headers)
  const contentHash = await hashText(rawText)
  const externalId = extractExternalId(message.headers, `govdelivery:${contentHash.slice(0, 24)}`)
  const archived = await archivePulseRaw(env, {
    sourceId: 'govdelivery.inbound',
    externalId,
    fetchedAt: now,
    body: rawText,
    contentType: 'message/rfc822',
  })
  const repo = makePulseOpsRepo(createDb(env.DB))
  const result = await repo.createSourceSnapshot({
    sourceId: 'govdelivery.inbound',
    externalId,
    title: subject,
    officialSourceUrl: extractFirstUrl(rawText),
    publishedAt: now,
    fetchedAt: now,
    contentHash: archived.contentHash,
    rawR2Key: archived.r2Key,
  })
  if (result.inserted) {
    await env.PULSE_QUEUE.send({
      type: 'pulse.extract',
      snapshotId: result.snapshot.id,
    } satisfies PulseExtractQueueMessage)
  }
  recordPulseMetric('pulse.govdelivery.inbound_snapshot', {
    inserted: result.inserted,
    sourceId: result.snapshot.sourceId,
    jurisdiction: inferJurisdiction(`${subject}\n${rawText}`),
  })
  return { inserted: result.inserted, snapshotId: result.snapshot.id }
}
