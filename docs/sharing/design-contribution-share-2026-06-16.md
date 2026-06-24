# DueDateHQ — Design, IA & Product Mapping

**A design companion to the demo — from Yuqi**
_2026-06-16 · audience: the product/eng team_

[Teammate] is driving the live demo. This is the **design half** of the story —
the _why_ behind each decision, written to be read next to the screens. It also
doubles as a reference: every claim points at where the work actually lives in
the repo.

The one thing I want to land: **I own the product's design surface — and I
designed a system, not screens.** A product model, an information architecture,
and a design language that any future surface can be built from without
re-litigating first principles. The screens in the demo are the _output_ of that
system, not the system itself. Code is the medium I work in, but design — the
model, the IA, the craft — is the job.

---

## What I owned

As one of the two founding product engineers, I held the whole design surface.
Concretely, that breaks into eight disciplines:

| Discipline                          | Scope                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product mapping / product model** | Turned the canonical product — 6 obligation types, 7 roles, the obligation lifecycle — into one mental model the team builds against.                                                 |
| **Information architecture**        | The page family, navigation, the workbench-vs-registry surface model, and the status taxonomy that organizes the entire product.                                                      |
| **UX / interaction design**         | End-to-end flows and states: master/detail patterns, alert-as-decision-tool, status propagation across pages, and the empty / loading / permission states behind them.                |
| **UI / visual design system**       | The canonical `DESIGN.md` — "Ramp × Linear light workbench": type scale, color roles, component primitives, depth, plus the CPA-specific risk-severity and evidence visual languages. |
| **UX writing / content design**     | Copy audits, de-jargoning for CPAs, microcopy, and full i18n in English + Simplified Chinese.                                                                                         |
| **Design ops & documentation**      | A dev-log entry per change (~1,240), ~70 design/critique/audit docs, ADRs, and a recurring critique cadence — so design decisions are durable and auditable.                          |
| **Cross-surface consistency**       | A cross-route consistency matrix and a data-consistency contract, so counts, labels, and dates never drift between surfaces.                                                          |
| **Responsive design**               | Per-surface responsive contracts (breakpoint behavior for the dashboard, deadlines, and alerts).                                                                                      |

---

## How I work — designing in the real product

A principle first: **the more tools you stack into a design workflow, the more it
costs you.** Every handoff — Figma to prototype to redline to code — leaks time
and fidelity. So I keep the loop tight, and I start and end in the real codebase:

1. **First version in Claude Code.** I generate a working first cut directly in
   the app — real components, real data, real constraints — not a static mock.
2. **Research.** I ground it: the product model, the CPA domain, competitors, and
   what the backend can actually support.
3. **Refine in Pencil.** I take it into Pencil for the one step where a design
   tool earns its place — pushing visual and interaction craft, exploring and
   raising fidelity without code friction.
4. **Back to Claude Code.** I bring the refined design back and ship it as
   production code.

