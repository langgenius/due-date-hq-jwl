import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { toolContent } from './tool-content.mjs'
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(base + '/cpa-tools-directory.html', 'utf8')
const DATE = '2026-07-22'
const ORIGIN = 'https://cpafieldguide.com'

// ---- extract shared parts by index (avoids nested-div regex pitfalls) ----
let style = (src.match(/<style>[\s\S]*?<\/style>/) || [''])[0]
const iStyleEnd = src.indexOf('</style>') + '</style>'.length
let fullBody = src.slice(iStyleEnd).trim()

// ---- auto-wire real logo/screenshot files when present (deploy/logos/<slug>.*, deploy/shots/<slug>.*) ----
// Drop a file named by the tool slug and it renders; otherwise the branded panel/tile shows. No HTML edits.
function assetMap(dir) {
  const d = resolve(base, 'deploy', dir)
  if (!existsSync(d)) return {}
  const m = {}
  for (const f of readdirSync(d)) {
    if (f.startsWith('.') || /readme/i.test(f) || /gitkeep/i.test(f)) continue
    m[f.replace(/\.[^.]+$/, '').toLowerCase()] = f
  }
  return m
}
const logos = assetMap('logos')
const shots = assetMap('shots')
const detailShots = assetMap('detail-shots') // real product screenshots, shown only on tool detail pages
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
fullBody = fullBody.replace(/<article class="card"[\s\S]*?<\/article>/g, (card) => {
  const nm = (card.match(/<div class="name">([^<]+)<\/div>/) || [])[1]
  if (!nm) return card
  const s = slugify(nm)
  if (logos[s])
    card = card.replace(
      '<img class="asset logo-img">',
      `<img class="asset logo-img" src="logos/${logos[s]}">`,
    )
  // Screenshot slot: render only when a real capture exists (deploy/shots/<slug>.*).
  // Until then, drop the whole panel rather than show an empty monogram placeholder.
  if (shots[s])
    card = card.replace(
      '<img class="asset shot-img">',
      `<img class="asset shot-img" src="shots/${shots[s]}">`,
    )
  else card = card.replace(/\s*<div class="shot"[\s\S]*?<\/div>\s*/, '')
  return card
})
// wrap each card's tool name in a link to its detail page (internal linking)
fullBody = fullBody.replace(
  /<div class="name">([^<]+)<\/div>/g,
  (m, n) => `<div class="name"><a class="namelink" href="/tools/${slugify(n)}">${n}</a></div>`,
)
const topbar = fullBody
  .slice(fullBody.indexOf('<div class="topbar">'), fullBody.indexOf('<header>'))
  .trim()
const method = fullBody
  .slice(fullBody.indexOf('<div class="method">'), fullBody.indexOf('<footer>'))
  .trim()
const footer = fullBody
  .slice(fullBody.indexOf('<footer>'), fullBody.indexOf('</footer>') + '</footer>'.length)
  .trim()
const sections = {}
;(fullBody.match(/<section class="section"[\s\S]*?<\/section>/g) || []).forEach((s) => {
  const m = s.match(/data-cat="(\w+)"/)
  if (m) sections[m[1]] = s
})

// ---- extra CSS for nav / breadcrumb / sibling links ----
const navCss = `
  /* multi-page nav — underline tabs, matching the homepage section nav */
  .catnav { border-bottom: 1px solid var(--line); background: var(--bg); }
  .catnav .wrap { display: flex; flex-wrap: wrap; align-items: stretch; gap: 2px; padding: 0 24px; min-height: 44px; font-family: -apple-system, sans-serif; margin-left: 0; }
  .catnav a { display: inline-flex; align-items: center; font-size: 13px; font-weight: 500; color: var(--soft); text-decoration: none; padding: 0 10px; border-bottom: 2px solid transparent; }
  .catnav a:hover { color: var(--ink); }
  .catnav a[aria-current="page"] { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
  .crumb { font-family: -apple-system, sans-serif; font-size: 12px; color: var(--faint); padding: 16px 0 0; }
  .crumb a { color: var(--soft); text-decoration: none; }
  .crumb a:hover { text-decoration: underline; }
  .cat-more { font-family: -apple-system, sans-serif; font-size: 13px; font-weight: 600; color: var(--info); text-decoration: none; margin-left: auto; white-space: nowrap; }
  .cat-more:hover { text-decoration: underline; }
  .cat-head h1 { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
  .cat-head .viewtoggle.catview { flex: none; margin-left: 12px; }
  .sibnav { border-top: 1px solid var(--line); margin-top: 40px; }
  .sibnav .wrap { padding: 24px 24px 6px; font-family: -apple-system, sans-serif; }
  .sibnav h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--faint); margin: 0 0 10px; font-weight: 700; }
  .sibnav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px; }
  .sibnav a { font-size: 14px; color: var(--info); text-decoration: none; }
  .sibnav a:hover { text-decoration: underline; }
  /* internal links + tool/guide pages */
  .namelink { color: inherit; text-decoration: none; }
  .namelink:hover { text-decoration: underline; }
  .toolhero { display: flex; align-items: center; gap: 14px; margin: 4px 0 2px; }
  .logo-lg { width: 54px; height: 54px; font-size: 20px; border-radius: 12px; }
  .toolshot { margin: 6px 0 26px; max-width: 760px; }
  .toolshot img { width: 100%; height: auto; display: block; border: 1px solid var(--line); border-radius: 10px; }
  .toolshot figcaption { font-family: -apple-system, sans-serif; font-size: 12px; color: var(--faint); margin-top: 9px; }
  .toolhero h1 { margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; }
  .toolsub { font-family: -apple-system, sans-serif; font-size: 13px; color: var(--faint); margin-top: 3px; }
  .toollede { font-family: -apple-system, sans-serif; font-size: 16px; line-height: 1.5; color: var(--soft); max-width: 66ch; margin: 12px 0 22px; }
  .facts { border-collapse: collapse; width: 100%; max-width: 640px; font-family: -apple-system, sans-serif; margin: 0 0 22px; }
  .facts th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: 700; padding: 11px 16px 11px 0; vertical-align: top; white-space: nowrap; width: 118px; border-top: 1px solid var(--line); }
  .facts td { font-size: 14px; color: var(--ink); padding: 11px 0; border-top: 1px solid var(--line); }
  .facts a { color: var(--info); text-decoration: none; }
  .facts a:hover { text-decoration: underline; }
  .muted { color: var(--faint); }
  .toolsection { font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.55; color: var(--soft); max-width: 66ch; margin: 0 0 22px; }
  .toolsection a { color: var(--info); }
  .revh2 { font-size: 20px; font-weight: 600; letter-spacing: -0.01em; margin: 34px 0 10px; }
  .proscons { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0 36px; max-width: 760px; margin: 0 0 10px; font-family: -apple-system, sans-serif; }
  .proscons h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; margin: 10px 0 2px; color: var(--faint); }
  .proscons ul { list-style: none; margin: 0; padding: 0; }
  .proscons li { font-size: 14px; line-height: 1.5; color: var(--soft); padding: 8px 0 8px 20px; position: relative; border-top: 1px solid var(--line); }
  .proscons li:first-child { border-top: 0; }
  .pc-pro li::before { content: "+"; position: absolute; left: 2px; font-weight: 700; color: var(--open, #2e9960); }
  .pc-con li::before { content: "\\2212"; position: absolute; left: 2px; font-weight: 700; color: var(--faint); }
  .usecase { max-width: 66ch; font-family: -apple-system, sans-serif; margin: 0 0 6px; }
  .usecase h3 { font-size: 15px; font-weight: 600; margin: 18px 0 4px; }
  .usecase p { font-size: 14px; line-height: 1.55; color: var(--soft); margin: 0; }
  .verdict { max-width: 66ch; font-family: -apple-system, sans-serif; border-left: 3px solid var(--accent); padding: 2px 0 2px 16px; margin: 12px 0 26px; }
  .verdict p { font-size: 15px; line-height: 1.6; color: var(--ink); margin: 0; }
  .disclose { max-width: 66ch; font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; color: var(--faint); border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; margin: 0 0 22px; }
  .gh1 { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; margin: 8px 0 6px; }
  .gh { font-size: 17px; font-weight: 600; margin: 26px 0 2px; }
  .toollist { font-family: -apple-system, sans-serif; list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 8px; }
  .toollist a { color: var(--info); text-decoration: none; font-weight: 600; font-size: 15px; }
  .toollist a:hover { text-decoration: underline; }
  .guides { border-top: 1px solid var(--line); background: var(--bg); }
  .guides .wrap { padding: 32px 24px; font-family: -apple-system, sans-serif; }
  .guides h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--faint); font-weight: 700; margin: 0 0 14px; }
  .guidelinks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 11px 32px; max-width: 760px; }
  .guidelinks a { display: inline-flex; align-items: center; gap: 7px; font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 500; color: var(--accent); text-decoration: none; }
  .guidelinks a::after { content: "\\2192"; color: var(--faint); transition: transform 0.15s ease; }
  .guidelinks a:hover { text-decoration: underline; }
  .guidelinks a:hover::after { transform: translateX(3px); }
  .footnav { border-top: 1px solid var(--line); background: var(--bg); }
  .footnav .wrap { padding: 24px 24px 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px 22px; font-family: -apple-system, sans-serif; }
  .footnav h3 { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); margin: 0 0 8px; font-weight: 700; }
  .footnav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
  .footnav a { font-size: 13px; color: var(--soft); text-decoration: none; }
  .footnav a:hover { color: var(--ink); text-decoration: underline; }
  .tablewrap { overflow-x: auto; margin: 10px 0 26px; border: 1px solid var(--line); border-radius: 10px; }
  .cmp { border-collapse: collapse; width: 100%; min-width: 660px; font-family: -apple-system, sans-serif; font-size: 14px; }
  .cmp th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: 700; padding: 11px 14px; background: var(--accent-soft); border-bottom: 1px solid var(--line); white-space: nowrap; position: sticky; top: 0; }
  .cmp td { padding: 11px 14px; border-bottom: 1px solid var(--line); color: var(--soft); vertical-align: top; }
  .cmp tbody tr:last-child td { border-bottom: none; }
  .cmp tbody tr:hover { background: var(--accent-soft); }
  .cmp td:first-child a { color: var(--accent); text-decoration: none; font-weight: 600; }
  .cmp td:first-child a:hover { text-decoration: underline; }
  .cmp.vs thead th a { color: var(--accent); text-decoration: none; }
  .cmp.vs tbody th { background: transparent; color: var(--ink); font-weight: 600; text-transform: none; letter-spacing: 0; font-size: 12px; white-space: nowrap; position: static; }
</style>`
style = style.replace('</style>', navCss)

