#!/usr/bin/env node
/**
 * post-x.mjs — zero-dep X (Twitter) poster for the DueDateHQ pipeline.
 *
 * Auth: OAuth 1.0a user context (required for writes). Keys live ONLY in env:
 *   X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 *   (create at developer.x.com — app permissions must be "Read and write")
 *
 * USAGE
 *   # dry run (default — prints what would post, sends nothing):
 *   node post-x.mjs "text of the post"
 *   node post-x.mjs --file post.txt
 *
 *   # actually post:
 *   X_CONSUMER_KEY=... X_CONSUMER_SECRET=... X_ACCESS_TOKEN=... X_ACCESS_TOKEN_SECRET=... \
 *     node post-x.mjs --post "text of the post"
 *
 *   # thread: file with posts separated by a line containing only "---"
 *   node post-x.mjs --post --file thread.txt
 */
import fs from 'node:fs'
import crypto from 'node:crypto'

const args = process.argv.slice(2)
const POST = args.includes('--post')
const fileIx = args.indexOf('--file')
let texts
if (fileIx >= 0) {
  const raw = fs.readFileSync(args[fileIx + 1], 'utf8').trim()
  texts = raw.split(/\n---\n/).map((s) => s.trim()).filter(Boolean)
} else {
  const positional = args.filter((a) => !a.startsWith('--'))
  texts = [positional.join(' ').trim()]
}
if (!texts.length || !texts[0]) {
  console.error('ERROR: no post text. Usage: node post-x.mjs [--post] "text" | --file f.txt')
  process.exit(1)
}
for (const t of texts) {
  if (t.length > 280) {
    console.error(`ERROR: post exceeds 280 chars (${t.length}):\n${t}`)
    process.exit(1)
  }
}

const K = {
  ck: process.env.X_CONSUMER_KEY,
  cs: process.env.X_CONSUMER_SECRET,
  at: process.env.X_ACCESS_TOKEN,
  as: process.env.X_ACCESS_TOKEN_SECRET,
}
if (POST && (!K.ck || !K.cs || !K.at || !K.as)) {
  console.error('ERROR: set X_CONSUMER_KEY / X_CONSUMER_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET to post.')
  process.exit(1)
}

const enc = (s) => encodeURIComponent(s).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

function oauthHeader(method, url) {
  const p = {
    oauth_consumer_key: K.ck,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: K.at,
    oauth_version: '1.0',
  }
  const paramStr = Object.keys(p).sort().map((k) => `${enc(k)}=${enc(p[k])}`).join('&')
  const base = [method, enc(url), enc(paramStr)].join('&')
  const key = `${enc(K.cs)}&${enc(K.as)}`
  p.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64')
  return 'OAuth ' + Object.keys(p).sort().map((k) => `${enc(k)}="${enc(p[k])}"`).join(', ')
}

async function postOne(text, replyTo) {
  const url = 'https://api.x.com/2/tweets'
  const body = replyTo ? { text, reply: { in_reply_to_tweet_id: replyTo } } : { text }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json().catch(() => ({}))
  if (res.status !== 201) throw new Error(`X API ${res.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return j.data.id
}

if (!POST) {
  texts.forEach((t, i) => console.log(`[DRY${texts.length > 1 ? ` ${i + 1}/${texts.length}` : ''}] (${t.length} chars)\n${t}\n`))
  console.log('Dry run only — add --post to publish.')
} else {
  let replyTo = null
  for (const [i, t] of texts.entries()) {
    const id = await postOne(t, replyTo)
    console.log(`✓ posted ${i + 1}/${texts.length}  id=${id}  https://x.com/i/status/${id}`)
    replyTo = id
    if (i < texts.length - 1) await new Promise((r) => setTimeout(r, 2000))
  }
}
