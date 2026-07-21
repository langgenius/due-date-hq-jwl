#!/usr/bin/env node
/**
 * Due Date HQ — cold-outreach sender (zero deps, Node 18+, Resend REST API)
 *
 * It reads the approved CSV exported from the review panel (or the full sequence CSV),
 * sends ONE touch per run, throttles, de-dupes (won't re-send), honors a suppression
 * list, and dry-runs by default. Re-run with a later --touch on the right days.
 *
 * REQUIRED (only you can supply these — an authenticated sender identity is yours, not mine):
 *   RESEND_API_KEY   your Resend key            (https://resend.com — free tier; verify a domain)
 *   FROM             "Name <you@SENDING-domain>"  ← use a SEPARATE domain, NOT the product's
 *
 * USAGE
 *   # 1) dry run touch 1 (prints, sends nothing):
 *   RESEND_API_KEY=re_xxx FROM="Yuqi <yuqi@reach.duedatehq.com>" \
 *     node scripts/outreach/send-outreach.mjs --touch 1 --dry
 *
 *   # 2) really send touch 1, throttled (30 today, 8s apart):
 *   RESEND_API_KEY=re_xxx FROM="..." \
 *     node scripts/outreach/send-outreach.mjs --touch 1 --send --limit 30 --delay 8000
 *
 *   # 3) four days later, touch 2 (only to those who got touch 1 ≥4d ago and haven't replied):
 *   ... --touch 2 --send --limit 30 --delay 8000
 *
 * FLAGS
 *   --touch N     1|2|3            (default 1)
 *   --send        actually send    (omit = dry run)
 *   --limit N     max sends this run (default 25)
 *   --delay MS    ms between sends   (default 6000)
 *   --csv PATH    input csv          (default ./duedatehq-approved.csv, else sequence csv)
 *   --state PATH  send log/state     (default ./.outreach-state.json)
 *   --suppress P  emails to skip, one per line (default ./outreach-suppress.txt)
 *   --utm-campaign NAME              (default 2026_07_cpa_outreach)
 *   --force       ignore the day gap between touches (for testing)
 */
import fs from 'node:fs'

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f, d) => {
  const i = args.indexOf(f)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}

const TOUCH = parseInt(val('--touch', '1'), 10)
const SEND = has('--send')
const LIMIT = parseInt(val('--limit', '25'), 10)
const DELAY = parseInt(val('--delay', '6000'), 10)
const FORCE = has('--force')
const ALERT = has('--alert') // per-state IRS disaster-relief alert send (uses disaster-notices.json)
const CSV = val(
  '--csv',
  fs.existsSync('duedatehq-approved.csv')
    ? 'duedatehq-approved.csv'
    : 'duedatehq-OUTREACH-sequence.csv',
)
const STATE_PATH = val('--state', '.outreach-state.json')
const SUPPRESS_PATH = val('--suppress', 'outreach-suppress.txt')
const UTM_SOURCE = val('--utm-source', 'cold_outreach')
const UTM_MEDIUM = val('--utm-medium', 'email')
const UTM_CAMPAIGN = val('--utm-campaign', '2026_07_cpa_outreach')
const GAP_DAYS = { 2: 4, 3: 10 } // touch2 ≥4d after touch1; touch3 ≥10d after touch1

const KEY = process.env.RESEND_API_KEY
const FROM = process.env.FROM
const REPLY_TO = process.env.REPLY_TO // optional: route replies to an inbox you already have (e.g. your Gmail)
const FOOTER_ADDRESS = process.env.FOOTER_ADDRESS // CAN-SPAM: a real physical mailing address (required to send)
if (SEND && (!KEY || !FROM)) {
  console.error('ERROR: set RESEND_API_KEY and FROM to send. (Dry run works without them.)')
  process.exit(1)
}
if (SEND && !FOOTER_ADDRESS) {
  console.error(
    'ERROR: set FOOTER_ADDRESS (CAN-SPAM requires a physical mailing address in every email).',
  )
  process.exit(1)
}

