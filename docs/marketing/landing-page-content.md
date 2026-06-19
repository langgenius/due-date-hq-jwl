# Landing Page + Waitlist — Content Deck

**Status:** Draft for launch · 2026-06-17
**Author:** content writeup for the public marketing site (`apps/marketing`)
**Purpose:** Ready-to-build copy for the launch landing page and the waitlist page, grounded in the real product, written in the brand voice (calm · precise · dollar-aware · glass-box). Pairs with `apps/marketing/src/i18n/en.ts`.
**Copy-only version:** `landing-page-copy.md` holds the clean, final strings and is the source of truth for exact wording; this deck adds the structure, rationale, and design notes.
**⚠ SUPERSEDED — historical reference only.** The positioning has since evolved substantially (active monitor→apply loop, long-tail framing, locked hero, villain beat, early-access/no-pricing, no demo video, "AI" removed from copy). The current source of truth is **`landing-page-copy.md`** (strings) + **`landing-page-structure.md`** (lean 7-section build). This deck is kept for its rationale and the **Deferred** copy only — do not build from its hero/section wording.

---

## 0 · Positioning the copy is built on

Everything below traces to these decisions. Read this first; it's the spine.

- **Who it's for:** US solo CPAs, EAs, and 1–10-person tax practices serving 20–100 active business clients (LLC / S-Corp / Partnership), often multi-state, who today stitch deadlines together with Excel + Outlook + 50 state websites — and who don't want a heavy platform (TaxDome / Karbon / Canopy).
- **The job:** _"Tell me who needs attention this week, why, what to check next, and where the date comes from — before a filing deadline becomes a client problem."_
- **The one scene:** the **Monday 5-minute triage**. Owner opens the laptop, sees the five most urgent clients, the evidence status, and the first keystroke.
- **The wedge vs. everyone:** File In Time _records_ deadlines; the big platforms _run your whole firm_. We do one thing — **judge deadline risk every week, with the source attached.**
- **The trust spine (Glass-Box):** AI may summarize, suggest, and draft. It may **never** show a recommendation without a source link, an exact quote, and a verified date. Missing source → flagged for review, not a confident guess. A human applies; AI never auto-applies.
- **Voice:** state outcomes plainly. No alarmist all-caps walls, no exclamation pile-ups, no "Oops!" cutesiness. Risk in dollars first, days second. Every AI line wears a `[source]` badge.
- **Honesty guardrails (do not violate):** alpha product; **not tax advice, not a filing system.** Coverage is `FED + 50 states + DC`, but state candidates are **review-gated** — monitored ≠ verified. No fabricated customer counts, logos, or testimonials at launch — let the live product surface and the source trail carry the proof instead.

---

## 1 · Launch framing decision (settled)

**Launch mode = Open / GA.** Anyone can sign up now. The primary action everywhere is **Open the workbench**; the live demo is the secondary, no-form path for skeptics. The status pill reads `Live · FED + 50 states + DC`.

| Setting           | Value at launch                        |
| ----------------- | -------------------------------------- |
| **Primary CTA**   | `Open the workbench`                   |
| **Secondary CTA** | `Watch the Monday triage` (2-min demo) |
| **Status pill**   | `Live · FED + 50 states + DC`          |

**What the waitlist page is for under GA.** Since the product is open, the waitlist page stops being an access gate and becomes a **guided-onboarding lead page** — for firms that want help loading their clients and confirming their first triage queue before they commit. It still captures the same qualifying fields (useful for onboarding priority and sales), but the promise shifts from "wait for an invite" to "we'll get you set up." Copy reflects that in §3. If you'd rather it stay a true pre-GA waitlist for a specific segment (multi-office, an integration, states moving from candidate → verified), the form is unchanged — only the header copy swaps.

---

## 2 · Landing page — section-by-section copy

### 2.0 — SEO / meta

- **Title:** `DueDateHQ — See deadline risk before it becomes a missed filing`
- **Description:** `The weekly deadline-triage workbench for US CPA practices. Every deadline, every IRS rule, every state alert traces back to its official source. Built for the Monday five-minute triage.`
- **OG image:** the Deadline Radar surface (keep the `live preview · not your data` label visible).

---

### 2.1 — Top navigation

- **Brand:** `DueDateHQ`
- **Audience tag:** `For US CPA practices`
- **Links:** `Product` · `How it works` · `Evidence` · `Coverage` · `Pricing` · `Resources`
- **Status pill:** `Live · FED + 50 states + DC`
- **CTA button:** `Open the workbench`

---

### 2.2 — Hero

