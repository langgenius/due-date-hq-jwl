import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const base = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(base + "/cpa-tools-directory.html", "utf8");
const DATE = "2026-07-08";
const ORIGIN = "https://cpafieldguide.com";

// ---- extract shared parts by index (avoids nested-div regex pitfalls) ----
let style = (src.match(/<style>[\s\S]*?<\/style>/) || [""])[0];
const iStyleEnd = src.indexOf("</style>") + "</style>".length;
let fullBody = src.slice(iStyleEnd).trim();

// ---- auto-wire real logo/screenshot files when present (deploy/logos/<slug>.*, deploy/shots/<slug>.*) ----
// Drop a file named by the tool slug and it renders; otherwise the branded panel/tile shows. No HTML edits.
function assetMap(dir) {
  const d = resolve(base, "deploy", dir);
  if (!existsSync(d)) return {};
  const m = {};
  for (const f of readdirSync(d)) {
    if (f.startsWith(".") || /readme/i.test(f) || /gitkeep/i.test(f)) continue;
    m[f.replace(/\.[^.]+$/, "").toLowerCase()] = f;
  }
  return m;
}
const _logos = assetMap("logos");
const _shots = assetMap("shots");
const _slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
fullBody = fullBody.replace(/<article class="card"[\s\S]*?<\/article>/g, (card) => {
  const nm = (card.match(/<div class="name">([^<]+)<\/div>/) || [])[1];
  if (!nm) return card;
  const s = _slug(nm);
  if (_logos[s]) card = card.replace('<img class="asset logo-img">', `<img class="asset logo-img" src="logos/${_logos[s]}">`);
  if (_shots[s]) card = card.replace('<img class="asset shot-img">', `<img class="asset shot-img" src="shots/${_shots[s]}">`);
  return card;
});
// wrap each card's tool name in a link to its detail page (internal linking)
fullBody = fullBody.replace(/<div class="name">([^<]+)<\/div>/g, (m, n) => `<div class="name"><a class="namelink" href="/tools/${_slug(n)}">${n}</a></div>`);
const topbar = fullBody.slice(fullBody.indexOf('<div class="topbar">'), fullBody.indexOf("<header>")).trim();
const method = fullBody.slice(fullBody.indexOf('<div class="method">'), fullBody.indexOf("<footer>")).trim();
const footer = fullBody.slice(fullBody.indexOf("<footer>"), fullBody.indexOf("</footer>") + "</footer>".length).trim();
const sections = {};
(fullBody.match(/<section class="section"[\s\S]*?<\/section>/g) || []).forEach((s) => {
  const m = s.match(/data-cat="(\w+)"/);
  if (m) sections[m[1]] = s;
});

