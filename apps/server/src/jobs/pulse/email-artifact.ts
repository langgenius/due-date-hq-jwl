import { stripHtml } from '@duedatehq/ingest/selectors'
import type { Email, Mailbox } from 'postal-mime'

export const CANONICAL_EMAIL_TEXT_BEGIN = '---BEGIN DUEDATEHQ CANONICAL EMAIL TEXT---'
export const CANONICAL_EMAIL_TEXT_END = '---END DUEDATEHQ CANONICAL EMAIL TEXT---'
export const RAW_EMAIL_ARTIFACT_BEGIN = '---BEGIN DUEDATEHQ RAW RFC822 EMAIL---'
export const RAW_EMAIL_ARTIFACT_END = '---END DUEDATEHQ RAW RFC822 EMAIL---'

const HEADER_NAMES = [
  'message-id',
  'date',
  'list-id',
  'x-accountcode',
  'x-account-code',
  'list-unsubscribe',
] as const

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const ARTIFACT_MARKERS = [
  CANONICAL_EMAIL_TEXT_BEGIN,
  CANONICAL_EMAIL_TEXT_END,
  RAW_EMAIL_ARTIFACT_BEGIN,
  RAW_EMAIL_ARTIFACT_END,
] as const

/**
 * A crafted email body containing a literal marker line could otherwise close
 * the canonical section early (extractCanonicalEmailText slices on indexOf),
 * truncating what the extractor sees. Break the exact match while keeping the
 * text readable in the archive.
 */
function neutralizeArtifactMarkers(value: string): string {
  let out = value
  for (const marker of ARTIFACT_MARKERS) {
    out = out.replaceAll(marker, marker.replaceAll('---', '~~~'))
  }
  return out
}

function addressLabel(value: Email['from'] | Email['to']): string | null {
  if (!value) return null
  const entries = Array.isArray(value) ? value : [value]
  const mailboxes: Mailbox[] = []
  for (const entry of entries) {
    if ('group' in entry && Array.isArray(entry.group)) {
      mailboxes.push(...entry.group)
    } else if ('address' in entry && typeof entry.address === 'string') {
      mailboxes.push(entry)
    }
  }
  return mailboxes
    .map((entry) => (entry.name ? `${entry.name} <${entry.address}>` : entry.address))
    .filter(Boolean)
    .join(', ')
}

function headerValue(email: Email, key: string): string | null {
  return email.headers.find((header) => header.key === key)?.value?.trim() || null
}

function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(/https?:\/\/[^\s<>"')]+/g) ?? []))
}

export function buildEmailCanonicalText(input: {
  parsed: Email
  rawText: string
  envelopeFrom: string
  envelopeTo: string
  fallbackSubject: string
}): string {
  const bodyText = normalizeWhitespace(
    input.parsed.text || (input.parsed.html ? stripHtml(input.parsed.html) : input.rawText),
  )
  const headerLines = [
    `Subject: ${input.parsed.subject?.trim() || input.fallbackSubject}`,
    `From: ${addressLabel(input.parsed.from) ?? input.envelopeFrom}`,
    `To: ${addressLabel(input.parsed.to) ?? input.envelopeTo}`,
    `Envelope-From: ${input.envelopeFrom}`,
    `Envelope-To: ${input.envelopeTo}`,
    ...HEADER_NAMES.flatMap((key) => {
      const value = headerValue(input.parsed, key)
      return value ? [`${key}: ${value}`] : []
    }),
  ]
  const links = extractUrls(bodyText)
  const sections = [
    CANONICAL_EMAIL_TEXT_BEGIN,
    // Header values and body are attacker-influenced — neutralize any embedded
    // marker lines so they cannot fake a section boundary.
    neutralizeArtifactMarkers(
      [
        headerLines.join('\n'),
        links.length > 0 ? ['Links:', ...links.map((url) => `- ${url}`)].join('\n') : null,
        'Body:',
        bodyText,
      ]
        .filter((section): section is string => Boolean(section))
        .join('\n\n'),
    ),
    CANONICAL_EMAIL_TEXT_END,
  ]
  return sections.join('\n\n')
}

export function buildEmailArchiveArtifact(input: {
  canonicalText: string
  rawText: string
}): string {
  return [
    input.canonicalText,
    RAW_EMAIL_ARTIFACT_BEGIN,
    input.rawText.trimEnd(),
    RAW_EMAIL_ARTIFACT_END,
  ].join('\n\n')
}

export function extractCanonicalEmailText(archivedText: string): string {
  const start = archivedText.indexOf(CANONICAL_EMAIL_TEXT_BEGIN)
  const end = archivedText.indexOf(CANONICAL_EMAIL_TEXT_END)
  if (start < 0 || end <= start) return archivedText
  return archivedText.slice(start + CANONICAL_EMAIL_TEXT_BEGIN.length, end).trim()
}