const cats = [
  {
    key: 'tax',
    slug: 'tax-preparation-software',
    label: 'Tax Preparation',
    nav: 'Tax prep',
    n: 7,
    title: 'Tax Preparation Software for CPA Firms (2026) — CPA Field Guide',
    desc: 'Professional tax preparation software for US CPA firms: Drake, Lacerte, ProConnect, ProSeries, UltraTax CS, CCH Axcess, and ATX — what each does, who it fits, and how open it is to integration.',
  },
  {
    key: 'monitor',
    slug: 'deadline-monitoring-software',
    label: 'Deadline & Compliance Tracking',
    nav: 'Deadlines & Monitoring',
    n: 3,
    title: 'Tax Due Date & Deadline Tracking Software — CPA Field Guide',
    desc: 'Due date tracking and deadline monitoring software for CPA firms: File In Time, DueDateHQ, and ONESOURCE Calendar — passive due-date trackers versus active monitors that watch the IRS, states, and FEMA.',
  },
  {
    key: 'pm',
    slug: 'practice-management-software',
    label: 'Practice Management',
    nav: 'Practice mgmt',
    n: 10,
    title: 'Accounting Practice Management Software — CPA Field Guide',
    desc: 'Practice management and workflow software for accounting firms: Karbon, TaxDome, Canopy, Financial Cents, Jetpack Workflow, Keeper, Firm360, Pixie, Aiwyn, and Ignition — features, firm-size fit, and API openness.',
  },
  {
    key: 'ledger',
    slug: 'accounting-software',
    label: 'Accounting & Bookkeeping',
    nav: 'Bookkeeping',
    n: 5,
    title: 'Accounting & Bookkeeping Software for CPA Firms — CPA Field Guide',
    desc: 'General-ledger and bookkeeping software CPA firms use: QuickBooks Online, Xero, Bill.com, Sage, and the Intuit ProAdvisor channel — and how each connects to the rest of the firm stack.',
  },
]
// ---- per-tool data (parsed from the already-built cards) for detail pages ----
const officialUrl = {
  'Drake Tax': 'https://www.drakesoftware.com',
  Lacerte: 'https://accountants.intuit.com/tax/lacerte/',
  ProConnect: 'https://accountants.intuit.com/tax/proconnect/',
  ProSeries: 'https://accountants.intuit.com/tax/proseries/',
  'UltraTax CS': 'https://tax.thomsonreuters.com/us/en/cs-professional-suite/ultratax-cs',
  'CCH Axcess': 'https://www.wolterskluwer.com/en/solutions/cch-axcess/tax',
  ATX: 'https://www.wolterskluwer.com/en/solutions/atx',
  'File In Time': 'https://www.timevalue.com/file-in-time',
  DueDateHQ: 'https://duedatehq.com',
  'ONESOURCE Calendar': 'https://tax.thomsonreuters.com/en/onesource/workflow-manager/calendar',
  Karbon: 'https://karbonhq.com',
  TaxDome: 'https://taxdome.com',
  Canopy: 'https://www.getcanopy.com',
  'Financial Cents': 'https://financial-cents.com',
  'Jetpack Workflow': 'https://jetpackworkflow.com',
  Keeper: 'https://keeper.app',
  Firm360: 'https://www.myfirm360.com',
  Pixie: 'https://www.usepixie.com',
  Aiwyn: 'https://www.aiwyn.ai',
  Ignition: 'https://www.ignitionapp.com',
  'QuickBooks Online': 'https://quickbooks.intuit.com',
  Xero: 'https://www.xero.com',
  'Bill.com': 'https://www.bill.com',
  Sage: 'https://www.sage.com',
  ProAdvisor: 'https://quickbooks.intuit.com/accountants/proadvisor/',
}
const openExplain = {
  'd-open':
    'It offers a self-serve public API, so it is among the easiest tools here to connect to.',
  'd-gated':
    'It has an API, but access is gated behind approval, a partner program, or a higher plan.',
  'd-zap': 'It has no direct API; it connects to other tools through Zapier.',
  'd-closed': 'It has no public API; data moves in and out by file export.',
  'd-info': 'It has no public API yet.',
}
// clarify the integration tag into one consistent vocabulary that matches the legend, and
// neutralize the colored logo-tile inline styles so real favicons sit on a clean white tile
// (kills the colored "ring" around each logo). Applied before parsing so tool pages inherit it.
const LABEL_MAP = {
  'File export': 'Export only',
  Closed: 'Export only',
  'No public API yet': 'No API yet',
  Zapier: 'Zapier only',
  Gated: 'Gated API',
  Partner: 'Partner API',
  'Partner program': 'Partner API',
  'API · partner': 'Partner API',
  'Suite · gated': 'Gated API',
}
const normLabels = (h) =>
  h.replace(
    /(<span class="tag"><span class="dot d-[a-z]+"><\/span>)([^<]+?)(<\/span\s*>)/g,
    (m, a, l, z) => a + (LABEL_MAP[l.trim()] || l.trim()) + z,
  )
const whiteLogo = (h) =>
  h.replace(/(<div class="logo(?:[^"]*)?")\s+style="[^"]*"/g, '$1 style="background:#fff"')
const stripLogoImg = (h) => h.replace(/<img\s+class="asset logo-img"[\s\S]*?>/g, '')
// Cards use a consistent monogram tile: keep each card's brand-color inline style and its
// <span class="logo-mono"> initials; the favicon img is stripped below (after toolData is parsed,
// so detail-page heroes can still show the real favicon).
fullBody = normLabels(fullBody)
for (const k of Object.keys(sections)) sections[k] = normLabels(sections[k])

