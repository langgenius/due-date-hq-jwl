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
// Calendar-day count, noon-to-noon — avoids the +1 overcount a 23:59 deadline gives ceil().
const todayNoon = new Date(`${TODAY.toISOString().slice(0, 10)}T12:00:00Z`)
const daysOut = (n) => Math.round((new Date(`${n.deadline}T12:00:00Z`) - todayNoon) / 864e5)
const fresh = live.filter((n) => {
  if (!n.issuedOn) return false
  const d = new Date(n.issuedOn)
  return !Number.isNaN(d) && (TODAY - d) / 864e5 <= DAYS
})
const soon = live.filter((n) => daysOut(n) <= 30)
// Urgency tiers drive the information hierarchy: act-now (≤14d) > this-month (15–30d) > further out.
const URGENT_DAYS = 14
const urgent = soon.filter((n) => daysOut(n) <= URGENT_DAYS)
const thisMonth = soon.filter((n) => daysOut(n) > URGENT_DAYS)
const nearest = soon[0] // soonest (for the subject line)

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
const CAP = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
const spell = (k) => CAP[k] ?? String(k) // spell small counts so a sentence never starts with a digit
// Brand wordmark as a data-URI (renders in preview + most clients; falls back to alt text).
const LOGO_URI = fs.existsSync(new URL('./wordmark-2x.png', import.meta.url))
  ? `data:image/png;base64,${fs.readFileSync(new URL('./wordmark-2x.png', import.meta.url)).toString('base64')}`
  : null

// ---- minimal design system: one ink, one gray, one accent, one hairline.
// Hierarchy comes from type + whitespace, not from color/borders/stripes. ----
const C = {
  ink: '#1a1a1a', // primary text
  sub: '#5b6270', // eyebrows / labels
  mut: '#8a8f98', // secondary detail
  acc: '#2e368c', // brand accent (links only)
  line: '#ececec', // hairline
  bg: '#f4f4f5', // page background
  card: '#ffffff', // content card
}
// tier label: uppercase eyebrow, hugging the content below it (big gap above, small below)
const eyebrow = (t) =>
  `<p style="margin:28px 0 8px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${C.sub}">${t}</p>`
// one notice block for every tier; urgency shows only as the day-count's weight, nothing else
// state is the only bold anchor; date + countdown share one weight (no bold-normal-bold).
// urgency is a value shift, not a weight clash: the meta line is ink for act-now, muted otherwise.
// "Your move" — the action a CPA takes on an act-now deadline, derived from the notice facts.
const shortDate = (n) => n.deadlineLabel.replace(/,\s*\d{4}$/, '')
const yourMove = (n) => `Your move: confirm each covered ${n.state} filing is set for ${shortDate(n)}.`
// Anatomy: [state (bold) + date·countdown (light)] with the IRS source right-aligned on the
// same line; event (muted) and "Clients in …" (one step darker) on their own lines; for
// act-now items an understated "→ Your move" line tucked right under.
// A descending ladder — each line one step lighter and smaller, so the block reads in order
// instead of clumping: ① state(600)+date(400) in ink, countdown gray, source right
// ② Clients in … (decision info, sub 14px) ③ event (background, mut 13px)
// ④ urgent only: a short "→ Your move" (mut 13px).
const block = (n, urgent) =>
  `<div style="margin:0 0 18px">` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
  `<td style="font-size:15px;line-height:1.5;color:${C.ink}"><span style="font-weight:600">${esc(n.state)}</span> &nbsp;${esc(n.deadlineLabel)} <span style="color:${C.mut}">&middot; ${daysOut(n)} days out</span></td>` +
  `<td align="right" valign="top" style="font-size:13px;line-height:1.7;white-space:nowrap"><a href="${esc(n.sourceHref)}" style="color:${C.acc};text-decoration:none">IRS ${esc(n.code)} &rarr;</a></td>` +
  `</tr></table>` +
  // one paragraph unit, narrative order (event → coverage), same size/value; the
  // decision phrase (the covered area) is anchored by italics, not by color/weight.
  `<p style="margin:4px 0 0;font-size:14px;line-height:1.5;color:${C.sub}">${esc(n.event)}.<br>Covers clients in <em>${esc(n.affectedAreaShort ?? n.affectedArea)}</em>.</p>` +
  (urgent
    ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${C.mut}">&rarr;&nbsp; ${esc(yourMove(n))}</p>`
    : '') +
  `</div>`

