# Product + Design themes — 2026-05-25

> Yuqi sent 7 strategic asks during the cross-surface UX pass that
> deserve discovery work, not snap-fixes. This doc captures each as a
> short brief — current state, the gap, open questions — so they can
> be scoped, prioritised, and owned independently. Nothing here ships
> until each theme has its own design doc + dev plan.

## Index

1. [Onboarding: which rules need manual activation](#1-onboarding-manual-rule-activation)
2. [Rule states: active vs inactive vs needs-review](#2-rule-states)
3. [Review flow: pending-review panel ↔ rule library](#3-review-flow)
4. [Client data normalisation: field mapping UI](#4-client-data-normalisation)
5. [Alert visuals: red/green/yellow tied to workflows](#5-alert-visuals)
6. [Auditability: how audit logs are surfaced](#6-auditability)
7. [Opportunity workflow: capture → categorise → approve](#7-opportunity-workflow)

---

## 1. Onboarding — manual rule activation

### What was asked

> "Surface which rules need manual activation during setup. Design
> onboarding states and guidance for rules that cannot auto-activate."

### Current state

- The migration wizard ends with `migration.apply` → genesis overlay
  → /deadlines. No explicit "rules that didn't auto-activate" hand-off.
- Rule activation states live on `/rules/library` as
  `pending_review` / `active` / `rejected` / `archived` (see
  `obligations.tsx` `STATUS_VARIANT`).
- The wizard's Step 4 dry-run shows what _deadlines_ will be created
  but doesn't surface which _rules_ contributed and which were
  inactive.

### The gap

1. A new CPA finishes import, opens /deadlines, sees a slimmer list
   than expected, and doesn't know _why_ — some rules were skipped
   because they need manual activation, but nothing tells them.
2. The /rules/library `needs_review` queue exists but has zero
   "you just imported, here are the rules you need to look at first"
   onboarding affordance.
3. No "activate by bulk" path for the first-time CPA — they have to
   review one at a time.

### Open questions

- **Definition of "manual activation":** is this every
  `pending_review` rule? Or only the subset whose Smart Priority is
  high? Or only rules in states the CPA has clients in?
- **Where does the handoff live?** Genesis overlay → toast → CTA
  on /deadlines → standing banner on /rules/library?
- **Bulk activate UX:** a single "trust them all" button is dangerous
  (skips review). A guided "review N rules in 5 minutes" flow is
  closer to the right shape, but slow. Hybrid?
- **Re-onboarding:** what about firms that already imported but never
  ran the review pass? Do we resurface this?

### Sketch (pre-design)

- Genesis overlay grows a second line: "X deadlines created · Y
  rules need your review" with a CTA to a guided activation flow.
- New surface `/rules/onboarding-review` (or modal stacked on
  /rules/library) that shows a deck of rules with the same
  dating-app card-stack pattern the rule library already uses, but
  pre-filtered to "rules imported in your last batch" + sorted by
  Smart Priority.

### Owner / next step

- Discovery: 30-min interview with a CPA who just finished
  onboarding. What did they expect to see next? Did they understand
  the rule-activation step exists?
- Then a short design doc with one chosen direction.

---

## 2. Rule states

### What was asked

> "Define the UX for active vs inactive rules. Show how users
> understand whether a rule needs review, update, or action."

### Current state

- `STATUS_VARIANT` maps `pending_review` / `active` / `rejected` /
  `archived` / `deprecated` to visual variants.
- Rule library table renders state via `RuleStatusBar` and
  `RuleStatusKicker`.
- The status-pill audit
  ([`status-pill-audit-2026-05-25.md`](./status-pill-audit-2026-05-25.md))
  already canonicalised the tone ladder — that's the _visual_
  half done. The _vocabulary_ half is what this theme is about.

### The gap

The product currently mixes three distinct rule-state axes into one
field:

1. **Lifecycle** — is the rule live in the system? (`active`,
   `archived`, `deprecated`)
2. **Trust** — has a human verified this for our practice?
   (`pending_review`, `active` once accepted)
3. **Applicability** — does this rule apply to _our_ client base?
   (currently implicit via `EntityStateCell` coverage)

A CPA looking at a rule wants to know all three independently. Today
the single status word collapses them.

### Open questions

- Should we split the status into two badges (Lifecycle + Trust)?
  Or keep one and add a "Why is this here?" tooltip?
- "Needs update" vs "Needs review" — are these the same state or
  different? A rule that was active and is now stale (effective date
  changed) is conceptually different from a rule that was just
  ingested and never reviewed.
- What does "inactive" even mean? `archived`? `deprecated`?
  `rejected`? Three different concepts.

### Sketch (pre-design)

- Two-axis chip cluster on each rule row:
  - Lifecycle: `Live` / `Archived` / `Deprecated` (color tone from
    audit §3.1)
  - Trust: `Verified by you` / `Needs review` / `Rejected`
- "Needs action" is the _intersection_ — surfaced as a one-line
  yellow band above the rule row when both Trust = needs review
  AND Lifecycle = live.

### Owner / next step

- Audit how each rule state is _used_ in code (queries, filters,
  badges). The data model probably already supports the split; the
  UI just doesn't surface it.

---

## 3. Review flow

### What was asked

> "Create a review panel for pending reviews. Connect that panel to
> the rule library so updates feel seamless."

### Current state

- `/rules/library` has a dating-app-style card-stack batch-review
  modal (kbd ← → A R) for `pending_review` rules. Working surface,
  feature-complete.
- `/rules/pulse` (Alerts) has a separate review flow for AI alerts
  (apply/snooze/dismiss).
- /clients/[id] has its own materials review (gap analysis).

### The gap

- Three separate review surfaces. No single "Inbox of things to
  review across the product" landing spot.
- The Today page surfaces alerts but not pending rules. A CPA who
  opens DueDateHQ as their first task of the day doesn't get a
  "here are all 12 things waiting on you" rollup.

### Open questions

- Should there be a unified `/review` route that lists everything
  across surfaces? Or is keeping reviews scoped to their domain
  (rules / alerts / materials) better?
- If unified: how do we keep the existing surfaces (which CPAs are
  already learning) from feeling like dead-ends?
- What's the SLA on a pending review item? Some are urgent (alerts
  with low confidence + many affected clients), some are background
  (a new rule that won't fire until next quarter).

### Sketch (pre-design)

- Today page gains a "Pending your review" card cluster alongside
  the existing Alerts + Actions sections. Each card links to its
  domain's review surface (rule library / pulse drawer / client
  materials).
- The card surfaces the _count_ per domain + the _highest-priority_
  item.

### Owner / next step

- Inventory every "needs review" data source. Mock a Today page
  variant with the rollup card.

---

## 4. Client data normalisation

### What was asked

> "Define UI for mapping fields across client systems. Cover mappings
> for entity type, client ID, manager ID, and external client ID."

### Current state

- Migration wizard Step 2 (Mapping) covers source-column →
  DueDateHQ-field mapping (the AI mapper).
- Migration wizard Step 3 (Normalize) covers value normalisation
  (entity_type / state).
- **Manager ID, client ID, external client ID** — currently absent
  from the mapping UI.

### The gap

1. CPAs migrating from TaxDome / Karbon / Drake bring along their
   own client IDs (often distinct from EIN). DueDateHQ doesn't have
   a clean place to capture & display these.
2. Manager assignments (which CPA owns which client) are part of
   the data being imported but not surfaced in mapping.
3. After import, no "client crosswalk" view shows source ID → our
   ID + manager.

### Open questions

- Does this belong in the wizard, or as a separate "Integrations" /
  "Crosswalk" surface accessible later?
- Should `external_client_id` be a first-class field on
  `ClientPublic`, or a key-value store of `(source, id)` so a client
  can have multiple external IDs across systems?
- Manager ID mapping is a permissions question first, UI second —
  who has authority to assign managers? The owner? Any manager?

### Sketch (pre-design)

- Step 2 gains two new field rows: `Manager email` →
  practice user (auto-match by email; fall back to "assign later").
  `External client ID` → preserved as `client.externalIds[source]`.
- Client detail page gains an "Identities" card under Info tab
  listing all known external IDs.

### Owner / next step

- Schema work first: what does `ClientPublic` need for external
  IDs? Then the wizard UI follows.

---

## 5. Alert visuals & meaning

### What was asked

> "Formalize the alert system with red / green / yellow states.
> Make sure each color has a clear meaning and ties into review or
> rule-change workflows."

### Current state

- Pulse vocabulary doc already exists
  (`docs/Design/pulse-vocabulary.md`) — defines `critical` /
  `warning` / `info` / `neutral` tones and `pulseAlertTone()` helper.
- Status-pill audit
  ([`status-pill-audit-2026-05-25.md`](./status-pill-audit-2026-05-25.md))
  defines the cross-product tone ladder
  (success / info / warning / destructive / secondary / outline).
- Alerts (Pulse) page uses these correctly.

### The gap

- Pulse defines tones for _alerts_. The status-pill audit defines
  tones for _chips_. But there's no single doc that says "across
  the whole product, red means X, yellow means Y, green means Z"
  with examples.
- The CPA mental model from Yuqi's ask: "red = act now, yellow =
  attention, green = ok." Current product mixes red for blocked
  (destructive) AND for low pulse confidence — not aligned.

### Open questions

- Is "low confidence" red or yellow? Current code makes it amber
  (warning) — which matches the audit's §3.1 ladder. But Yuqi's
  red/green/yellow ask suggests three buckets, not the six in the
  ladder. Do we collapse?
- How does this tie into the review workflow? Probably: red →
  block until reviewed; yellow → review before next action; green
  → audit later.

### Sketch (pre-design)

- New doc: `docs/Design/alert-tone-canonical.md` that consolidates
  pulse-vocabulary.md + status-pill audit §3 into a single
  three-tier table (red / yellow / green) with cross-references to
  each surface that consumes them.

### Owner / next step

- Don't write a new doc until the existing two are reconciled — risk
  of fourth competing source of truth. Best move: extend
  status-pill-audit-2026-05-25.md with a "Alert vs status — when to
  use which" section.

---

## 6. Auditability

### What was asked

> "Design how audit logs are exposed so users can understand
> changes and actions."

### Current state

- `/audit` page exists (`features/audit/audit-log-page.tsx`).
- Each obligation has a per-row audit trail accessible from the
  drawer.
- `ConceptHelp concept="auditTrail"` explains what's captured.
- Status changes generate audit events via the obligation workflow.

### The gap

1. The /audit page is a flat event stream. Hard to answer "what
   happened to _this_ client in the last month" without filtering.
2. Per-obligation audit lives in the drawer but isn't summarised on
   the obligation row itself ("last change: 2 days ago").
3. No "audit replay" view — given an audit entry, can the CPA
   understand the full state of the system at that moment?

### Open questions

- Is the /audit page for _people_ (CPAs, auditors) or for _machines_
  (export to SOC 2 reviewer)? Both? Today it's clearly the second.
- Should rule-change audits be a separate stream from obligation
  status changes? Different lifetime, different consumers.
- What's the minimum viable "I want to know what changed yesterday"
  view?

### Sketch (pre-design)

- /audit gains a "View by client" / "View by rule" / "View by user"
  segmented control. Defaults to "all" (current behaviour) but the
  filtered views are first-class.
- Each obligation row gains a `<RelativeTime>` tag in a meta column:
  "edited 2d ago" — clickable, opens the drawer's audit tab.

### Owner / next step

- Talk to one CPA + one auditor (SOC reviewer or partner who reviews
  staff work). Their use cases probably diverge sharply.

---

## 7. Opportunity workflow

### What was asked

> "Design how opportunities are captured, categorized, and moved
> through approval."

### Current state

- `/opportunities` page exists
  (`features/opportunities/opportunities-page.tsx`).
- Opportunities have a primary action ("Open in deadlines /
  clients / etc") and status filtering.
- No explicit approval gate; opportunities are surfaced as "FYI,
  here are penalties you might want to chase / extensions you
  could file."

### The gap

1. Capture: opportunities come from the rule engine + AI insights.
   No user-initiated capture (e.g., CPA on a phone with a client:
   "remind me to follow up on this"). Should that exist?
2. Categorisation: today's filter is by status, not by
   _type_ (penalty recovery, extension filing, planning).
3. Approval: zero-step today. For high-impact opportunities (e.g.,
   "claim $X estimated penalty refund") there's no double-check
   ("partner sign-off") before action.

### Open questions

- Is this a separate primary surface or a tab inside Today / Client
  detail?
- Approval is a permissions + workflow question, not UI. What's the
  shape of the approval rule — "any opportunity over $X needs
  partner approval"? "Any approval at all"?
- How does this interact with the materials review on /clients/[id]?
  Are they the same flow with different surfaces?

### Sketch (pre-design)

- /opportunities gains a typed status pipeline:
  `Suggested → Reviewed by CPA → Approved by partner → Actioned →
Closed`. Stages are configurable per firm.
- A "Capture opportunity" button on /clients/[id] lets a CPA
  manually add one outside the AI flow.

### Owner / next step

- Money-impact opportunities (penalty recovery, refund claims) are
  the wedge — start there. Planning opportunities can follow once
  the approval flow is proven.

---

## Cross-theme notes

- **Themes 1, 2, 3 cluster around "rules".** Probably one initiative
  covering all three rather than three independent designs.
- **Themes 4 is migration-side**, owned by the wizard. Smaller
  scope.
- **Themes 5, 6, 7** are individually scoped surfaces. Can be
  picked up independently.

## Process suggestion

Each theme above needs its own short design doc before any code
work. Suggested order of attack (by impact × clarity):

1. **Theme 5** (alert tones) — fastest; mostly consolidating
   existing docs.
2. **Theme 2** (rule states) — clarifies the vocabulary before
   theme 3 builds UI on top.
3. **Theme 3** (review flow) — pulls 1 + 2 together.
4. **Theme 1** (onboarding) — depends on 3 being defined.
5. **Theme 4** (client data normalisation) — independent, can
   parallel-track.
6. **Theme 6** (auditability) — independent.
7. **Theme 7** (opportunity workflow) — independent, broadest scope.