const toolData = []
for (const c of cats) {
  const sec = sections[c.key] || ''
  ;(sec.match(/<article class="card"[\s\S]*?<\/article>/g) || []).forEach((card) => {
    const g = (re) => (card.match(re) || [])[1] || ''
    const name = g(/<div class="name">(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/div>/)
    if (!name) return
    toolData.push({
      name,
      slug: slugify(name),
      catKey: c.key,
      catLabel: c.label,
      catSlug: c.slug,
      seg: g(/<div class="seg">([^<]+)<\/div>/),
      desc: g(/<p class="desc">([\s\S]*?)<\/p>/),
      price: g(/<span class="price">([^<]+)<\/span>/),
      share: g(/<span class="share">([^<]+)<\/span>/),
      openClass: g(/<span class="tag"><span class="dot (d-[a-z]+)"><\/span>/),
      openLabel: g(
        /<span class="tag"><span class="dot d-[a-z]+"><\/span>([^<]+?)<\/span\s*>/,
      ).trim(),
      dataSeg: g(/data-seg="([^"]+)"/),
      logo: (card.match(/<div class="logo"[\s\S]*?<\/div>/) || [''])[0],
      url: officialUrl[name] || '',
    })
  })
}
// remove the cryptic "16.3% share" from the cards themselves (it stays in tool fact tables and the
// statistics page). toolData.share is already captured above, so downstream data is unaffected.
const stripShare = (h) => h.replace(/<span class="share">[^<]*<\/span>/g, '')
fullBody = stripLogoImg(stripShare(fullBody))
for (const k of Object.keys(sections)) sections[k] = stripLogoImg(stripShare(sections[k]))
const esc = (s) => String(s).replace(/&(?!amp;|lt;|gt;|#\d)/g, '&amp;')

// shared footer link graph (added to every page for internal linking + crawl)
const footerNav =
  `<div class="footnav"><div class="wrap">` +
  `<div><h3>Categories</h3><ul>${cats.map((c) => `<li><a href="/${c.slug}">${c.nav}</a></li>`).join('')}</ul></div>` +
  `<div><h3>Guides</h3><ul><li><a href="/compare">Compare all tools</a></li><li><a href="/cpa-software-pricing">Pricing guide</a></li><li><a href="/cpa-software-with-open-api">Software with an open API</a></li><li><a href="/best-cpa-software-for-solo-firms">Best for solo firms</a></li><li><a href="/best-cpa-software-for-small-firms">Best for small firms</a></li></ul></div>` +
  `<div><h3>Directory</h3><ul><li><a href="/">All ${toolData.length} tools</a></li><li><a href="/compare">Compare all</a></li><li><a href="/cpa-software-statistics">Statistics</a></li></ul></div>` +
  `</div></div>`
const footerBlock = footerNav + '\n\n' + footer

// per-category FAQ (real, sourced answers — strong for AI answer engines)
const faqByCat = {
  tax: [
    [
      'What is the cheapest professional tax software?',
      'Drake Tax and ATX are the lowest-cost unlimited desktop options; Intuit ProSeries and ProConnect use pay-per-return pricing that can be cheaper at low volume.',
    ],
    [
      'Do professional tax packages e-file state returns?',
      'Yes — all support IRS Modernized e-File (MeF) and the matching state e-filing. Multi-state coverage and per-return economics vary by product.',
    ],
    [
      'Which tax software do the largest firms use?',
      'UltraTax CS and CCH Axcess Tax lead at mid-to-large firms (2025 AICPA survey), while Drake dominates among sole practitioners.',
    ],
  ],
  monitor: [
    [
      'What is the difference between a deadline tracker and a compliance monitor?',
      'A passive tracker records the due dates you enter and rolls them forward. An active monitor also watches the IRS, state agencies, and FEMA and flags when a date changes and which clients it affects.',
    ],
    [
      'Is deadline tracking built into practice management software?',
      'Usually yes — Karbon, Canopy, TaxDome, Financial Cents, and Jetpack all include due-date tracking. The standalone tools here focus on it specifically.',
    ],
  ],
  pm: [
    [
      'How much does accounting practice management software cost?',
      'Entry pricing runs from about $19/user/mo (Financial Cents) to $59–67/user/mo (Karbon, TaxDome). Some, like Pixie, charge a flat monthly fee; enterprise tools such as Aiwyn are custom-quoted.',
    ],
    [
      'Which practice management tool has the best API?',
      "Karbon offers the deepest self-serve public API with webhooks; TaxDome also issues self-serve keys. Canopy's API is approval-gated, and several others connect only through Zapier.",
    ],
    [
      'Which is best for a small tax firm?',
      'TaxDome and Canopy are popular all-in-ones with client portals; Financial Cents and Jetpack are lighter and lower-cost; Karbon leads on integration depth.',
    ],
  ],
  ledger: [
    [
      'QuickBooks Online vs Xero — which should a firm use?',
      'QuickBooks Online dominates US small business and has 500k+ ProAdvisors, so most US firms standardize on it; Xero is strong internationally with a comparable open API. Both offer self-serve APIs and app stores.',
    ],
    [
      'How much is QuickBooks Online for accountants?',
      'QuickBooks Online starts around $35/mo (Simple Start). Accountants join the free ProAdvisor program for discounted client subscriptions and firm tools.',
    ],
  ],
}

const tools = [
  ['Drake Tax', 'https://www.drakesoftware.com', 'Tax Preparation'],
  ['Lacerte', 'https://accountants.intuit.com/tax/lacerte/', 'Tax Preparation'],
  ['ProConnect Tax', 'https://accountants.intuit.com/tax/proconnect/', 'Tax Preparation'],
  ['ProSeries', 'https://accountants.intuit.com/tax/proseries/', 'Tax Preparation'],
  [
    'UltraTax CS',
    'https://tax.thomsonreuters.com/us/en/cs-professional-suite/ultratax-cs',
    'Tax Preparation',
  ],
  [
    'CCH Axcess Tax',
    'https://www.wolterskluwer.com/en/solutions/cch-axcess/tax',
    'Tax Preparation',
  ],
  ['ATX', 'https://www.wolterskluwer.com/en/solutions/atx', 'Tax Preparation'],
  ['File In Time', 'https://www.timevalue.com/file-in-time', 'Deadline & Compliance Tracking'],
  ['DueDateHQ', 'https://duedatehq.com', 'Deadline & Compliance Tracking'],
  ['ONESOURCE Calendar', 'https://www.thomsonreuters.com', 'Deadline & Compliance Tracking'],
  ['Karbon', 'https://karbonhq.com', 'Practice Management'],
  ['TaxDome', 'https://taxdome.com', 'Practice Management'],
  ['Canopy', 'https://www.getcanopy.com', 'Practice Management'],
  ['Financial Cents', 'https://financial-cents.com', 'Practice Management'],
  ['Jetpack Workflow', 'https://jetpackworkflow.com', 'Practice Management'],
  ['Keeper', 'https://keeper.app', 'Practice Management'],
  ['Firm360', 'https://www.myfirm360.com', 'Practice Management'],
  ['Pixie', 'https://www.usepixie.com', 'Practice Management'],
  ['Aiwyn', 'https://www.aiwyn.ai', 'Practice Management'],
  ['Ignition', 'https://www.ignitionapp.com', 'Practice Management'],
  ['QuickBooks Online', 'https://quickbooks.intuit.com', 'Accounting & Bookkeeping'],
  ['Xero', 'https://www.xero.com', 'Accounting & Bookkeeping'],
  ['Bill.com', 'https://www.bill.com', 'Accounting & Bookkeeping'],
  ['Sage', 'https://www.sage.com', 'Accounting & Bookkeeping'],
  [
    'Intuit ProAdvisor',
    'https://quickbooks.intuit.com/accountants/proadvisor/',
    'Accounting & Bookkeeping',
  ],
]
const org = {
  '@type': 'Organization',
  '@id': ORIGIN + '/#org',
  name: 'CPA Field Guide',
  url: ORIGIN + '/',
  logo: ORIGIN + '/og.png',
  sameAs: ['https://duedatehq.com'],
  description:
    'Independent, vendor-neutral directory of US tax and accounting software, maintained by the team behind DueDateHQ.',
}
// Shared WebSite node. Every interior page's `isPartOf` points at `#website`, but
// the node itself only existed on the homepage — leaving 21 dangling references.
// Including it in every page's @graph (like `org`) makes the reference resolve
// on-page and matches Yoast/best-practice site-wide schema. Mirrors the homepage
// node exactly so the two never conflict on @id.
const site = {
  '@type': 'WebSite',
  '@id': ORIGIN + '/#website',
  name: 'CPA Field Guide',
  url: ORIGIN + '/',
  inLanguage: 'en-US',
  publisher: { '@id': ORIGIN + '/#org' },
  description:
    'An independent, vendor-neutral directory of US tax and accounting software — tax preparation, deadline monitoring, practice management, and bookkeeping — with category definitions, inclusion criteria, and integration openness.',
}

function head(title, desc, canonical) {
  const fav =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><rect width='30' height='30' rx='8' fill='%231A1A1A'/><path d='M15 4.2 L17.6 12.4 L25.8 15 L17.6 17.6 L15 25.8 L12.4 17.6 L4.2 15 L12.4 12.4 Z' fill='%23FFFFFF'/><path d='M12.4 12.4 L15 4.2 L17.6 12.4 Z' fill='%232F6DA6'/></svg>"
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="googlebot" content="index,follow,max-snippet:-1,max-image-preview:large">
<link rel="icon" href="${fav}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CPA Field Guide">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ORIGIN}/og.png">
<meta name="theme-color" content="#1A1A1A">
<meta name="author" content="CPA Field Guide">
<link rel="alternate" hreflang="en-us" href="${canonical}">
<link rel="alternate" hreflang="x-default" href="${canonical}">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
${style}
</head>`
}

function catnav(activeKey) {
  const links = [
    `<a href="/"${activeKey === 'home' ? ' aria-current="page"' : ''}>All</a>`,
    ...cats.map(
      (c) =>
        `<a href="/${c.slug}"${activeKey === c.key ? ' aria-current="page"' : ''}>${c.nav}</a>`,
    ),
  ].join('\n      ')
  return `<nav class="catnav" aria-label="Categories">\n    <div class="wrap">\n      ${links}\n    </div>\n  </nav>`
}

const revealScript = `<script>
  (function () {
    document.querySelectorAll("img.asset").forEach(function (img) {
      var card = img.closest(".card"); var nm = card && card.querySelector(".name") ? card.querySelector(".name").textContent.trim() : "";
      img.alt = nm ? (img.classList.contains("shot-img") ? nm + " screenshot" : nm + " logo") : "";
      if (!img.getAttribute("src")) { img.remove(); return; }
      img.addEventListener("load", function () { img.classList.add("loaded"); });
      img.addEventListener("error", function () { img.remove(); });
    });
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var c = e.target; c.classList.add("in"); io.unobserve(c); setTimeout(function(){c.classList.remove("reveal","in");},650);} }); }, { rootMargin: "0px 0px -6% 0px" });
      document.querySelectorAll(".card").forEach(function (c) { c.classList.add("reveal"); io.observe(c); });
    }
  })();
  (function () {
    var toggle = document.querySelector(".viewtoggle");
    if (!toggle) return;
    var grids = document.querySelectorAll(".grid");
    var btns = toggle.querySelectorAll("button[data-view]");
    function setView(v) {
      grids.forEach(function (g) { g.classList.toggle("rows", v === "rows"); });
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === v ? "true" : "false"); });
      try { localStorage.setItem("cfg-view", v); } catch (e) {}
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
    var saved; try { saved = localStorage.getItem("cfg-view"); } catch (e) {}
    if (saved === "rows") setView("rows");
  })();