// ---- extra CSS for nav / breadcrumb / sibling links ----
const navCss = `
  /* multi-page nav */
  .catnav { border-bottom: 1px solid var(--line); background: var(--bg); }
  .catnav .wrap { display: flex; flex-wrap: wrap; gap: 4px; padding: 9px 24px; font-family: -apple-system, sans-serif; }
  .catnav a { font-size: 13px; color: var(--soft); text-decoration: none; padding: 5px 11px; border-radius: 6px; border: 1px solid transparent; }
  .catnav a:hover { border-color: var(--line); color: var(--ink); }
  .catnav a[aria-current="page"] { background: var(--accent); color: #fff; }
  .crumb { font-family: -apple-system, sans-serif; font-size: 12px; color: var(--faint); padding: 16px 0 0; }
  .crumb a { color: var(--soft); text-decoration: none; }
  .crumb a:hover { text-decoration: underline; }
  .cat-more { font-family: -apple-system, sans-serif; font-size: 12.5px; font-weight: 600; color: var(--info); text-decoration: none; margin-left: auto; white-space: nowrap; }
  .cat-more:hover { text-decoration: underline; }
  .cat-head h1 { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
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
  .toolhero h1 { margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; }
  .toolsub { font-family: -apple-system, sans-serif; font-size: 13px; color: var(--faint); margin-top: 3px; }
  .toollede { font-family: -apple-system, sans-serif; font-size: 16px; line-height: 1.5; color: var(--soft); max-width: 66ch; margin: 12px 0 22px; }
  .facts { border-collapse: collapse; width: 100%; max-width: 640px; font-family: -apple-system, sans-serif; margin: 0 0 22px; }
  .facts th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: 700; padding: 11px 16px 11px 0; vertical-align: top; white-space: nowrap; width: 118px; border-top: 1px solid var(--line); }
  .facts td { font-size: 14px; color: var(--ink); padding: 11px 0; border-top: 1px solid var(--line); }
  .facts a { color: var(--info); text-decoration: none; }
  .facts a:hover { text-decoration: underline; }
  .muted { color: var(--faint); }
  .toolsection { font-family: -apple-system, sans-serif; font-size: 14.5px; line-height: 1.55; color: var(--soft); max-width: 66ch; margin: 0 0 22px; }
  .toolsection a { color: var(--info); }
  .gh1 { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; margin: 8px 0 6px; }
  .gh { font-size: 17px; font-weight: 600; margin: 26px 0 2px; }
  .toollist { font-family: -apple-system, sans-serif; list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 8px; }
  .toollist a { color: var(--info); text-decoration: none; font-weight: 600; font-size: 15px; }
  .toollist a:hover { text-decoration: underline; }
  .guides { border-top: 1px solid var(--accent-line); background: var(--accent-soft); }
  .guides .wrap { padding: 26px 24px; }
  .guides h2 { font-size: 18px; font-weight: 600; margin: 0 0 12px; }
  .footnav { border-top: 1px solid var(--line); background: var(--bg); }
  .footnav .wrap { padding: 30px 24px 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 22px; font-family: -apple-system, sans-serif; }
  .footnav h3 { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); margin: 0 0 9px; font-weight: 700; }
  .footnav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .footnav a { font-size: 13.5px; color: var(--soft); text-decoration: none; }
  .footnav a:hover { color: var(--ink); text-decoration: underline; }
</style>`;
style = style.replace("</style>", navCss);

const cats = [
  { key: "tax", slug: "tax-preparation-software", label: "Tax Preparation", nav: "Tax prep", n: 7,
    title: "Tax Preparation Software for CPA Firms (2026) — CPA Field Guide",
    desc: "Professional tax preparation software for US CPA firms: Drake, Lacerte, ProConnect, ProSeries, UltraTax CS, CCH Axcess, and ATX — what each does, who it fits, and how open it is to integration." },
  { key: "monitor", slug: "deadline-monitoring-software", label: "Deadline & Compliance Tracking", nav: "Deadlines & Monitoring", n: 3,
    title: "Tax Deadline & Compliance Monitoring Software — CPA Field Guide",
    desc: "Deadline tracking and compliance monitoring tools for CPA firms: File In Time, DueDateHQ, and ONESOURCE Calendar — passive trackers versus active monitors that watch the IRS, states, and FEMA." },
  { key: "pm", slug: "practice-management-software", label: "Practice Management", nav: "Practice mgmt", n: 10,
    title: "Accounting Practice Management Software — CPA Field Guide",
    desc: "Practice management and workflow software for accounting firms: Karbon, TaxDome, Canopy, Financial Cents, Jetpack Workflow, Keeper, Firm360, Pixie, Aiwyn, and Ignition — features, firm-size fit, and API openness." },
  { key: "ledger", slug: "accounting-software", label: "Accounting & Bookkeeping", nav: "Bookkeeping", n: 5,
    title: "Accounting & Bookkeeping Software for CPA Firms — CPA Field Guide",
    desc: "General-ledger and bookkeeping software CPA firms use: QuickBooks Online, Xero, Bill.com, Sage, and the Intuit ProAdvisor channel — and how each connects to the rest of the firm stack." },
];
const slugOf = Object.fromEntries(cats.map((c) => [c.key, c.slug]));
const labelToSlug = Object.fromEntries(cats.map((c) => [c.label, c.slug]));