Why it matters: the design↔code gap is closed by construction. There's no
handoff to lose fidelity in, and I design against the _real_ product — so the
screens in the demo aren't aspirational, they're the build. ("No fiction on
canvas" is this belief written as a rule.)

---

## The product in one breath

DueDateHQ is a **workbench for CPA and accounting firms to manage tax &
compliance obligations** — the filings, and the deadlines attached to them —
across all of their clients.

The reason design matters here: the cost of a missed deadline is severe, the
incoming data is messy, and the regulatory rules themselves change. The product
has to make _"what's at risk, what's blocked, what do I do next"_ answerable at a
glance — and be trustworthy enough that a CPA will actually act on what it says.

Two assets make this more than a generic SaaS table app, and both are mostly a
design problem:

- **Pulse / Alerts** — detects regulatory and rule changes and turns each one
  into a _decision_, not a notification.
- **Evidence & provenance** — every datum is traceable, because CPAs need an
  audit trail before they'll trust a number.

---

## What I've done

### 1. Foundation — the product model & IA

Everything else sits on this layer, so it's where most of the hard thinking went.

- **The obligation & status taxonomy.** I collapsed today's 8 ad-hoc states into
  a clean 6-state model — `not_started → waiting_on_client → blocked → in_review
→ filed → completed` — and wrote the migration map from old to new
  (`docs/Design/status-taxonomy-migration-map.md`,
  `docs/Design/status-changes-prd.md`).
- **"Status is observed, not chosen."** This is a product-defining stance.
  Status auto-advances from monitored events; there is no generic "pick a state"
  dropdown anywhere. We surface the _triggers_ and the _blocking items_ instead,
  and rare manual overrides live in a kebab menu. Watch for this in the demo — it
  changes how the whole detail page reads.
- **The page family & surface model.** Every surface is classified as a
  _workbench_ (dense, action-oriented, 12px/500 names) or a _registry_ (reference,
  14px/600 titles), each with its own type scale and alignment rules. New pages
  inherit a known archetype instead of being designed from zero
  (`docs/Design/page-family-canonical.md`,
  `docs/Design/unified-table-surface-vocabulary.md`).
- **The status-propagation contract.** Status is the product's primary key. I
  catalogued the 18 touchpoints where status is _read_, _written_, or _derived_,
  and defined a subscription/fan-out model so a change in one place updates
  everywhere consistently (`docs/Design/status-changes-prd.md` and the
  cross-route matrix below).

### 2. The design language

The canonical reference is **`docs/Design/DueDateHQ-DESIGN.md`** — 16 sections,
the single source of truth. What it actually encodes, and why each choice is the
way it is:

**Theme — "Ramp × Linear, light workbench."** Calm, dense, professional. It
explicitly _refuses_ the moves that make B2B SaaS look generic: no purple
gradients (the "Stripe trap"), no big drop shadows, no rounded-pill everything
(corner radius caps at 8px, on a fixed scale — no freelance 6/10/14 values). The
visual lift between surfaces comes from a border plus a half-step background
change, not from elevation. Restraint here is a written rule, not taste, so the
UI doesn't get louder as the team grows.

**Color is a triage signal, used against intuition.** Gray means "OK / not
urgent" — _not_ green. Green is reserved for done/filed. That one inversion is
the whole philosophy: in a tool where everything competes for attention, the calm
state has to be the quiet one, so the eye goes straight to risk. Chromatic accent
lives in _containers_ (buttons, chips, severity borders), never in body text —
and never colored text on a dark surface.

**Typography is a system, not eyeball sizing.** Inter for UI, Geist Mono for
every number. The iron rule: all vertically-aligned numbers — dollar amounts,
days-left, dates, EIN, rule IDs — use `font-mono` + `tabular-nums`, so columns
actually line up instead of jittering. Sizes map to a _role_ (page title /
section header / card title / body / body-strong / body-secondary), not to a
visual guess. And the rule I had to enforce across surface after surface: the
**body / body-strong / body-secondary trio must read as three distinct tiers in
the same row.** If the only difference between a heading and its supporting copy
is `font-medium` vs `font-regular` at one size, the hierarchy reads flat — the
fix is to change _the token and the weight_, never just the weight.

**Risk severity — a CPA-only visual language (DESIGN §7).** Four levels —
Critical / High / Medium / Neutral — driven by _either_ days-left _or_ dollar
exposure (Critical = ≤2 days or >$10k). Three craft rules make it trustworthy
rather than decorative:

- **Double-encoded for colorblind safety** — every row carries a `CRITICAL` /
  `HIGH` text badge; color is never the only signal.
- **Tint + border, two signals** — a low-saturation background tint plus a 2px
  high-saturation left border.
- **The computation is explainable** — hover the badge and it tells you _why_:
  "3 days to deadline + $28k exposure → CRITICAL."
- **Severity ≠ Status.** Workflow status (Draft / Waiting / Filed) and risk
  severity are two independent token sets that never bleed together — a Filed row
  never shows a red tint, because that would be a semantic lie.

Risk is expressed in **dollars first, days second** — `$28,400 at risk` reads
before `3d`. That ordering is deliberate: money is what makes a CPA act.

**Evidence & provenance — our other exclusive asset (DESIGN §8).** A CPA won't
act on a number they can't trace, so every AI-derived fact carries its source:
footnote chips, evidence chips (`[IRS.GOV]`), source badges, and a verbatim-quote
popover that shows the actual statute text, the URL, and who verified it. The
non-negotiable rule is **"No provenance = no render"**: an AI sentence without
`source_url + verified_at + source_excerpt` renders as _"I don't have a verified
source for this yet"_ — never as a confident fact. Better empty than hallucinated.
(This is the same belief as "No fiction on canvas," enforced at the data layer.)

**Primitive vocabulary.** Every pattern has exactly one canonical primitive —
Button, TextLink, SearchInput, FilterTrigger, ToggleChip, Segmented, Switch,
CountPill, Badge, AssigneeAvatar, ListRail — nothing hand-rolled. Live specimen
gallery at **`/preview`**. This is what lets the system survive more than one
person building on it.

### 3. The key surfaces — and the decision behind each

These are your demo stops. For each I've noted the hard problem and the move.

- **/today (dashboard).** Problem: a firm opens the app to "what needs me today,"
  not a feed. The surface model leads with the work, applies a two-color rule so
  urgency reads instantly, and treats the alerts grid as triage, not news
  (`docs/Design/today-actions-table-style.md`).
- **/deadlines list + detail.** The core workbench. The detail is a **master/
  detail page** (rail + detail) that reuses the drawer component in a new "page"
  mode, locked to **4 tabs — Status · Materials · Record · Audit** after a
  deliberate 6→4→3→4 oscillation that I closed out. The workflow card binds to
  the status state-machine, and stages get **asymmetric attention** (active stage
  ~40–50%, future stages ghosted at 0.5 opacity) rather than tidy equal-width
  strips (`docs/Design/deadline-row-interaction.md`, the deadline-detail page in
  `apps/app/src/features/obligations/detail/`).
- **Alert detail = a decision tool, not a record.** No tabs — a hero, then a
  dominant "your decision" region, then a client-impact module. Change / Source /
  Activity are scroll-spy anchors, not tabs. The entire layout is engineered to
  drive _one action_ (`docs/Design/alert-card-design.md`).
- **Clients list + detail.** A single shared summary band reused across 5
  surfaces; de-jargoned empty states; master/detail row feedback
  (`docs/Design/client-detail-ideal.md`,
  `docs/Design/client-detail-page-layout.md`).
- **Rules library + review flow.** Accept/reject regulatory-change drafts with
  real gating, including a bulk-review path and an affected-clients modal
  (`docs/Design/rule-library-review-flow.md`,
  `docs/Design/rules-review-modals.md`).

### 4. The principles I established

This is the part that makes the system reusable — named principles the team can
apply without me in the room:

- **Demote, don't delete.** De-noise by giving a fact a quieter form, never by
  removing decision information. One home per fact.
- **No fiction on canvas.** Every datum and affordance must trace to a real
  backend value or be explicitly tagged net-new in an eng brief. There's a
  banned-fiction checklist (no invented ETAs, dollar amounts, reminder cadences,
  file-storage affordances that don't exist yet).
- **Clear sections, not boxes.** Delineate with headers + full-width rules +
  whitespace; reserve bordered boxes for tables and buttons.
- **One purpose per panel** / **separate visualization from action.** The strip
  is the map; the active card is the workspace. Don't bloat one column of a
  multi-step strip into a workspace.
- **Asymmetric stage attention.** Real estate follows relevance, not symmetry.

### 5. Design ops

The discipline that keeps all of the above true over time:

- **~1,240 dev-log entries** in `docs/dev-log/` — one per change, so the design
  history is reconstructable.
- **~70 design / critique / audit docs** in `docs/Design/` — a real critique
  cadence (drift audits, copy audits, consistency matrices), not one-off opinions.
- **Full i18n** — English + Simplified Chinese, on the Lingui pipeline.
- **A cross-route consistency matrix + a data-consistency contract**
  (`docs/Design/cross-route-consistency-matrix.md`) — the single source of truth
  for shared counts, labels, and dates, so the strip never says "5/5" while the
  Materials tab says "6+8."

---

## How to watch the demo

Since I'm not narrating live, here's what to actually notice on each screen:

- **/today** — urgency reads from _size and color alone_. No bold-on-red
  double-emphasis anywhere; that's deliberate.
- **A deadline detail** — the status pill is not a dropdown. Watch where the next
  action comes from: observed triggers and blocking items, not a manual picker.
- **An alert** — the page funnels to a single decision. Change / Source /
  Activity scroll, they don't tab.
- **Across pages** — the same client count, label, and date appear everywhere.
  That's the consistency contract doing its job.
- **Everywhere** — the same small set of primitives. `/preview` shows the full
  catalog they're drawn from.

---

## What I'm doing next

The through-line for the next stretch is **"make the system real"** — every
principle that's documented becomes enforced in code and consistent across every
surface.

Shipping next:

- **Finish the status-taxonomy migration** (8 → 6 states) across all 18
  touchpoints, per the migration map.
- **Close the Record/Materials storage gap.** Today the Record tab is partly
  placeholder — no real file storage, workpaper schema, or e-sign behind it. I'll
  design the honest empty states and spec the net-new mutations it needs.
- **Quick filters / saved views** for /deadlines — typeahead + preset groups
  (Default / My work / Scope / Condition) + save-as.
- **Deadline-detail tab additions** — Summary / Materials / Extension / Evidence,
  plus the new Risk/Audit tab contract.

Exploring / in flight:

- **Roll out the responsive contracts** for /deadlines, /alerts, and /today to
  every breakpoint.
- **Deepen status propagation** — wire the remaining read/write/derive
  touchpoints to the live subscription model so status truly fans out.

---

## How I actually worked — git, difficulties, and knowing when to stop

The honest process layer, since the polished screens hide it.

### Version control — main-direct, but disciplined

We built fast: the repo went from its first commit (2026-04-20) to demo in under
two months, with single days topping 160+ commits and AI pairing all over the
record (`Co-authored-by` appears ~1,960 times). That velocity is only safe with
real git discipline:

- **Main-direct, linear history.** No PR-per-change ceremony — `main` has _zero_
  merge commits; everything is rebased into a linear history. For a 2–3 person
  team, branch-and-PR per tweak would have been pure drag, so the discipline
  lives in the commit instead of the review.
- **Conventional, scoped commits.** Every commit is `type(scope):` —
  `design(deadlines)`, `fix(clients)`, `refactor(due-date)`. The scopes map 1:1
  to the product surfaces (alerts · rules · deadlines · today · clients · pulse ·
  migration …), so `git log` doubles as a per-surface changelog you can read.
- **A dev-log entry per change.** ~1,240 notes in `docs/dev-log/` carry the _why_
  a commit subject can't. That's the real "use GitHub properly" — the history is
  still legible months later, not just a wall of "fix stuff."
- **Parallel AI sessions, carefully merged.** I often ran more than one Claude
  session at once. The protocol: selective hunk staging, never race the other
  session's rebase, and cut a `backup/…` branch before any risky history
  linearize. Fast, but with a seatbelt.

### The difficulties

Two kinds — and the second was harder than the first.

- **Design↔code footguns.** Working in real code means real traps. The ones I
  hit and then _wrote down_ so the team wouldn't re-hit them: Lingui's `plural()`
  crashing at runtime where the type-checker couldn't see it; `cn()`
  (tailwind-merge) silently dropping our custom font-size tokens; new Button color
  tokens no-op'ing unless re-exported in the theme; per-side borders rendering
  broken on rounded corners; Pencil's copied-frame render bug. Each became a
  one-line reference note, not a lesson I had to relearn.
- **The judgment loops.** Harder than any bug was knowing when a design was
  actually _right_. I oscillated — the deadline detail's tab count went
  6 → 4 → 3 → 4 → 3 → 4 before it locked. Visual drift crept in (a `text-2xl`
  that "felt thin" here, a `text-lg` that "competed with h1" there) until a drift
  audit pulled the strays back to one canonical scale.

### Knowing when to stop

This is the lesson I'd most want to pass on, because it's where I lost the most
time early:

- **Lock the decision, record the reason, stop reopening.** The tab count got
  locked at 4 — Status · Materials · Record · Audit — with the rationale written
  down (canonical, 2026-06-09). The oscillation stopped not because anyone got
  tired, but because the decision finally had _a home_ to point at.
- **Drift audits beat endless polish.** Rather than polish forever, I'd
  periodically run a consistency/drift audit, re-converge everything to the
  canon, and stop. Convergence is a finish line; "a little more polish" is not.
- **Don't re-ask the settled questions.** Once something's decided (the sidebar
  is collapsible; this surface is warm-gray), I note it as _settled_ so the next
  pass builds on it instead of relitigating it.
- **The real signal to stop:** when an edit stops making a decision _clearer_ and
  starts just moving pixels. "Demote, don't delete" gives me the test — if a
  change isn't sharpening what the user has to decide, it's noise, and I'm done.

---

## Reflections — from the seam between design and code

I don't really call myself a "product engineer" — I'm a designer who happens to
work in code. But holding both ends of that seam on a product from zero taught me
a few things worth passing on:

- **The model is the real artifact; screens are downstream.** The hours spent
  getting the obligation taxonomy and the IA right paid back on _every_ surface.
  When the underlying model is wrong, no amount of screen polish rescues it — and
  no amount of polish is wasted once it's right.
- **Designing in real code kills fiction.** The moment you design against the
  actual backend, you find out what's really there. That's how I caught that the
  Record tab was mostly placeholder — you can't draw an honest empty state from
  inside a mock.
- **When building gets cheap, restraint becomes the job.** AI makes it trivial to
  add one more card, one more color, one more section. So the scarce skill flips
  from _"can I build it"_ to _"should this exist"_ — the design-system rules exist
  precisely to resist the temptation that cheap building creates.
- **Owning both ends means decisions don't leak in handoff.** "Status is
  observed, not chosen" is a design stance and an architecture decision at the
  same time. Split across two people and a spec, that nuance is the first thing
  that gets lost.
- **Velocity is only safe if decisions are written down.** Moving fast in code
  means the _why_ evaporates unless you capture it — that's what the dev-log and
  the design docs are really for. Not bureaucracy; memory.

---

## Where everything lives

| What                                 | Path                              |
| ------------------------------------ | --------------------------------- |
| Canonical design system              | `docs/Design/DueDateHQ-DESIGN.md` |
| Design / critique / audit docs (~70) | `docs/Design/`                    |
| Per-change decision log (~1,240)     | `docs/dev-log/`                   |
| Architecture decisions               | `docs/adr/`                       |
| Product requirements                 | `docs/PRD/`                       |
| Information architecture             | `docs/IA/`                        |
| Live component gallery               | `/preview` (in the app)           |
