#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'

const FIXTURES = {
  ny: 'mock/pulse-email-inbound/ny-email-services.eml',
  oh: 'mock/pulse-email-inbound/oh-tax-alerts.eml',
  fl: 'mock/pulse-email-inbound/fl-tax-publications.eml',
  wa: 'mock/pulse-email-inbound/wa-dor-news.eml',
  ma: 'mock/pulse-email-inbound/ma-dor-press.eml',
  tx: 'mock/pulse-email-inbound/tx-comptroller-news.eml',
  unmatched: 'mock/pulse-email-inbound/unmatched.eml',
}

const args = parseArgs(process.argv.slice(2))
const endpoint = args.endpoint ?? 'http://127.0.0.1:8787'
const fixtureKey = args.fixture ?? 'ny'
const fixturePath = FIXTURES[fixtureKey] ?? fixtureKey
const rawFixture = readFileSync(path.resolve(process.cwd(), fixturePath), 'utf8')
let rawEmail =
  args.unique === 'false'
    ? rawFixture
    : withSmokeNonce(rawFixture, args.nonce ?? new Date().toISOString())
const from = args.from ?? parseAddressHeader(rawEmail, 'from')
const to = rewriteDomain(args.to ?? parseAddressHeader(rawEmail, 'to'), args.domain)

if (!from || !to) {
  console.error('Could not infer from/to. Pass --from and --to explicitly.')
  process.exit(1)
}

if (args.from) rawEmail = replaceAddressHeader(rawEmail, 'from', from)
if (args.to || args.domain) rawEmail = replaceAddressHeader(rawEmail, 'to', to)

const emailEndpoint = new URL('/cdn-cgi/handler/email', endpoint)
emailEndpoint.searchParams.set('from', from)
emailEndpoint.searchParams.set('to', to)

if (args['dry-run'] === 'true') {
  console.log(`Fixture: ${fixturePath}`)
  console.log(`Endpoint: ${emailEndpoint.toString()}`)
  console.log(`From: ${from}`)
  console.log(`To: ${to}`)
  process.exit(0)
}

console.log(`Posting ${fixturePath} to ${emailEndpoint.toString()}`)
const response = await fetch(emailEndpoint, {
  method: 'POST',
  headers: {
    'content-type': 'message/rfc822',
  },
  body: rawEmail,
})

const body = await response.text()
if (!response.ok) {
  console.error(`Inbound email smoke failed: HTTP ${response.status}`)
  if (body) console.error(body)
  process.exit(1)
}

console.log(`Inbound email smoke accepted: HTTP ${response.status}`)
if (body) console.log(body)
console.log('Inspect local D1 pulse_source_snapshot and R2_PULSE for the archived result.')

function parseArgs(input) {
  const parsed = {}
  for (let index = 0; index < input.length; index += 1) {
    const token = input[index]
    if (!token.startsWith('--')) continue

    const key = token.slice(2)
    const next = input[index + 1]
    if (next && !next.startsWith('--')) {
      parsed[key] = next
      index += 1
    } else {
      parsed[key] = 'true'
    }
  }
  return parsed
}

function parseAddressHeader(rawEmailText, headerName) {
  const header = rawEmailText.match(new RegExp(`^${headerName}:\\s*(.+)$`, 'im'))?.[1]?.trim()
  if (!header) return null
  return header.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? header
}

function rewriteDomain(address, domain) {
  if (!address || !domain) return address
  const at = address.indexOf('@')
  if (at <= 0) return address
  return `${address.slice(0, at)}@${domain}`
}

function replaceAddressHeader(rawEmailText, headerName, address) {
  return rawEmailText.replace(
    new RegExp(`^${headerName}:\\s*.+$`, 'im'),
    `${headerName}: ${address}`,
  )
}

function withSmokeNonce(rawEmailText, nonce) {
  const safeNonce = nonce.replace(/[^A-Za-z0-9._-]+/g, '-')
  const withMessageId = rawEmailText.replace(
    /^Message-ID:\s*<([^@>]+)@([^>]+)>$/im,
    `Message-ID: <$1.${safeNonce}@$2>`,
  )
  return `${withMessageId.trimEnd()}\n\nSmoke-Nonce: ${safeNonce}\n`
}