// ---- per-tool data (parsed from the already-built cards) for detail pages ----
const officialUrl = {
  "Drake Tax": "https://www.drakesoftware.com", "Lacerte": "https://accountants.intuit.com/tax/lacerte/",
  "ProConnect": "https://accountants.intuit.com/tax/proconnect/", "ProSeries": "https://accountants.intuit.com/tax/proseries/",
  "UltraTax CS": "https://tax.thomsonreuters.com/us/en/cs-professional-suite/ultratax-cs",
  "CCH Axcess": "https://www.wolterskluwer.com/en/solutions/cch-axcess/tax", "ATX": "https://www.wolterskluwer.com/en/solutions/atx",
  "File In Time": "https://www.timevalue.com/file-in-time", "DueDateHQ": "https://duedatehq.com",
  "ONESOURCE Calendar": "https://tax.thomsonreuters.com/en/onesource/workflow-manager/calendar",
  "Karbon": "https://karbonhq.com", "TaxDome": "https://taxdome.com", "Canopy": "https://www.getcanopy.com",
  "Financial Cents": "https://financial-cents.com", "Jetpack Workflow": "https://jetpackworkflow.com",
  "Keeper": "https://keeper.app", "Firm360": "https://www.myfirm360.com", "Pixie": "https://www.usepixie.com",
  "Aiwyn": "https://www.aiwyn.ai", "Ignition": "https://www.ignitionapp.com",
  "QuickBooks Online": "https://quickbooks.intuit.com", "Xero": "https://www.xero.com", "Bill.com": "https://www.bill.com",
  "Sage": "https://www.sage.com", "ProAdvisor": "https://quickbooks.intuit.com/accountants/proadvisor/",
};
const openExplain = {
  "d-open": "It offers a self-serve public API, so it is among the easiest tools here to connect to.",
  "d-gated": "It has an API, but access is gated behind approval, a partner program, or a higher plan.",
  "d-zap": "It has no direct API; it connects to other tools through Zapier.",
  "d-closed": "It has no public API; data moves in and out by file export.",
  "d-info": "It has no public API yet.",
};
const toolData = [];
for (const c of cats) {
  const sec = sections[c.key] || "";
  (sec.match(/<article class="card"[\s\S]*?<\/article>/g) || []).forEach((card) => {
    const g = (re) => (card.match(re) || [])[1] || "";
    const name = g(/<div class="name">(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/div>/);
    if (!name) return;
    toolData.push({
      name, slug: _slug(name), catKey: c.key, catLabel: c.label, catSlug: c.slug,
      seg: g(/<div class="seg">([^<]+)<\/div>/),
      desc: g(/<p class="desc">([\s\S]*?)<\/p>/),
      price: g(/<span class="price">([^<]+)<\/span>/),
      share: g(/<span class="share">([^<]+)<\/span>/),
      openClass: g(/<span class="tag"><span class="dot (d-[a-z]+)"><\/span>/),
      openLabel: g(/<span class="tag"><span class="dot d-[a-z]+"><\/span>([^<]+)<\/span>/),
      dataSeg: g(/data-seg="([^"]+)"/),
      logo: (card.match(/<div class="logo"[\s\S]*?<\/div>/) || [""])[0],
      url: officialUrl[name] || "",
    });
  });
}
const esc = (s) => String(s).replace(/&(?!amp;|lt;|gt;|#\d)/g, "&amp;");

// shared footer link graph (added to every page for internal linking + crawl)
const footerNav = `<div class="footnav"><div class="wrap">` +
  `<div><h3>Categories</h3><ul>${cats.map((c) => `<li><a href="/${c.slug}">${c.nav}</a></li>`).join("")}</ul></div>` +
  `<div><h3>Guides</h3><ul><li><a href="/cpa-software-with-open-api">Software with an open API</a></li><li><a href="/best-cpa-software-for-solo-firms">Best for solo firms</a></li><li><a href="/best-cpa-software-for-small-firms">Best for small firms</a></li></ul></div>` +
  `<div><h3>Directory</h3><ul><li><a href="/">All ${toolData.length} tools</a></li></ul></div>` +
  `</div></div>`;
const footerBlock = footerNav + "\n\n" + footer;

// per-category FAQ (real, sourced answers — strong for AI answer engines)
const faqByCat = {
  tax: [
    ["What is the cheapest professional tax software?", "Drake Tax and ATX are the lowest-cost unlimited desktop options; Intuit ProSeries and ProConnect use pay-per-return pricing that can be cheaper at low volume."],
    ["Do professional tax packages e-file state returns?", "Yes — all support IRS Modernized e-File (MeF) and the matching state e-filing. Multi-state coverage and per-return economics vary by product."],
    ["Which tax software do the largest firms use?", "UltraTax CS and CCH Axcess Tax lead at mid-to-large firms (2025 AICPA survey), while Drake dominates among sole practitioners."],
  ],
  monitor: [
    ["What is the difference between a deadline tracker and a compliance monitor?", "A passive tracker records the due dates you enter and rolls them forward. An active monitor also watches the IRS, state agencies, and FEMA and flags when a date changes and which clients it affects."],
    ["Is deadline tracking built into practice management software?", "Usually yes — Karbon, Canopy, TaxDome, Financial Cents, and Jetpack all include due-date tracking. The standalone tools here focus on it specifically."],
  ],
  pm: [
    ["How much does accounting practice management software cost?", "Entry pricing runs from about $19/user/mo (Financial Cents) to $59–67/user/mo (Karbon, TaxDome). Some, like Pixie, charge a flat monthly fee; enterprise tools such as Aiwyn are custom-quoted."],
    ["Which practice management tool has the best API?", "Karbon offers the deepest self-serve public API with webhooks; TaxDome also issues self-serve keys. Canopy's API is approval-gated, and several others connect only through Zapier."],
    ["Which is best for a small tax firm?", "TaxDome and Canopy are popular all-in-ones with client portals; Financial Cents and Jetpack are lighter and lower-cost; Karbon leads on integration depth."],
  ],
  ledger: [
    ["QuickBooks Online vs Xero — which should a firm use?", "QuickBooks Online dominates US small business and has 500k+ ProAdvisors, so most US firms standardize on it; Xero is strong internationally with a comparable open API. Both offer self-serve APIs and app stores."],
    ["How much is QuickBooks Online for accountants?", "QuickBooks Online starts around $35/mo (Simple Start). Accountants join the free ProAdvisor program for discounted client subscriptions and firm tools."],
  ],
};

const tools = [
  ["Drake Tax", "https://www.drakesoftware.com", "Tax Preparation"],
  ["Lacerte", "https://accountants.intuit.com/tax/lacerte/", "Tax Preparation"],
  ["ProConnect Tax", "https://accountants.intuit.com/tax/proconnect/", "Tax Preparation"],
  ["ProSeries", "https://accountants.intuit.com/tax/proseries/", "Tax Preparation"],
  ["UltraTax CS", "https://tax.thomsonreuters.com/us/en/cs-professional-suite/ultratax-cs", "Tax Preparation"],
  ["CCH Axcess Tax", "https://www.wolterskluwer.com/en/solutions/cch-axcess/tax", "Tax Preparation"],
  ["ATX", "https://www.wolterskluwer.com/en/solutions/atx", "Tax Preparation"],
  ["File In Time", "https://www.timevalue.com/file-in-time", "Deadline & Compliance Tracking"],
  ["DueDateHQ", "https://duedatehq.com", "Deadline & Compliance Tracking"],
  ["ONESOURCE Calendar", "https://www.thomsonreuters.com", "Deadline & Compliance Tracking"],
  ["Karbon", "https://karbonhq.com", "Practice Management"],
  ["TaxDome", "https://taxdome.com", "Practice Management"],
  ["Canopy", "https://www.getcanopy.com", "Practice Management"],
  ["Financial Cents", "https://financial-cents.com", "Practice Management"],
  ["Jetpack Workflow", "https://jetpackworkflow.com", "Practice Management"],
  ["Keeper", "https://keeper.app", "Practice Management"],
  ["Firm360", "https://www.myfirm360.com", "Practice Management"],
  ["Pixie", "https://www.usepixie.com", "Practice Management"],
  ["Aiwyn", "https://www.aiwyn.ai", "Practice Management"],
  ["Ignition", "https://www.ignitionapp.com", "Practice Management"],
  ["QuickBooks Online", "https://quickbooks.intuit.com", "Accounting & Bookkeeping"],
  ["Xero", "https://www.xero.com", "Accounting & Bookkeeping"],
  ["Bill.com", "https://www.bill.com", "Accounting & Bookkeeping"],
  ["Sage", "https://www.sage.com", "Accounting & Bookkeeping"],
  ["Intuit ProAdvisor", "https://quickbooks.intuit.com/accountants/proadvisor/", "Accounting & Bookkeeping"],
];
const org = {
  "@type": "Organization", "@id": ORIGIN + "/#org", name: "CPA Field Guide", url: ORIGIN + "/",
  logo: ORIGIN + "/og.png", sameAs: ["https://duedatehq.com"],
  description: "Independent, vendor-neutral directory of US tax and accounting software, maintained by the team behind DueDateHQ.",
};

function head(title, desc, canonical) {
  const fav = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><rect width='30' height='30' rx='8' fill='%231A1A1A'/><path d='M15 6 L18.2 15 L11.8 15 Z' fill='%232F6DA6'/><path d='M15 24 L11.8 15 L18.2 15 Z' fill='%237C7C77'/></svg>";
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
</head>`;
}

function catnav(activeKey) {
  const links = [
    `<a href="/"${activeKey === "home" ? ' aria-current="page"' : ""}>All</a>`,
    ...cats.map((c) => `<a href="/${c.slug}"${activeKey === c.key ? ' aria-current="page"' : ""}>${c.nav}</a>`),
  ].join("\n      ");
  return `<nav class="catnav" aria-label="Categories">\n    <div class="wrap">\n      ${links}\n    </div>\n  </nav>`;
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
    var controls = document.querySelector(".catnav");
  })();
</script>`;

// ---------- HOMEPAGE ----------
let homeBody = fullBody;
// inject category nav after topbar
homeBody = homeBody.replace("<header>", catnav("home") + "\n\n<header>");
// drop the redundant Category filter row on the homepage (the top catnav already navigates categories)
homeBody = homeBody.replace(/<span class="clabel">Category<\/span>[\s\S]*?<span class="sep" aria-hidden="true"><\/span>\s*/, "");
// add "view all" links from each homepage category heading to its page
for (const c of cats) {
  const secOpenRe = new RegExp(`(<section class="section" data-cat="${c.key}">\\s*<div class="cat-head">(?:<span class="cat-icon">[\\s\\S]*?<\\/span>)?)(<h2>[\\s\\S]*?<\\/h2><span class="count">[^<]*<\\/span>)(</div>)`);
  homeBody = homeBody.replace(secOpenRe, `$1$2<a class="cat-more" href="/${c.slug}">View all ${c.n} &rarr;</a>$3`);
}
// homepage: link the guide pages (internal links so they aren't orphaned)
homeBody = homeBody.replace(
  '<div class="faq">',
  `<div class="guides"><div class="wrap"><h2>Guides</h2><ul class="toollist"><li><a href="/cpa-software-with-open-api">CPA &amp; accounting software with an open API</a></li><li><a href="/best-cpa-software-for-solo-firms">Best software for solo CPA firms</a></li><li><a href="/best-cpa-software-for-small-firms">Best software for small CPA firms</a></li></ul></div></div>\n\n<div class="faq">`
);
homeBody = homeBody.replace("<footer>", footerNav + "\n<footer>");
const homeHtml = head(
  "CPA Field Guide — US Tax & Accounting Software Directory (2026)",
  "Independent, vendor-neutral directory of US tax & accounting software: tax preparation, deadline monitoring, practice management, and bookkeeping. Category definitions, inclusion criteria, and integration openness. No pay-to-list.",
  ORIGIN + "/"
) + "\n<body>\n" + homeBody + "\n</body>\n</html>\n";
writeFileSync(base + "/deploy/index.html", homeHtml);

// ---------- CATEGORY PAGES ----------
for (const c of cats) {
  let section = sections[c.key];
  // promote the category H2 to H1 for this landing page
  section = section.replace("<h2>", "<h1>").replace("</h2>", "</h1>");
  const url = `${ORIGIN}/${c.slug}`;
  const catTools = tools.filter((t) => t[2] === c.label);
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; ${c.label.replace("&", "&amp;")}</nav></div>`;
  const siblings = cats.filter((s) => s.key !== c.key);
  const sibnav = `<div class="sibnav"><div class="wrap"><h2>Other categories</h2><ul>` +
    `<li><a href="/">All ${tools.length} tools</a></li>` +
    siblings.map((s) => `<li><a href="/${s.slug}">${s.label.replace("&", "&amp;")} (${s.n})</a></li>`).join("") +
    `</ul></div></div>`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      org,
      { "@type": "CollectionPage", "@id": url + "#webpage", url: url, name: c.title,
        isPartOf: { "@id": ORIGIN + "/#website" }, about: c.label + " software for CPA firms",
        inLanguage: "en-US", datePublished: DATE, dateModified: DATE,
        primaryImageOfPage: ORIGIN + "/og.png", breadcrumb: { "@id": url + "#breadcrumb" },
        speakable: { "@type": "SpeakableSpecification", cssSelector: [".faq h3", ".faq p"] } },
      { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [
        { "@type": "ListItem", position: 1, name: "CPA Field Guide", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: c.label, item: url },
      ] },
      { "@type": "ItemList", name: c.label + " software", numberOfItems: catTools.length,
        itemListElement: catTools.map((t, i) => ({ "@type": "ListItem", position: i + 1,
          item: { "@type": "SoftwareApplication", name: t[0], url: t[1], applicationCategory: t[2] + " software" } })) },
      ...(faqByCat[c.key] ? [{ "@type": "FAQPage", mainEntity: faqByCat[c.key].map((f) => ({ "@type": "Question", name: f[0], acceptedAnswer: { "@type": "Answer", text: f[1] } })) }] : []),
    ],
  };
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;

  const catFaq = faqByCat[c.key] || [];
  const catFaqHtml = catFaq.length
    ? `<div class="faq"><div class="wrap"><h2>${c.label.replace("&", "&amp;")} — FAQ</h2>` +
      catFaq.map((f) => `<div class="qa"><h3>${f[0]}</h3><p>${f[1]}</p></div>`).join("") + `</div></div>`
    : "";
  const guideNav = `<div class="sibnav"><div class="wrap"><h2>Related guides</h2><ul>` +
    `<li><a href="/cpa-software-with-open-api">Software with an open API</a></li>` +
    `<li><a href="/best-cpa-software-for-solo-firms">Best for solo firms</a></li>` +
    `<li><a href="/best-cpa-software-for-small-firms">Best for small firms</a></li></ul></div></div>`;
  const body = [
    topbar, catnav(c.key), '<main class="wrap">', crumb, section, "</main>",
    catFaqHtml, sibnav, guideNav, method, footerBlock, revealScript, ld,
  ].join("\n\n");
  const page = head(c.title, c.desc, url) + "\n<body>\n" + body + "\n</body>\n</html>\n";
  writeFileSync(base + "/deploy/" + c.slug + ".html", page);
}

// ---------- TOOL PAGES (/tools/<slug>) ----------
mkdirSync(base + "/deploy/tools", { recursive: true });
for (const t of toolData) {
  const url = `${ORIGIN}/tools/${t.slug}`;
  const catHtml = t.catLabel.replace("&", "&amp;");
  const siblings = toolData.filter((x) => x.catKey === t.catKey && x.slug !== t.slug);
  const domain = t.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; <a href="/${t.catSlug}">${catHtml}</a> &nbsp;/&nbsp; ${esc(t.name)}</nav></div>`;
  const facts = `<table class="facts"><tbody>` +
    `<tr><th>Category</th><td><a href="/${t.catSlug}">${catHtml}</a></td></tr>` +
    `<tr><th>Best for</th><td>${t.seg} firms</td></tr>` +
    `<tr><th>Pricing</th><td>${esc(t.price)}${t.share ? ` <span class="muted">· ${esc(t.share)}</span>` : ""}</td></tr>` +
    `<tr><th>Integration</th><td>${esc(t.openLabel)}</td></tr>` +
    `<tr><th>Official site</th><td><a href="${t.url}" target="_blank" rel="nofollow noopener">${domain}</a></td></tr>` +
    `</tbody></table>`;
  const connects = `<p class="toolsection"><strong>How it connects.</strong> ${openExplain[t.openClass] || ""} <a href="/cpa-software-with-open-api">Compare every tool by integration openness &rarr;</a></p>`;
  const related = siblings.length
    ? `<div class="sibnav"><div class="wrap"><h2>Other ${catHtml} tools</h2><ul>` +
      siblings.map((s) => `<li><a href="/tools/${s.slug}">${esc(s.name)}</a></li>`).join("") +
      `<li><a href="/${t.catSlug}">See all &rarr;</a></li></ul></div></div>`
    : "";
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      org,
      { "@type": "SoftwareApplication", name: t.name, applicationCategory: t.catLabel + " software",
        url: t.url, sameAs: t.url, description: t.desc },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "CPA Field Guide", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: t.catLabel, item: `${ORIGIN}/${t.catSlug}` },
        { "@type": "ListItem", position: 3, name: t.name, item: url },
      ] },
    ],
  };
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;
  const logoBig = t.logo.replace('class="logo"', 'class="logo logo-lg"');
  const body = [
    topbar, catnav(t.catKey), '<main class="wrap">', crumb,
    `<div class="toolhero">${logoBig}<div><h1>${esc(t.name)}</h1><div class="toolsub">${catHtml} · ${t.seg}</div></div></div>`,
    `<p class="toollede">${esc(t.desc)}</p>`, facts, connects, "</main>", related, method, footerBlock, revealScript, ld,
  ].join("\n\n");
  const title = `${t.name} — Pricing, Features & Integration | CPA Field Guide`;
  const desc = esc(`${t.name}: ${t.desc} Pricing: ${t.price}. Who it's for and how open it is to integration.`).slice(0, 300);
  writeFileSync(base + "/deploy/tools/" + t.slug + ".html", head(esc(title), desc, url) + "\n<body>\n" + body + "\n</body>\n</html>\n");
}