</script>`
const viewToggleHtml =
  '<div class="viewtoggle catview" role="group" aria-label="View">' +
  '<button data-view="cards" aria-pressed="true" aria-label="Card view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg></button>' +
  '<button data-view="rows" aria-pressed="false" aria-label="List view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>' +
  '</div>'

// ---------- HOMEPAGE ----------
// The homepage carries its own in-page section nav (scroll-spy) + firm-size filter in the
// sticky control bar, so it does NOT get the top catnav or per-heading "View all" links.
let homeBody = fullBody
// homepage: link the guide pages as a compact pill row (internal links so they aren't orphaned)
homeBody = homeBody.replace(
  '<div class="faq">',
  `<div class="guides"><div class="wrap"><h2>Guides</h2><ul class="guidelinks"><li><a href="/compare">Compare all 25 tools</a></li><li><a href="/cpa-software-pricing">Pricing across all 25 tools</a></li><li><a href="/cpa-software-with-open-api">Software with an open API</a></li><li><a href="/best-cpa-software-for-solo-firms">Best for solo firms</a></li><li><a href="/best-cpa-software-for-small-firms">Best for small firms</a></li></ul></div></div>\n\n<div class="faq">`,
)
homeBody = homeBody.replace('<footer>', footerNav + '\n<footer>')
const homeHtml =
  head(
    'CPA Field Guide — US Tax & Accounting Software Directory (2026)',
    'Independent, vendor-neutral directory of US tax & accounting software: tax preparation, deadline monitoring, practice management, and bookkeeping. Category definitions, inclusion criteria, and integration openness. No pay-to-list.',
    ORIGIN + '/',
  ) +
  '\n<body>\n' +
  homeBody +
  '\n</body>\n</html>\n'
writeFileSync(base + '/deploy/index.html', homeHtml)

// ---------- CATEGORY PAGES ----------
for (const c of cats) {
  let section = sections[c.key]
  // promote the category H2 to H1 for this landing page
  section = section.replace('<h2>', '<h1>').replace('</h2>', '</h1>')
  // give the single-category grid a card <-> dense-row view toggle (in the banner, after the count)
  section = section.replace(/(<span class="count">[^<]*<\/span>)/, `$1${viewToggleHtml}`)
  const url = `${ORIGIN}/${c.slug}`
  const catTools = tools.filter((t) => t[2] === c.label)
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; ${c.label.replace('&', '&amp;')}</nav></div>`
  const siblings = cats.filter((s) => s.key !== c.key)
  const sibnav =
    `<div class="sibnav"><div class="wrap"><h2>Other categories</h2><ul>` +
    `<li><a href="/">All ${tools.length} tools</a></li>` +
    siblings
      .map((s) => `<li><a href="/${s.slug}">${s.label.replace('&', '&amp;')} (${s.n})</a></li>`)
      .join('') +
    `</ul></div></div>`

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'CollectionPage',
        '@id': url + '#webpage',
        url: url,
        name: c.title,
        isPartOf: { '@id': ORIGIN + '/#website' },
        about: c.label + ' software for CPA firms',
        inLanguage: 'en-US',
        datePublished: DATE,
        dateModified: DATE,
        primaryImageOfPage: ORIGIN + '/og.png',
        breadcrumb: { '@id': url + '#breadcrumb' },
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.faq summary', '.faq p'] },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: c.label, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        name: c.label + ' software',
        numberOfItems: catTools.length,
        itemListElement: catTools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: t[0],
            url: t[1],
            applicationCategory: t[2] + ' software',
          },
        })),
      },
      ...(faqByCat[c.key]
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faqByCat[c.key].map((f) => ({
                '@type': 'Question',
                name: f[0],
                acceptedAnswer: { '@type': 'Answer', text: f[1] },
              })),
            },
          ]
        : []),
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`

  const catFaq = faqByCat[c.key] || []
  const catFaqHtml = catFaq.length
    ? `<div class="faq"><div class="wrap"><h2>${c.label.replace('&', '&amp;')} — FAQ</h2>` +
      catFaq
        .map((f) => `<details class="qa"><summary>${f[0]}</summary><p>${f[1]}</p></details>`)
        .join('') +
      `</div></div>`
    : ''
  const guideNav =
    `<div class="sibnav"><div class="wrap"><h2>Related guides</h2><ul>` +
    `<li><a href="/cpa-software-pricing">Pricing across all 25 tools</a></li>` +
    `<li><a href="/cpa-software-with-open-api">Software with an open API</a></li>` +
    `<li><a href="/best-cpa-software-for-solo-firms">Best for solo firms</a></li>` +
    `<li><a href="/best-cpa-software-for-small-firms">Best for small firms</a></li></ul></div></div>`
  const body = [
    topbar,
    catnav(c.key),
    '<main class="wrap">',
    crumb,
    section,
    '</main>',
    catFaqHtml,
    sibnav,
    guideNav,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  const page = head(c.title, c.desc, url) + '\n<body>\n' + body + '\n</body>\n</html>\n'
  writeFileSync(base + '/deploy/' + c.slug + '.html', page)
}

// ---------- cross-link data (head-to-head + alternatives) ----------
// Defined once here — consumed by the tool pages below AND by the vs/alt page
// generators lower down. Hoisting it lets each tool profile link to the comparison
// pages that feature it, so those high-intent pages get internal-link equity from
// the strong tool pages instead of being reachable only from /compare.
const VS_PAIRS = [
  ['taxdome', 'canopy'],
  ['karbon', 'taxdome'],
  ['canopy', 'karbon'],
  ['quickbooks-online', 'xero'],
  ['drake-tax', 'ultratax-cs'],
  ['lacerte', 'proseries'],
  ['proconnect', 'proseries'],
  ['lacerte', 'proconnect'],
  ['drake-tax', 'lacerte'],
  ['drake-tax', 'proseries'],
  ['ultratax-cs', 'cch-axcess'],
  ['atx', 'drake-tax'],
  ['taxdome', 'financial-cents'],
  ['karbon', 'financial-cents'],
  ['xero', 'sage'],
  ['quickbooks-online', 'sage'],
  ['karbon', 'jetpack-workflow'],
  ['file-in-time', 'duedatehq'],
]
const ALT_SLUGS = [
  'taxdome',
  'karbon',
  'canopy',
  'quickbooks-online',
  'drake-tax',
  'lacerte',
  'proseries',
  'ultratax-cs',
  'financial-cents',
  'xero',
  'ignition',
  'jetpack-workflow',
  'file-in-time',
  'onesource-calendar',
]
// any page that features DueDateHQ carries the affiliation up front (facts-only program red line)
const DDHQ_DISCLOSURE = `<p class="disclose"><strong>Disclosure:</strong> DueDateHQ is built by the team that maintains this guide. Same sourced facts, same rules as every other tool on this page.</p>`
const nameBySlug = Object.fromEntries(toolData.map((t) => [t.slug, t.name]))
function crossLinksFor(slug) {
  const vs = VS_PAIRS.filter((p) => p.includes(slug)).map(([a, b]) => ({
    href: `/${a}-vs-${b}`,
    label: `${nameBySlug[a] || a} vs ${nameBySlug[b] || b}`,
  }))
  const alt = ALT_SLUGS.includes(slug) ? `/${slug}-alternatives` : null
  return { vs, alt }
}

// ---------- TOOL PAGES (/tools/<slug>) ----------
mkdirSync(base + '/deploy/tools', { recursive: true })
for (const t of toolData) {
  const url = `${ORIGIN}/tools/${t.slug}`
  const catHtml = t.catLabel.replace('&', '&amp;')
  const siblings = toolData.filter((x) => x.catKey === t.catKey && x.slug !== t.slug)
  const domain = t.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; <a href="/${t.catSlug}">${catHtml}</a> &nbsp;/&nbsp; ${esc(t.name)}</nav></div>`
  const facts =
    `<table class="facts"><tbody>` +
    `<tr><th>Category</th><td><a href="/${t.catSlug}">${catHtml}</a></td></tr>` +
    `<tr><th>Best for</th><td>${t.seg} firms</td></tr>` +
    `<tr><th>Pricing</th><td>${esc(t.price)}${t.share ? ` <span class="muted">· ${esc(t.share)}</span>` : ''}</td></tr>` +
    `<tr><th>Integration</th><td>${esc(t.openLabel)}</td></tr>` +
    `<tr><th>Official site</th><td><a href="${t.url}" target="_blank" rel="nofollow noopener">${domain}</a></td></tr>` +
    `</tbody></table>`
  const connects = `<p class="toolsection"><strong>How it connects.</strong> ${openExplain[t.openClass] || ''} <a href="/cpa-software-with-open-api">Compare every tool by integration openness &rarr;</a></p>`
  const related = siblings.length
    ? `<div class="sibnav"><div class="wrap"><h2>Other ${catHtml} tools</h2><ul>` +
      siblings.map((s) => `<li><a href="/tools/${s.slug}">${esc(s.name)}</a></li>`).join('') +
      `<li><a href="/${t.catSlug}">See all &rarr;</a></li></ul></div></div>`
    : ''
  // Link each profile to the head-to-head + alternatives pages that feature it —
  // those high-intent pages otherwise only receive links from /compare.
  const cross = crossLinksFor(t.slug)
  const crossItems = [
    ...cross.vs.map((v) => `<li><a href="${v.href}">${esc(v.label)}</a></li>`),
    ...(cross.alt ? [`<li><a href="${cross.alt}">${esc(t.name)} alternatives</a></li>`] : []),
  ]
  const crossBlock = crossItems.length
    ? `<div class="sibnav"><div class="wrap"><h2>Compare ${esc(t.name)}</h2><ul>${crossItems.join('')}</ul></div></div>`
    : ''
  const tfaq = [
    [
      `How much does ${t.name} cost?`,
      `${t.name}'s pricing: ${t.price}.${t.share ? ' It is used by ' + t.share.replace(/ share$/, ' of firms in the 2025 AICPA survey') + '.' : ''}`,
    ],
    [`Does ${t.name} have an API?`, openExplain[t.openClass] || 'Integration details vary.'],
    [
      `Who is ${t.name} best for?`,
      `${t.name} is built for ${t.seg.toLowerCase()} firms. ${t.desc}`,
    ],
    ...(toolContent[t.slug]
      ? [
          [
            `What are the main drawbacks of ${t.name}?`,
            `The trade-offs firms weigh: ${toolContent[t.slug].cons
              .slice(0, 3)
              .map((c) => c.replace(/^([A-Z])/, (m) => m.toLowerCase()).replace(/\.$/, ''))
              .join('; ')}.`,
          ],
        ]
      : []),
  ]
  const tfaqHtml =
    `<div class="faq"><div class="wrap"><h2>${esc(t.name)} — FAQ</h2>` +
    tfaq
      .map(
        (f) => `<details class="qa"><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`,
      )
      .join('') +
    `</div></div>`
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'SoftwareApplication',
        '@id': url + '#app',
        name: t.name,
        applicationCategory: t.catLabel + ' software',
        url: t.url,
        sameAs: t.url,
        description: t.desc,
      },
      ...(toolContent[t.slug]
        ? [
            {
              '@type': 'Review',
              itemReviewed: { '@id': url + '#app' },
              author: { '@id': ORIGIN + '/#org' },
              datePublished: DATE,
              reviewBody: toolContent[t.slug].verdict,
            },
          ]
        : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: t.catLabel, item: `${ORIGIN}/${t.catSlug}` },
          { '@type': 'ListItem', position: 3, name: t.name, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: tfaq.map((f) => ({
          '@type': 'Question',
          name: f[0],
          acceptedAnswer: { '@type': 'Answer', text: f[1] },
        })),
      },
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`
  const logoBig = whiteLogo(t.logo).replace('class="logo"', 'class="logo logo-lg"') // detail hero keeps the real favicon on a white tile
  const dshot = detailShots[t.slug]
  const screenshot = dshot
    ? `<figure class="toolshot"><img src="/detail-shots/${dshot}" alt="${esc(t.name)} interface" loading="lazy"><figcaption>${esc(t.name)} — product interface. Screenshot © ${esc(t.name)}; shown for identification.</figcaption></figure>`
    : ''
  // editorial review sections (tool-content.mjs): pros/cons, scenarios, verdict
  const tc = toolContent[t.slug]
  const disclosure = tc?.disclosure
    ? `<p class="disclose"><strong>Disclosure:</strong> ${esc(t.name)} is built by the team that maintains this guide. Its facts table and this review follow the same rules as every other tool here — and we say so wherever it appears.</p>`
    : ''
  const reviewHtml = tc
    ? [
        `<h2 class="revh2">${esc(t.name)} pros and cons</h2>`,
        `<div class="proscons"><div class="pc-pro"><h3>Pros</h3><ul>${tc.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div><div class="pc-con"><h3>Cons</h3><ul>${tc.cons.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></div>`,
        `<h2 class="revh2">Who ${esc(t.name)} is for — real-world scenarios</h2>`,
        tc.scenarios
          .map((s) => `<div class="usecase"><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></div>`)
          .join('\n'),
        `<h2 class="revh2">Bottom line</h2>`,
        `<div class="verdict"><p>${esc(tc.verdict)}</p></div>`,
      ].join('\n')
    : ''
  const body = [
    topbar,
    catnav(t.catKey),
    '<main class="wrap">',
    crumb,
    `<div class="toolhero">${logoBig}<div><h1>${esc(t.name)}</h1><div class="toolsub">${catHtml} · ${t.seg}</div></div></div>`,
    `<p class="toollede">${esc(t.desc)}</p>`,
    disclosure,
    facts,
    connects,
    screenshot,
    reviewHtml,
    '</main>',
    tfaqHtml,
    crossBlock,
    related,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  const title = toolContent[t.slug]
    ? `${t.name} Review (2026): Pricing, Pros & Cons | CPA Field Guide`
    : `${t.name} — Pricing, Features & Integration | CPA Field Guide`
  const desc = esc(
    toolContent[t.slug]
      ? `${t.name} review for US firms: pros and cons, who it fits, pricing (${t.price}), and how open it is to integration. Independent — no vendor pays for placement.`
      : `${t.name}: ${t.desc} Pricing: ${t.price}. Who it's for and how open it is to integration.`,
  ).slice(0, 300)
  writeFileSync(
    base + '/deploy/tools/' + t.slug + '.html',
    head(esc(title), desc, url) + '\n<body>\n' + body + '\n</body>\n</html>\n',
  )
}