// Opening line — orient the reader with tier counts; the blocks below carry the detail.
const openHook = urgent.length
  ? `${spell(urgent.length)} IRS deadline${urgent.length === 1 ? '' : 's'} need${urgent.length === 1 ? 's' : ''} your attention in the next two weeks${thisMonth.length ? ` — ${spell(thisMonth.length).toLowerCase()} more land${thisMonth.length === 1 ? 's' : ''} this month` : ''}.`
  : soon.length
    ? `${spell(soon.length)} IRS deadline${soon.length === 1 ? '' : 's'} come${soon.length === 1 ? 's' : ''} due this month.`
    : fresh.length
      ? `The IRS postponed deadlines in ${fresh.map((n) => n.state).join(', ')} this week.`
      : `A quiet week — nothing new, and nothing federal due in the next 30 days.`

const rest = live.filter((n) => !soon.includes(n)) // further out (>30 days)
// "Also active" grouped by deadline: "Arizona, Montana — Sept. 28" per line.
const restByDate = []
for (const n of rest) {
  let g = restByDate.find((x) => x.date === n.deadlineLabel)
  if (!g) {
    g = { date: n.deadlineLabel, states: [] }
    restByDate.push(g)
  }
  if (!g.states.includes(n.state)) g.states.push(n.state)
}

// ---- HTML (minimal: one ink / one gray / one accent; type + whitespace do the work) ----
let html =
  `<div style="background:${C.bg};padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">` +
  `<div style="max-width:536px;margin:0 auto;background:${C.card};border-radius:12px;padding:30px 34px 26px;font-size:15px;line-height:1.55;color:${C.ink};box-shadow:0 1px 3px rgba(16,24,40,.05)">` +
  // Letter-style: an audience kicker (memo "To:"-style), then the lead. No logo header.
  `<p style="margin:0 0 7px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${C.sub}">For CPAs with US clients</p>` +
  `<p style="margin:0;font-size:18px;line-height:1.4;font-weight:600;letter-spacing:-.01em;color:${C.ink}">${esc(openHook)}</p>` +
  `<p style="margin:6px 0 0;font-size:13px;color:${C.mut}">${dateLabel} &middot; verified against the irs.gov release</p>`

if (urgent.length) html += eyebrow('Next two weeks') + urgent.map((n) => block(n, true)).join('')
if (thisMonth.length) html += eyebrow('This month') + thisMonth.map((n) => block(n, false)).join('')
if (restByDate.length)
  html +=
    eyebrow('Further out') +
    `<p style="margin:0;font-size:14px;line-height:1.75;color:${C.mut}">${restByDate
      .map((g) => `<span style="color:${C.sub};font-weight:600">${esc(g.date)}</span> &nbsp; ${esc(g.states.join(', '))}`)
      .join('<br>')}</p>`

