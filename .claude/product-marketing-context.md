# Product Marketing Context — DueDateHQ

Foundational positioning + messaging. Other marketing work (landing page, emails, ads, social, SEO) references this so we don't repeat ourselves. Auto-drafted 2026-06-17 from the repo (README, `apps/marketing`, brand book) and ICP research (`docs/report`). **Review and correct — flag what's wrong or missing.**

---

## Product overview

- **One-liner:** DueDateHQ monitors the IRS and the major state tax agencies for filing changes, finds which of a CPA's clients are affected, and applies the fix in one click — plus a daily risk-ranked triage.
- **What it does:** Watches ~14 official tax sources around the clock — the IRS, the major state tax agencies (CA, NY, TX, FL, WA, MA), and FEMA disaster declarations nationwide; when a rule or deadline changes, it reads the official notice, computes which clients are affected (by jurisdiction, form, entity type), and lets the owner apply the fix across all of them in one click — sourced, audited, reversible. Imports a book of clients in ~30 minutes, ranks the daily worklist by risk, and attaches an official source to every date (glass-box). It never auto-applies — the human keeps the click. (Deadline-rule *coverage* spans FED + 50 states + DC; live *monitoring* is the sources above.)
- **Category (how they search):** tax deadline tracking / CPA deadline management software · "tax return due date tracker," "File In Time alternative," "CPA deadline software."
- **Product type:** B2B SaaS, single-practice cloud workspace, keyboard-first web app (no native app, no client portal).
- **Business model & pricing:** owner-billed subscription. Solo $39/mo · Pro $79/mo (3 seats, recommended) · Team $149/mo (10 seats) · Enterprise from $399/mo. Yearly ≈ 20% off. Only the practice owner can change billing.

## Target audience