// ---------- GUIDE PAGES ----------
function guidePage(slug, title, h1, intro, groups, faq) {
  const url = `${ORIGIN}/${slug}`
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; ${h1}</nav></div>`
  const groupsHtml = groups
    .filter((gp) => gp.items.length)
    .map(
      (gp) =>
        `<h2 class="gh">${gp.h}</h2>${gp.note ? `<p class="toolsection">${gp.note}</p>` : ''}<ul class="toollist">` +
        gp.items
          .map(
            (t) =>
              `<li><a href="/tools/${t.slug}">${esc(t.name)}</a> <span class="muted">— ${esc(t.price)}${t.share ? ` · ${esc(t.share)}` : ''}</span></li>`,
          )
          .join('') +
        `</ul>`,
    )
    .join('\n')
  const allItems = groups.flatMap((gp) => gp.items)
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'CollectionPage',
        '@id': url + '#webpage',
        url,
        name: title,
        isPartOf: { '@id': ORIGIN + '/#website' },
        inLanguage: 'en-US',
        datePublished: DATE,
        dateModified: DATE,
        primaryImageOfPage: ORIGIN + '/og.png',
        breadcrumb: { '@id': url + '#breadcrumb' },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: h1, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        numberOfItems: allItems.length,
        itemListElement: allItems.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: t.name,
            url: t.url || `${ORIGIN}/tools/${t.slug}`,
            applicationCategory: t.catLabel + ' software',
          },
        })),
      },
      ...(faq
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faq.map((f) => ({
                '@type': 'Question',
                name: f[0],
                acceptedAnswer: { '@type': 'Answer', text: f[1] },
              })),
            },
          ]
        : []),
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`
  const faqHtml = faq
    ? `<div class="faq"><div class="wrap"><h2>FAQ</h2>` +
      faq
        .map((f) => `<details class="qa"><summary>${f[0]}</summary><p>${f[1]}</p></details>`)
        .join('') +
      `</div></div>`
    : ''
  const body = [
    topbar,
    catnav(''),
    '<main class="wrap">',
    crumb,
    `<h1 class="gh1">${h1}</h1>`,
    `<p class="toollede">${intro}</p>`,
    groupsHtml,
    '</main>',
    faqHtml,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  writeFileSync(
    base + '/deploy/' + slug + '.html',
    head(
      esc(title),
      esc(intro)
        .replace(/<[^>]+>/g, '')
        .slice(0, 300),
      url,
    ) +
      '\n<body>\n' +
      body +
      '\n</body>\n</html>\n',
  )
  return url
}
const seg = (key) =>
  cats.map((c) => ({
    h: c.label.replace('&', '&amp;'),
    items: toolData.filter((t) => t.catKey === c.key && t.dataSeg.split(',').includes(key)),
  }))
const priceOf = (slug) => ((toolData.find((t) => t.slug === slug) || {}).price || '').toLowerCase()
const bare = (slug) => priceOf(slug).replace(/^from /, '')
const guideUrls = [
  guidePage(
    'cpa-software-pricing',
    'CPA Software Pricing (2026): 25 Tools Compared — CPA Field Guide',
    'CPA software pricing (2026)',
    'Real starting prices for every tool in this guide, grouped by category — taken from public pricing pages, with custom-quote vendors marked as such. No vendor pays for placement.',
    cats.map((c) => ({
      h: c.label.replace('&', '&amp;'),
      items: toolData.filter((t) => t.catKey === c.key),
    })),
    [
      [
        'How much does Lacerte cost?',
        `Intuit does not publish a flat Lacerte price — it is quoted custom, per-return. Fixed-price tax-prep alternatives: ProSeries ${priceOf('proseries')}, Drake Tax ${priceOf('drake-tax')}.`,
      ],
      [
        'How much does UltraTax CS cost?',
        `Thomson Reuters prices UltraTax CS by ${priceOf('ultratax-cs')} only. Published-price alternatives: Drake Tax ${priceOf('drake-tax')}, CCH Axcess ${priceOf('cch-axcess')}, ATX ${priceOf('atx')}.`,
      ],
      [
        'How much does Karbon cost?',
        `Karbon starts ${priceOf('karbon')}. Other practice-management tools: TaxDome ${priceOf('taxdome')}, Canopy ${priceOf('canopy')}, Jetpack Workflow ${priceOf('jetpack-workflow')}, Financial Cents ${priceOf('financial-cents')}.`,
      ],
      [
        'How much does Jetpack Workflow cost?',
        `Jetpack Workflow starts ${priceOf('jetpack-workflow')} — one of the lower published prices in practice management; Financial Cents is lower still at ${priceOf('financial-cents')}.`,
      ],
      [
        'What does CPA practice management software cost per user?',
        `Published per-user starting prices run from ${bare('financial-cents')} (Financial Cents) to ${bare('taxdome')} (TaxDome); Karbon is ${bare('karbon')} and Canopy ${bare('canopy')}. Flat-priced options like Pixie (${priceOf('pixie')}) and Keeper (${priceOf('keeper')}) are not per-user.`,
      ],
    ],
  ),
  guidePage(
    'cpa-software-with-open-api',
    'CPA & Accounting Software With an Open API (2026) — CPA Field Guide',
    'CPA &amp; accounting software with an open API',
    'How open a tool is to integration decides how much it locks you in. Here is every tool in this guide sorted by that — the ones with a self-serve public API first.',
    [
      {
        h: 'Open API — self-serve',
        note: 'You can generate an API key yourself and build against it, no approval needed.',
        items: toolData.filter((t) => t.openClass === 'd-open'),
      },
      {
        h: 'Gated API',
        note: 'An API exists, but access needs approval, a partner program, or a higher plan.',
        items: toolData.filter((t) => t.openClass === 'd-gated'),
      },
      {
        h: 'Zapier only',
        note: 'No direct API; they connect to the rest of your stack through Zapier.',
        items: toolData.filter((t) => t.openClass === 'd-zap'),
      },
    ],
    [
      [
        'Which CPA practice-management tool has the best API?',
        'Karbon offers the most complete self-serve public API with webhooks; TaxDome also issues self-serve keys. Both let you build directly, without a partner agreement.',
      ],
      [
        'What does an open API mean for accounting software?',
        "It means you can generate an API key yourself and integrate without vendor approval — the lowest-friction way to connect a tool to the rest of your firm's stack.",
      ],
    ],
  ),
  guidePage(
    'best-cpa-software-for-solo-firms',
    'Best CPA Software for Solo Firms & Sole Practitioners (2026)',
    'Best software for solo CPA firms',
    'Software scoped and priced for a one-person US tax or accounting practice, grouped by what each does. Every price is a real starting figure.',
    seg('solo'),
  ),
  guidePage(
    'best-cpa-software-for-small-firms',
    'Best CPA Software for Small Firms (2026) — CPA Field Guide',
    'Best software for small CPA firms',
    'Tools that fit a small (roughly 2–10 person) US tax or accounting firm, grouped by what each does, with real starting prices.',
    seg('small'),
  ),
]

// ---------- HEAD-TO-HEAD "vs" PAGES ----------
const bySlug = Object.fromEntries(toolData.map((t) => [t.slug, t]))
const openRank = { 'd-open': 4, 'd-gated': 3, 'd-zap': 2, 'd-info': 1, 'd-closed': 1 }
const comparisonRow = (label, left, right) =>
  `<tr><th>${label}</th><td>${left}</td><td>${right}</td></tr>`

function vsPage(A, B) {
  const slug = `${A.slug}-vs-${B.slug}`
  const url = `${ORIGIN}/${slug}`
  const both =
    A.catKey === B.catKey
      ? `both ${A.catLabel.toLowerCase()} tools`
      : `a ${A.catLabel.toLowerCase()} tool and a ${B.catLabel.toLowerCase()} tool`
  const intro = `${A.name} and ${B.name} are ${both}. Here is how they compare on firm-size fit, pricing, and integration — sourced, with no vendor paying for placement.`
  const table =
    `<div class="tablewrap"><table class="cmp vs"><thead><tr><th></th><th><a href="/tools/${A.slug}">${esc(A.name)}</a></th><th><a href="/tools/${B.slug}">${esc(B.name)}</a></th></tr></thead><tbody>` +
    comparisonRow('Category', A.catLabel.replace('&', '&amp;'), B.catLabel.replace('&', '&amp;')) +
    comparisonRow('Best for', A.seg + ' firms', B.seg + ' firms') +
    comparisonRow('Pricing', esc(A.price), esc(B.price)) +
    comparisonRow('Integration', esc(A.openLabel), esc(B.openLabel)) +
    (A.share || B.share
      ? comparisonRow('Adoption', esc(A.share || '—'), esc(B.share || '—'))
      : '') +
    `</tbody></table></div>`
  const moreOpen =
    openRank[A.openClass] > openRank[B.openClass]
      ? A
      : openRank[B.openClass] > openRank[A.openClass]
        ? B
        : null
  const choose = `<p class="toolsection"><strong>How to choose.</strong> ${esc(A.name)} targets ${A.seg.toLowerCase()} firms and ${esc(B.name)} targets ${B.seg.toLowerCase()}. On integration, ${esc(A.name)} is "${esc(A.openLabel)}" and ${esc(B.name)} is "${esc(B.openLabel)}"${moreOpen ? `, so ${esc(moreOpen.name)} is the more open of the two` : ''}. Pricing: ${esc(A.name)} ${A.price.toLowerCase()}, ${esc(B.name)} ${B.price.toLowerCase()}.</p>`
  const faq = [
    [
      `Is ${A.name} or ${B.name} cheaper?`,
      `${A.name} pricing: ${A.price}. ${B.name} pricing: ${B.price}.`,
    ],
    [
      `Does ${A.name} or ${B.name} have a better API?`,
      `${A.name}: ${A.openLabel}. ${B.name}: ${B.openLabel}.${moreOpen ? ' ' + moreOpen.name + ' is the more open of the two.' : ''}`,
    ],
  ]
  const faqHtml =
    `<div class="faq"><div class="wrap"><h2>${esc(A.name)} vs ${esc(B.name)} — FAQ</h2>` +
    faq
      .map(
        (f) => `<details class="qa"><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`,
      )
      .join('') +
    `</div></div>`
  const links = `<div class="sibnav"><div class="wrap"><h2>Full profiles</h2><ul><li><a href="/tools/${A.slug}">${esc(A.name)}</a></li><li><a href="/tools/${B.slug}">${esc(B.name)}</a></li>${A.catKey === B.catKey ? `<li><a href="/${A.catSlug}">All ${A.catLabel.replace('&', '&amp;')} tools</a></li>` : ''}</ul></div></div>`
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'CollectionPage',
        '@id': url + '#webpage',
        url,
        name: `${A.name} vs ${B.name}`,
        isPartOf: { '@id': ORIGIN + '/#website' },
        inLanguage: 'en-US',
        datePublished: DATE,
        dateModified: DATE,
        primaryImageOfPage: ORIGIN + '/og.png',
        breadcrumb: { '@id': url + '#breadcrumb' },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: `${A.name} vs ${B.name}`, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        numberOfItems: 2,
        itemListElement: [A, B].map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: t.name,
            url: t.url || `${ORIGIN}/tools/${t.slug}`,
            applicationCategory: t.catLabel + ' software',
          },
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f[0],
          acceptedAnswer: { '@type': 'Answer', text: f[1] },
        })),
      },
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; ${esc(A.name)} vs ${esc(B.name)}</nav></div>`
  const body = [
    topbar,
    catnav(A.catKey === B.catKey ? A.catKey : ''),
    '<main class="wrap">',
    crumb,
    `<h1 class="gh1">${esc(A.name)} vs ${esc(B.name)}</h1>`,
    `<p class="toollede">${esc(intro)}</p>`,
    [A.slug, B.slug].includes('duedatehq') ? DDHQ_DISCLOSURE : '',
    table,
    choose,
    '</main>',
    faqHtml,
    links,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  writeFileSync(
    base + '/deploy/' + slug + '.html',
    head(
      `${A.name} vs ${B.name} (2026): Pricing, Features & API — CPA Field Guide`,
      esc(intro).slice(0, 300),
      url,
    ) +
      '\n<body>\n' +
      body +
      '\n</body>\n</html>\n',
  )
  return { url, path: '/' + slug, aName: A.name, bName: B.name }
}
// Pairs defined once in VS_PAIRS (hoisted above the tool pages so profiles can
// cross-link to these); generate from the same list so they can never drift.
const vsList = VS_PAIRS.map(([a, b]) =>
  bySlug[a] && bySlug[b] ? vsPage(bySlug[a], bySlug[b]) : null,
).filter(Boolean)

// ---------- "X alternatives" PAGES ----------
function altPage(T) {
  const slug = `${T.slug}-alternatives`
  const url = `${ORIGIN}/${slug}`
  const alts = toolData.filter((x) => x.catKey === T.catKey && x.slug !== T.slug)
  const catl = T.catLabel.toLowerCase().replace('&', 'and')
  const intro = `Looking for an alternative to ${T.name}? Here are the other ${catl} tools US firms use — each with pricing and how open it is to integration, so you can compare on the axes that matter. Independent, no vendor pays to be here.`
  const cheaper = alts.filter((a) => /^from \$/i.test(a.price))
  const list =
    `<ul class="toollist">` +
    alts
      .map(
        (a) =>
          `<li><a href="/tools/${a.slug}">${esc(a.name)}</a> <span class="muted">— ${esc(a.price)} · ${esc(a.openLabel)}${a.share ? ` · ${esc(a.share)}` : ''}</span></li>`,
      )
      .join('') +
    `</ul>`
  const faq = [
    [
      `What is the best alternative to ${T.name}?`,
      `The closest ${catl} alternatives are ${alts
        .slice(0, 3)
        .map((a) => a.name)
        .join(
          ', ',
        )}. The right pick depends on price and how open you need the integration to be — compare them above.`,
    ],
    [
      `Is there a cheaper alternative to ${T.name}?`,
      `${T.name}'s pricing is ${T.price}. Lower-priced ${catl} options include ${
        cheaper
          .slice(0, 3)
          .map((a) => a.name + ' (' + a.price + ')')
          .join(', ') || 'several of the tools listed above'
      }.`,
    ],
  ]
  const faqHtml =
    `<div class="faq"><div class="wrap"><h2>${esc(T.name)} alternatives — FAQ</h2>` +
    faq
      .map(
        (f) => `<details class="qa"><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`,
      )
      .join('') +
    `</div></div>`
  const back = `<div class="sibnav"><div class="wrap"><h2>See also</h2><ul><li><a href="/tools/${T.slug}">${esc(T.name)} full profile</a></li><li><a href="/${T.catSlug}">All ${T.catLabel.replace('&', '&amp;')} tools</a></li></ul></div></div>`
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'CollectionPage',
        '@id': url + '#webpage',
        url,
        name: `${T.name} alternatives`,
        isPartOf: { '@id': ORIGIN + '/#website' },
        inLanguage: 'en-US',
        datePublished: DATE,
        dateModified: DATE,
        primaryImageOfPage: ORIGIN + '/og.png',
        breadcrumb: { '@id': url + '#breadcrumb' },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: `${T.name} alternatives`, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        numberOfItems: alts.length,
        itemListElement: alts.map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: a.name,
            url: a.url || `${ORIGIN}/tools/${a.slug}`,
            applicationCategory: a.catLabel + ' software',
          },
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f[0],
          acceptedAnswer: { '@type': 'Answer', text: f[1] },
        })),
      },
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; ${esc(T.name)} alternatives</nav></div>`
  const body = [
    topbar,
    catnav(T.catKey),
    '<main class="wrap">',
    crumb,
    `<h1 class="gh1">${esc(T.name)} alternatives</h1>`,
    `<p class="toollede">${esc(intro)}</p>`,
    T.slug === 'duedatehq' || alts.some((a) => a.slug === 'duedatehq') ? DDHQ_DISCLOSURE : '',
    list,
    '</main>',
    faqHtml,
    back,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  writeFileSync(
    base + '/deploy/' + slug + '.html',
    head(
      `${T.name} Alternatives (2026): Compared for US Firms — CPA Field Guide`,
      esc(intro).slice(0, 300),
      url,
    ) +
      '\n<body>\n' +
      body +
      '\n</body>\n</html>\n',
  )
  return { url, path: '/' + slug, name: T.name }
}
const altList = ALT_SLUGS.map((s) => (bySlug[s] ? altPage(bySlug[s]) : null)).filter(Boolean)

