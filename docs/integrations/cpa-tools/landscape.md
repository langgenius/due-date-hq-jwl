# CPA Software Ecosystem — Integration Landscape

**For:** DueDateHQ integration / app-marketplace scoping · **Date:** 2026-07-06 · **Status:** research (Part 1 of 2; recommendation in [integration-recommendation.md](integration-recommendation.md))

Maps the software CPAs actually work in daily, and how open each tool is to an integration. Framing throughout: DueDateHQ is **pre-validation** — nobody has yet proven they want to use or pay for it. So this doc separates _cheap ways to reach real CPA users fast_ from _heavy builds that only pay off after validation_. The recommendation doc turns this into a single pick.

Every "does it have an API" claim below is sourced. Where a fact could not be verified, it says **unverified** — not fabricated.

---

## The one fact that reframes everything

DueDateHQ **already ingests client lists** — Migration Copilot ships CSV import presets and source detection for CCH Axcess, CCH ProSystem fx, Lacerte, ProSeries, UltraTax CS, and ProConnect Tax, plus File In Time and generic CSV (`docs/dev-log/2026-05-22-migration-tax-software-presets.md`). A firm pastes a client-roster export and gets a sourced year of deadlines in ~30 minutes.

That matters because most of this landscape is about _getting the client list in_ — and for DueDateHQ that door is already open, cheaply, for exactly the tax-prep tools whose only integration surface is a file export anyway. So the interesting integration question is **not** "how do we read the client list from tool X." It's **"how do we push DueDateHQ's one un-copyable output — a filing date moved → here's who it hits — back into the tool the CPA already lives in,"** to test whether they act on it. Keep that asymmetry in mind reading the rest.

---

## Three layers of the stack

CPAs touch three kinds of software. They differ sharply in how open they are:

1. **Practice-management / workflow** (Karbon, Canopy, TaxDome, Financial Cents, Jetpack…) — where the firm tracks _work and clients_. **Most open layer.** This is where a "deadline moved → create a task" action naturally lands, and where the real APIs and Zapier apps live.
2. **Accounting / bookkeeping ledgers** (QuickBooks Online, Xero, Bill.com, Sage…) — where the _books_ live. Private APIs are cheap; public marketplace listings are heavy and security-audited. Weak deadline fit — these are ledgers, not task engines.
3. **Professional tax-prep engines** (Drake, Lacerte, ProConnect, ProSeries, UltraTax, CCH Axcess, ATX) — where returns are computed. **Most closed layer.** Six of seven have no public API; integration is a file export — which Migration Copilot already consumes.

---

## Layer 1 — Practice management / workflow (the open layer)

The firm's client list _and_ task engine live here, so "a date moved → these clients affected → make tasks" maps cleanly. Openness varies from self-serve keys to enterprise partner gates. **Universal fallback: all nine below have an official public Zapier app** — so even the closed ones are reachable through Zapier.

### Karbon