// ---------- GUIDE PAGES ----------
function guidePage(slug, title, h1, intro, groups, faq) {
  const url = `${ORIGIN}/${slug}`;
  const crumb = `<div class="wrap"><nav class="crumb" aria-label="Breadcrumb"><a href="/">CPA Field Guide</a> &nbsp;/&nbsp; ${h1}</nav></div>`;
  const groupsHtml = groups.filter((gp) => gp.items.length).map((gp) =>
    `<h2 class="gh">${gp.h}</h2>${gp.note ? `<p class="toolsection">${gp.note}</p>` : ""}<ul class="toollist">` +
    gp.items.map((t) => `<li><a href="/tools/${t.slug}">${esc(t.name)}</a> <span class="muted">— ${esc(t.price)}${t.share ? ` · ${esc(t.share)}` : ""}</span></li>`).join("") +
    `</ul>`).join("\n");
  const allItems = groups.flatMap((gp) => gp.items);
  const graph = { "@context": "https://schema.org", "@graph": [ org,
    { "@type": "CollectionPage", "@id": url + "#webpage", url, name: title, isPartOf: { "@id": ORIGIN + "/#website" },
      inLanguage: "en-US", datePublished: DATE, dateModified: DATE, primaryImageOfPage: ORIGIN + "/og.png", breadcrumb: { "@id": url + "#breadcrumb" } },
    { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "CPA Field Guide", item: ORIGIN + "/" },
      { "@type": "ListItem", position: 2, name: h1, item: url } ] },
    { "@type": "ItemList", numberOfItems: allItems.length, itemListElement: allItems.map((t, i) => ({ "@type": "ListItem", position: i + 1,
      item: { "@type": "SoftwareApplication", name: t.name, url: t.url || `${ORIGIN}/tools/${t.slug}`, applicationCategory: t.catLabel + " software" } })) },
    ...(faq ? [{ "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f[0], acceptedAnswer: { "@type": "Answer", text: f[1] } })) }] : []),
  ] };
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;
  const faqHtml = faq ? `<div class="faq"><div class="wrap"><h2>FAQ</h2>` + faq.map((f) => `<div class="qa"><h3>${f[0]}</h3><p>${f[1]}</p></div>`).join("") + `</div></div>` : "";
  const body = [ topbar, catnav(""), '<main class="wrap">', crumb, `<h1 class="gh1">${h1}</h1>`, `<p class="toollede">${intro}</p>`, groupsHtml, "</main>", faqHtml, method, footerBlock, revealScript, ld ].join("\n\n");
  writeFileSync(base + "/deploy/" + slug + ".html", head(esc(title), esc(intro).replace(/<[^>]+>/g, "").slice(0, 300), url) + "\n<body>\n" + body + "\n</body>\n</html>\n");
  return url;
}
const seg = (key) => cats.map((c) => ({ h: c.label.replace("&", "&amp;"), items: toolData.filter((t) => t.catKey === c.key && t.dataSeg.split(",").includes(key)) }));
const guideUrls = [
  guidePage("cpa-software-with-open-api",
    "CPA & Accounting Software With an Open API (2026) — CPA Field Guide",
    "CPA &amp; accounting software with an open API",
    "How open a tool is to integration decides how much it locks you in. Here is every tool in this guide sorted by that — the ones with a self-serve public API first.",
    [
      { h: "Open API — self-serve", note: "You can generate an API key yourself and build against it, no approval needed.", items: toolData.filter((t) => t.openClass === "d-open") },
      { h: "Gated API", note: "An API exists, but access needs approval, a partner program, or a higher plan.", items: toolData.filter((t) => t.openClass === "d-gated") },
      { h: "Zapier only", note: "No direct API; they connect to the rest of your stack through Zapier.", items: toolData.filter((t) => t.openClass === "d-zap") },
    ],
    [
      ["Which CPA practice-management tool has the best API?", "Karbon offers the most complete self-serve public API with webhooks; TaxDome also issues self-serve keys. Both let you build directly, without a partner agreement."],
      ["What does an open API mean for accounting software?", "It means you can generate an API key yourself and integrate without vendor approval — the lowest-friction way to connect a tool to the rest of your firm's stack."],
    ]),
  guidePage("best-cpa-software-for-solo-firms",
    "Best CPA Software for Solo Firms & Sole Practitioners (2026)",
    "Best software for solo CPA firms",
    "Software scoped and priced for a one-person US tax or accounting practice, grouped by what each does. Every price is a real starting figure.",
    seg("solo")),
  guidePage("best-cpa-software-for-small-firms",
    "Best CPA Software for Small Firms (2026) — CPA Field Guide",
    "Best software for small CPA firms",
    "Tools that fit a small (roughly 2–10 person) US tax or accounting firm, grouped by what each does, with real starting prices.",
    seg("small")),
];

// ---------- llms.txt (a map for AI answer engines / GEO) ----------
const llms = `# CPA Field Guide
> Independent, vendor-neutral directory of US tax & accounting software for CPA and accounting firms — tax preparation, deadline monitoring, practice management, and bookkeeping. Every tool is defined, priced, and rated for how open it is to integration. No vendor pays for placement. Reviewed ${DATE}.

## Categories
${cats.map((c) => `- [${c.label}](${ORIGIN}/${c.slug}): ${c.desc}`).join("\n")}

## Guides
- [CPA & accounting software with an open API](${ORIGIN}/cpa-software-with-open-api)
- [Best software for solo CPA firms](${ORIGIN}/best-cpa-software-for-solo-firms)
- [Best software for small CPA firms](${ORIGIN}/best-cpa-software-for-small-firms)

## Tools
${toolData.map((t) => `- [${t.name}](${ORIGIN}/tools/${t.slug}): ${t.catLabel}. ${t.price}. ${t.openLabel}. ${t.desc}`).join("\n")}
`;
writeFileSync(base + "/deploy/llms.txt", llms);

// ---------- branded 404 ----------
const notFound =
  head("Page not found — CPA Field Guide", "That page does not exist. Browse the independent directory of US tax & accounting software.", ORIGIN + "/404") +
  `\n<body>\n${topbar}\n\n${catnav("")}\n\n<main class="wrap"><div style="padding:56px 0 40px"><h1 class="gh1">Page not found</h1><p class="toollede">That page does not exist. Try the <a href="/">full directory</a>, or pick a category above.</p></div></main>\n\n${footerBlock}\n</body>\n</html>\n`;
writeFileSync(base + "/deploy/404.html", notFound);

// ---------- sitemap (home + categories + guides + tools) ----------
const entries = [
  { u: ORIGIN + "/", p: "1.0" },
  ...cats.map((c) => ({ u: `${ORIGIN}/${c.slug}`, p: "0.8" })),
  ...guideUrls.map((u) => ({ u, p: "0.8" })),
  ...toolData.map((t) => ({ u: `${ORIGIN}/tools/${t.slug}`, p: "0.6" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.u}</loc><lastmod>${DATE}</lastmod><changefreq>weekly</changefreq><priority>${e.p}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(base + "/deploy/sitemap.xml", sitemap);

console.log("pages:", 1 + cats.length + guideUrls.length + toolData.length, "(home + " + cats.length + " categories + " + guideUrls.length + " guides + " + toolData.length + " tools)");
console.log("sitemap urls:", entries.length);