// ---------- STATS PAGE (citeable data for AEO/GEO) ----------
const statsUrl = ORIGIN + '/cpa-software-statistics'
{
  const shareTools = toolData
    .filter((t) => t.share.endsWith(' share'))
    .map((t) => ({ n: t.name, s: t.share }))
    .toSorted((a, b) => parseFloat(b.s) - parseFloat(a.s))
  const openLabels = {
    'd-open': 'Open, self-serve API',
    'd-gated': 'Gated API (approval / plan / partner)',
    'd-zap': 'Zapier only (no direct API)',
    'd-closed': 'No public API (file export)',
    'd-info': 'No public API yet',
  }
  const openCounts = {}
  toolData.forEach((t) => {
    openCounts[t.openClass] = (openCounts[t.openClass] || 0) + 1
  })
  const shareTable = `<div class="tablewrap"><table class="cmp"><thead><tr><th>Tax software</th><th>Market share (2025 AICPA survey)</th></tr></thead><tbody>${shareTools.map((r) => `<tr><td>${esc(r.n)}</td><td>${esc(r.s.replace(/ share$/, ''))}</td></tr>`).join('')}</tbody></table></div>`
  const openList = `<ul class="toollist">${Object.entries(openLabels)
    .filter(([k]) => openCounts[k])
    .map(
      ([k, l]) =>
        `<li><span class="muted">${openCounts[k]} of ${toolData.length}</span> — ${l}</li>`,
    )
    .join('')}</ul>`
  const faq = [
    [
      'What tax software has the largest market share?',
      `Thomson Reuters UltraTax CS leads at ${(shareTools[0] || {}).s || '~23%'} of surveyed firms, followed by Drake Tax and Intuit Lacerte (2025 AICPA tax software survey).`,
    ],
    [
      'How many CPA tools offer an open API?',
      `${openCounts['d-open'] || 0} of the ${toolData.length} tools in this guide offer a self-serve public API; ${openCounts['d-gated'] || 0} have a gated API, and the rest connect only via Zapier or file export.`,
    ],
  ]
  const faqHtml =
    `<div class="faq"><div class="wrap"><h2>FAQ</h2>` +
    faq
      .map(
        (f) => `<details class="qa"><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`,
      )
      .join('') +
    `</div></div>`
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'CollectionPage',
        '@id': statsUrl + '#webpage',
        url: statsUrl,
        name: 'CPA & accounting software statistics 2026',
        isPartOf: { '@id': ORIGIN + '/#website' },
        inLanguage: 'en-US',
        datePublished: DATE,
        dateModified: DATE,
        primaryImageOfPage: ORIGIN + '/og.png',
        breadcrumb: { '@id': statsUrl + '#breadcrumb' },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': statsUrl + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: 'Statistics', item: statsUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f[0],
          acceptedAnswer: { '@type': 'Answer', text: f[1] },
        })),
      },
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; Statistics</nav></div>`
  const body = [
    topbar,
    catnav(''),
    '<main class="wrap">',
    crumb,
    `<h1 class="gh1">CPA &amp; accounting software, by the numbers</h1>`,
    `<p class="toollede">Market share, integration openness, and pricing across the ${toolData.length} US tax and accounting tools in this guide. Sourced; updated ${DATE}.</p>`,
    `<h2 class="gh">Tax software market share</h2><p class="toolsection">Usage share among 2,011 US preparers in the 2025 AICPA / Journal of Accountancy tax software survey.</p>`,
    shareTable,
    `<h2 class="gh">Integration openness</h2><p class="toolsection">How the ${toolData.length} tools break down by how easy they are to connect to:</p>`,
    openList,
    '</main>',
    faqHtml,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  writeFileSync(
    base + '/deploy/cpa-software-statistics.html',
    head(
      'CPA & Accounting Software Statistics 2026 (Market Share, Pricing, APIs) — CPA Field Guide',
      'Data on US tax and accounting software: tax-prep market share (2025 AICPA survey), integration openness, and pricing across 25 tools. Sourced, independent.',
      statsUrl,
    ) +
      '\n<body>\n' +
      body +
      '\n</body>\n</html>\n',
  )
}

// ---------- COMPARE PAGE (/compare) ----------
const compareUrl = ORIGIN + '/compare'
{
  const rows = toolData
    .map(
      (t) =>
        `<tr><td><a href="/tools/${t.slug}">${esc(t.name)}</a></td><td>${t.catLabel.replace('&', '&amp;')}</td><td>${t.seg}</td><td>${esc(t.price)}</td><td>${esc(t.openLabel)}</td></tr>`,
    )
    .join('')
  const table = `<div class="tablewrap"><table class="cmp"><thead><tr><th>Tool</th><th>Category</th><th>Best for</th><th>Pricing</th><th>Integration</th></tr></thead><tbody>${rows}</tbody></table></div>`
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; Compare</nav></div>`
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      site,
      {
        '@type': 'CollectionPage',
        '@id': compareUrl + '#webpage',
        url: compareUrl,
        name: 'Compare CPA & accounting software',
        isPartOf: { '@id': ORIGIN + '/#website' },
        inLanguage: 'en-US',
        datePublished: DATE,
        dateModified: DATE,
        primaryImageOfPage: ORIGIN + '/og.png',
        breadcrumb: { '@id': compareUrl + '#breadcrumb' },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': compareUrl + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CPA Field Guide', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: 'Compare', item: compareUrl },
        ],
      },
      {
        '@type': 'ItemList',
        numberOfItems: toolData.length,
        itemListElement: toolData.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: t.name,
            url: t.url || `${ORIGIN}/tools/${t.slug}`,
            applicationCategory: t.catLabel + ' software',
          },
        })),
      },
    ],
  }
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`
  const vsBlock = vsList.length
    ? `<div class="sibnav"><div class="wrap"><h2>Popular comparisons</h2><ul>` +
      vsList
        .map((v) => `<li><a href="${v.path}">${esc(v.aName)} vs ${esc(v.bName)}</a></li>`)
        .join('') +
      `</ul></div></div>`
    : ''
  const altBlock = altList.length
    ? `<div class="sibnav"><div class="wrap"><h2>Alternatives &amp; data</h2><ul>` +
      altList.map((a) => `<li><a href="${a.path}">${esc(a.name)} alternatives</a></li>`).join('') +
      `<li><a href="/cpa-software-statistics">Software statistics 2026</a></li></ul></div></div>`
    : ''
  const body = [
    topbar,
    catnav(''),
    '<main class="wrap">',
    crumb,
    `<h1 class="gh1">Compare every CPA &amp; accounting tool</h1>`,
    `<p class="toollede">All ${toolData.length} tools in one table — category, firm-size fit, starting price, and how open each is to integration. Independent, and no vendor pays to be here.</p>`,
    table,
    '</main>',
    vsBlock,
    altBlock,
    method,
    footerBlock,
    revealScript,
    ld,
  ].join('\n\n')
  writeFileSync(
    base + '/deploy/compare.html',
    head(
      'Compare 25 CPA & Accounting Software Tools — Pricing & Integration | CPA Field Guide',
      'Side-by-side comparison of 25 US tax and accounting tools: category, firm-size fit, starting price, and integration openness. Independent, no pay-to-list.',
      compareUrl,
    ) +
      '\n<body>\n' +
      body +
      '\n</body>\n</html>\n',
  )
}

// ---------- llms.txt (a map for AI answer engines / GEO) ----------
const llms = `# CPA Field Guide
> Independent, vendor-neutral directory of US tax & accounting software for CPA and accounting firms — tax preparation, deadline monitoring, practice management, and bookkeeping. Every tool is defined, priced, and rated for how open it is to integration. No vendor pays for placement. Reviewed ${DATE}.