- **What / who:** All-in-one practice management (workflow, email/collaboration, billing). Small-to-mid firms (~5–50 staff); premium, integration-mature.
- **API / openness:** Real public REST API (v3) with **webhooks** (Contact, Organisation, WorkItem, Invoice; CustomField added Feb 2026). **Near self-serve** — available to all customers but "enabled upon request" for security; you then grab your key in Settings → Connected Apps. [Developer Center](https://developers.karbonhq.com/) · [API reference](https://karbonhq.github.io/karbon-api-reference/) · [finding your key](https://help.karbonhq.com/en/articles/4324748-how-do-i-find-my-karbon-api-access-key)
- **Zapier / Make:** Official Zapier app; the **full API is reachable via "Webhooks by Zapier"** on a paid plan. [Zapier](https://zapier.com/apps/karbon/integrations) · [Webhooks-by-Zapier guide](https://help.karbonhq.com/en/articles/6637771-accessing-karbon-webhooks-through-zapier)
- **Where deadline data plugs in:** Work Items from Work Templates (task engine) + Contacts/Organisations (client list). Query affected clients, POST Work Items. Real-time change notifications back via webhooks.
- **Difficulty:** **Easy** — best-in-class API for this segment; request-to-enable is the only friction.

### TaxDome

- **What / who:** All-in-one PM + client portal (pipelines, CRM, docs/e-sign, invoicing). Solo → small/mid; one of the largest install bases in the list.
- **API / openness:** Public API (v2, OAuth). **Self-serve, customer-scoped** — any firm generates keys in-app (Account → API Keys); no formal apply-and-wait gate found. Public endpoint-reference portal is **unverified** (thinner docs than Karbon). [Integrations overview](https://taxdome.com/integrations-overview) · [status/API](https://status.taxdome.com/api)
- **Zapier / Make:** Official Zapier app incl. **Webhooks by Zapier**; also Make. [TaxDome Webhooks by Zapier](https://zapier.com/apps/taxdome/integrations/webhook)
- **Where deadline data plugs in:** Pipelines/automations (fan out tasks) + full CRM + jobs/calendar. Native automation engine can cascade tasks.
- **Difficulty:** **Easy–moderate** — self-serve keys + Zapier+webhooks; caveat is thin public endpoint docs.

### Canopy

- **What / who:** Modular PM (CRM, workflow, docs, time & billing, tax resolution). Small-to-mid firms.
- **API / openness:** Public API for **client data** (contacts, statuses, classification, custom fields, GUID). **Approval-required** — must confirm you're a customer and pass a "secure review and approval process"; AR data not exposed; CRM-1 accounts ineligible. Webhooks **unverified**. [Canopy API](https://www.getcanopy.com/api/) · [API KB / approval](https://support.getcanopy.com/en/articles/9376222-canopy-api)
- **Zapier / Make:** Official Zapier app (triggers incl. new client / business client created). [Zapier](https://zapier.com/apps/canopy/integrations)
- **Where deadline data plugs in:** Client CRM + custom fields (tag affected clients); the direct API leans read-oriented, so task/write automation is more natural via Zapier.
- **Difficulty:** **Moderate** — real API but partner-gated and read-leaning; writes lean on Zapier.

### Financial Cents

- **What / who:** Value-tier accounting workflow (recurring workflows, client tasks, portal). Solo/small firms moving upmarket.
- **API / openness:** **Open API, self-serve but plan-gated** — available on the **Scale plan (~$69/user/mo)**. Webhooks **unverified**. [Open API docs](https://help.financial-cents.com/en/articles/8780860-financial-cents-open-api)
- **Zapier / Make:** Official Zapier app (create clients/tasks, apply templates); also a Zapier MCP endpoint. [Zapier](https://zapier.com/apps/financial-cents/integrations)
- **Where deadline data plugs in:** Recurring-workflow + task engine is a natural home for deadline-driven jobs.
- **Difficulty:** **Easy** — self-serve API on the Scale tier + mature Zapier app; friction is the plan requirement.

### Jetpack Workflow

- **What / who:** Focused workflow / **deadline-tracking** software (jobs, recurring tasks). Solo/small firms. The most _on-topic_ engine in the list — and in 2026 shipped "AI-powered deadline intelligence" that auto-adjusts deadlines when extensions are filed.
- **API / openness:** API exists but **Enterprise-plan-gated**; no public self-serve dev portal found (direct-API docs **unverified**). Webhooks **unverified**.
- **Zapier / Make:** Official Zapier app (automate job creation, sync clients from Ignition). [Zapier](https://zapier.com/apps/jetpack-workflow/integrations)
- **Where deadline data plugs in:** Literally a deadline/job engine + client list — best conceptual fit. But direct API is Enterprise-only, so integrators route through Zapier.
- **Difficulty:** **Moderate** — great fit, but the clean path is Zapier, not the gated API.

### Keeper · Firm360 · Pixie (Zapier-only tier)

- **Keeper** (keeper.app, bookkeeping-close workflow, 2-way QBO sync): no confirmed public API — **Zapier-only** (create clients/tasks, update properties). Bookkeeping-close-centric, not tax-deadline-centric. [Zapier](https://zapier.com/apps/keeper/integrations)
- **Firm360** (all-in-one PM, small-mid): **no public API — confirmed.** Everything routes through a **Premium-plan-gated** Zapier connector (create client/project). [Zapier](https://zapier.com/apps/firm360/integrations)
- **Pixie** (simple PM, UK-leaning, solo/small): direct API **unverified/none**; **Zapier-only** (job/contact triggers). [Zapier](https://zapier.com/apps/pixie/integrations)
- **Difficulty:** **Moderate → moderate-hard** — no direct API; Zapier is the only programmable surface, often plan-gated.

### Aiwyn

- **What / who:** Revenue-cycle / billing / AR automation, moving into PM. **Mid-market to enterprise / Top-500 firms** (800+ firms cited). Sits _on top of_ incumbent PM/CRM systems.
- **API / openness:** **Partner-centric, no public self-serve API.** No public developer portal; integrations happen through managed partnerships. No Zapier app found. [aiwyn.ai](https://www.aiwyn.ai/)
- **Where deadline data plugs in:** Weak — it's a revenue-cycle layer, not a task/deadline engine.
- **Difficulty:** **Hard** — enterprise, partner-gated, poor fit. Skip pre-validation.

**Layer-1 openness, ranked:**

| Tool                         | Direct API         | Openness                            | Zapier (+webhooks) | Deadline-ingestion surface   |
| ---------------------------- | ------------------ | ----------------------------------- | ------------------ | ---------------------------- |
| **TaxDome**                  | Yes (v2, OAuth)    | **Self-serve** (in-app keys)        | Yes (+webhooks)    | Pipelines/automations + jobs |
| **Karbon**                   | Yes (v3, webhooks) | Near self-serve (request-to-enable) | Yes (+webhooks)    | Work Items from templates    |
| **Financial Cents**          | Yes (Open API)     | Self-serve, Scale-plan-gated        | Yes                | Recurring workflows/tasks    |
| **Canopy**                   | Yes (client data)  | **Approval-required**               | Yes                | Client CRM + custom fields   |
| **Jetpack Workflow**         | Yes                | **Enterprise-gated**, undocumented  | Yes                | Recurring jobs (best fit)    |
| **Keeper / Firm360 / Pixie** | No / unverified    | Zapier-only (often plan-gated)      | Yes                | Tasks/projects via Zapier    |
| **Aiwyn**                    | No                 | Partner/enterprise-gated            | None found         | Weak fit                     |

---

## Layer 2 — Accounting / bookkeeping ledgers

The books live here. **Two very different integration costs, always separate them:** calling the API _privately_ (self-serve, often same-day, free) vs. _listing a public marketplace app_ (heavy, security-audited, multi-week, re-audited annually). Deadline fit is weak across this layer — these are ledgers, not task engines — but they're where distribution scale and the ProAdvisor channel live.

### QuickBooks Online (Intuit)

- **What / who:** Dominant US small-business accounting ledger (~80–90%+ of the category historically). The **Intuit ProAdvisor** accountant channel is **500,000+ strong** — the single biggest US-CPA-adjacent audience anywhere in this doc. [ProAdvisor](https://quickbooks.intuit.com/accountants/proadvisor/)
- **API / openness:** REST + OAuth2, **webhooks** (Create/Update/Delete on most entities). **Private call = self-serve** (free dev account, immediate sandbox). 2025 metering shift: write calls free, **read calls now metered** (~500k free reads/mo on Builder tier). [Develop docs](https://developer.intuit.com/app/developer/qbo/docs/develop) · [webhooks](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks)
- **Marketplace = heavy:** the **QuickBooks App Store** listing requires a **three-part review — Technical (~20 days), Security (penetration testing, encryption + vuln scans, remediate all critical/high/medium), Marketing.** **Any app over 500 connections is reviewed whether listed or not; listed apps are re-reviewed annually.** [What to expect](https://developer.intuit.com/app/developer/qbo/docs/go-live/list-on-the-app-store/what-to-expect-during-the-review) · [security requirements](https://developer.intuit.com/app/developer/qbo/docs/go-live/publish-app/security-requirements) · [assessment FAQ](https://help.developer.intuit.com/s/article/New-app-assessment-process-FAQ)
- **Zapier / Make:** Official GA connectors on both.
- **Deadline fit:** **Weak** — client/customer-list sync to seed a roster is fine; sales-tax liability / bill due dates are weak signals. No native compliance-deadline surface.
- **Difficulty:** Private API **easy**; App Store listing **heavy** (pen-test-grade audit + annual re-review).

### Xero

- **What / who:** #2 cloud ledger; strong ANZ/UK, growing US; solo → small/mid. Runs the **Xero App Store**.
- **API / openness — tiered, and the tiering is the story:** REST + OAuth2, webhooks. **Three self-serve tiers before certification:** (1) uncertified OAuth app — self-serve but **max 25 orgs, 2 uncertified apps per org**; (2) **Custom Connections** — paid single-org, _don't_ count against the uncertified limit; (3) **certified App Store app** — approval-required, needed to exceed 25 orgs. [Managing connections](https://developer.xero.com/documentation/best-practices/managing-connections/connections/) · [custom connections](https://developer.xero.com/documentation/guides/oauth2/custom-connections/)
- **Marketplace = heavy:** certification checkpoints + a **security assessment re-passed annually** (OAuth2, TLS1.2+/AES-256, MFA/SSO, audit logging). [Certification](https://developer.xero.com/documentation/xero-app-store/app-partner-guides/certification-checkpoints/) · [security standard](https://developer.xero.com/partner/security-standard-for-xero-api-consumers)
- **Zapier / Make:** Official connectors on both.
- **Deadline fit:** **Weak** — contact/client sync OK; no deadline surface.
- **Difficulty:** Private API **easy** (but 25-org ceiling forces certification to scale); listing **heavy**. **More generous pre-certification runway than QBO.**

### Ignition (ignitionapp.com, formerly Practice Ignition)

- **What / who:** Firm-facing proposals, engagement letters, automated billing/collection. Accounting/bookkeeping _firms_, solo → mid. Sits close to the engagement/deadline layer. _(Disambiguation: not Inductive Automation's "Ignition" SCADA product, which does have a REST API — different company.)_
- **API / openness:** **No public self-serve REST API — Zapier is the only open surface** (8 triggers / 5 actions incl. client create/update, proposal accepted). Native integrations directory (QBO, Xero, Karbon, ProConnect, Gusto, Financial Cents, Slack) are ones Ignition builds. [Ignition + Zapier](https://support.ignitionapp.com/en/articles/1325000-ignition-and-zapier) · [integrations](https://www.ignitionapp.com/integrations) · [Zapier listing](https://zapier.com/apps/ignition/integrations)
- **Deadline fit:** **Strongest conceptual fit** in Layer 2 — engagement/proposal data maps onto an obligation model — but the channel is thin (Zapier trigger/action set only).
- **Difficulty:** Private API **blocked**; via Zapier **easy** if its triggers cover the need.

### Bill.com (BILL) · Sage (brief)

- **Bill.com:** AP/AR + payments. **BILL v3 API is self-serve** (sign up, generate a key, test) with **webhooks**; partner/multi-org tier needs an agreement. No heavy marketplace gauntlet. Deadline fit **moderate** — bills/invoices carry real **due dates**. [v3 API](https://developer.bill.com/docs/bill-v3-api-get-started) · [webhooks](https://developer.bill.com/docs/webhooks)
- **Sage:** a family, not one product. Sage Business Cloud Accounting (SMB) and Sage Intacct (mid-market) each have **separate, fragmented APIs** (Intacct is XML-first + newer REST); **Intacct Marketplace** lists 350+ partners but is partner-onboarding-driven. Deadline fit **weak**; value mostly at the Intacct mid-market tier. [developer.sage.com](https://developer.sage.com/) · [Intacct Marketplace](https://www.sage.com/en-us/sage-business-cloud/intacct/product-capabilities/extended-capabilities/marketplace/)

| Tool                  | Private API                      | Public marketplace                                           | Deadline-data fit                 |
| --------------------- | -------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| **QuickBooks Online** | Easy (free, same-day)            | **Heavy** — 3-part review + pen-test audit, annual re-review | Weak (client sync OK)             |
| **Xero**              | Easy, 25-org uncertified ceiling | **Heavy** — certification + annual security assessment       | Weak (contact sync OK)            |
| **Ignition**          | Blocked (Zapier only)            | No dev marketplace                                           | Strong conceptually, thin channel |
| **Bill.com**          | Easy (self-serve key + webhooks) | No heavy marketplace; partner tier = agreement               | Moderate (due dates)              |
| **Sage**              | Moderate (fragmented)            | Moderate (partner onboarding)                                | Weak                              |

---

## Layer 3 — Professional tax-prep engines (the closed layer)

Where returns are computed, and the firm's roster + entity types + form list live. **Six of seven have no public API.** Integration is file-based (proforma/conversion files, client-list CSV export, print-driver capture) or, for Lacerte, a local ODBC/SDK. **None have a native Zapier/Make app.** Market-share notes below are from the **2025 Journal of Accountancy / Tax Adviser survey** (2,011 AICPA members).

**The point for DueDateHQ: the asset here is the client roster + entity type + return type, and for every one of these the door is a file export — which Migration Copilot already ingests.** There is no live-API work to do at this layer pre-validation; the CSV path already covers it.

- **Drake Tax** — dominant among **sole practitioners** (+0.4 pt in 2025). **No public API.** Third parties integrate via file import/export or a **print-driver** (a tell there's no API). Path: client-list/proforma CSV export. [drakesoftware.com](https://www.drakesoftware.com/)
- **Lacerte (Intuit)** — small-to-mid, complex returns. **No web API, but a local SDK/ODBC driver** can read return data on-prem (INSERTs restricted). The _most_ programmatically accessible desktop product, but on-prem only. [Lacerte SDK](https://static.developer.intuit.com/resources/Lacerte_SDK_Developer_Instructions.pdf)
- **ProConnect Tax (Intuit)** — cloud-native, solo/small (~3.8%). **No public API despite being cloud** — Intuit says a public web API is officially "**Under review**." Watch this one; it's the incumbent most likely to open next. [Intuit dev Q&A](https://help.developer.intuit.com/s/question/0D54R00009CYIKeSAP/is-there-a-public-web-api-for-proconnect-tax)
- **ProSeries (Intuit)** — small / high-volume 1040. **No public API, no SDK.** Onboarding via Data Conversion Wizard + file import. [Data conversion](https://proconnect.intuit.com/proseries/data-conversion/)
- **UltraTax CS (Thomson Reuters)** — **mid-to-large firms** (~⅓ of largest-firm respondents; +0.3 pt). **No public API** — integration is intra-CS-suite + file. But has a built-in **client-list export** (ID, EIN/SSN, name, address) — exactly the roster DueDateHQ wants, consumed as a CSV. [Client-list export](https://www.thomsonreuters.com/en-us/help/ultratax-cs/integration/integrate-with-cs-suite/export-ultratax-cs-client-information)
- **CCH Axcess Tax (Wolters Kluwer) — the exception.** Cloud-native, **mid-to-large/enterprise** (~¼ of largest-firm respondents). **Real, documented cloud API** — Open Integration Platform + [Developer Portal](https://developers.cchaxcess.com/) + a **CCH Axcess Marketplace** — but access runs through the **Integration Vendor Program** (vendor agreement, three tiers). APIs expose client/entity data, returns, e-file status, K-1 import, roll-forward. **Partner-gated, not self-serve.** [Open Integration](https://www.wolterskluwer.com/en/solutions/cch-axcess/open-integration) · [Vendor Program](https://www.wolterskluwer.com/en/solutions/cch-axcess/vendor-program)
- **ATX (Wolters Kluwer)** — budget forms-based desktop, solo/small. **No API** (the WK API belongs to CCH Axcess, not ATX). Client-list CSV export only.

| Tool               | Segment                | Public API               | Access model                       | Deadline-data path                                 |
| ------------------ | ---------------------- | ------------------------ | ---------------------------------- | -------------------------------------------------- |
| **Drake**          | Solo (dominant)        | No                       | Closed                             | Client-list / proforma CSV → **Migration Copilot** |
| **Lacerte**        | Small–mid              | Local SDK/ODBC only      | On-prem, DIY                       | ODBC read (local) or CSV export                    |
| **ProConnect**     | Solo/small (cloud)     | No ("under review")      | Closed                             | QBOA link / manual export                          |
| **ProSeries**      | Small / 1040 volume    | No                       | Closed                             | Data-conversion / CSV export                       |
| **UltraTax CS**    | Mid–large              | No                       | Closed (intra-suite)               | Built-in client-list CSV export                    |
| **CCH Axcess Tax** | Mid–large / enterprise | **Yes (real cloud API)** | **Partner-gated (Vendor Program)** | Live client/return API                             |
| **ATX**            | Solo/small             | No                       | Closed                             | Client-list CSV export                             |

---

## Layer 0 — Integration _shortcuts_ (middleware, calendar, messaging)

Not tools CPAs buy — _paths_ to reach them without building point-to-point connectors. This is where the cheap distribution actually lives.

### .ics / iCal subscription feed — **near-zero effort, ships today**

Host a tokenized `.ics` URL; the CPA pastes it into Google/Outlook/Apple Calendar once and DueDateHQ deadlines appear as events. No SDK, no OAuth, no review. **But honest limits:** it's **one-way and read-only** (no "who's affected," no click-to-apply — a flat list of dated events), and **refresh is slow and throttled** — Google ~12–24h, Outlook ~3–24h+, Apple weekly by default. A date that _moves today_ may not surface until tomorrow — which directly undercuts the "the moment a date moves" pitch. Use as an ambient beachhead, not the product. [ICS refresh mechanics](https://www.usecarly.com/blog/google-calendar-ics-refresh-rate/)

### Email / Slack digest — **near-zero effort, best effort-to-value**

Push a digest ("3 client deadlines moved this week — here's who's affected") into a channel the firm already watches. Email is effectively free (Resend is already in the stack; a morning digest already ships). **Slack Incoming Webhooks** are self-serve — user picks a channel, authorizes, you POST JSON on a cron; no app-directory review for this basic use. **Unlike .ics, a digest can carry the "who's affected" narrative and a deep link back into the app** for the one-click apply — so it preserves the moat while staying nearly free. [Slack incoming webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/)

### Zapier — **the connective tissue of Layer 1**

Every practice-management tool in Layer 1 speaks Zapier. So one Zapier build reaches Karbon + Canopy + TaxDome + Financial Cents + Jetpack + Keeper + Firm360 + Pixie without a single point-to-point connector.

- **Private / unlisted app — light, no gatekeeper.** Zapier explicitly supports private apps that **bypass public review**; you share an invite link with specific firms. A working DueDateHQ Zap can be in front of a design-partner CPA **this week**. Reaches one firm at a time (not discoverable). [Private vs public](https://docs.zapier.com/platform/quickstart/private-vs-public-integrations) · [private apps](https://help.zapier.com/hc/en-us/articles/8496312360461-Use-private-apps-with-Zapier)
- **Public listing — medium, demand-gated.** To go fully public you need review **plus ≥10 Zap templates and 50 active users**; Zapier auto-launches once you hit the thresholds. Discoverability comes _after_ you've already earned users elsewhere. [Publish public](https://docs.zapier.com/platform/publish/public-integration)

### Make (Integromat) — medium, 2–4 week manual QA

Custom app → request review → manual QA (most apps approved 2–4 weeks). Smaller CPA footprint than Zapier. Second-choice automation platform; do later, if at all. [Make app review](https://developers.make.com/custom-apps-documentation/app-review/overview)

### Calendar & Outlook _API_ apps — medium-heavy, review-gated

- **Google Calendar API:** read/write needs a **sensitive scope** → Google **OAuth verification** (brand check 2–3 days; sensitive review adds time; restricted scopes can run weeks). [Sensitive-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- **Outlook / Microsoft Graph:** either Graph `Calendars.ReadWrite` (admin consent) or an Office.js add-in through **AppSource / Partner Center certification** (strict manifest/cross-client validation). [AppSource submission](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/submit-to-appsource-via-partner-center)
- Two-way and richer than .ics, but gated. Not the light path.

### Embedded-app / iframe slots in PM tools — **don't exist today**

No "drop-in custom tab/iframe widget" slot across Karbon / Canopy / TaxDome — they integrate via **API + Zapier**, not embedded UI panels. Reach these tools _through Zapier_, not a UI embed.

| Path                              | Effort       | Review gate                          | Reaches CPAs fast?     | Carries "who's-affected" value?  |
| --------------------------------- | ------------ | ------------------------------------ | ---------------------- | -------------------------------- |
| **.ics feed**                     | Near-zero    | None                                 | Yes (today)            | No — one-way, flat, 12–24h stale |
| **Email / Slack digest**          | Near-zero    | None (self-serve webhook)            | Yes                    | **Yes** (deep-link back to app)  |
| **Zapier — private/unlisted**     | Light        | None (invite)                        | Yes (1 firm at a time) | Partial (data sync + triggers)   |
| **Zapier — public listing**       | Medium       | Review + 10 templates + **50 users** | Slower (post-traction) | Partial                          |
| **Make custom app**               | Medium       | Manual QA, 2–4 wks                   | Slower; smaller base   | Partial                          |
| **Google / Outlook calendar API** | Medium-heavy | OAuth verification / AppSource cert  | Slower                 | Some (two-way)                   |
| **PM-tool embed**                 | —            | No iframe slot exists                | No                     | —                                |

---

## What this landscape says (hand-off to the recommendation)

1. **Ingestion is already solved.** Migration Copilot's CSV presets cover the tax-prep layer (the closed one) for free. Don't rebuild client-list ingestion as an API integration pre-validation.
2. **The open layer is practice management, and its common denominator is Zapier.** One Zapier build reaches all eight PM tools; three of them (TaxDome, Karbon, Financial Cents) also have near-self-serve direct APIs for later.
3. **The ledgers (QBO/Xero) are the big audience but the heavy build.** Private API is cheap; a _listed marketplace app_ is a pen-test-grade, annually-re-audited, multi-week commitment — a post-validation scaling move, not a pre-validation one. The 500k-strong ProAdvisor channel is the prize that makes it worth _eventually_.
4. **The cheapest ways to get the moat in front of a CPA are Layer 0:** a Slack/email digest (carries the who's-affected story + deep link) and a private Zapier connector (embeds the signal into the firm's real workflow, one build for every PM tool). `.ics` is near-zero but strips the interactivity and is too stale for the core pitch.
5. **Partner-gated doors to note for timing** (all _later_): Canopy approval, Jetpack Enterprise tier, CCH Axcess Vendor Program, QBO/Xero certification. None gate the pre-validation path.

Continued in [integration-recommendation.md](integration-recommendation.md).
