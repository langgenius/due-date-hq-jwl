# CPA-Software Directory — Competitive Landscape, Taxonomy Check & Go/No-Go

**For:** the "CPA Field Guide" directory idea · **Date:** 2026-07-07 · **Status:** research + decision brief. Companion to [landscape.md](landscape.md) (the integration research) and the prototype [cpa-tools-directory.html](cpa-tools-directory.html).

This exists because an earlier quick take ("red ocean, not worth it") wasn't earned — it was three web searches. This is the real version: four parallel sourced research passes on (1) who already does this, (2) how tools are actually categorized, (3) how CPAs really choose software + SEO reality, (4) the honest verdict.

---

## Bottom line

**Do similar sites exist? Yes — many. But almost every one is compromised, which is not the same as "the need is met."** There is a real gap (open + structured + genuinely neutral + CPA-specific + fresh). **But it is a gap that is hard to fill, slow to pay off, already occupied by trusted humans, and would be undercut by DueDateHQ's own conflict of interest.** For a pre-validation startup whose #1 job is getting CPAs to try the product, building this as a directory/SEO business is the wrong bet. A small, genuinely-neutral one-pager as outreach collateral is the only version worth considering — and even that cannot be deadline-framed or rank DueDateHQ #1.

---

## 1. Who already does this — and why each is compromised

The space is crowded, but sorted by what a CPA actually needs (open · filterable · structured data · vendor-neutral · CPA-specific · fresh), **nobody hits all six.**

### Horizontal review directories