## Categories
${cats.map((c) => `- [${c.label}](${ORIGIN}/${c.slug}): ${c.desc}`).join('\n')}

## Guides
- [Compare all ${toolData.length} tools (one table: category, price, integration)](${ORIGIN}/compare)
- [CPA & accounting software with an open API](${ORIGIN}/cpa-software-with-open-api)
- [Best software for solo CPA firms](${ORIGIN}/best-cpa-software-for-solo-firms)
- [Best software for small CPA firms](${ORIGIN}/best-cpa-software-for-small-firms)

## Comparisons
${vsList.map((v) => `- [${v.aName} vs ${v.bName}](${v.url})`).join('\n')}
${altList.map((a) => `- [${a.name} alternatives](${a.url})`).join('\n')}

## Data
- [CPA software statistics 2026 (market share, pricing, APIs)](${statsUrl})

## Tools
${toolData.map((t) => `- [${t.name}](${ORIGIN}/tools/${t.slug}): ${t.catLabel}. ${t.price}. ${t.openLabel}. ${t.desc}`).join('\n')}
`
writeFileSync(base + '/deploy/llms.txt', llms)

// ---------- llms-full.txt (full machine-readable dump for GEO) ----------
const llmsFull = `# CPA Field Guide — full index
> Independent, vendor-neutral directory of US tax & accounting software for CPA and accounting firms. Every tool is defined, priced, and rated for how open it is to integration. No vendor pays for placement. Reviewed ${DATE}.

