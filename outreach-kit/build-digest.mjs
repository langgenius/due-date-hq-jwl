#!/usr/bin/env node
/**
 * build-digest.mjs — weekly "IRS deadline changes" digest builder (zero deps).
 *
 * Reads the verified dataset (disaster-notices.json — every fact transcribed from
 * the cited irs.gov release) and writes an email-ready HTML + plain-text digest to
 * ./digests/. It SENDS NOTHING — review the draft, then send to the subscriber
 * list (Resend broadcast, or a future --digest mode).
 *
 * Usage:
 *   node build-digest.mjs                 # "new" window = last 7 days
 *   node build-digest.mjs --days 10
 *   node build-digest.mjs --date 2026-07-16   # pretend today (for testing)
 *
 * Design follows the alert email: system sans, navy on links only, weights
 * 400/500 with a single 600 title, amber urgency only when a deadline is ≤30d.
 */
import fs from 'node:fs'

const args = process.argv.slice(2)
const val = (f, d) => {
  const i = args.indexOf(f)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}
const DAYS = parseInt(val('--days', '7'), 10)
const TODAY = val('--date', null) ? new Date(`${val('--date')}T12:00:00Z`) : new Date()

const notices = JSON.parse(
  fs.readFileSync(new URL('./disaster-notices.json', import.meta.url), 'utf8'),
)

const live = notices
  .filter((n) => new Date(`${n.deadline}T23:59:59Z`) >= TODAY)
  .toSorted((a, b) => (a.deadline < b.deadline ? -1 : 1))
const daysOut = (n) => Math.ceil((new Date(`${n.deadline}T23:59:59Z`) - TODAY) / 864e5)
const fresh = live.filter((n) => {
  if (!n.issuedOn) return false
  const d = new Date(n.issuedOn)
  return !Number.isNaN(d) && (TODAY - d) / 864e5 <= DAYS
})
const soon = live.filter((n) => daysOut(n) <= 30)

const fmt = (d) =>
  d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
const dateLabel = fmt(TODAY)
const iso = TODAY.toISOString().slice(0, 10)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---- shared bits (mirrors the alert email design language) ----
const badge = (abbr) =>
  `<span style="display:inline-block;min-width:23px;text-align:center;font-size:11px;font-weight:600;color:#2E368C;background:#EEF1FB;border:1px solid #D5DBF3;border-radius:6px;padding:2px 5px;margin-right:8px;vertical-align:middle">${esc(abbr)}</span>`
const pill = (n) => {
  const d = daysOut(n)
  const css =
    d <= 30
      ? 'color:#B54708;background:#FFFAEB;border:1px solid #FEDF89'
      : 'color:#475467;background:#F2F4F7;border:1px solid #E4E7EC'
  return `<span style="display:inline-block;font-size:12px;${css};border-radius:999px;padding:3px 10px;white-space:nowrap">${d} days out</span>`
}
const card = (n) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 14px"><tr><td style="border:1px solid #E4E7EC;border-radius:12px">` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
  `<td style="background:#FCFCFD;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:9px 15px">${badge(n.abbr)}<span style="font-size:12px;font-weight:500;color:#344054;vertical-align:middle">${esc(n.state)} · ${esc(n.event)}</span></td>` +
  `<td align="right" style="background:#FCFCFD;border-bottom:1px solid #EAECF0;border-radius:12px 12px 0 0;padding:9px 15px"><span style="font-size:11px;color:#98A2B3;font-variant-numeric:tabular-nums;white-space:nowrap">IRS ${esc(n.code)}</span></td>` +
  `</tr></table>` +
  `<div style="padding:13px 15px 15px">` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
  `<td valign="middle"><span style="font-size:12px;color:#475467">Postponed to </span><span style="font-size:19px;font-weight:500;color:#101828;font-variant-numeric:tabular-nums">${esc(n.deadlineLabel)}</span></td>` +
  `<td align="right" valign="middle">${pill(n)}</td>` +
  `</tr></table>` +
  `<div style="font-size:12px;color:#667085;margin-top:8px">${esc(n.affectedArea)} · <a href="${esc(n.sourceHref)}" style="color:#2E368C;text-decoration:underline">IRS notice</a></div>` +
  `</div></td></tr></table>`
const row = (n) =>
  `<tr>` +
  `<td style="padding:8px 0;border-bottom:1px solid #F2F4F7">${badge(n.abbr)}<span style="font-size:13px;color:#101828;vertical-align:middle">${esc(n.event)}</span></td>` +
  `<td align="right" style="padding:8px 0 8px 14px;border-bottom:1px solid #F2F4F7;white-space:nowrap"><span style="font-size:13px;font-weight:500;color:#101828;font-variant-numeric:tabular-nums">${esc(n.deadlineLabel)}</span> <span style="font-size:12px;color:#98A2B3;font-variant-numeric:tabular-nums">· ${esc(n.code)}</span></td>` +
  `</tr>`