// restrict this run to the emails listed in a wave CSV (--wave ALL-trackB.csv) — any csv/txt with an Email column or one email per line
const WAVE = val('--wave', null)
let waveSet = null
if (WAVE) {
  const raw = fs.readFileSync(WAVE, 'utf8')
  if (/(^|,)Email(,|$)/m.test(raw.split('\n')[0])) {
    waveSet = new Set(
      parseCSV(raw)
        .map((r) => (r.Email || '').trim().toLowerCase())
        .filter(Boolean),
    )
  } else {
    waveSet = new Set(
      raw
        .split('\n')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes('@')),
    )
  }
}

// --- tiny CSV parser (handles quotes, commas, newlines) ---
function parseCSV(text) {
  const rows = []
  let row = [],
    cur = '',
    q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else if (c === '\r') {
      /* skip */
    } else cur += c
  }
  if (cur.length || row.length) {
    row.push(cur)
    rows.push(row)
  }
  const head = rows.shift().map((h) => h.trim())
  return rows
    .filter((r) => r.some((x) => x !== ''))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

function emailOf(r) {
  return (r.To || r.Contact || '').trim()
}
const isEmail = (s) => /@/.test(s) && !/contact form|find manually/i.test(s)

const state = fs.existsSync(STATE_PATH)
  ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
  : { sent: {} }
const suppress = new Set(
  fs.existsSync(SUPPRESS_PATH)
    ? fs
        .readFileSync(SUPPRESS_PATH, 'utf8')
        .split('\n')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [],
)

const rows = parseCSV(fs.readFileSync(CSV, 'utf8'))
const subjCol = `Subject${TOUCH}`,
  bodyCol = `Email${TOUCH}`

function withFooter(text) {
  if (!FOOTER_ADDRESS) return text
  return `${text}\n\nP.S. Not useful? Just reply "no thanks" and I won't write again.\nDueDateHQ · ${FOOTER_ADDRESS}`
}

