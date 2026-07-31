#!/usr/bin/env node
/**
 * DueDateHQ — newsletter-outreach TEST sender (zero deps, Node 18+, Resend REST API)
 *
 * Sends the two newsletter-outreach variants (see newsletter-outreach-pack.md)
 * to a single inbox for review — verbatim what the real recipients would get:
 *   1. Template A (creator) as it would go to Jason Staats
 *   2. Template B (publication) as it would go to AICPA ad sales / The Tax Adviser
 *
 * Plain text only — these are one-to-one sponsorship/media-kit inquiries, not
 * bulk sends, so no HTML card and no CAN-SPAM footer.
 *
 * USAGE
 *   RESEND_API_KEY=re_xxx node send-newsletter-test.mjs --to you@example.com --send
 *   (omit --send for a dry run; FROM defaults to "Gigi <gigi@duedatehq.com>")
 */
const args = process.argv.slice(2)
const val = (f, d) => {
  const i = args.indexOf(f)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}
const SEND = args.includes('--send')
const TO = val('--to', null)
const FROM = process.env.FROM || 'Gigi <gigi@duedatehq.com>'
const KEY = process.env.RESEND_API_KEY
if (!TO) {
  console.error('ERROR: --to is required')
  process.exit(1)
}
if (SEND && !KEY) {
  console.error('ERROR: set RESEND_API_KEY to send. (Dry run works without it.)')
  process.exit(1)
}

const emails = [
  {
    label: 'Template A (creator) — as to Jason Staats',
    subject: "sponsoring an issue of What's Next For Accounting?",
    text: `Hi Jason,

I read What's Next For Accounting? every week — the no-vendor-fluff take is why.

I'm the co-founder of DueDateHQ. We watch the IRS, all 50 states, and FEMA for filing-deadline changes, and show you which clients each one hits. Every date links to its official notice, or we hold it back — no guessing. It's built for the small firms who read you.

Would you consider a sponsored mention or classified? I'd rather you try it first — happy to set you up free.

Thanks for the work you put in, either way.

Gigi
https://duedatehq.com/`,
  },
  {
    label: 'Template B (publication) — as to AICPA ad sales (The Tax Adviser)',
    subject: 'Media kit request — newsletter advertising',
    text: `Hi team,

I'd like to advertise in The Tax Adviser. I'm the co-founder of DueDateHQ — we monitor filing-deadline changes for US CPA firms (IRS, all 50 states, and FEMA) and flag which clients each change hits.

Could you send your newsletter rates and media kit? I'm interested in e-blasts and in-newsletter placements.

Thanks,
Gigi
DueDateHQ
https://duedatehq.com/`,
  },
]

for (const e of emails) {
  if (!SEND) {
    console.log(`[DRY] → ${TO}  "${e.subject}"  (${e.label})`)
    continue
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject: e.subject, text: e.text }),
  })
  if (!res.ok) {
    console.error(`✗ FAIL "${e.subject}": ${res.status} ${await res.text()}`)
    continue
  }
  console.log(`✓ sent "${e.subject}"  (${e.label})  id=${(await res.json()).id}`)
  await new Promise((r) => setTimeout(r, 2000))
}
if (!SEND) console.log('Dry run only — add --send to actually send.')