- **G2, Capterra, GetApp, Software Advice** — real filterable categories (Capterra "Accounting Practice Management" = **181 products**; G2 category = **4,145 reviews**). **But two disqualifiers for a CPA:** (a) **explicitly pay-to-play** — "Sponsored" is the _default sort_, vendors pay ~$3k–$95k/yr for placement/badges, "$2–$20+ per click," and you can effectively pay to be a "Category Leader" ([Capterra pay-to-play write-up](https://retaintrust.com/advertising-on-capterra-and-software-advice/), [Dark Side of G2/Capterra](https://www.linkedin.com/pulse/calling-out-g2-capterra-dark-side-app-directories-reviews-moore-ev6wc)); (b) **US-tax-blind and integration-silent** — nothing on e-file reliability, multistate, K-1/K-2/K-3, or how tools plug into the UltraTax/Lacerte/CCH stack.
- **Consolidation just made it worse:** G2 **acquired Capterra, GetApp, and Software Advice from Gartner** (closed **Feb 5, 2026**), so the four biggest directories are now **one owner** promising "a new pay-per-lead offering" ([PR Newswire](https://www.prnewswire.com/news-releases/g2-to-acquire-capterra-software-advice-and-getapp-from-gartner-302673901.html)). The "independent" landscape got less independent — which makes the neutrality gap timelier, but also concentrates the SEO authority you'd fight.
- **Second-tier** (SourceForge, Slashdot, SaaSworthy, Crozdesk, FinancesOnline, SoftwareSuggest, GoodFirms) — all sponsored-first / lead-gen, thin on US-tax nuance, padded with non-US products. **Gartner Peer Insights / PeerSpot** — high-trust but enterprise-only; near-empty for small-firm CPA tools.

### Accounting-industry-specific sources

- **CPA Practice Advisor** — the authoritative niche name; **Readers' Choice Awards** (~4,000 practitioner voters, 30+ categories) is genuinely useful _popularity_ data. **But:** it's a popularity vote that structurally favors incumbents (Drake, Intuit), the "directory" itself is sponsored PR, and — the real red flag — it's **owned by Rightworks, a company that sells accounting-firm software/hosting** (undisclosed conflict). [2025 winners](https://www.cpapracticeadvisor.com/2025/05/09/accountants-and-tax-pros-rank-their-favorite-tech-2025-readers-choice-award-winners-announced/160262/)
- **AICPA / Journal of Accountancy Tax Software Survey** — the most rigorous neutral data (2,011 credentialed fee preparers; market share UltraTax 22.9%, Drake 16.3%, Lacerte 15.8%). **But it's an annual survey, not a browsable directory.** [2025 survey](https://www.journalofaccountancy.com/issues/2025/sep/2025-tax-software-survey/)
- **Accounting Today** — clean editorial (owned by a media co, no product conflict), but a once-a-year ~12-product listicle, not filterable. [2026 Top New Products](https://www.accountingtoday.com/list/the-2026-top-new-products-for-accountants)
- **CPA.com (AICPA's commercial arm)** — a paid preferred-partner list (one vendor per category), and its accelerator can **take equity/IP in the tools it promotes**. A sales surface, not a guide.
- **Future Firm / TOA / vendor tech-stack guides (Karbon, Ignition, TaxDome, Canopy)** — accounting-literate but **affiliate-monetized or self-ranking** ("Canopy is the leading choice…"). Vendor marketplaces (QBO/Xero/CCH/Thomson) are the truth source for _integrations_ but are **platform-locked**.
- **AccountingWEB US** — the one independent US community+directory model — **shut down in 2022**, vacant ~4 years.

### The one genuinely-independent competitor to know

- **Jason Staats' App Database** ([jasononfirms.com/apps](https://www.jasononfirms.com/apps)) — 200+ apps, ~13 US categories, a **Leaders/Contenders/Watching/Laggards** rating that _warns as well as recommends_, explicitly **no affiliate / not paid**, versioned to 2026, "trusted by 8k+ firms," backed by ~1,000-firm switching data. **This is the reference competitor.** Its weaknesses (the wedge, if anyone builds this): **email-gated** (not open/linkable/SEO-able), single-editor, and **no structured spec data** (pricing/integrations as fields). Its strength — _independent + reputation-carrying human_ — is exactly what a cold anonymous directory cannot copy.

**Summary:** the market is review-farms (pay-to-play) + biased vendor listicles + trade-media awards (incumbent-owned or popularity-biased) + one gated independent human + a dead US community site. **Nobody combines open + filterable + structured + truly neutral + CPA-specific + fresh.** The gap is real.

---

## 2. Is the taxonomy correct and useful? No — fix it

The prototype uses 4 buckets: **deadline monitoring · practice management · tax prep · ledgers.** Checked against G2, Capterra, and CPA Practice Advisor's 30+ Readers' Choice categories:

- **"Deadline monitoring" is not a legitimate top-level category.** _No_ authoritative source treats it as one — Capterra lists "due date tracking" as a **feature** of Accounting Practice Management; every tech-stack guide places it _inside_ practice management. Elevating it to a peer of "tax prep" is a **vendor-centric distortion** (it's DueDateHQ's own niche) that makes the directory read as marketing, not reference.
- **Four buckets is too thin.** A CPA expects, and will look for: document management & client portal, payroll, sales/indirect tax (Avalara/Vertex), proposals/engagement/billing & payments (Ignition), audit & assurance, tax planning, tax research, e-signature.

**Recommended 7-bucket taxonomy** (deadline tracking demoted to a sub-capability where it belongs):

1. **Tax & Compliance** — prep/e-file, planning, research, sales/indirect tax
2. **Practice & Workflow Management** — jobs, capacity, workflow, CRM, _and due-date tracking as a sub-capability_ ← where DueDateHQ actually competes
3. **Client Collaboration** — document management, portal, e-signature
4. **Billing, Proposals & Payments (AR)**
5. **Accounting & Bookkeeping** — GL (QBO/Xero), write-up, expense/AP
6. **Payroll & Assurance** — payroll + audit
7. **Firm Infrastructure & AI** — hosting/security, analytics, AI copilots

The single most important change: **demote deadline monitoring into practice management.** It's the one choice no source supports, and fixing it is what moves the page from "vendor brochure" to "credible reference."

---

## 3. How CPAs actually choose software (and the SEO reality)

- **Peer word-of-mouth dominates, not directories.** CPAs route _around_ review sites to r/taxpros (credential-gated), r/Accounting (400k+), Facebook groups, TaxProTalk, and conferences. In real recommendation threads, peers answer with **diagnostic questions, not directory links** ("what do you use now? how many states? what returns? cost?"). Peer recommendation trust ≈ 82%; anonymous reviews rank near the bottom.
- **What's hard for them:** price/pricing opacity (**61.5%** of tax-software complaints cite price), tool sprawl (avg firm ~10 apps, only ~41% "fully integrated"), and switching regret.
- **SEO is not winnable on a pre-validation timeline.** DR0 site + finance/YMYL longer sandbox; only **1.74%** of new pages rank top-10 within a year; average #1 result is ~5 years old; **AI Overviews now appear on ~50% of searches** and cut position-1 clicks 34–58% on exactly the "best / X vs Y / alternatives" queries a directory targets ([Ahrefs](https://ahrefs.com/blog/how-long-does-it-take-to-rank-in-google-and-how-old-are-top-ranking-pages/), [Ahrefs AIO](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/), [Pew](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)). Head and "X vs Y" terms are owned by the vendors themselves; only low-volume deadline long-tail is realistically winnable, in 12–24 months, payoff in years 2–3.

---

## 4. Verdict for a pre-validation startup

- **(i) As an SEO/traffic engine → No.** The timeline (years 2–3), the AI-Overview click erosion, and vendor-defended SERPs make this a bet a pre-validation company can't afford.
- **(ii) As a credibility/outreach asset → Qualified yes, small.** The neutrality gap is real and newly timely (G2 consolidation). A genuinely-neutral, practitioner-voiced one-pager could be a _trust artifact_ to link in outreach ("we published an honest, un-bought comparison"). **But the constraints gut its lead-gen value:** it must be transparently non-monetized, must **not** center a deadline lens, and must **not** rank DueDateHQ #1 — or it becomes the pay-to-play thing it's replacing.
- **(iii) Not at all → the strongest realistic option.** The independent position is already held by reputation-carrying humans (Jason Staats et al.) that a cold directory cannot out-trust, on a timeline it can't afford, for traffic AI Overviews will skim. **Redirect the effort** into the peer/community channels that actually decide CPA software (r/taxpros, Facebook groups, a Staats-style creator relationship, conference/state-society presence) and product-led loops.

**What would change this:** if DueDateHQ already had domain authority or an email list; if a creator (Staats-style) co-branded it; or if you commit to true editorial independence with a revenue model that isn't the thing being criticized. None of those are true today.

**Recommendation:** don't build "CPA Field Guide" as a directory/SEO play. Keep the domain parked. If you want _anything_ from this research, harvest the honest one-page landscape as outreach collateral — neutral, not deadline-framed, not self-ranking — and put the energy into the channels and product loops that actually drive trials.

---

_Method note: findings synthesized from four parallel sourced research passes (horizontal directories, accounting-vertical sources, taxonomy, demand/SEO). Reddit content is indirectly verified (crawler-blocked); several vendor/directory sites 403 automated fetchers — counts marked in the underlying research where unverified._