// ---- Touch-1 template (v12 light, 2026-07-07): plain, personal, Inbox-friendly —
// no card/table/image (the v11 card landed in Promotions). Full loop copy:
// monitor IRS/state/FEMA -> who's affected -> one-click apply -> official source.
function trackOf(r) {
  if (/wildfire/i.test(r.Subject1 || '')) return 'A'
  if (/S-corps/i.test(r.Subject1 || '') || /S-corps and partnerships/.test(r.Email1 || ''))
    return 'C'
  return 'B'
}
function firstNameOf(r) {
  const m = /^Hi ([^,]+),/.exec(r.Email1 || '')
  return m ? m[1] : 'there'
}
function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}
function waveLabel() {
  const source = WAVE || CSV
  const basename = source.split(/[\\/]/).pop() || 'sequence'
  return slug(basename.replace(/\.[^.]+$/, '')) || 'sequence'
}
function trackedUrl(r, placement = 'body') {
  const url = new URL('https://duedatehq.com/')
  url.searchParams.set('utm_source', slug(UTM_SOURCE) || 'cold_outreach')
  url.searchParams.set('utm_medium', slug(UTM_MEDIUM) || 'email')
  url.searchParams.set('utm_campaign', slug(UTM_CAMPAIGN) || '2026_07_cpa_outreach')
  url.searchParams.set(
    'utm_content',
    [waveLabel(), `t${TOUCH}`, `track_${trackOf(r).toLowerCase()}`, slug(placement)]
      .filter(Boolean)
      .join('_'),
  )
  return url.toString()
}
function htmlAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
function applyTrackedLinks(content, r, placement = 'body') {
  const url = trackedUrl(r, placement)
  return content
    .replace(/https?:\/\/(?:www\.)?duedatehq\.com\/?(?:\?[^)\s"'<]*)?/gi, url)
    .replace(/(^|[\s([{"'>])(?:www\.)?duedatehq\.com\b/gi, (_match, prefix) => {
      return `${prefix}${url}`
    })
}
function buildTouch1(r) {
  const first = firstNameOf(r)
  const url = trackedUrl(r, 'body')
  // v12 light Inbox template (2026-07-07, approved by Yuqi): plain, personal, no
  // card/table/image (those landed the v11 card in Promotions). Full loop:
  // monitor IRS/state/FEMA -> who's affected -> one-click apply -> source.
  // The plain-text footer is appended by withFooter() in sendOne; HTML footer inline.
  return {
    subject: 'DueDateHQ — deadline monitoring for US CPAs, and who it hits',
    text:
      `Hi ${first},\n` +
      `When the IRS, a state, or FEMA moves a filing deadline, the hard part is knowing which of your clients it hits.\n` +
      `DueDateHQ watches all three around the clock. The moment a date moves, it shows you exactly which clients are affected — with the official notice — and lets you update their deadlines in one click.\n` +
      `Paste your client list; first sourced deadline in ~10 minutes. Want in?\n` +
      `Gigi\nCo-Founder, DueDateHQ\n${url}`,
    html:
      `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.62;color:#1f2430">` +
      `<p style="margin:0 0 14px">Hi ${first},</p>` +
      `<p style="margin:0 0 14px;text-wrap:pretty">When the IRS, a state, or FEMA moves a filing deadline, the hard part is knowing which of your clients it hits.</p>` +
      `<p style="margin:0 0 14px;text-wrap:pretty"><a href="${htmlAttr(url)}" style="color:#2E368C;text-decoration:none;border-bottom:1px solid #c9cdec">DueDateHQ</a> watches all three around the clock. The moment a date moves, it shows you exactly which clients are affected — with the official notice — and lets you update their deadlines in one click.</p>` +
      `<p style="margin:0 0 22px;text-wrap:pretty">Paste your client list; first sourced deadline in ~10 minutes. Want in?</p>` +
      `<div style="font-weight:600;color:#111827">Gigi</div>` +
      `<div style="color:#6b7280;font-size:13px;margin-top:2px">Co-Founder · DueDateHQ</div>` +
      (FOOTER_ADDRESS
        ? `<p style="margin:20px 0 0;padding-top:13px;border-top:1px solid #ecedf2;font-size:12px;color:#9aa0a6;text-wrap:pretty">Not useful? Just reply &quot;no thanks&quot; and I won&#39;t write again.<br>DueDateHQ · ${FOOTER_ADDRESS}</p>`
        : '') +
      `</div>`,
    attachments: [],
  }
}

// ---- Alert template: per-state IRS disaster-relief postponement.
// Data from disaster-notices.json (each fact transcribed from the cited irs.gov release).
// HONEST per-state fill: uses only verified IRS facts (state, event, deadline, affected area,
// affected returns). No fabricated state-conformity dates. States with no live notice are skipped.
const NOTICES = ALERT
  ? JSON.parse(fs.readFileSync(val('--notices', 'disaster-notices.json'), 'utf8'))
  : []
const noticeForState = (abbr) => NOTICES.find((n) => n.abbr === (abbr || '').trim().toUpperCase())
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Restored for the alert's cid logo (main's v12 touch-1 dropped the wordmark image).
const WORDMARK_B64 = fs.existsSync(new URL('./wordmark-2x.png', import.meta.url))
  ? fs.readFileSync(new URL('./wordmark-2x.png', import.meta.url)).toString('base64')
  : null
function buildAlert(r) {
  const n = noticeForState(r.State)
  if (!n) return null // no live disaster relief for this recipient's state
  const first = firstNameOf(r)
  const daysLeft = Math.ceil((new Date(`${n.deadline}T23:59:59Z`).getTime() - Date.now()) / 864e5)
  const daysLine = daysLeft > 0 ? `${daysLeft} days out` : 'due now'
  const pillCss =
    daysLeft <= 30
      ? 'color:#B54708;background:#FFFAEB;border:1px solid #FEDF89'
      : 'color:#475467;background:#F2F4F7;border:1px solid #E4E7EC'
  const forms = n.forms.join(' · ')
  const subject = `The IRS moved a filing deadline in ${n.state} to ${n.deadlineLabel}`
  const text = [
    `Hi ${first},`,
    `A ${n.state} filing deadline has moved. After ${n.event}, the IRS postponed federal deadlines to ${n.deadlineLabel} for taxpayers in ${n.affectedArea}${daysLeft > 0 ? ` — ${daysLeft} days out` : ''}.`,
    ``,
    `If any of your clients file there, it covers: ${forms}.`,
    ``,
    `DueDateHQ caught this the day it posted — it watches every IRS and state deadline and tells you which of your clients each change affects. The ${n.state} notice: ${n.sourceHref}`,
    ``,
    `It's free while we're in beta. Next time a date moves in a state you file in, you'll know that morning.`,
    ``,
    `Gigi`,
    `Co-Founder of DueDateHQ`,
    `A new product from Dify (dify.ai) · duedatehq.com`,
  ].join('\n')
  const scope = n.forms.length >= 6 ? 'Nearly all federal returns' : n.forms.join(', ')
  // Attribution: every duedatehq link in the alert carries UTM so Amplitude can
  // segment visits by state batch (utm_content=alert_<abbr>).
  const utm = `utm_source=cold_outreach&utm_medium=email&utm_campaign=disaster_alert&utm_content=alert_${n.abbr.toLowerCase()}`
  const siteUrl = `https://duedatehq.com/?${utm}`
  const appUrl = `https://app.duedatehq.com/alerts?state=${encodeURIComponent(n.abbr)}&${utm}`
  const logo = WORDMARK_B64
    ? `<a href="${siteUrl}" style="text-decoration:none"><img src="cid:wordmark" width="116" height="15" alt="DueDateHQ" style="display:block;border:0"></a>`
    : `<a href="${siteUrl}" style="text-decoration:none;font-size:15px;font-weight:600;color:#101828;letter-spacing:-.02em">DueDateHQ</a>`
  const footerHtml = FOOTER_ADDRESS
    ? `<p style="margin:20px 0 0;font-size:10px;line-height:1.5;color:#98A2B3">Facts from IRS ${esc(n.code)}. Not useful? Reply &quot;no thanks&quot; and I won&#39;t write again.<br>DueDateHQ · ${FOOTER_ADDRESS}</p>`
    : ''
  const html =
    '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#475467;max-width:496px;padding-top:16px">' +
    `<div style="margin:0 0 26px;padding-bottom:16px;border-bottom:1px solid #EAECF0">${logo}</div>` +
    `<p style="margin:0 0 20px;font-size:20px;line-height:1.35;font-weight:500;color:#101828;letter-spacing:-.015em">A ${esc(n.state)} filing deadline has moved.</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 24px"><tr><td style="border:1px solid #E4E7EC;border-radius:12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="background:#FCFCFD;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:10px 18px"><span style="display:inline-block;min-width:23px;text-align:center;font-size:11px;font-weight:600;color:#2E368C;background:#EEF1FB;border:1px solid #D5DBF3;border-radius:6px;padding:2px 5px;margin-right:9px;font-variant-numeric:tabular-nums;vertical-align:middle">${esc(n.abbr)}</span><span style="font-size:12px;font-weight:500;color:#344054;vertical-align:middle">${esc(n.state)} disaster relief</span></td>` +
    `<td align="right" style="background:#FCFCFD;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:11px 18px"><span style="font-size:11px;color:#98A2B3;font-variant-numeric:tabular-nums">IRS ${esc(n.code)}</span></td>` +
    `</tr></table>` +
    `<div style="padding:18px">` +
    `<div style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#98A2B3;font-weight:500">New federal deadline</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:7px"><tr>` +
    `<td valign="middle"><span style="font-size:28px;font-weight:500;color:#101828;letter-spacing:-.02em;font-variant-numeric:tabular-nums">${esc(n.deadlineLabel)}</span></td>` +
    `<td align="right" valign="middle"><span style="display:inline-block;font-size:12px;${pillCss};border-radius:999px;padding:4px 11px;white-space:nowrap">${daysLine}</span></td>` +
    `</tr></table>` +
    `</div></td></tr></table>` +
    `<p style="margin:0 0 24px;color:#475467"><a href="${siteUrl}" style="color:#2E368C;text-decoration:underline">DueDateHQ</a> caught this the day it posted — it watches every IRS and state deadline and tells you which of your clients each change affects.</p>` +
    `<a href="${appUrl}" style="display:inline-block;background:#2E368C;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 22px;border-radius:8px;box-shadow:0 1px 2px rgba(16,24,40,.18)">See your affected clients →</a>` +
    `<div style="font-size:13px;color:#667085;margin-top:26px"><span style="font-weight:500;color:#101828">Gigi</span> · Co-Founder · a new product from <a href="https://dify.ai" style="color:#2E368C;text-decoration:underline">Dify</a></div>` +
    footerHtml +
    '</div>'
  const attachments = WORDMARK_B64
    ? [
        {
          filename: 'duedatehq.png',
          content: WORDMARK_B64,
          content_id: 'wordmark',
          content_type: 'image/png',
        },
      ]
    : []
  return { subject, text, html, attachments }
}

async function sendOne(to, subject, text, html, attachments) {
  const unsubTo = REPLY_TO || FROM.replace(/^.*<|>$/g, '')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text: withFooter(text),
      ...(html ? { html } : {}),
      ...(attachments && attachments.length ? { attachments } : {}),
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      headers: { 'List-Unsubscribe': `<mailto:${unsubTo}?subject=unsubscribe>` },
    }),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return (await res.json()).id
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let sent = 0,
  skipped = 0,
  failed = 0
console.log(
  `\nDue Date HQ outreach · touch ${TOUCH} · ${SEND ? 'SEND' : 'DRY RUN'} · csv=${CSV} · limit=${LIMIT}\n`,
)

for (const r of rows) {
  if (sent >= LIMIT) break
  const to = emailOf(r)
  const key = to.toLowerCase()
  if (!isEmail(to)) {
    skipped++
    continue
  } // contact-form / no email
  if (waveSet && !waveSet.has(key)) {
    skipped++
    continue
  } // not in this wave
  if (suppress.has(key)) {
    skipped++
    continue
  } // opted out
  const log = state.sent[key] || {}
  if (ALERT) {
    if (log.alert) {
      skipped++
      continue
    } // already alerted
    const built = buildAlert(r)
    if (!built) {
      skipped++
      continue
    } // no live disaster relief for this state
    if (!SEND) {
      console.log(`[DRY] alert → ${to}  (${r.Firm}, ${r.State})  "${built.subject}"`)
      sent++
      continue
    }
    try {
      const id = await sendOne(to, built.subject, built.text, built.html, built.attachments)
      log.alert = Date.now()
      state.sent[key] = log
      fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
      console.log(`✓ alert ${to}  (${r.Firm})  id=${id}`)
      sent++
      await sleep(DELAY)
    } catch (e) {
      console.error(`✗ FAIL ${to}  (${r.Firm}): ${e.message}`)
      failed++
    }
    continue
  }
  if (log[`t${TOUCH}`]) {
    skipped++
    continue
  } // already sent this touch
  if (TOUCH > 1) {
    const t1 = log.t1
    if (!t1) {
      skipped++
      continue
    } // never got touch 1
    if (!FORCE && Date.now() - t1 < GAP_DAYS[TOUCH] * 864e5) {
      skipped++
      continue
    } // too soon
  }
  let subject = r[subjCol]?.trim(),
    text = r[bodyCol]?.trim(),
    html = null,
    attachments = null
  if (!subject || !text || text.startsWith('(contact form')) {
    skipped++
    continue
  }
  if (text.includes('[SENDER]')) {
    console.error(`! ${r.Firm}: body still has [SENDER] — fix sign-off first`)
    skipped++
    continue
  }
  if (TOUCH === 1) ({ subject, text, html, attachments } = buildTouch1(r))
  else text = applyTrackedLinks(text, r)

  if (!SEND) {
    console.log(`[DRY] → ${to}  (${r.Firm})  [${trackOf(r)}·${firstNameOf(r)}]  "${subject}"`)
    sent++
    continue
  }
  try {
    const id = await sendOne(to, subject, text, html, attachments)
    log[`t${TOUCH}`] = Date.now()
    state.sent[key] = log
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
    console.log(`✓ sent ${to}  (${r.Firm})  id=${id}`)
    sent++
    await sleep(DELAY)
  } catch (e) {
    console.error(`✗ FAIL ${to}  (${r.Firm}): ${e.message}`)
    failed++
  }
}

console.log(`\nDone. ${SEND ? 'sent' : 'would send'}=${sent}  skipped=${skipped}  failed=${failed}`)
if (!SEND) console.log('Dry run only — add --send to actually send.')
