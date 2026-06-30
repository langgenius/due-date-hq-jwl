# Design-consistency review — findings ledger

Accumulates across the review waves. Each wave appends; the final cross-reference
wave (波7) consumes the whole file. **Read the "Decisions & Exemptions" section first —
those are settled calls with rationale; do NOT re-flag them.**

---

## Decisions & Exemptions (settled — do NOT re-flag)

These were decided during the token/spacing pass (2026-06-30) and are intentional.

| Item | Decision | Rationale | Trace |
|---|---|---|---|
| `--background-soft` vs `--background-section` | **Do not fold** | Coincide in light (both gray-50) but DIVERGE in dark (soft `0.25` vs section `0.4`) — genuinely distinct token | comment in `semantic-light.css` |
| `rounded-[1px]` — tooltip arrow tip | Linter EXCEPTION | 1px decorative softening; no canonical radius token applies | `check-token-discipline.mjs` EXCEPTIONS |
| `rounded-[1px]` — readiness bar segments (`primitives.tsx`) | Linter EXCEPTION | Thin `h-full flex-1` bar; the 4px compact-radius minimum would over-round it | `check-token-discipline.mjs` EXCEPTIONS |
| `pl-[34px]` ×3 (`PulseSourceMeta`, `rules.library` ×2) | Keep off-scale | Optical alignment — indents row to line up with title-text / rule-row start (Pencil `[0,34]` inset) | inline comments already in code |
| `pl-[5px]` ×2 (`app-shell-user-menu`) | Keep off-scale | Optical alignment — centers the 28px avatar on the shared rail centerline (x=41) | inline comments already in code |
| `clients.$clientId`, `deadline-detail` — no PageHeader | Keep | master-detail pages with internal header/rail; a page-level header doesn't apply | 波1 |
| `readiness` — bespoke portal layout | Keep | unauthenticated public portal, intentionally outside the workbench family | 波1 |
| `login`, `splash` — standalone auth chrome | Keep | deliberate brand/marketing divergence with their own chrome (not `_entry-layout`) | 波1 |
| `account-security-two-factor-setup` — embedded 2-col panel | Keep | not a page; a panel rendered inside settings.profile's Card | 波1 |
| `SeverityChip` — own `--severity-*` tokens, not Badge | Keep | deliberately separate ramp from Badge's `--state-*` so urgency reads distinct; don't fold into Badge | 波3 |
| `ToggleChip` | Keep standalone | it's a `<button>` (aria-pressed), not a label — pill shape is coincidental | 波3 |
| `StateBadge` | Keep standalone | image/seal-centric, not a text chip | 波3 |
| `PulseChangeKindChip`, `PulseAuthorityRoleChip` | Keep | inline text+icon meta labels (no fill) — not chips | 波3 |

## Pending visual confirmation (likely-optical, low confidence — confirm in 波1)

Not yet enshrined; I haven't seen them rendered. Confirm during the alignment pass.

- `pl-[25px]` — `states-rail.tsx:345`, indents subtext span; probably aligns under the row's flag/icon above. Verify it lines up; if so → exemption, if not → snap.
- `mt-[7px]` — `AlertStructuredFields.tsx:426`, top-margin on a 4px bullet dot; probably optical-centers the dot against the first text line. Verify against cap-height.

---

## 波1 — Structure & Hierarchy

Verdict: **structurally healthy.** 80% of authenticated surfaces use the shared `PageHeader`; width caps follow a deliberate two-tier split; every skeleton outlier is justified (see Decisions ledger). Canonical workbench skeleton confirmed:

```
PageHeader (title · eyebrow · count-pill · actions)
  → [inline banner]  → [StatBand summary]  → [toolbar/filters]
  → primary content (table | card-grid | list | master-detail)  → [detail rail/drawer]
```
Settings family: `_layout` → PageHeader (+breadcrumb) → Card stack, capped `max-w-page-narrow|wide`.
Auth family: `_entry-layout` → CenteredAuthScreen → AuthCard (no PageHeader, centered not capped).

**Genuine findings (code-level):**

**F-002 · Two ways to render the same header region · noticeable**
`alerts`, `alerts.history`, `rules.sources` render their header via a `RulesPageShell` wrapper; the other 9 surfaces use `PageHeader` directly. Sub-pages (history, sources) need breadcrumbs, so a shell is reasonable — but the split should be *deliberate and documented*, not incidental. → Confirm: is `RulesPageShell` the canonical "sub-page-with-breadcrumb" shell (then document + name it so), or accidental divergence (then fold into PageHeader)? **Flag for Yuqi.**