html +=
  `<div style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${C.line}">` +
  `<p style="margin:0;font-size:14px;line-height:1.55;color:${C.ink}">You shouldn't have to watch the IRS to protect your clients &mdash; DueDateHQ does it for you, across the IRS, all 50 states, DC and FEMA, naming the exact clients each change hits, with the source on every date. Next time a deadline moves, you'll know exactly who.</p>` +
  `<p style="margin:10px 0 0;font-size:15px"><a href="https://app.duedatehq.com/?lng=en" style="color:${C.acc};text-decoration:none;font-weight:500">See your affected clients &rarr;</a></p>` +
  // letter sign-off
  `<p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:${C.ink}">Gigi<br><span style="color:${C.mut}">Co-Founder of DueDateHQ</span></p>` +
  // small logo, moved to the bottom (links to the product); tagline beneath
  (LOGO_URI
    ? `<a href="https://duedatehq.com" style="text-decoration:none"><img src="${LOGO_URI}" alt="DueDateHQ" width="93" height="12" style="display:block;border:0;margin:18px 0 0"></a>`
    : `<p style="margin:18px 0 0;font-size:14px;font-weight:700"><a href="https://duedatehq.com" style="color:${C.acc};text-decoration:none">DueDateHQ</a></p>`) +
  `<p style="margin:6px 0 0;font-size:12px;color:${C.mut}">Rule-change monitoring for US CPA firms &middot; a new product from <a href="https://dify.ai" style="color:${C.mut};text-decoration:underline">Dify</a></p>` +
  `<p style="margin:14px 0 0;font-size:11px;line-height:1.55;color:${C.mut}">You're getting this because you're a US CPA firm and IRS deadline changes hit your clients' filings. Reply "no thanks" and we won't write again.<br>DueDateHQ &middot; 548 Market St PMB 60083, San Francisco, CA 94104</p>` +
  `</div>` + // close footer group
  `</div>` + // close content card
  '</div>' // close page background

// ---- text ----
const tLine = (n) =>
  `${n.state} · ${n.deadlineLabel} — ${daysOut(n)} days out\n  ${n.event}. Clients in ${n.affectedAreaShort ?? n.affectedArea}.\n  IRS ${n.code}: ${n.sourceHref}`
let text = `FOR CPAs WITH US CLIENTS\nThis week in IRS deadline changes — ${dateLabel}\n\n${openHook}\nEvery date verified against the irs.gov release.\n\n`
if (urgent.length)
  text += `NEXT TWO WEEKS\n${urgent.map((n) => `${tLine(n)}\n  ${yourMove(n)}`).join('\n')}\n\n`
if (thisMonth.length) text += `Also coming due this month\n${thisMonth.map(tLine).join('\n')}\n\n`
if (restByDate.length)
  text += `Active, further out\n${restByDate.map((g) => `${g.states.join(', ')} — ${g.date}`).join('\n')}\n\n`
text += `You run the firm; DueDateHQ catches the rule change — the moment the IRS, a state, or FEMA moves a deadline — and names the clients in your book it hits, with the source on every date.\nSee your affected clients: https://app.duedatehq.com/?lng=en\n\n—\nGigi\nCo-Founder of DueDateHQ\nDueDateHQ · a new product from Dify (dify.ai)\n\nYou're getting this because you're a US CPA firm and IRS deadline changes hit your clients' filings. Reply "no thanks" and we won't write again.\nDueDateHQ · 548 Market St PMB 60083, San Francisco, CA 94104\n`

fs.mkdirSync(new URL('./digests/', import.meta.url), { recursive: true })
const base = new URL(`./digests/digest-${iso}`, import.meta.url).pathname
fs.writeFileSync(`${base}.html`, html)
fs.writeFileSync(`${base}.txt`, text)
console.log(`digest ${dateLabel}: live=${live.length} new=${fresh.length} due-soon=${soon.length}`)
console.log(
  `wrote ${base}.html and .txt — review, then send to the subscriber list. Nothing was sent.`,
)
// Subject = a question that makes a CPA scan their own book ("any clients in …?") +
// the stakes. No state-name lead (filters out 34 other states), no date-stamp tail.
const subject = fresh.length
  ? `New IRS relief in ${fresh.map((n) => n.abbr).join(', ')} — any clients there?`
  : soon.length
    ? `Any clients in ${soon.map((n) => n.abbr).join(', ')}? ${spell(soon.length)} IRS deadline${soon.length === 1 ? '' : 's'} land${soon.length === 1 ? 's' : ''} within 30 days`
    : `IRS deadline monitor — all quiet this week`
fs.writeFileSync(`${base}.subject.txt`, subject)
console.log(`suggested subject: ${subject}`)