const section = (title, body) =>
  `<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#98A2B3;font-weight:500;margin:26px 0 12px">${title}</div>` +
  body

// ---- HTML ----
let html =
  '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#475467;max-width:520px;padding-top:16px">' +
  `<div style="margin:0 0 24px;padding-bottom:15px;border-bottom:1px solid #EAECF0"><a href="https://duedatehq.com" style="text-decoration:none;font-size:15px;font-weight:600;color:#101828;letter-spacing:-.02em">DueDateHQ</a></div>` +
  `<p style="margin:0 0 6px;font-size:20px;line-height:1.35;font-weight:600;color:#101828;letter-spacing:-.015em">This week in IRS deadline changes</p>` +
  `<p style="margin:0 0 4px;font-size:13px;color:#667085">${dateLabel} · ${live.length} live postponement${live.length === 1 ? '' : 's'} · every date verified against the irs.gov release</p>`

html += fresh.length
  ? section(`New this week (${fresh.length})`, fresh.map(card).join(''))
  : section(
      'New this week',
      `<p style="margin:0;font-size:13px;color:#667085">No new IRS disaster-relief postponements in the last ${DAYS} days.</p>`,
    )

if (soon.length)
  html += section(`Coming due within 30 days (${soon.length})`, soon.map(card).join(''))

const rest = live.filter((n) => !soon.includes(n) && !fresh.includes(n))
if (rest.length)
  html += section(
    `Also live (${rest.length})`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rest.map(row).join('')}</table>`,
  )

html +=
  `<p style="margin:26px 0 0;color:#475467">DueDateHQ watches every IRS and state deadline and tells you which of your clients each change affects — <a href="https://duedatehq.com/irs-disaster-relief" style="color:#2E368C;text-decoration:underline">current notices</a> · <a href="https://app.duedatehq.com/?lng=en" style="color:#2E368C;text-decoration:underline">see your affected clients</a>.</p>` +
  `<p style="margin:20px 0 0;font-size:10px;line-height:1.5;color:#98A2B3">You asked for deadline-change alerts from DueDateHQ. Not useful? Reply "no thanks" and we won't write again.<br>DueDateHQ · 548 Market St PMB 60083, San Francisco, CA 94104</p>` +
  '</div>'

// ---- text ----
const tLine = (n) =>
  `- ${n.abbr} · ${n.event} — postponed to ${n.deadlineLabel} (${daysOut(n)} days out) · IRS ${n.code}\n  ${n.affectedArea}\n  ${n.sourceHref}`
let text = `This week in IRS deadline changes — ${dateLabel}\n${live.length} live postponements · every date verified against the irs.gov release\n\n`
text += fresh.length
  ? `NEW THIS WEEK (${fresh.length})\n${fresh.map(tLine).join('\n')}\n\n`
  : `NEW THIS WEEK\nNo new IRS disaster-relief postponements in the last ${DAYS} days.\n\n`
if (soon.length)
  text += `COMING DUE WITHIN 30 DAYS (${soon.length})\n${soon.map(tLine).join('\n')}\n\n`
if (rest.length)
  text += `ALSO LIVE (${rest.length})\n${rest.map((n) => `- ${n.abbr} · ${n.event} — ${n.deadlineLabel} · IRS ${n.code}`).join('\n')}\n\n`
text += `Current notices: https://duedatehq.com/irs-disaster-relief\nSee your affected clients: https://app.duedatehq.com/?lng=en\n\nYou asked for deadline-change alerts from DueDateHQ. Not useful? Reply "no thanks" and we won't write again.\nDueDateHQ · 548 Market St PMB 60083, San Francisco, CA 94104\n`

fs.mkdirSync(new URL('./digests/', import.meta.url), { recursive: true })
const base = new URL(`./digests/digest-${iso}`, import.meta.url).pathname
fs.writeFileSync(`${base}.html`, html)
fs.writeFileSync(`${base}.txt`, text)
console.log(`digest ${dateLabel}: live=${live.length} new=${fresh.length} due-soon=${soon.length}`)
console.log(
  `wrote ${base}.html and .txt — review, then send to the subscriber list. Nothing was sent.`,
)
console.log(
  `suggested subject: IRS deadline changes this week — ${fresh.length ? fresh.map((n) => n.abbr).join(', ') + ' new' : 'no new relief'} · ${dateLabel}`,
)