## Key pages
- Home: ${ORIGIN}/
- Compare all tools (table): ${ORIGIN}/compare
${cats.map((c) => `- ${c.label}: ${ORIGIN}/${c.slug}`).join('\n')}

## Guides
- CPA & accounting software with an open API: ${ORIGIN}/cpa-software-with-open-api
- Best software for solo CPA firms: ${ORIGIN}/best-cpa-software-for-solo-firms
- Best software for small CPA firms: ${ORIGIN}/best-cpa-software-for-small-firms

## Comparisons
${vsList.map((v) => `- ${v.aName} vs ${v.bName}: ${v.url}`).join('\n')}

## Tools (full detail)
${toolData
  .map(
    (t) => `### ${t.name}
- Page: ${ORIGIN}/tools/${t.slug}
- Official site: ${t.url}
- Category: ${t.catLabel}
- Best for: ${t.seg} firms
- Pricing: ${t.price}
- Integration: ${t.openLabel} — ${openExplain[t.openClass] || ''}
${t.share ? `- Adoption: ${t.share}\n` : ''}- Summary: ${t.desc}`,
  )
  .join('\n\n')}
`
writeFileSync(base + '/deploy/llms-full.txt', llmsFull)

// ---------- branded 404 ----------
const notFound =
  head(
    'Page not found — CPA Field Guide',
    'That page does not exist. Browse the independent directory of US tax & accounting software.',
    ORIGIN + '/404',
  ) +
  `\n<body>\n${topbar}\n\n${catnav('')}\n\n<main class="wrap"><div style="padding:56px 0 40px"><h1 class="gh1">Page not found</h1><p class="toollede">That page does not exist. Try the <a href="/">full directory</a>, or pick a category above.</p></div></main>\n\n${footerBlock}\n</body>\n</html>\n`
writeFileSync(base + '/deploy/404.html', notFound)

// ---------- sitemap (home + categories + guides + tools) ----------
const entries = [
  { u: ORIGIN + '/', p: '1.0' },
  ...cats.map((c) => ({ u: `${ORIGIN}/${c.slug}`, p: '0.8' })),
  ...guideUrls.map((u) => ({ u, p: '0.8' })),
  { u: compareUrl, p: '0.8' },
  { u: statsUrl, p: '0.7' },
  ...vsList.map((v) => ({ u: v.url, p: '0.7' })),
  ...altList.map((a) => ({ u: a.url, p: '0.7' })),
  ...toolData.map((t) => ({ u: `${ORIGIN}/tools/${t.slug}`, p: '0.6' })),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.u}</loc><lastmod>${DATE}</lastmod><changefreq>weekly</changefreq><priority>${e.p}</priority></url>`).join('\n')}
</urlset>
`
writeFileSync(base + '/deploy/sitemap.xml', sitemap)

console.log(
  'pages:',
  2 + cats.length + guideUrls.length + toolData.length,
  '(home + ' +
    cats.length +
    ' categories + ' +
    guideUrls.length +
    ' guides + ' +
    toolData.length +
    ' tools)',
)
console.log('sitemap urls:', entries.length)
