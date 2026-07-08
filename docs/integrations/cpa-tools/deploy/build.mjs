import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
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
  .catnav a[aria-current="page"] { background: var(--ink); color: #fff; }
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
  logo: ORIGIN + "/og.png",
  description: "Independent, vendor-neutral directory of US tax and accounting software, maintained by the team behind DueDateHQ.",
};

function head(title, desc, canonical) {
  const fav = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><rect width='30' height='30' rx='8' fill='%231A1A1A'/><path d='M15 6 L18.2 15 L11.8 15 Z' fill='%2322936A'/><path d='M15 24 L11.8 15 L18.2 15 Z' fill='%237C7C77'/></svg>";
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
  const secOpenRe = new RegExp(`(<section class="section" data-cat="${c.key}">\\s*<div class="cat-head">)(<h2>[\\s\\S]*?<\\/h2><span class="count">[^<]*<\\/span>)(</div>)`);
  homeBody = homeBody.replace(secOpenRe, `$1$2<a class="cat-more" href="/${c.slug}">View all ${c.n} &rarr;</a>$3`);
}
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
        primaryImageOfPage: ORIGIN + "/og.png", breadcrumb: { "@id": url + "#breadcrumb" } },
      { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [
        { "@type": "ListItem", position: 1, name: "CPA Field Guide", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: c.label, item: url },
      ] },
      { "@type": "ItemList", name: c.label + " software", numberOfItems: catTools.length,
        itemListElement: catTools.map((t, i) => ({ "@type": "ListItem", position: i + 1,
          item: { "@type": "SoftwareApplication", name: t[0], url: t[1], applicationCategory: t[2] + " software" } })) },
    ],
  };
  const ld = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;

  const body = [
    topbar,
    catnav(c.key),
    '<main class="wrap">',
    crumb,
    section,
    "</main>",
    sibnav,
    method,
    footer,
    revealScript,
    ld,
  ].join("\n\n");
  const page = head(c.title, c.desc, url) + "\n<body>\n" + body + "\n</body>\n</html>\n";
  writeFileSync(base + "/deploy/" + c.slug + ".html", page);
}

// ---------- sitemap ----------
const urls = [ORIGIN + "/", ...cats.map((c) => `${ORIGIN}/${c.slug}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u, i) => `  <url><loc>${u}</loc><lastmod>${DATE}</lastmod><changefreq>weekly</changefreq><priority>${i === 0 ? "1.0" : "0.8"}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(base + "/deploy/sitemap.xml", sitemap);

console.log("pages written: index.html +", cats.map((c) => c.slug + ".html").join(", "));
console.log("sitemap urls:", urls.length);