**Eyebrow:** `GLASS-BOX DEADLINE INTELLIGENCE`

**Headline (recommended):**

> See deadline risk before it becomes a missed filing.

**Headline alternates** (for design to test — pick one, don't stack):

- _Know who needs attention this week. And why._
- _Your Monday deadline triage, done in five minutes._
- _Every deadline, traced back to its source._

**Subhead:**

> DueDateHQ is the weekly deadline-triage workbench for US CPA practices. It shows you which clients are at risk this week, why, and what to check next — and every date traces back to its official IRS or state source. Built for the Monday five-minute triage, not another calendar to maintain.

**Primary CTA:** `Open the workbench`
**Secondary CTA:** `Watch a 2-minute demo`

> Sub-CTA microline (optional, under the buttons): `Sign in with Google — your first triage queue is ready minutes after your first paste.`

**Trust chips (under the buttons):**

- `No black-box AI`
- `Cites every date`
- `Keyboard-first`
- `Alerts within 24h`

**Hero surface caption:** `live preview · not your data`

> Design note: the hero surface is the real Deadline Radar / Today console — ranked clients, days remaining, evidence status, one alert banner. Keep it the actual product, not an abstract illustration. That _is_ the pitch.

---

### 2.3 — "Built for" strip (qualify the visitor fast)

A single quiet line beneath the hero so the right reader recognizes themselves and the wrong one bounces:

> Built for solo CPAs and 1–10-person tax practices running 20–100 business clients across multiple states — on Excel, Outlook, and fifty state websites. If you've ever spent a tax-season morning making sure nobody slipped through, this is for you.

---

### 2.4 — The problem

**Eyebrow:** `THE PROBLEM WITH TODAY'S STACK` · index `01`

**Title:**

> Excel + Outlook + fifty state websites — one missed deadline away from a hard conversation.

**Paragraph:**

> A single filing date isn't hard. The hard part is the math underneath it: clients × states × entity types × tax types × original-vs-extended dates × who's still waiting on the client × how much capacity you have this week. That's not a calendar problem — it's a weekly triage problem, and most practices solve it by hand every Monday morning.

**Three problem cards:**

**Card 1 — "Which four of these touch my clients?"**

- Tag: `STATE WATCH` · severity `critical`
- Headline: `Rule and date changes ship all season. You only need the ones that hit your clients.`
- Body: `IRS notices, state filing changes, holiday and weekend shifts, disaster-relief postponements — each one is an exception you'd otherwise check by hand. Alerts gather them into one in-app banner with the exact quote, the source link, and a one-click path to the clients affected.`

**Card 2 — "Extension ≠ payment, and other quiet traps."**

- Tag: `TRUST GAP` · severity `high`
- Headline: `A date that looks right still has to be one you can stand behind.`
- Body: `Form 7004 extends the filing, not the payment. PTE elections, franchise tax, estimated payments, and state holidays all create exceptions. DueDateHQ keeps the official source and a plain-language "why it matters" on every deadline, so you can trust it without re-checking it line by line.`

**Card 3 — "Four hours of typing to move thirty clients."**

- Tag: `MIGRATION DRAG` · severity `medium`
- Headline: `Getting your clients in shouldn't cost a workday.`
- Body: `Migration Copilot maps, standardizes, and builds the year's deadlines from a paste, a CSV, or a File-In-Time export — in a typical 30-minute sitting, not a per-client setup wizard. Every imported client keeps a link back to its source row.`

**Footnote:** `A missed federal or state deadline can sit unnoticed for weeks. Triage is how you make sure it never surprises you.`

---

### 2.5 — How it works

**Eyebrow:** `HOW IT WORKS` · index `02`

**Title:**

> Triage. Migrate. Verify. One console, three moves.

**Paragraph:**

> DueDateHQ runs on three rules: every action lives on the keyboard, every number lines up so you can scan it, and every AI line cites its source. Here's the actual workbench doing each one.

**Step 01 — Triage · 30 seconds**

- Tag: `TRIAGE · 30 SECONDS`
- Headline: `The Monday console.`
- Body: `Open the laptop and see your five most urgent clients, their evidence status, and the first action to take. Smart Priority ranks by days remaining, evidence completeness, readiness, and alerts — plain, explainable math. No AI in the triage path; the ranking is something you can audit, not a number you have to trust.`
- Keys: `⌘K Command` · `E Evidence`

**Step 02 — Migrate · 30 minutes**

- Tag: `MIGRATE · 30 MINUTES`
- Headline: `Paste, map, normalize, generate.`
- Body: `Migration Copilot reads a paste, a spreadsheet, or a provider export and maps each field with a confidence grade. High-confidence matches apply on their own; lower-confidence ones get flagged for a quick human check. You nudge — you don't retype. When it's done, a full year of deadlines exists for every client, each one linked to the row it came from.`
- Keys: `⌘V Paste` · `Tab Next field`

**Step 03 — Verify · every claim**

- Tag: `VERIFY · EVERY CLAIM`
- Headline: `No source, no claim.`
- Body: `Every AI sentence and every rule citation links to its source — the link, the exact quote, and the date it was verified. If any of those is missing, DueDateHQ flags the deadline for review instead of showing a recommendation. When the proof isn't there, it says so — that's the point.`
- Keys: `E Open evidence` · `Esc Close`

---

### 2.6 — What's inside (feature highlights)

**Eyebrow:** `THE WORKBENCH` · index `03`

**Title:**

> One surface for the whole deadline operation.

Six tiles, each one real and shipping:

1. **Deadline Radar** — `This week, this month, long-term — your portfolio ranked by risk, not just by date. The five clients that matter rise to the top before you've finished your coffee.`
2. **Smart Priority** — `An explainable score from days remaining, evidence completeness, readiness, and alerts. Sortable, auditable, no black box.`
3. **Migration Copilot** — `CSV, TSV, XLSX, pasted tables, and File-In-Time-shaped exports → mapped, normalized, and turned into a year of deadlines, with an audit trail on every import.`
4. **Alerts** — `Monitored IRS and 50-state filing changes reach you within 24 hours — with the exact quote, the affected-client list pre-computed, and a one-click apply or revert. You review every change; nothing is applied silently.`
5. **Evidence drawer** — `Open any deadline to its official source: the link, the exact quote, and who verified it and when. Every number on the screen clicks back to where it came from.`
6. **Reminders & morning digest** — `A 30/7/1-day schedule with firm-owned templates, plus a personal morning digest that only emails you when deadline pressure, a new alert, or a delivery failure actually needs you.`

> Supporting line under the tiles: `Plus client facts and readiness signals, saved triage views, bulk status updates, a calendar subscription, an audit log on every apply, undo, and revert, role-aware seats, and shared team workload — for the practices that run as a team.`

---

### 2.7 — The Glass-Box Guarantee (the trust section)

**Eyebrow:** `THE GLASS-BOX GUARANTEE`

**Title:**

> Every number on the screen clicks back to its source.

**Paragraph:**

> AI is allowed to summarize, suggest, and draft. It is never allowed to show you a recommendation without a verifiable source link, an exact quote, and a verified date. When the source is missing, DueDateHQ asks you to verify it instead of guessing. You stay the professional in the loop; the software just makes the source impossible to lose.

**Four proof stats:**

- `100%` — `Verified citations.` `Every AI line and rule citation carries a source link, an exact quote, and a verified date — or it's suppressed.`
- `50 + DC` — `Jurisdictions monitored.` `IRS plus every state filing authority, in one reviewed rule library. State candidates stay under review until a human verifies them.`
- `24h` — `Alert turnaround.` `From official publication to in-app banner and email digest — with the affected-client list already computed.`
- `0` — `Black-box auto-applies.` `AI never changes a client's deadline on its own. Apply is always a human keyboard action, with an audit record.`

**Footnote:** `Glass-Box Guard checks every AI claim against its source before you ever see it.`

---

### 2.8 — Why CPAs trust it (security + boundaries)

**Title:** `WHY CPAs TRUST IT`

Four short proofs:

- **Per-practice isolation** — `your data stays inside your own practice — never pooled or shared across firms.`
- **Evidence on every claim** — `source link, exact quote, and verified date — attached to the deadline, not buried in a log.`
- **Full audit trail** — `every apply, undo, and revert is recorded and inspectable.`
- **Email-first** — `no client portal to configure, no document vault to migrate. It fits the way you already work.`

**The honest boundary (keep this — it builds trust, it doesn't cost you):**

> DueDateHQ supports evidence-backed review and decision-making. It is **not tax advice, not a filing system, and not a replacement for review by a CPA, EA, attorney, or other qualified professional.** It tells you where to look and why; you make the call.

---

### 2.9 — Coverage

**Eyebrow:** `COVERAGE`

**Title:**

> Federal, fifty states, and DC — with the deepest coverage where you file most.

**Body:**

> DueDateHQ monitors public IRS and state filing signals across all 50 states and DC. California, New York, Texas, Florida, and Washington have the deepest live coverage today, with the rest held as candidates that a human verifies before they ever become a reminder. Coverage means a public signal can be monitored and matched to your clients — whether it applies is still your professional judgment, and the source is always one click away.

**Sub-link:** `See state coverage →`

---

### 2.10 — Pricing teaser

**Eyebrow:** `PRICING`

**Title:**

> Pay for the deadline risk you can finally see.

**Body:**

> Start solo, add seats when the practice needs shared triage, and talk to us when you're running multiple offices. Plans from **$39/mo** (Solo) · **$79/mo** (Pro, 3 seats — recommended) · **$149/mo** (Team, 10 seats) · **Enterprise** from $399. Yearly billing saves about 20%. Only the practice owner can change billing.

**CTA:** `See full pricing →` (live checkout; the owner approves any upgrade)

---

### 2.11 — FAQ / objection handling

Answer the objections this specific buyer actually has.

**Q: How is this different from File In Time?**

> File In Time records and rolls forward your deadlines. DueDateHQ judges them — every week — and shows you which clients are at risk, why, and what to check next, with the official source on each date. It's deadline _intelligence_, not a deadline _table_.

**Q: Do I have to leave TaxDome / Karbon / Canopy?**

> No. DueDateHQ is deliberately narrow — it's the weekly deadline-triage layer, not a practice-management platform. It's email-first with no portal to configure, so it sits alongside whatever you already run. Most of our users are coming from Excel and Outlook, not from a full platform.

**Q: Can I trust a date if AI helped process it?**

> Only because AI is never the source of truth. Every date keeps its official IRS or state source link, an exact quote, and a verified date, plus a human review state. AI turns the source into something you can act on; it doesn't invent the date or change the rule.

**Q: How long until I see value?**

> Migration Copilot turns a paste or export into a full year of deadlines in about 30 minutes. Most owners run a real Monday triage the same day they load their clients.

**Q: Is this tax advice?**

> No — and it's careful never to pretend to be. It surfaces sources, risk, and next steps so you can decide faster. The professional judgment stays yours.

**Q: Where does my client data live?**

> Inside your own isolated practice workspace — never pooled across firms. Imports, rule changes, status changes, and billing events are all recorded in an audit log you can inspect.

---

### 2.12 — Final CTA

**Pill:** `Monday triage in 5 minutes`
**Pill caption:** `SOURCE-BACKED DEADLINE OPERATIONS`

**Title:**

> Stop spending Monday morning making sure nobody slipped.

**Body:**

> Open the workbench, paste or import your clients, and a full year of source-backed deadlines is ready within minutes. Sign in with Google — no native app, no portal to configure. Want a hand moving off Excel or File In Time? We'll set it up with you.

**Primary CTA:** `Open the workbench`
**Secondary CTA:** `Get a guided setup` (links to §3)
**Reassurance line:** `No card required to start · your data stays in your own practice · cancel anytime`

---

### 2.13 — Footer

- **Tagline:** `Glass-box deadline intelligence for US CPA practices.`
- **Audience line:** `For US CPA practices · evidence-backed · FED + 50 states + DC`
- **Columns:** Product (Workbench, Alerts, Migration Copilot, Evidence drawer, Pricing) · Resources (Rule library, State coverage, CPA deadline-risk guide, Evidence-backed software, Compare File In Time, Status) · Company (About, Security, Privacy, Terms, Contact)
- **Legal line:** `DueDateHQ is an alpha product. It is not tax advice or a filing system. © 2026 DueDateHQ Inc.`

---

## 3 · Waitlist / guided-onboarding page — copy

A focused page. Under GA its job isn't to gate access — the app is open — it's to capture firms that want a hand getting set up, and to give sales/onboarding the context to prioritize them. No nav noise, no second pitch; they already decided.

> If you instead use this as a true pre-GA waitlist for a specific segment, keep the form and swap the header for `Get on the list` / `We'll send your invite when your group opens`.

### 3.1 — Header

**Eyebrow:** `GUIDED ONBOARDING`

**Title:**

> Move off Excel without losing a week to it.

**Subhead:**

> The app is open — you can start solo today. But if you'd rather not load your clients alone, tell us about your practice and we'll set it up with you: Migration Copilot imports your clients, and we confirm your first source-backed triage queue together.

### 3.2 — "What you get" (three quiet points)

- **A real setup, not a cold login.** `We migrate your clients with you and confirm your first Monday triage queue.`
- **The right plan, no overbuying.** `We'll point you at Solo, Pro, or Team for your seat count — yearly saves about 20%, and the owner approves any upgrade.`
- **A direct line to the team.** `Early firms get our attention — we read your feedback and ship against it.`

### 3.3 — Form

Keep it short — every field is a qualifier, not bureaucracy.

| Field                   | Label                                | Microcopy / placeholder                                                                     |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Email _(required)_      | `Work email`                         | `you@yourpractice.com`                                                                      |
| Name                    | `Your name`                          | —                                                                                           |
| Practice name           | `Practice or firm name`              | —                                                                                           |
| Role                    | `Your role`                          | select: `Owner / Partner` · `CPA / EA` · `Staff` · `Other`                                  |
| Active business clients | `Roughly how many business clients?` | select: `Under 20` · `20–50` · `50–100` · `100+`                                            |
| States you file in      | `Which states do you file in most?`  | `e.g. CA, NY, TX`                                                                           |
| Today's tool            | `How do you track deadlines today?`  | select: `Excel / Sheets + Outlook` · `File In Time` · `TaxDome / Karbon / Canopy` · `Other` |

**Submit button:** `Request a guided setup`
**Privacy microcopy under the button:** `We'll only email you about your setup and onboarding. No spam, no sharing your data, unsubscribe anytime.`
**Secondary line (don't trap the self-server):** `Ready to dive in? Open the workbench →`

> Qualifying logic for design/eng: the "20–100 clients," "multi-state," and "Excel/File-In-Time" answers mark the strongest-fit firms. Use them to prioritize the onboarding queue and route plan recommendations — not to reject anyone on the page.

### 3.4 — Confirmation state (after submit)

**Title:**

> Got it — we'll set you up.

**Body:**

> Thanks — we've got your practice. Someone from the team will reach out to schedule your setup and walk your clients into DueDateHQ with you. Want to get a head start? You can open the workbench now; we'll pick up wherever you are.

**CTA:** `Open the workbench`
**Secondary:** `Watch a 2-minute demo`

**Footer microline:** `Tell us about a deadline that nearly slipped this year — reply to your email. It helps us tailor your setup, and we read every one.`

### 3.5 — Confirmation email (transactional)

- **Subject:** `Let's get [Practice name] set up on DueDateHQ`
- **Body:**
  > Thanks for reaching out about [Practice name].
  >
  > We'll be in touch shortly to schedule your setup — Migration Copilot loads your clients, and we confirm your first source-backed triage queue together. If you'd rather start now, you can open the workbench any time and we'll pick up wherever you are.
  >
  > One thing that helps us tailor your setup: just reply and tell us about a deadline that nearly slipped this year. It tells us more than any form field.
  >
  > — The DueDateHQ team
  >
  > _DueDateHQ is an alpha product. It supports evidence-backed review; it is not tax advice or a filing system._

---

## 4 · Copy guardrails (for anyone editing this later)

- **Numbers are mono and concrete.** "5 clients," "within 24 hours," "$39/mo" — never "many," "fast," "affordable."
- **Risk reads in dollars first, days second** where a figure is real; never fabricate a dollar amount to look precise.
- **No invented social proof.** No fake logos, customer counts, or testimonials before they're real. Let the live product surface and the visible source trail do the convincing instead.
- **Never imply auto-filing or tax advice.** Allowed: "this may require review," "confirm applicability," "source indicates Form 7004 does not extend time to pay." Banned: "your client qualifies," "you should file X," "no penalty will apply."
- **Status is observed, not chosen.** Don't write copy implying the user picks a state from a dropdown; surface the trigger that advanced it.
- **One primary CTA per view.** `Open the workbench` leads; `Watch the demo` and `Get a guided setup` are secondary — they never compete with the primary for emphasis.
- **Keep the live-demo escape hatch.** A skeptic should always be able to see the product without filling a form.

---

## 5 · When you're ready to ship it (reference — not requested yet)

You're taking this as written content for now. When it's time to build, this is the smallest path in:

1. Most of the landing copy already maps onto existing `en.ts` slots (hero, problem, workflow, proof, security, pricing, footer) — it's largely a copy refresh, not new components. Net-new slots: the "Built for" strip (§2.3), the 6-tile feature section (§2.6), and the FAQ (§2.11).
2. Add the `/waitlist` route (`apps/marketing/src/pages/waitlist.astro` + `zh-CN/waitlist.astro`) using §3; wire the form to a capture endpoint (Resend audience or a D1 table).
3. Mirror everything into `apps/marketing/src/i18n/zh-CN.ts` — the site is bilingual; don't ship EN-only.
4. Keep the demo CTA pointing at the live console so the no-form skeptic path survives.
