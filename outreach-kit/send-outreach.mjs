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

// ---- Touch-1 template (v11 FINAL, locked 2026-07-02): serif hero question +
// product-faithful GA alert card (white 12px card, gray header band, IRS/GEORGIA
// comparison table, counties line, whole card links to the app pinned ?lng=en) +
// morning-close + logo signature (cid-embedded wordmark). Approved by Yuqi.
import { Buffer } from 'node:buffer'
const WORDMARK_B64 = fs.existsSync(new URL('./wordmark-2x.png', import.meta.url))
  ? Buffer.from(fs.readFileSync(new URL('./wordmark-2x.png', import.meta.url))).toString('base64')
  : null
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
function buildTouch1(r) {
  const first = firstNameOf(r)
  const track = trackOf(r)
  const touchesLine =
    track === 'C'
      ? 'know exactly which of your S-corps and partnerships it touches'
      : 'know exactly which clients it touches'
  const touchesHtml =
    track === 'C'
      ? 'know exactly which of your <b>S-corps and partnerships</b> it touches'
      : 'know exactly which clients it touches'
  const footerHtml = FOOTER_ADDRESS
    ? `<p style="margin:26px 0 0;font-size:11px;color:#9aa0a6">Not useful? Just reply &quot;no thanks&quot; and I won&#39;t write again.<br>DueDateHQ · ${FOOTER_ADDRESS}</p>`
    : ''
  const subject = r.Subject1
  const text =
    "Hi ${first},\nA deadline just moved. Do you know who it hits?\n\nThat's the question DueDateHQ (duedatehq.com) answers \u2014 it watches the IRS, all 50 states, and FEMA around the clock. The moment a filing date moves, you see who it hits \u2014 and the official notice behind it. Like this one, live right now:\n\n  GEORGIA \u00b7 WILDFIRE RELIEF (IRS GA-2026-03 \u00b7 May 2026)\n  IRS pushed everything to Aug 20. Georgia didn't conform:\n                     IRS      GEORGIA\n  Estimates          Aug 20   Oct 13\n  Payroll returns    Aug 20   Oct 28\n  Extended returns   Aug 20   Feb 12\n  Hits clients in Clinch, Echols & Brantley counties \u2014 see which of yours: app.duedatehq.com/?lng=en\n\nIt's free while we're in beta. The next time a state quietly moves a date, you'll know that morning \u2014 and ${touchesLine}.\n\nGigi\nCo-Founder of DueDateHQ\nA new product from Dify (dify.ai) \u00b7 duedatehq.com"
      .replaceAll('${first}', first)
      .replaceAll('${touchesLine}', touchesLine)
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#202124;max-width:560px"><p style="margin:0 0 16px">Hi ${first},</p><p style="margin:0 0 16px;font-family:Georgia,\'Times New Roman\',serif;font-size:19px;line-height:1.35;color:#1F315C">A deadline just moved. Do you know <i>who</i> it hits?</p><p style="margin:0 0 16px">That&#39;s the question <a href="https://duedatehq.com" style="color:#2E368C;text-decoration:underline">DueDateHQ</a> answers \u2014 it watches the IRS, all 50 states, and FEMA around the clock. The moment a filing date moves, you see who it hits \u2014 and the official notice behind it. Like this one, live right now:</p><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;margin:0 0 16px"><tr><td style="background:#FFFFFF;border:1px solid #EAECF0;border-radius:12px">\n<a href="https://app.duedatehq.com/?lng=en" style="display:block;text-decoration:none;color:inherit">\n<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate"><tr>\n<td style="background:#F9FAFB;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:7px 14px"><span style="font-size:11px;letter-spacing:0.1em;font-weight:bold;color:#2E368C">GEORGIA&nbsp;\u00b7&nbsp;WILDFIRE RELIEF</span></td>\n<td align="right" style="background:#F9FAFB;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:7px 14px"><span style="font-size:11px;color:#98A2B3">IRS GA-2026-03&nbsp;\u00b7&nbsp;May 2026</span></td>\n</tr></table>\n<div style="padding:10px 14px">\n<div style="font-size:14px;font-weight:500;color:#101828">IRS pushed everything to Aug 20.</div>\n<div style="font-size:13px;color:#475467;margin-top:2px">Georgia didn&#39;t conform \u2014 the state runs on its own dates:</div>\n<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:6px">\n<tr>\n<td style="padding:0 0 3px;border-bottom:1px solid #EAECF0"></td>\n<td align="right" style="padding:0 0 3px;border-bottom:1px solid #EAECF0"><span style="font-size:11px;letter-spacing:0.08em;font-weight:500;color:#98A2B3">IRS</span></td>\n<td align="right" style="padding:0 0 3px 36px;border-bottom:1px solid #EAECF0"><span style="font-size:11px;letter-spacing:0.08em;font-weight:500;color:#98A2B3">GEORGIA</span></td>\n</tr>\n<tr>\n<td style="padding:6px 0;border-bottom:1px solid #F2F4F7;"><span style="font-size:13px;color:#101828">Estimates</span></td>\n<td align="right" style="padding:6px 0;border-bottom:1px solid #F2F4F7;"><span style="font-size:13px;color:#98A2B3;font-variant-numeric:tabular-nums">Aug 20</span></td>\n<td align="right" style="padding:6px 0 6px 36px;border-bottom:1px solid #F2F4F7;"><span style="font-size:13px;font-weight:500;color:#101828;font-variant-numeric:tabular-nums">Oct 13</span></td>\n</tr>\n<tr>\n<td style="padding:6px 0;border-bottom:1px solid #F2F4F7;"><span style="font-size:13px;color:#101828">Payroll returns</span></td>\n<td align="right" style="padding:6px 0;border-bottom:1px solid #F2F4F7;"><span style="font-size:13px;color:#98A2B3;font-variant-numeric:tabular-nums">Aug 20</span></td>\n<td align="right" style="padding:6px 0 6px 36px;border-bottom:1px solid #F2F4F7;"><span style="font-size:13px;font-weight:500;color:#101828;font-variant-numeric:tabular-nums">Oct 28</span></td>\n</tr>\n<tr>\n<td style="padding:6px 0;"><span style="font-size:13px;color:#101828">Extended returns</span></td>\n<td align="right" style="padding:6px 0;"><span style="font-size:13px;color:#98A2B3;font-variant-numeric:tabular-nums">Aug 20</span></td>\n<td align="right" style="padding:6px 0 6px 36px;"><span style="font-size:13px;font-weight:500;color:#101828;font-variant-numeric:tabular-nums">Feb 12</span></td>\n</tr>\n</table>\n<div style="font-size:12px;color:#475467;margin-top:7px;padding-top:7px;border-top:1px solid #EAECF0">Hits clients in <span style="font-weight:500;color:#101828">Clinch, Echols &amp; Brantley counties</span> \u2014 <span style="color:#2E368C;font-weight:500">see which of yours \u2192</span></div>\n</div>\n</a>\n</td></tr></table><p style="margin:0 0 24px">It&#39;s free while we&#39;re in beta. The next time a state quietly moves a date, you&#39;ll know that morning \u2014 and ${touchesHtml}.</p><div style="font-size:14px;font-weight:bold;color:#202124">Gigi</div><div style="font-size:12px;color:#9aa0a6;margin-top:1px">Co-Founder of DueDateHQ</div><div style="margin-top:10px"><a href="https://duedatehq.com" style="text-decoration:none"><img src="cid:wordmark" width="132" height="17" alt="DueDateHQ" style="display:block;border:0"></a></div><div style="font-size:12px;color:#5f6368;margin-top:8px">A new product from <a href="https://dify.ai" style="color:#2E368C;text-decoration:underline">Dify</a></div>${footerHtml}</div>'
      .replaceAll('${first}', first)
      .replaceAll('${touchesHtml}', touchesHtml)
      .replaceAll('${footerHtml}', footerHtml)
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

// ---- Alert template: per-state IRS disaster-relief postponement.
// Data from disaster-notices.json (each fact transcribed from the cited irs.gov release).
// HONEST per-state fill: uses only verified IRS facts (state, event, deadline, affected area,
// affected returns). No fabricated state-conformity dates. States with no live notice are skipped.
const NOTICES = ALERT
  ? JSON.parse(fs.readFileSync(val('--notices', 'disaster-notices.json'), 'utf8'))
  : []
const noticeForState = (abbr) => NOTICES.find((n) => n.abbr === (abbr || '').trim().toUpperCase())
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function buildAlert(r) {
  const n = noticeForState(r.State)
  if (!n) return null // no live disaster relief for this recipient's state
  const first = firstNameOf(r)
  const daysLeft = Math.ceil((new Date(`${n.deadline}T23:59:59Z`).getTime() - Date.now()) / 864e5)
  const daysLine = daysLeft > 0 ? `${daysLeft} days out` : 'due now'
  const forms = n.forms.join(' · ')
  const subject = `The IRS moved a filing deadline in ${n.state} to ${n.deadlineLabel}`
  const text = [
    `Hi ${first},`,
    `A filing deadline just moved in ${n.state}. After ${n.event.toLowerCase()}, the IRS postponed federal deadlines to ${n.deadlineLabel} for taxpayers in ${n.affectedArea}${daysLeft > 0 ? ` — ${daysLeft} days out` : ''}.`,
    ``,
    `If any of your clients file there, it covers: ${forms}.`,
    ``,
    `That's what DueDateHQ does — it watches the IRS, all 50 states and FEMA, and the moment a filing date moves it shows which of your clients it hits, with the official notice behind it. This ${n.state} change is live now: ${n.sourceHref}`,
    ``,
    `It's free while we're in beta. Next time a date moves in a state you file in, you'll know that morning.`,
    ``,
    `Gigi`,
    `Co-Founder of DueDateHQ`,
    `A new product from Dify (dify.ai) · duedatehq.com`,
  ].join('\n')
  const chips = n.forms
    .map(
      (f) =>
        `<span style="display:inline-block;font-size:12px;font-weight:bold;color:#2E368C;background:#F2F4FF;border:1px solid #DDE1F6;border-radius:6px;padding:3px 8px;margin:0 4px 4px 0">${esc(f)}</span>`,
    )
    .join('')
  const footerHtml = FOOTER_ADDRESS
    ? `<p style="margin:18px 0 0;font-size:11px;color:#9aa0a6">Facts from IRS ${esc(n.code)}. Not useful? Reply &quot;no thanks&quot; and I won&#39;t write again.<br>DueDateHQ · ${FOOTER_ADDRESS}</p>`
    : ''
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#202124;max-width:540px">' +
    `<p style="margin:0 0 14px"><span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:#14C5F6;vertical-align:middle"></span> <span style="font-size:11px;letter-spacing:.12em;font-weight:bold;color:#2E368C">DEADLINE ALERT · IRS DISASTER RELIEF</span></p>` +
    `<p style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;line-height:1.28;color:#1F315C">A filing deadline just moved in ${esc(n.state)}.</p>` +
    `<p style="margin:0 0 16px">After ${esc(n.event.toLowerCase())}, the IRS postponed federal deadlines to <b>${esc(n.deadlineLabel)}</b> for taxpayers in ${esc(n.affectedArea)}. If any of your clients file there, here&#39;s who it hits.</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 18px"><tr><td style="border:1px solid #EAECF0;border-radius:12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="background:#F9FAFB;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:8px 14px"><span style="font-size:11px;letter-spacing:.06em;font-weight:bold;color:#2E368C">${esc(n.state.toUpperCase())} · DISASTER RELIEF</span></td>` +
    `<td align="right" style="background:#F9FAFB;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:8px 14px"><span style="font-size:11px;color:#98A2B3">IRS ${esc(n.code)}</span></td>` +
    `</tr></table>` +
    `<div style="padding:13px 14px">` +
    `<div style="font-size:12px;color:#475467">Federal deadlines postponed to</div>` +
    `<div style="margin-top:2px"><span style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#101828">${esc(n.deadlineLabel)}</span> <span style="font-size:12px;color:#B54708;font-weight:bold">· ${daysLine}</span></div>` +
    `<div style="font-size:12px;color:#475467;margin-top:11px;padding-top:11px;border-top:1px solid #EAECF0">Affected area</div>` +
    `<div style="font-size:13px;color:#101828;margin-top:2px">${esc(n.affectedArea)}</div>` +
    `<div style="font-size:12px;color:#475467;margin-top:11px">Who it hits</div>` +
    `<div style="margin-top:6px">${chips}</div>` +
    `</div></td></tr></table>` +
    `<p style="margin:0 0 20px">That&#39;s what <a href="https://duedatehq.com" style="color:#2E368C;text-decoration:underline">DueDateHQ</a> does — it watches the IRS, all 50 states and FEMA, and the moment a filing date moves it shows which of your clients it hits, with the <a href="${esc(n.sourceHref)}" style="color:#2E368C;text-decoration:underline">official notice</a> behind it. Free while we&#39;re in beta.</p>` +
    `<a href="https://app.duedatehq.com/?lng=en" style="display:inline-block;background:#2E368C;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:11px 20px;border-radius:8px">See which of your clients this hits →</a>` +
    `<div style="font-size:14px;font-weight:bold;color:#202124;margin-top:24px">Gigi</div>` +
    `<div style="font-size:12px;color:#9aa0a6;margin-top:1px">Co-Founder of DueDateHQ</div>` +
    `<div style="font-size:12px;color:#5f6368;margin-top:6px">A new product from <a href="https://dify.ai" style="color:#2E368C;text-decoration:underline">Dify</a></div>` +
    footerHtml +
    '</div>'
  return { subject, text, html, attachments: [] }
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
  if (TOUCH === 1) ({ subject, text, html, attachments } = buildTouch1(r)) // touch 1 = locked v3 template (card + close); touches 2/3 stay plain-text from CSV

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