- **Company type:** US solo CPAs, EAs, and 1–10-person tax practices serving 20–100 active business clients (LLC / S-Corp / Partnership), usually multi-state.
- **Decision-maker:** the practice owner — who is also the primary user and the buyer (compressed B2B). On Pro/Team, staff are seat-users.
- **Primary use case:** the Monday 5-minute deadline triage — who to handle first this week and why.
- **Jobs to be done:**
  1. Make sure no client deadline slips (and nobody's extension is forgotten).
  2. Know who to prioritize this week and what to check next.
  3. Trust the dates without re-verifying each one by hand.
  4. Get off Excel/Outlook without taking on a heavy platform.

## Personas

Compressed — for the core ICP the owner is User + Champion + Decision Maker + Financial Buyer in one person. Sell to the owner.

- **Owner / solo practitioner (primary):** cares about not missing deadlines, billable time, low setup cost. Challenge: weekly triage runs their tax season. Promise: a trustworthy worklist in five minutes.
- **Staff / preparer (Pro/Team seat-user):** cares about clarity on what's theirs and what's blocked. Promise: shared triage, no notice slips into a junior's drafts.

## Problems & pain points

- **Core challenge:** deadline triage is a weekly combinatorial problem — `clients × states × entity types × tax types × original-vs-extended dates × client readiness × this-week capacity`. A single date is easy; the triage is what's hard, and most practices redo it by hand every Monday.
- **Why current solutions fall short:**
  - **Excel + Outlook + 50 state sites** — scattered, manual, no risk ranking, no source of truth, state changes buried in email.
  - **File In Time** — records and rolls forward dates but doesn't *judge* weekly risk; dated UX, weak collaboration and integrations.
  - **TaxDome / Canopy / Karbon** — full platforms; too heavy, too expensive, portal/migration cost; overkill for a practice that just needs deadline triage.
- **What it costs them:** a missed federal/state deadline → penalties, client cleanup, lost trust, reputational hit — and it can sit unnoticed for weeks. Plus a morning a week of manual triage in season.
- **Emotional tension:** low-grade tax-season dread — *"did I forget someone?"* · doubt about whether a date is even right · fear of the quiet miss.

## Competitive landscape

- **Direct:** File In Time (deadline-first tracker). Need is proven; UX and intelligence are the gap.
- **Secondary (same problem, different solution):** TaxDome, Canopy, Karbon, Jetpack Workflow — practice-management platforms with deadline features.
- **Indirect / the real #1 competitor:** the firm's current Excel/Google Sheet + Outlook reminders + inbox search + 50 state websites.
- **How they fall short:** none rank weekly *risk* with an official *source* attached; the platforms over-serve and over-charge; the spreadsheet doesn't judge anything.

## Differentiation

**The core moat — the active loop (vs. every passive tracker):** DueDateHQ monitors 14 official sources (IRS, state DORs, FEMA) around the clock, uses AI to read each change and classify it, computes which of the firm's clients are affected (jurisdiction × form × entity type), and lets the owner apply the fix across all of them in one click — sourced, audited, reversible (24h undo). File In Time records dates; the platforms manage practices; **none watch the law and turn a change into applied, sourced work.** Full grounding in `docs/marketing/unique-selling-points.md`.

- **Glass-box, by design:** AI does every step up to the click; it never auto-applies. Every change traces to the human who approved it, the AI that read it, and the official source URL — the trust that makes the automation usable for a compliance pro.
- **Smart triage:** the daily worklist ranks open work by days remaining, evidence, readiness, and alerts — explainable, auditable. Severity is urgent / informational / resolved (never invented "critical/high").
- **One-paste migration:** a CSV or File In Time export → a sourced year of deadlines in ~30 min.
- **Narrow, fast, email-first:** sits alongside whatever they run; no portal to configure.

Claim discipline: "around the clock" is accurate (continuous polling, every 30 min); avoid an all-source "within 24h" SLA. "Suggested actions" today = a suggested-next-step card + apply-readiness, not AI-written action plans. Never use the word "Radar" in copy (banned engine term; the product is **Alerts**).

## Objections & anti-personas

- **"Isn't this just File In Time on the web?"** → No — it *judges* risk every week and cites a source on every date. Intelligence, not a table.
- **"Do I have to leave TaxDome/Karbon/Canopy?"** → No — it's narrow and email-first; it sits alongside them. Most users come from Excel, not a platform.
- **"Can I trust dates an AI touched?"** → AI is never the source of truth; every date keeps its official source + a human review state.
- **"Another tool, another setup?"** → Migration Copilot does the data entry; value the same day. No card required to start.
- **Anti-personas:** simple 1040-only preparers; single-state, low-complexity practices; firms already happy on a full platform; large-firm employees without purchasing power; anyone who won't put client data in the cloud; anyone expecting AI to give tax conclusions or auto-file.

## Switching dynamics (JTBD four forces)

- **Push:** missed/near-missed deadlines, Monday triage eating a morning, tool sprawl, tax-season dread.
- **Pull:** a trustworthy 5-minute triage, a source on every date, 30-minute migration, risk ranking.
- **Habit:** the spreadsheet "works"; muscle memory; dread of re-entering all the client data.
- **Anxiety:** will the generated dates be right? will migration hurt? is my client data safe? worth another subscription?
- **Implication for messaging:** attack **Habit** with Migration Copilot (we do the data entry) and **Anxiety** with glass-box sources + per-practice isolation + 30-minute setup + no-card-to-start.

## Customer language

- **How they describe the problem (verbatim from r/taxpros research):** "making sure I didn't forget to give anyone an extension" · "I just want a due date list" · "overwhelmed with deadlines" · "still waiting on the K-1" · "following up for the 100th time."
- **Words to use:** triage · who needs attention this week · source · extension ≠ payment · didn't slip · off Excel · this week.
- **Words to avoid:** revolutionary / game-changing · AI tax advice · "automate your firm" · all-in-one platform · "compliance made easy" · any implied tax conclusion.
- **Glossary (product terms):** Deadline Radar (the ranked dashboard) · Smart Priority (the risk score) · Migration Copilot (import) · Alerts (monitored rule changes) · Evidence drawer (the source view) · glass-box (the trust model).

## Brand voice

- **Tone:** calm, precise, dollar-aware, glass-box, keyboard-first.
- **Style:** state outcomes plainly; no hedging, no hype, no exclamation pile-ups, no cutesiness. Numbers are concrete; risk in dollars first, days second.
- **Personality (3–5):** precise · calm · trustworthy · efficient · unhyped. Lineage: Ramp × Linear (not Notion warmth, not Stripe gradient, not Bloomberg neon).

## Proof points (honest — no fabrication at launch)

- 100% of AI lines/citations carry source link + exact quote + verified date, or they're suppressed.
- Federal + 50 states + DC monitored (state candidates review-gated).
- Alerts within 24h, affected-client list pre-computed.
- 0 black-box auto-applies.
- ~30-minute migration to a full year of deadlines.
- **No testimonials/logos yet.** Until real ones exist, proof = the live product surface + the visible source trail + the honest "not tax advice" boundary. Leave a designated slot for social proof and fill it the moment it's real.

## Goals

- **Primary business goal:** GA signups → *activated* practices (first source-backed triage queue built).
- **Key conversion action:** **Open the workbench** (sign in with Google → first paste). Secondary: request a guided setup (lead); the live interactive "try it" module (no-form skeptic path — no demo video).
- **Activation funnel to watch:** signup → first client created → first calendar generated → weekly brief viewed → returns in week 2.

---

*Boundary (applies to all copy): DueDateHQ is an alpha product. It supports evidence-backed review; it is not tax advice, not a filing system, and not a replacement for a qualified professional.*