**F-003 · `migration.new` hand-rolls its header in the main layout · noticeable**
Lives in `_layout` (settings/workbench family) but uses a custom `MigrationActivationIntro` instead of `PageHeader`. The only main-layout page that skips PageHeader without a master-detail/portal justification. → Adopt `PageHeader`, or justify why migration intro is special. **Flag for Yuqi.**

**F-004 · `notifications.preferences` breaks the settings wrapper · noticeable**
Every other settings page uses `mx-auto max-w-page-* px-* pt-8 pb-12`; this one applies `p-4 md:p-6` directly with **no width cap** → renders wider and with different padding than its siblings. → Adopt the settings wrapper. (Clear fix, low risk.)

**F-005 · Width-tier assignment worth a sanity check · minor**
expanded(1440) vs wide(1100) is principled (dense lists → expanded, moderate tables → wide), but a few assignments are worth confirming intentional (e.g. `clients` expanded vs `calendar`/`members` wide). Likely deliberate per prior promotions; **confirm, don't auto-change.**

**Visual-pending (needs a render — deferred to the server pass):**
- Pixel-level: grid/edge-line drift, icon-vs-text optical alignment, same-row card-height parity, ad-hoc whitespace.
- Hierarchy "一眼能否看出主操作": structurally sound where PageHeader carries title+actions, but the *visual* "where the eye lands" read needs screenshots.
- The `18→16px` rail-snap verification (carry-over #2).

---

## 波2 — spacing (remaining design judgment)

**F-001 · `px-[22px]` inconsistent with snapped siblings · noticeable**
`rule-detail-drawer.tsx:1653` — a panel uses `flex flex-col gap-3.5 px-[22px] py-5`. Its
sibling sections in the same drawer were snapped to `px-4` (16px) in the spacing pass, so
this 22px now reads as an odd one-off. Not optical alignment (it's container padding).
→ Recommend snap to `px-4` to match siblings, OR justify the wider inset. **Confirm with Yuqi.**

---

## Fix log + backlog re-scope (post-inspection, 2026-06-30)

Reading each site before fixing shrank the backlog — several "findings" were not bugs:

**Fixed:**
- ✅ **F-013** — `OnboardingSkipModal`: "Stay and import" → primary, "Skip for now" → secondary. Emphasis now favors the wanted action.

**Reclassified — NOT bugs (do not re-flag):**
- **F-014 (split buttons)** — `obligations` + `ClientsCreateSplitButton` "Add deadline" are proper **split buttons** (one control: primary action + dropdown chevron). Both halves primary is *correct*; making the chevron secondary would break the joined affordance. Code comment confirms it's the deliberate primary affordance. Only a genuinely-separate adjacent dual-primary (e.g. permission-gate) would qualify, pending check.
- **F-011 (Card border)** — `settings.profile` Danger-zone uses `border-state-destructive-*`, which is a **valid semantic token** (right role), not a raw bypass. Card simply has no `destructive` tone. Optional enhancement, not a fix.

**Genuine remaining backlog (real, but larger than the flag labels suggested):**
- ✅ **F-010 · Select compact `size="sm"`** — DONE. `size="sm"` now carries `h-8 + rounded-lg + text-xs`; the 4 generation-preview SelectTriggers use it (dropped the per-site overrides). Zero-visual-change (sites already rendered those values via overrides).
- **F-009 · members inline cell-picker** — the one `h-6` transparent SelectTrigger is a genuinely distinct *inline table-cell* pattern (smaller than `sm`'s h-8, borderless) — left as a documented one-off, not the same as the compact Select. Low priority.
- **F-003 · `migration.new` header — RECLASSIFIED, not a bug** — `MigrationActivationIntro` carries onboarding-flow affordances `PageHeader` lacks (Step 3-of-3 dots, conditional Back, Skip, Review-rules count). It's a justified flow-specific header (like the auth pages), not drift. Removed from backlog.
- **F-002 · `RulesPageShell` compose `PageHeader`** — verify/refactor so there's one header source. *(medium; touches the alerts area an active sibling session is editing → coordinate/defer)*
- **F-015 · widen `EmptyState` adoption** — ~13 hand-rolled empties → the primitive. *(large, spread across surfaces)*
- **F-011a / F-012 (optional primitive enhancements)** — add Card `destructive` tone; build a `ButtonGroup` primitive (the existing `data-[slot=button-group]` hooks don't actually flatten joins, so it's real design work for 2 working hand-rolls — low ROI).

---

## 波3 — Components

Verdict: **mostly disciplined.** The chip family largely wraps `Badge`; the real issues are a few token-fighting overrides + one backwards CTA — not sprawl.

**Chip/pill/tag/badge family:**
- **F-006 · `AlertCard` hand-rolled pills · minor** — action pill (`:262`) and client-affinity chip (`:413`) hand-roll `rounded-full/rounded-sm + bg + text`; both map cleanly to `<Badge>` (variant secondary/outline, size sm).
- **F-007 · `PulseJurisdictionChip` vs `JurisdictionChip` — NOT a clean dupe · flag (visual)** — both are `Badge variant="outline" shape="square"`, but differ meaningfully: `JurisdictionChip` adds a name tooltip + `font-mono` + `min-w-9` (tabular column alignment) + real `toUpperCase()`; `PulseJurisdictionChip` is thinner (CSS `uppercase` + `tracking-wide`, none of those). Converging = the alert-card chip *adopts* mono/tooltip/min-w — a visual change to the alert meta cluster. ⚠️ Don't auto-merge; confirm in the visual pass whether the alert card should use the richer chip. (Agent called these "identical" — reading the source shows they're not.)
- **F-008 · Chip/Pill/Badge vocabulary unenforced · flag** — same genus is `*Badge` in one place, `*Chip` in another (`AlertStatusBadge` vs `AlertStatusChip` — identical variant+icon map, named by context). Decide a naming convention + rename. ⚠️ Naming decision, not a bug.

**Core controls — token-fighting overrides:**
- **F-009 · `members-page` SelectTrigger `:1061` · bypasses-system** — 5-way override (`h-6 rounded-sm bg-transparent px-2 text-xs`) fully exits the Select contract. Fix, or promote to a real Select variant.
- **F-010 · `generation-preview-tab` SelectTrigger ×4 (`334/476/509/532`) · flag** — identical `h-8 rounded-lg text-xs` → a *consistent* compact-select need. Either add a Select size token or accept. ⚠️ Likely intentional local density — confirm.
- **F-011 · Card overrides · noticeable** — `settings.profile:530` uses `border-state-destructive-*` directly instead of a `tone` prop (semantic bypass); `rule-detail-drawer:2507` forces `px-3 py-2.5` vs `size="sm"`.
- **F-012 · Split buttons hand-roll corner joins; the wrapper primitive is missing · noticeable** — `ClientsCreateSplitButton:72/87` and `obligations:3647/3660` use `rounded-r-none/rounded-l-none`. `button.tsx` *anticipates* this (it has `in-data-[slot=button-group]:rounded-*` hooks) but **no `ButtonGroup` wrapper component exists** (grep: zero). So every split button re-hand-rolls. → Build the `ButtonGroup` primitive that sets `data-slot="button-group"`, then the corner logic comes for free.

**Competing CTA / wrong variant:**
- **F-013 · `OnboardingSkipModal:98–103` emphasis · flag** — "Skip for now" renders primary (no variant), "Stay and import" is secondary. So the skip-onboarding path carries the primary emphasis. Whether that's wrong depends on intent (confirm-the-skip vs steer-users-to-stay). ⚠️ Confirm with Yuqi which action should own primary.
- **F-014 · Adjacent dual-primary · noticeable** — `obligations` split-button chevron is also `primary` (should be secondary); `permission-gate:184–196` has two primary-emphasis CTAs. ⚠️ Confirm permission-gate intent.

---

## 波5 — Interaction states (code slice only; full pass needs render)

- ✓ **0** hand-rolled clickable `<div>/<span>` with `onClick` — clickables go through primitives (good).
- **37** `outline-none` without a same-line `focus-visible`, + **15** `role="button"` hand-rolls → VERIFY these aren't keyboard-focus gaps (many likely carry `focus-visible` elsewhere in the class list or are non-focusable). Needs a focused keyboard/visual pass — **deferred to the server pass.**
- Primitives (Button/Badge/Input CVAs) carry focus/hover/disabled centrally, so systemic state coverage is sound; risk is isolated hand-rolls.

---

## 波6 — Copy & content

Verdict: **good, with clear intentional patterns.** Verbs (Save/Add/Create/Delete/Remove/Dismiss/Close) are largely semantic and consistent; casing is mostly Title-Case-controls / sentence-case-prose. Findings:
- **F-015 · EmptyState primitive adoption ~27% · noticeable** — most "No X yet" empties are hand-rolled (tone/structure consistent, but the component is used on only ~5 of ~18 surfaces). Widen adoption.
- **F-016 · Dialog-title casing rule undocumented · flag** — statement titles Title Case ("Create client") vs question titles sentence case ("Delete {name}?"). Looks intentional; **document the rule** so it's enforceable.
- **F-017 · Description trailing-period rule inconsistent · minor** — multi-sentence descriptions get a period, single-line helpers don't, no stated rule. Pick one.
- **F-018 · one validation-period outlier · trivial** — `email-otp` "Enter the 6-digit code." (most validation has no period).
- **Deliverable:** the copy agent inferred a least-disruptive **canonical word + casing table** (Save [object] / Create [object] / Add [object] / Delete [object]? / Remove / Dismiss / Close; "No [X] yet"; "[Gerund]…"; "Couldn't [verb]…"; imperative validation no-period). Adopt as the written style guide — this is the cheapest high-leverage 波6 fix.

---

## 波7 — Cross-reference (code-doable slice; full pass needs visual + all waves)

**F-019 · Dedicated card/panel container tokens are effectively dead · noticeable**
`components-card-bg` (2), `components-card-border` (1), `components-panel-border` (~6) are barely used. "A bordered container" is instead built ad hoc from `divider-regular`/`divider-subtle` borders + `rounded-lg`/`rounded-xl`. The component-token layer for cards exists but the app bypasses it. → Decide: either route containers through the `components-card-*` tokens, or retire those tokens and bless the divider-based recipe as canonical. (Connects to the token-set audit — these are MERGE/RETIRE candidates.)

**F-020 · Container border-weight + radius split · flag**
- Border: `divider-regular` (125) vs `divider-subtle` (91) for container edges — two weights for the same job.
- Radius: `rounded-lg` (8px, 355×) vs `rounded-xl` (12px, 152×) for containers.
Per the radius canon (12 = wrapper / 8 = button-input-table / 0 = inner section), the lg/xl split *should* map to inner-vs-wrapper, and regular/subtle *might* map to elevated-vs-quiet. ⚠️ **Investigate whether the split is principled or drift** — if principled, document the rule (regular=elevated card, subtle=quiet section; xl=outer wrapper, lg=inner); if not, converge. Needs the visual pass to judge which containers should read elevated vs quiet.

> Not flagged: `bg-background-default` vs `bg-background-section` on containers — that's the documented white-work-surface / warm-gray-section model, intentional.

**Remaining for the full 波7 (visual + consumes all findings):** the "same function looks plain/generic" judgments, per-element canonical-version specs, the forced count+ranking, and before/after change list — all want the rendered app and the visual-wave findings first.

---

## 波1 / 波2 / 波7 — Visual pass (representative: /today, /alerts, /deadlines, /notifications.preferences)

Server finally up (process-cap fight resolved + Vite cache cleared). Verified on the rendered app:

**Verifications (carry-over closed):**
- **Spacing snaps ✓** — probed live CSS: `px-4`=16px, `px-3`=12px, `px-3.5`=14px, `gap-2.5`=10px, `py-0.5`=2px, `py-1`=4px. Every snap renders its intended pixel; all four surfaces render with no misalignment. **Carry-over #2 (rail-snap visual check) = PASS.**
- **F-004 ✓** — `notifications.preferences` now matches its settings siblings (breadcrumb + title + `pt-8` + centered 1100px cap). Reads correct.

**Visual verdict — the product is visually coherent, NOT "很乱":**
- Alignment: content left-edge consistent across surfaces; sidebar icons centered; table columns aligned. No visible px-drift.
- Hierarchy: strong everywhere — dominant title, clear sections, identifiable primary action. Weight restraint holding (only titles heavy; `font-bold` count was 3).
- Proximity/breathing: sections well-separated, related items grouped; nothing cramped or over-sparse in the sampled surfaces.
- Density/noise: calm — subtle hairline borders, limited color (navy accent + status hues).
- **F-020 (container border/radius split):** not visually jarring at render — `divider-regular`/`subtle` + `lg`/`xl` read consistent. Downgrade to **low priority / likely-principled**; revisit only if a deeper per-surface diff shows drift.

**Confirmed-on-render findings:**
- **F-014 ✓ real** — `/deadlines` "Add deadline" split-button chevron is full-navy (same primary as the main half) → the two compete. Minor but real.
- **F-007 confirmed judgment-call** — the alert-list `PulseJurisdictionChip` (FED/NY/FL squares) reads fine as-is; converging to the mono `JurisdictionChip` is optional, not a fix.

**Honest scope note:** this was a *representative* visual pass (4 surfaces covering dashboard/list/table/settings), not an exhaustive 30-surface + keyboard-tab-through audit. A deeper 波5-keyboard pass (the 37 `outline-none`/15 `role=button`) and full 波7 per-element finale remain available, but the headline holds: **no pervasive visual chaos; the real issues are the specific F-findings.**

---

## Carry-over follow-ups (from token/spacing pass)

- **Visual verification of `18→16px` rail snaps** (×24 sites) — gates proved "system not
  broken" but not "looks right." Confirm on rail surfaces (`/alerts`, `/deadlines`) before commit.
- **Drop Button legacy aliases** from `button.tsx` (`default`/`outline`/`destructive`) — call
  sites migrated; needs `defaultVariant` repoint + retype. Filed as a follow-up task.
