# Design handoff index — all screens for implementation

**Date:** 2026-06-10
**Source design file:** `~/Desktop/duedatehq_work.pen`
**Companion docs:**
- `docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md` — execution brief (per-section instructions, contract migrations)
- `docs/Design/rule-library-review-flow.md` — rule library design source-of-truth

This index is the master catalog. Every Pencil screen that needs engineering work is listed here, organized by surface, with status, file targets, and dependencies. Sequence them in the order suggested by the **Recommended ship order** at the bottom.

---

## How to read this doc

- **🟢 Mocked** — design exists in Pencil, ready for engineering to translate.
- **🟡 Mocked, needs polish** — design exists but has known issues flagged inline.
- **🔴 Not mocked** — only described in text; engineering can extrapolate from canonical patterns.
- **Pencil ID** — open in `~/Desktop/duedatehq_work.pen` via Pencil MCP `get_screenshot` to see it.
- **Code target** — file or component path engineers should touch.

---

## Surface 1 — Alert detail (right panel)

**Primary canvas:** `BbQAK` (SectionsWrapper, 8 cards)
**Companion modal:** `ly7p0` (Impact preview)
**State variants:** `kpPeW · b7fa5Y · AAMn4 · M5UKQ`

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Right panel (8 sections) | `BbQAK` | 🟢 | `apps/app/src/features/alerts/AlertDetailDrawer.tsx` |
| KeyChange hero with status chip + plain summary + meta strip | inside `BbQAK` (`Qla5h`) | 🟢 | KeyChange section inside the drawer |
| ExtractedFacts grid (8 cells) | inside `BbQAK` (`b4syg`) | 🟢 | `AlertStructuredFields.tsx` (likely existing) |
| AffectedClients (table + selection + match pills) | inside `BbQAK` (`G24tQh`) | 🟢 | `AffectedClientsTable.tsx` (existing — verify match-pill copy is "High match", not "Confirmed") |
| SourceExtract (cite + quote) | inside `BbQAK` (`c0Vxc`) | 🟢 | new component or section inside drawer |
| Activity timeline (4 events) | inside `BbQAK` (`gRY5g`) | 🟢 | new component inside drawer |
| Notes (bubbles + composer) | inside `BbQAK` (`H410cj`) | 🟢 | new component inside drawer |
| Related rules section | inside `BbQAK` (`Related rules` card) | 🟡 needs schema migration first | new component; **schema gap — see dev-log §1.4** |
| Decision footer (Apply · Customize · Dismiss + audit signature) | inside `BbQAK` (`Decision` card) | 🟢 | `DecisionActions.tsx` (new component, Pencil ref `fJtAo`) |
| Impact preview confirmation modal | `ly7p0` | 🟢 | new `AlertImpactPreviewDialog.tsx` |
| Empty + error states (0 clients, low confidence, source fetch fail) | `kpPeW` | 🟢 | conditional render in each section |
| Interactive states (hover · focus · loading · disabled) | `b7fa5Y` | 🟢 | engineering inherits via styled primitives |
| Overflow + truncation states | `AAMn4` | 🟢 | engineering inherits via CSS truncation |
| Narrow viewport (768px) | `M5UKQ` | 🟢 | responsive — CSS media queries |
| Keyboard focus order + ARIA | `M5UKQ` (right column) | 🟢 | engineering spec only |

**Dependencies:**
- Contract migration: `dismissedAt` + `appliedAt` exposed in `PulseAlertPublic` (`packages/contracts/src/pulse.ts:136-172`). Required for the status chip timestamp suffix. See dev-log §1.3.
- DB schema for Related rules — new join table. Defer to v1.1 if scope-pressured.

---

## Surface 2 — Deadline detail (Status tab + Materials/Record/Audit tabs)

**Primary canvas:** `Y8xrR` (left column of Status tab — 5 cards including new Decision footer)
**Tab family:** `rzzww · HThur · DeZE3 · g8Bna2`
**Page chrome:** `kWbdW`

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Page chrome (Crumb · Hero · TabsBar · Body) | `kWbdW` | 🟢 | `apps/app/src/features/deadlines/[id]/page.tsx` (or similar) |
| Status tab — left column (Workflow hero + Recent activity + Penalty + What's left + Decision) | `Y8xrR` | 🟢 | `StatusTab.tsx` |
| Workflow milestone card (hero) | `K2yVqt` in `Y8xrR` | 🟡 missing bar header — see audit notes | `WorkflowMilestoneCard.tsx` |
| Recent activity card | `qSa9z` in `Y8xrR` | 🟢 | `RecentActivityCard.tsx` |
| Penalty exposure card | `u2jxP` in `Y8xrR` | 🟢 | `PenaltyExposureCard.tsx` |
| What's left to do card | `bmwHb` in `Y8xrR` | 🟢 | `WhatsLeftCard.tsx` |
| Decision footer (Mark filed · Request extension · Reassign + audit signature) | `IOGF4` in `Y8xrR` | 🟢 | `DeadlineDecisionFooter.tsx` (uses `DecisionActions` component) |
| Materials tab body | `rzzww` (Materials canonical) | 🟢 | `MaterialsTab.tsx` |
| Status tab body | `HThur` | 🟢 | `StatusTab.tsx` |
| Record tab body | `DeZE3` | 🟢 (with honest empty state) | `RecordTab.tsx` — see dev-log §2.2 storage gap |
| Audit tab body | `g8Bna2` | 🟢 | `AuditTab.tsx` |

**Dependencies:**
- DeadlineStatusChip variant of `AlertStatusChip` — new state set: `On track · At risk · Overdue · Filed · Extension requested`. Same component, different label/color mapping.
- K2yVqt bar header restructure — flagged for follow-up turn (was deferred this round).

---

## Surface 3 — Clients list + Client detail

**List canvas:** `rOSHx` (canonical)
**Detail variants:** `tZ0BB · thUSa · WWEtF · PFkmy`
**Empty state:** `T4eNmw`

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Clients list page (header + KPI strip + filter row + table + selected-row pattern) | `rOSHx` | 🟢 | `apps/app/src/routes/clients/index.tsx` |
| Empty state (no clients yet) | `T4eNmw` | 🟢 | conditional render |
| Client detail — primary (PageHeader + Body) | `tZ0BB` | 🟢 | `apps/app/src/routes/clients/[id].tsx` |
| Client detail — sticky-rail variant | `thUSa` | 🟢 | alt layout if/when needed |
| Client detail — deadline drawer overlay | `WWEtF` | 🟢 | `ClientDeadlineDrawer.tsx` |
| Client detail — inline row expansion | `PFkmy` | 🟢 | inline expand behavior on deadlines table |

**Notes:**
- ClientsTable selected-row pattern: `fill:$ddhq-state-accent-hover · stroke {left:2}:$ddhq-state-accent-solid`. Matches `Z0Q8Yk` (rules table) and `BbQAK` AffectedClients selected rows.
- Floating-card sidebar pattern (280w, cornerRadius 12, padding-20 screen gutter) applied across all variants.

---

## Surface 4 — Rule library (THE BIG ONE)

This is the most-changed surface. Multiple views, modals, and states.

**Overview canvas:** `GLnAJ` (NEW — page tabbed Overview)
**Review · Queue canvas:** `O0pyRO` (master-detail with summary card-stack on right)
**Review · Stream canvas:** `dPICW` (long-scroll + multi-select)
**Inline detail panel (canonical):** `N2X10V` (8-card summary-first)
**Stale alternate (DO NOT SHIP):** `qgiTf` (marked stale on canvas)
**Component library:** `lLC46`

### Sub-surface 4a — Overview tab

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Page chrome (header · tabs · body) | `GLnAJ` | 🟢 | `apps/app/src/features/rules/index.tsx` (or rename `coverage-tab.tsx`) |
| Tab strip (Overview · Review (12) · Sources · Audit) | inside `GLnAJ` | 🟢 | `RulesPageTabs.tsx` |
| 4-KPI strip (Total · Coverage · Pending · Recent) | inside `GLnAJ` | 🟢 | `RulesKpiStrip.tsx` |
| Recent changes card | inside `GLnAJ` | 🟢 | `RecentRuleChangesCard.tsx` |

### Sub-surface 4b — Review tab (Queue mode, master-detail)

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Page layout (coverage strip + filter chips + queue + detail) | `O0pyRO` | 🟢 | `RulesReviewQueue.tsx` |
| Coverage strip (h48, 4 counts + view toggle + Review all) | inside `O0pyRO` (`Z3J97T`) | 🟢 | `CoverageStrip.tsx` |
| Filter chip row | inside `O0pyRO` (`s6eqHe`) | 🟢 | `RuleFilterChips.tsx` |
| Rule queue list card | inside `O0pyRO` (`lVweK`) | 🟢 | `RuleQueueList.tsx` |
| Selected-row pattern | `s0brvg` in queue | 🟢 | inherits canonical (accent-hover + 2px accent left stroke) |
| Inline rule detail (8 cards, summary-first) | `N2X10V` OR inside `O0pyRO` (`BbK6Q`) | 🟢 | `RuleDetailPanel.tsx` (rebuild of `RuleDetailCompact`) |

### Sub-surface 4c — Review tab (Stream mode)

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Stream layout (coverage + filter + scrolling stream body) | `dPICW` | 🟢 | `RulesReviewStream.tsx` |
| Per-rule summary card (inline Accept/Reject) | inside `dPICW` (Rule 1-4) | 🟢 | `RuleStreamCard.tsx` |
| Multi-select state (checkbox in bar + sticky footer) | inside `dPICW` (selected variant + `J8c71i` footer) | 🟢 | `RuleStreamMultiSelectFooter.tsx` |
| `Select multiple` toggle | inside `dPICW` filter row (`icLl6`) | 🟢 | engineering wires the toggle to controlled state |

### Sub-surface 4d — Modals + post-action

| Screen | Pencil ID | Status | Code target |
|---|---|---|---|
| Bulk review modal (simplified, with Reject) | text-only in `docs/Design/rule-library-review-flow.md` § "Screen G" | 🔴 not mocked | `BulkReviewModal.tsx` refactor of existing |
| Accept impact confirmation modal | text-only in `docs/Design/rule-library-review-flow.md` § "Screen D" | 🔴 not mocked | new `AcceptRuleDialog.tsx` |
| Reject reason dialog | text-only in `docs/Design/rule-library-review-flow.md` § "Screen E" | 🔴 not mocked | new `RejectRuleDialog.tsx` |
| Post-accept success state | text-only in `docs/Design/rule-library-review-flow.md` § "Screen F" | 🔴 not mocked | in-place card update + toast |
| Read-more reveal pattern | text-only | 🔴 not mocked | conditional render inside `RuleDetailPanel` |

**Engineering note:** For the 5 🔴 items above, the patterns are well-established by analogy:
- Accept modal → follow `ly7p0` (Impact preview) pattern
- Reject dialog → follow Alert's reject pattern (octagon-x destructive header + reason chips + free-text note)
- Post-accept success → swap `AlertStatusChip awaiting` (`w4DBr`) → `AlertStatusChip applied` (`b75I5W`)
- Read-more → controlled expanded state per card section, default false

If you want me to mock these next turn instead of leaving as text-only, say so.

---

## Surface 5 — Pencil component library

**Canvas:** `lLC46`

| Component | Pencil ID | Variants | Code target |
|---|---|---|---|
| `AlertStatusChip` | `w4DBr · b75I5W · GzVzj · g770iB · Cirrk · OMxu3` | 6 (awaiting · applied · dismissed · partially_applied · reverted · reviewed) | `apps/app/src/components/AlertStatusChip.tsx` (NEW) |
| `RelatedRuleRow` | `G0zYC` | 1 | `apps/app/src/components/RelatedRuleRow.tsx` (NEW) |
| `DecisionActions` | `fJtAo` | 1 (Apply / Customize / Dismiss) | `apps/app/src/components/DecisionActions.tsx` (NEW) |

**Engineering contract:** each Pencil component above has the canonical chrome documented. React translation:
- Take props from the Pencil node names (e.g. `AlertStatusChip` props: `status` · `timestamp` · `size?`)
- Reuse for `DeadlineStatusChip` (same component, different status enum mapping)
- Reuse for `RuleStatusChip` (same component, different status enum mapping)

---

## States designed (apply across all surfaces)

| State family | Pencil ID | What it covers |
|---|---|---|
| Empty + Error | `kpPeW` | 0-clients · low-confidence · source-fetch-failed · 0-events · 0-notes |
| Interactive (hover · focus · disabled · loading) | `b7fa5Y` | Primary button matrix · secondary button matrix · composer states · loading skeletons · link hovers |
| Overflow + Truncation | `AAMn4` | Long client name · long note body · long source quote · long extracted-facts value · @mention chip · selection toolbar variants |
| Narrow viewport (768px) + a11y | `M5UKQ` | Mobile reflow · keyboard tab order · ARIA contract |

**Engineering action:** these are reference specs for CSS/component implementation. They're not separate routes — they're variant states of the existing surfaces. Engineering reuses the canonical chrome and conditionally renders empty/error states based on data.

---

## Audit notes (zjwn8)

Live tracker for open questions. Status as of 2026-06-10:

| # | Note | Status |
|---|---|---|
| 1 | ExtractedFacts partial extraction (em-dash + tooltip) | 🔴 OPEN — product decision needed (surface or strip) |
| 2 | ExtractedFacts per-field confidence ticks | 🔴 OPEN — product decision needed (transparency vs visual calm) |
| 3 | AffectedClients 0-matches state | 🟢 DESIGNED at `kpPeW` |
| 4 | "Confirmed" pill semantics | 🟢 FIXED — renamed to "High match" |
| 5 | Pill contrast | 🟢 FIXED — token swap + hex bug repaired |
| 6 | "View 3 more" hover state | 🟡 FLAG FOR ENG — hover state not designable in static |

---

## Recommended ship order

Ordered by: (a) low risk first, (b) maximize user-visible value early, (c) unlock dependent work.

### Phase 1 — Foundation (1 sprint)

1. **Pencil components → React scaffolds**
   - `AlertStatusChip` (6 variants)
   - `RelatedRuleRow`
   - `DecisionActions`
   - Code target: `apps/app/src/components/`
2. **Contract migration** — expose `dismissedAt` + `appliedAt` in `PulseAlertPublic`
3. **Deadline card chrome cleanup** — token migration sweep (§2.1)

These unlock everything downstream. No user-visible UX change yet.

### Phase 2 — Alert detail (1 sprint)

4. **Dismiss handler wired** — fix the lying keyboard hint at `AlertDetailDrawer.tsx:1762`
5. **Alert detail status chip** — render `AlertStatusChip` with timestamp suffix
6. **Decision section added** — Apply / Customize / Dismiss in the panel footer (or SheetFooter merger per §1.1)
7. **Plain-language summary line** — already exists in code (`PulseAlertPublic.summary`) — verify rendering matches design

### Phase 3 — Rule library Overview tab (1 sprint)

8. **Rules page tab structure** — Overview · Review · Sources · Audit
9. **Overview tab** — KPI strip + Recent changes feed
10. **Token cleanup on existing rule library code** — sweep hex leaks

### Phase 4 — Rule library Review (Queue mode) (2 sprints)

11. **Widen Sheet (Step 4a from dev-log §3.1)** — quick 1080w expansion of existing drawer
12. **Right-column takeover (Step 4b)** — `?ruleId=` routing, queue list left + detail right
13. **`RuleDetailCompact` rebuild summary-first (Step 4d)** — 8 cards, summary-first pattern from `N2X10V`
14. **Filter chips + coverage strip** — replace jurisdiction sub-sidebar

### Phase 5 — Rule library Review (Stream mode) + Bulk (1 sprint)

15. **Stream view** — long-scroll alternate
16. **Multi-select in Stream** — checkbox + sticky footer pattern
17. **Bulk modal refactor (Step 4c)** — add Reject + per-rule mini-edit
18. **Accept impact + Reject reason modals** — mock if needed, or extrapolate from existing patterns

### Phase 6 — Polish (1 sprint)

19. **Related rules** — schema + UI (or defer to v1.1)
20. **K2yVqt bar header restructure** — close last deadline detail divergence
21. **Hover/focus/disabled state polish** — apply b7fa5Y specs
22. **Overflow/truncation states** — apply AAMn4 specs
23. **Narrow viewport / a11y** — apply M5UKQ specs

---

## Files Claude Code will touch (per phase)

### Phase 1
```
apps/app/src/components/AlertStatusChip.tsx          [NEW]
apps/app/src/components/RelatedRuleRow.tsx           [NEW]
apps/app/src/components/DecisionActions.tsx          [NEW]
packages/contracts/src/pulse.ts                      [MODIFY]
apps/app/src/server/routers/alerts.ts                [MODIFY — resolver exposes timestamps]
apps/app/src/features/deadlines/**                   [token sweep]
```

### Phase 2
```
apps/app/src/features/alerts/AlertDetailDrawer.tsx   [MODIFY heavily]
apps/app/src/features/alerts/components/AlertStatusBadge.tsx [RENAME/REFACTOR to AlertStatusChip]
apps/app/src/server/routers/alerts.ts                [MODIFY — add dismissAlert mutation]
```

### Phase 3
```
apps/app/src/features/rules/coverage-tab.tsx         [REFACTOR — add tabs, Overview body]
apps/app/src/features/rules/components/RulesKpiStrip.tsx [NEW]
apps/app/src/features/rules/components/RecentRuleChangesCard.tsx [NEW]
```

### Phase 4
```
apps/app/src/features/rules/rule-detail-drawer.tsx   [REBUILD — summary-first card-stack]
apps/app/src/features/rules/coverage-tab.tsx         [MODIFY — Review tab routing]
apps/app/src/features/rules/components/RuleQueueList.tsx [NEW]
apps/app/src/features/rules/components/RuleDetailPanel.tsx [NEW or rebuild]
apps/app/src/features/rules/components/CoverageStrip.tsx [NEW]
apps/app/src/features/rules/components/RuleFilterChips.tsx [NEW]
```

### Phase 5
```
apps/app/src/features/rules/components/RulesReviewStream.tsx [NEW]
apps/app/src/features/rules/components/RuleStreamCard.tsx [NEW]
apps/app/src/features/rules/components/RuleStreamMultiSelectFooter.tsx [NEW]
apps/app/src/features/rules/components/BulkReviewModal.tsx [REFACTOR existing]
apps/app/src/features/rules/components/AcceptRuleDialog.tsx [NEW]
apps/app/src/features/rules/components/RejectRuleDialog.tsx [NEW]
```

### Phase 6
```
packages/db/src/schema/pulse.ts                      [MODIFY — Related rules join table]
packages/contracts/src/pulse.ts                      [MODIFY — Related rules field]
apps/app/src/features/alerts/components/RelatedRulesSection.tsx [NEW]
+ misc polish across all surfaces
```

---

## Done-when (master checklist)

### Foundation
- [ ] `AlertStatusChip` React component renders 6 variants
- [ ] `RelatedRuleRow` React component renders
- [ ] `DecisionActions` React component renders (Apply · Customize · Dismiss slots)
- [ ] `PulseAlertPublic` exposes `dismissedAt` + `appliedAt`
- [ ] Deadline detail card chrome — 0 hex leaks, all tokens

### Alert detail
- [ ] `D` keyboard shortcut dismisses
- [ ] Dismiss button visible in footer
- [ ] Status chip shows `Awaiting decision · 2h` / `Applied · Mar 4` / `Dismissed · Mar 5`
- [ ] Decision section landed (Apply / Customize / Dismiss)
- [ ] Plain-language summary rendered

### Rule library Overview
- [ ] Tabs: Overview · Review (12) · Sources · Audit
- [ ] 4 KPI cards in strip
- [ ] Recent changes feed renders

### Rule library Review (Queue)
- [ ] `?ruleId=` URL routing works
- [ ] Coverage strip + filter chips render
- [ ] Click rule row → right column takes over with detail
- [ ] Detail panel renders 8 summary-first cards
- [ ] Read more / Show all expanders work
- [ ] Accept / Reject / Skip actions work

### Rule library Review (Stream)
- [ ] Toggle between Queue and Stream
- [ ] Per-card Accept/Reject inline
- [ ] Multi-select mode with sticky footer
- [ ] Bulk Accept N / Reject N work

### Rule library modals
- [ ] Accept confirmation modal (with impact preview)
- [ ] Reject reason dialog (preset chips + free-text)
- [ ] Bulk review modal (simplified — add Reject + per-rule mini-edit)

### States
- [ ] Empty + error states render per design
- [ ] Hover/focus/disabled/loading states match `b7fa5Y`
- [ ] Truncation + overflow handled per `AAMn4`
- [ ] Narrow viewport (768px) reflows per `M5UKQ`
- [ ] Keyboard nav order matches `M5UKQ` spec

### Audit cleanup (zjwn8)
- [ ] Match pill renamed to "High match" everywhere
- [ ] Match pill contrast verified WCAG AA in all themes
- [ ] 0-matches empty state rendered when matchedClients.length === 0
- [ ] Hover state on "View N more" expander spec'd in CSS

---

## What's still in design backlog (not shipping in this round)

| Item | Why deferred | When to revisit |
|---|---|---|
| Map view / list-map toggle for rule library | Decided NO — see Design doc § "Map view verdict" | If 3+ users explicitly ask |
| Related rules section in alert detail | Schema work + linker is its own project | v1.1 |
| Client comms template (pre-drafted email/Slack after alert applied) | Scope creep | v1.1 |
| Geographic rule analysis page (`/rules/coverage`) | No clear demand | If reviewers ask |
| Per-field confidence ticks on ExtractedFacts | Product decision needed | v1.1 after b7fa5Y a11y ships |
| Partial extraction state (em-dash + tooltip) | Product decision needed | v1.1 |
| `awaiting_decision` rename of DB `matched` status | Cosmetic; display-only rename suffices | If product wants semantic clarity |

---

## Quick reference: Pencil node → engineering target

For when Claude Code (or any engineer) needs to find a design fast:

| Pencil node | Surface | Type |
|---|---|---|
| `BbQAK` | Alert detail right panel | Page section |
| `ly7p0` | Alert Impact preview modal | Modal |
| `kpPeW` | Alert empty + error states | State spec |
| `b7fa5Y` | Alert interactive states | State spec |
| `AAMn4` | Alert overflow + truncation | State spec |
| `M5UKQ` | Alert narrow viewport + a11y | State spec |
| `lLC46` | Pencil component library | Components |
| `Y8xrR` | Deadline Status tab left column | Page section |
| `rzzww` | Deadline Materials tab | Page |
| `HThur` | Deadline Status tab | Page |
| `DeZE3` | Deadline Record tab | Page |
| `g8Bna2` | Deadline Audit tab | Page |
| `kWbdW` | Deadline detail page chrome | Page chrome |
| `tZ0BB` | Client detail canonical | Page |
| `thUSa · WWEtF · PFkmy` | Client detail variants | Page variants |
| `rOSHx` | Clients list | Page |
| `T4eNmw` | Clients empty state | Page (empty) |
| `GLnAJ` | Rule library Overview tab | Page |
| `O0pyRO` | Rule library Review (Queue) | Page |
| `dPICW` | Rule library Review (Stream) | Page |
| `N2X10V` | Rule library inline detail panel | Page section |
| `qgiTf` | Rule library alternate (STALE — do not ship) | (none) |

---

## Where this index lives in the doc tree

```
docs/
├── dev-log/
│   ├── 2026-06-09-alert-deadline-rule-detail-amendments.md   ← execution brief (per-section)
│   └── 2026-06-10-design-handoff-index.md                    ← THIS FILE (master index)
└── Design/
    └── rule-library-review-flow.md                           ← design source-of-truth
```

To start work, an engineer or Claude Code session should:

1. Read this index (`2026-06-10-design-handoff-index.md`) for the lay of the land.
2. Pick a phase from "Recommended ship order."
3. Read the corresponding section of `2026-06-09-alert-deadline-rule-detail-amendments.md` for execution details.
4. Open the Pencil node IDs referenced for visual reference.
5. Use the prompt template in the dev-log § "How to invoke Claude Code" if running another session.

---

# APPENDIX — Claude Code execution specs

Everything below is **detail an engineer would otherwise have to infer**. If you're Claude Code and starting a phase, the answer to "what props does this component take?" or "what's the exact tRPC signature?" lives here.

---

## A. Design token reference (use these exact strings)

All colors are CSS variables defined in `packages/ui/src/preset.css`. Use the token name, never the hex.

### Surface tokens

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `$ddhq-bg-body` | `#FAFBFC` | `#0B0F14` | Outer page background |
| `$ddhq-bg-default` | `#FFFFFF` | `#11161D` | Card/panel surface |
| `$ddhq-bg-subtle` | `#F4F5F7` | `#1A2029` | Card bar header, button hover |
| `$ddhq-bg-section` | `#F0F1F3` | `#1D232C` | Sectioned inset (used in some inputs) |

### Stroke / divider tokens

| Token | Used for |
|---|---|
| `$ddhq-divider-subtle` | Card borders, row separators, hairlines (DEFAULT divider) |
| `$ddhq-divider-regular` | Slightly stronger — input borders, button outlines |

### Text tokens

| Token | Used for |
|---|---|
| `$ddhq-text-primary` | Headings, primary body text |
| `$ddhq-text-secondary` | Secondary body text, button labels |
| `$ddhq-text-tertiary` | Captions, meta info, dim labels |
| `$ddhq-text-muted` | Eyebrow labels, placeholder text, deep-dim |
| `$ddhq-text-accent` | Links (same color as state-accent-solid in most themes) |
| `$ddhq-text-success` | Success-tier text (green) |
| `$ddhq-text-destructive` | Error/destructive text (red) |

### State tokens (accent / success / warning / destructive)

Each tier has 3 levels: `solid` (filled bg / vibrant), `hover` (light tint bg), `text` (foreground on hover bg).

| Tier | solid | hover | text |
|---|---|---|---|
| accent (blue) | `$ddhq-state-accent-solid` | `$ddhq-state-accent-hover` | `$ddhq-state-accent-solid` (text equivalent) |
| success (green) | `$ddhq-state-success-solid` | `$ddhq-state-success-hover` | `$ddhq-text-success` |
| warning (orange/amber) | `$ddhq-state-warning-solid` | `$ddhq-state-warning-hover` | `$ddhq-state-warning-text` |
| destructive (red) | `$ddhq-state-destructive-solid` | `$ddhq-state-destructive-hover` | `$ddhq-state-destructive-text` |

**Usage pattern for status pills** (chip with bg + icon + text):
```css
background: var(--ddhq-state-{tier}-hover);  /* light tint */
color: var(--ddhq-{tier}-text);              /* foreground */
border-radius: 999px;
padding: 3px 10px;
```

### CornerRadius scale (LOCKED — no freelance values)

| Token | Use |
|---|---|
| `0` | Inner sections, flush elements |
| `4` | Compact controls (cell labels in grids) |
| `8` | Buttons, inputs, table chrome, badges |
| `12` | Cards, wrappers, dialogs |
| `999` | Pills, chips, avatars |

NO 6, 10, 14, 16 — those are AI-generated freelance values that fail review.

---

## B. Canonical chrome specs (apply pixel-perfect)

These are the rules every card/bar/section must follow. Hard-code these values in component scaffolds.

### Card (every section in detail panels)

```tsx
// Always
className: rounded-[12px] border border-[var(--ddhq-divider-subtle)] bg-[var(--ddhq-bg-default)] overflow-hidden flex flex-col
```

```ts
{
  cornerRadius: 12,
  stroke: '$ddhq-divider-subtle',
  strokeWidth: 1,
  strokeAlignment: 'inner',
  fill: '$ddhq-bg-default',
  clip: true,
  layout: 'vertical',
}
```

### Card bar header (every bar)

```tsx
className: h-9 bg-[var(--ddhq-bg-subtle)] border-b border-[var(--ddhq-divider-subtle)] px-5 flex items-center gap-2
```

```ts
{
  height: 36,
  fill: '$ddhq-bg-subtle',
  stroke: '$ddhq-divider-subtle',
  strokeWidth: { bottom: 1 },
  strokeAlignment: 'inner',
  padding: [16, 20],
  gap: 8,
  alignItems: 'center',
}
```

### Bar title

```css
font-family: 'Geist';
font-size: 13px;
font-weight: 600;
color: var(--ddhq-text-primary);
```

### Bar right slot (action or sub)

```css
font-family: 'Geist';
font-size: 12px;
font-weight: 500;
color: var(--ddhq-state-accent-solid); /* link */
       /* OR */ var(--ddhq-text-muted);  /* sub */
```

### Card content body

```css
padding: 16px 20px;
display: flex;
flex-direction: column;
gap: 10px; /* default; some cards use 8 or 12 */
```

### Card-stack gap (between cards)

```css
gap: 18px;
```

### Row inside a card (e.g. activity event, note, source row)

```css
padding: 14px 20px;
border-top: 1px solid var(--ddhq-divider-subtle); /* skip on first row */
```

---

## C. React component spec — `AlertStatusChip`

**File:** `apps/app/src/components/AlertStatusChip.tsx`
**Pencil refs:** `w4DBr · b75I5W · GzVzj · g770iB · Cirrk · OMxu3`
**Used by:** Alert detail bar, alert list rows, rule detail (rebranded as `RuleStatusChip` — same component), deadline detail (rebranded as `DeadlineStatusChip` — same component)

### Props

```ts
import { PulseFirmAlertStatus } from '@/contracts/pulse';

export interface AlertStatusChipProps {
  /** Lifecycle status from PulseAlertPublic */
  status: PulseFirmAlertStatus | 'awaiting_decision';
  /** Optional timestamp for the suffix (e.g. "2h ago", "Mar 4") */
  timestamp?: Date | number;
  /** Optional override for the timestamp format */
  formatTimestamp?: (ts: Date | number) => string;
  /** Visual size — defaults to 'sm' */
  size?: 'sm' | 'md';
  /** Override the default label per status (rare) */
  label?: string;
  /** Override the default icon per status (rare) */
  icon?: LucideIcon;
}
```

### Status → visual mapping

```ts
const STATUS_MAP: Record<string, { label: string; icon: LucideIcon; tier: 'warning' | 'success' | 'neutral' | 'accent' }> = {
  matched: { label: 'Awaiting decision', icon: Clock3, tier: 'warning' },
  awaiting_decision: { label: 'Awaiting decision', icon: Clock3, tier: 'warning' },  // alias
  applied: { label: 'Applied', icon: CheckCheck, tier: 'success' },
  dismissed: { label: 'Dismissed', icon: Undo2, tier: 'neutral' },
  partially_applied: { label: 'Partially applied', icon: CircleDot, tier: 'warning' },
  reverted: { label: 'Reverted', icon: RotateCcw, tier: 'neutral' },  // with outline
  reviewed: { label: 'Reviewed', icon: BadgeCheck, tier: 'success' },
};
```

### Implementation skeleton

```tsx
export function AlertStatusChip({ status, timestamp, formatTimestamp, size = 'sm', label, icon }: AlertStatusChipProps) {
  const config = STATUS_MAP[status];
  const Icon = icon ?? config.icon;
  const displayLabel = label ?? config.label;

  const tierClasses = {
    warning: 'bg-[var(--ddhq-state-warning-hover)] text-[var(--ddhq-state-warning-text)]',
    success: 'bg-[var(--ddhq-state-success-hover)] text-[var(--ddhq-text-success)]',
    accent:  'bg-[var(--ddhq-state-accent-hover)] text-[var(--ddhq-state-accent-solid)]',
    neutral: 'bg-[var(--ddhq-bg-subtle)] text-[var(--ddhq-text-tertiary)]',
  }[config.tier];

  const sizeClasses = size === 'sm'
    ? 'h-[18px] px-[10px] py-[3px] text-[11px] gap-[5px]'
    : 'h-[24px] px-[12px] py-[4px] text-[12px] gap-[6px]';

  const suffix = timestamp ? ` · ${formatTimestamp?.(timestamp) ?? defaultFormat(timestamp)}` : '';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${tierClasses} ${sizeClasses}`} role="status">
      <Icon size={size === 'sm' ? 11 : 13} aria-hidden />
      <span>{displayLabel}{suffix}</span>
    </span>
  );
}

function defaultFormat(ts: Date | number): string {
  const date = typeof ts === 'number' ? new Date(ts) : ts;
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000; // seconds

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return format(date, 'MMM d');
}
```

### Test cases

```ts
describe('AlertStatusChip', () => {
  it('renders all 6 status variants with correct label + icon', () => {
    const statuses: PulseFirmAlertStatus[] = ['matched', 'applied', 'dismissed', 'partially_applied', 'reverted', 'reviewed'];
    statuses.forEach(s => {
      const { getByRole } = render(<AlertStatusChip status={s} />);
      expect(getByRole('status')).toBeInTheDocument();
    });
  });

  it('renders matched as "Awaiting decision" (display rename)', () => {
    const { getByText } = render(<AlertStatusChip status="matched" />);
    expect(getByText(/Awaiting decision/)).toBeInTheDocument();
  });

  it('appends timestamp suffix when timestamp prop provided', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const { getByText } = render(<AlertStatusChip status="matched" timestamp={twoHoursAgo} />);
    expect(getByText(/2h ago/)).toBeInTheDocument();
  });

  it('respects custom label override', () => {
    const { getByText } = render(<AlertStatusChip status="applied" label="Custom label" />);
    expect(getByText('Custom label')).toBeInTheDocument();
  });

  it('renders without timestamp when not provided', () => {
    const { getByText } = render(<AlertStatusChip status="applied" />);
    expect(getByText('Applied')).toBeInTheDocument();
  });
});
```

---

## D. React component spec — `DecisionActions`

**File:** `apps/app/src/components/DecisionActions.tsx`
**Pencil ref:** `fJtAo`
**Used by:** Alert detail Decision section, Deadline detail Decision section, Rule detail Decision section

### Props

```ts
export interface DecisionActionsProps {
  /** Primary action (filled accent button) */
  primary: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  /** Optional secondary action (outline button) */
  secondary?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
  /** Optional tertiary action (text link) */
  tertiary?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  /** Variant: 'horizontal' (alert/rule) or 'horizontal-with-tertiary-right' (deadline) */
  variant?: 'horizontal' | 'horizontal-with-tertiary-right';
}
```

### Layout (matches Pencil `fJtAo`)

```tsx
export function DecisionActions({ primary, secondary, tertiary, variant = 'horizontal' }: DecisionActionsProps) {
  return (
    <div className="flex items-center gap-[10px] w-full">
      <Button kind="primary" {...primary} />
      {secondary && <Button kind="secondary" {...secondary} />}
      <div className="flex-1" />  {/* spacer */}
      {tertiary && <TextLink {...tertiary} />}
    </div>
  );
}
```

### Button styling (locked specs)

- **Primary:** `bg: $ddhq-state-accent-solid · text: #FFFFFF · padding: 10px 16px · rounded: 8px · gap: 6px · font: Geist 14/600 · icon: 14px white`
- **Secondary:** `bg: $ddhq-bg-default · border: 1px $ddhq-divider-regular · text: $ddhq-text-primary · padding: 10px 16px · rounded: 8px · gap: 6px · font: Geist 14/500 · icon: 14px $ddhq-text-secondary`
- **Tertiary:** `text: $ddhq-text-tertiary · font: Geist 13/500 · icon: 12px · gap: 5px · no bg, no border`

### Test cases

```ts
it('renders primary button always', () => { ... });
it('omits secondary when secondary prop not provided', () => { ... });
it('omits tertiary when tertiary prop not provided', () => { ... });
it('calls primary.onClick when primary clicked', () => { ... });
it('respects disabled state on primary', () => { ... });
it('shows loading spinner on primary when loading=true', () => { ... });
```

---

## E. React component spec — `RelatedRuleRow`

**File:** `apps/app/src/components/RelatedRuleRow.tsx`
**Pencil ref:** `G0zYC`

### Props

```ts
export interface RelatedRuleRowProps {
  /** Rule code (e.g. "CA FTB-2026-12") */
  code: string;
  /** Short name */
  name: string;
  /** Description (1-2 line, truncates) */
  description: string;
  /** Relation tier */
  relation?: 'mirror' | 'safeharbor' | 'overlap';
  /** Click handler — navigates to rule detail */
  onClick: () => void;
}
```

### Visual spec

```tsx
export function RelatedRuleRow({ code, name, description, relation, onClick }: RelatedRuleRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-[12px] py-[10px] border-t border-[var(--ddhq-divider-subtle)] hover:bg-[var(--ddhq-bg-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ddhq-state-accent-solid)] first:border-t-0"
    >
      <div className="w-[22px] h-[22px] flex items-center justify-center bg-[var(--ddhq-bg-subtle)] rounded-[4px]">
        <FileTextIcon size={14} className="text-[var(--ddhq-text-muted)]" aria-hidden />
      </div>
      <div className="flex-1 flex flex-col gap-[2px] text-left">
        <div className="flex items-center gap-[6px]">
          <span className="font-mono text-[12px] font-semibold text-[var(--ddhq-text-primary)]">{code}</span>
          <span className="text-[12px] text-[var(--ddhq-text-muted)]">·</span>
          <span className="text-[12px] text-[var(--ddhq-text-secondary)]">{name}</span>
        </div>
        <p className="text-[12px] text-[var(--ddhq-text-tertiary)] leading-[1.4]">{description}</p>
      </div>
      <div className="w-[22px] h-[22px] flex items-center justify-center">
        <ChevronRightIcon size={14} className="text-[var(--ddhq-text-muted)]" aria-hidden />
      </div>
    </button>
  );
}
```

---

## F. tRPC API additions

### F.1 — Dismiss alert (Phase 2)

**Procedure:** `alerts.dismissAlert`
**Router file:** `apps/app/src/server/routers/alerts.ts`

```ts
import { z } from 'zod';
import { protectedProcedure, router } from '@/server/trpc';
import { eq } from 'drizzle-orm';
import { pulseFirmAlert } from '@/db/schema/pulse';

export const alertsRouter = router({
  // ... existing procedures

  dismissAlert: protectedProcedure
    .input(z.object({
      alertId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const now = Date.now();

      const [updated] = await db
        .update(pulseFirmAlert)
        .set({
          status: 'dismissed',
          dismissedAt: now,
          dismissedBy: session.userId,
          reviewNote: input.reason,
        })
        .where(eq(pulseFirmAlert.id, input.alertId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found' });
      }

      // Emit audit log event
      await ctx.audit.log({
        action: 'alert.dismissed',
        entityId: input.alertId,
        actor: session.userId,
        metadata: { reason: input.reason },
      });

      return updated;
    }),
});
```

### F.2 — Contract schema additions (Phase 1)

**File:** `packages/contracts/src/pulse.ts`

```ts
// Find PulseAlertPublic schema (around line 136-172) and add:

export const PulseAlertPublic = z.object({
  // ... existing fields
  status: PulseFirmAlertStatusSchema,
  summary: z.string().min(1),
  // ADD THESE:
  dismissedAt: z.number().int().nullable(),   // epoch ms
  appliedAt: z.number().int().nullable(),     // epoch ms (note: lives on pulseApplication in DB; resolver must JOIN)
  dismissedBy: z.string().uuid().nullable(),  // user ID
});

export type PulseAlertPublic = z.infer<typeof PulseAlertPublic>;
```

**Resolver update** — where the alert detail is queried, JOIN to `pulseApplication` to fetch `appliedAt`:

```ts
const alert = await db
  .select({
    // ... existing fields
    dismissedAt: pulseFirmAlert.dismissedAt,
    dismissedBy: pulseFirmAlert.dismissedBy,
    // appliedAt from earliest pulseApplication entry for this alert
    appliedAt: sql<number | null>`(SELECT MIN(applied_at) FROM pulse_application WHERE alert_id = ${pulseFirmAlert.id})`,
  })
  .from(pulseFirmAlert)
  .where(eq(pulseFirmAlert.id, alertId))
  .limit(1);
```

---

## G. Hex → token migration table (Phase 1 + 3)

Replace these literal hex values everywhere they appear in `apps/app/src/**`:

| Hex (raw) | Token |
|---|---|
| `#ffffff` body surface | `var(--ddhq-bg-default)` |
| `#fafafa` / `#f9f9f9` page bg | `var(--ddhq-bg-body)` |
| `#f2f4f7` / `#f4f5f7` subtle bg | `var(--ddhq-bg-subtle)` |
| `#101828` text-primary | `var(--ddhq-text-primary)` |
| `#354052` text-secondary | `var(--ddhq-text-secondary)` |
| `#676f83` text-tertiary | `var(--ddhq-text-tertiary)` |
| `#98a2b2` text-muted | `var(--ddhq-text-muted)` |
| `#155aef` accent-solid | `var(--ddhq-state-accent-solid)` |
| `#eff4ff` accent-hover | `var(--ddhq-state-accent-hover)` |
| `#f04438` destructive-solid | `var(--ddhq-state-destructive-solid)` |
| `#ecfdf3` success-hover | `var(--ddhq-state-success-hover)` |
| `#079455` success-solid | `var(--ddhq-state-success-solid)` |
| `#fffaeb` warning-hover | `var(--ddhq-state-warning-hover)` |
| `#fdb022` warning-solid | `var(--ddhq-state-warning-solid)` |
| `#e9e9e9` divider | `var(--ddhq-divider-subtle)` |
| `#d4d4d4` stronger divider | `var(--ddhq-divider-regular)` |

**Allowed exceptions** (keep as hex):
- `#ffffff` ON colored buttons (white-on-accent text) — locked in design system, this is white not theme-aware
- Per-client brand avatar colors (e.g. `#EEF2FF/#4338CA` for "AC" tile) — these are intentional per-client identity, not theme colors

**Find-replace pattern for engineers:**
```bash
# Example sweep
rg --type tsx '#f9f9f9' apps/app/src/features/deadlines/
# Then manually replace with the matching token
```

---

## H. Per-task execution recipes

### H.1 — Implementing the Dismiss button (§1.2 in dev-log)

**Files to touch:**
- `apps/app/src/features/alerts/AlertDetailDrawer.tsx`
- `apps/app/src/server/routers/alerts.ts` (mutation from §F.1)

**Steps in order:**

1. Add the `dismissAlert` mutation to the alerts router (see §F.1)
2. In `AlertDetailDrawer.tsx`, find the existing keyboard shortcut hint at line ~1762 (the `D → Dismiss` chip)
3. Add the mutation hook:
   ```tsx
   const dismissMutation = trpc.alerts.dismissAlert.useMutation({
     onSuccess: () => {
       toast.success('Alert dismissed');
       onClose?.();
       queryClient.invalidateQueries(['alerts']);
     },
   });
   ```
4. Add the keyboard handler:
   ```tsx
   useEffect(() => {
     const handler = (e: KeyboardEvent) => {
       if (e.key === 'd' || e.key === 'D') {
         if (!isInputFocused()) {
           dismissMutation.mutate({ alertId: alert.id });
         }
       }
     };
     window.addEventListener('keydown', handler);
     return () => window.removeEventListener('keydown', handler);
   }, [alert.id]);
   ```
5. Add the Dismiss button to the SheetFooter (next to existing Apply button):
   ```tsx
   <Button
     variant="outline"
     onClick={() => dismissMutation.mutate({ alertId: alert.id })}
     disabled={dismissMutation.isPending}
   >
     <X size={14} className="mr-[6px]" />
     Dismiss
   </Button>
   ```
6. Smoke test (see §I.1 below)
7. Add dev-log entry per project convention

### H.2 — Adding `AlertStatusChip` to the alert detail header

**Files to touch:**
- `apps/app/src/features/alerts/components/AlertStatusBadge.tsx` (rename to `AlertStatusChip.tsx`, refactor)
- `apps/app/src/features/alerts/AlertDetailDrawer.tsx` (place in header)

**Steps:**

1. Confirm contract migration is live (`PulseAlertPublic` includes `dismissedAt` + `appliedAt`)
2. Build `AlertStatusChip` per spec §C above
3. Delete the old `AlertStatusBadge.tsx` (or rename to the chip)
4. In the drawer header, where the existing badge renders, swap:
   ```tsx
   // BEFORE
   <AlertStatusBadge status={alert.status} />

   // AFTER
   <AlertStatusChip
     status={alert.status}
     timestamp={
       alert.status === 'matched' ? alert.createdAt :
       alert.status === 'applied' ? alert.appliedAt :
       alert.status === 'dismissed' ? alert.dismissedAt :
       undefined
     }
   />
   ```
5. Smoke test all 6 variants in storybook or by manually triggering each state
6. Verify WCAG AA contrast in light + dark themes

### H.3 — Rebuild `RuleDetailCompact` summary-first (§3.4 in dev-log)

This is the biggest task. Break into sub-tasks:

**Sub-task 3.4.a — Add bar header card chrome to existing sections**

Look at the existing component at `apps/app/src/features/rules/rule-detail-drawer.tsx:218-312`. Each section currently renders as `<div>{title}: {content}</div>`. Refactor to use the canonical bar-header card pattern from §B.

Create a reusable `<SectionCard>` primitive:

```tsx
// apps/app/src/features/rules/components/SectionCard.tsx
interface SectionCardProps {
  title: string;
  rightSlot?: React.ReactNode;
  defaultExpanded?: boolean;
  expandable?: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({ title, rightSlot, defaultExpanded = false, expandable = true, summary, children }: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <article className="rounded-[12px] border border-[var(--ddhq-divider-subtle)] bg-[var(--ddhq-bg-default)] overflow-hidden flex flex-col">
      <header className="h-9 bg-[var(--ddhq-bg-subtle)] border-b border-[var(--ddhq-divider-subtle)] px-5 flex items-center gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--ddhq-text-primary)]">{title}</h3>
        <div className="flex-1" />
        {rightSlot}
      </header>
      <div className="px-5 py-4 flex flex-col gap-[10px]">
        {expandable ? (expanded ? children : summary) : children}
        {expandable && summary && (
          <button onClick={() => setExpanded(!expanded)} className="text-[12px] font-semibold text-[var(--ddhq-state-accent-solid)] flex items-center gap-[5px]">
            {expanded ? 'Show less' : 'Read more'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
    </article>
  );
}
```

**Sub-task 3.4.b — Replace existing sections with `SectionCard`**

Per the design at Pencil `N2X10V`, the 8 sections are:

1. **Key rule (hero)** — uses `rightSlot=<AlertStatusChip status="awaiting_decision" timestamp={alert.createdAt} />` (rebranded as `RuleStatusChip` if you prefer). No `expandable` — always visible.
2. **Applicability** — `summary` = 3 chip pills (Entity · Files · Effective); `children` = full 6-field grid
3. **Due date logic** — `summary` = highlighted "Due Apr 15, 2026" block + 1 line; `children` = full extension rules
4. **Evidence** — `summary` = primary source row only; `children` = all sources
5. **Coverage impact** — `summary` = one-line text; `children` = per-client breakdown table
6. **Practice review** — `summary` = note textarea + char count; `children` = team notes thread
7. **Activity** — `summary` = most recent event; `children` = full timeline
8. **Decision (footer)** — `expandable={false}` — always shows Accept/Reject/Skip via `<DecisionActions>`

**Sub-task 3.4.c — Test each section's expand/collapse independently**

```ts
describe('RuleDetailPanel', () => {
  it('renders all 8 sections summarized by default', () => { ... });
  it('expanding one section does NOT cascade-expand others', () => { ... });
  it('Decision section always shows actions (not expandable)', () => { ... });
  it('persists expanded state per section across re-renders', () => { ... });
});
```

---

## I. Smoke test recipes

### I.1 — Dismiss handler smoke test

```bash
# Start the app
pnpm dev

# In browser:
# 1. Navigate to /alerts
# 2. Click any alert to open detail drawer
# 3. Press 'D' key
# 4. EXPECTED: toast "Alert dismissed" appears, drawer closes, alert disappears from list (or moves to history)
# 5. Refresh page
# 6. EXPECTED: dismissed alert NOT in active list

# Then click into the dismissed alert from history:
# 7. EXPECTED: AlertStatusChip shows "Dismissed · {date}"
```

### I.2 — Status chip smoke test

```bash
# Use database seed or admin tools to create alerts in each status state:
# matched, applied, dismissed, partially_applied, reverted, reviewed

# In browser /alerts/history:
# 1. Each alert row shows the correct chip color + label + timestamp
# 2. Open each alert detail → header chip matches
# 3. Verify WCAG contrast with browser devtools accessibility inspector
# 4. Toggle dark mode → verify all 6 chips still pass contrast
```

### I.3 — Rule detail summary-first smoke test

```bash
# Use seed: create a rule with all 8 sections populated
# Navigate to /rules → click any rule

# EXPECTED behaviors:
# 1. Right column shows rule detail
# 2. All 6 expandable sections render summary state by default
# 3. Decision footer always shows (not collapsed)
# 4. Click "Read more" on Hero → that section expands, others stay collapsed
# 5. Click "Show all 6 fields" on Applicability → that section expands inline
# 6. Click Accept → impact preview modal opens
# 7. Confirm modal → status chip flips to "Applied · just now", panel stays open, toast appears
```

---

## J. Done-when per phase (granular checklist for each task)

### Phase 1 — Foundation

For each of the 3 new React components:

- [ ] File exists at the spec'd path
- [ ] Props match the TypeScript interface from §C/D/E
- [ ] Renders all variants correctly in Storybook or manual smoke test
- [ ] All hex values are tokens
- [ ] Lint + typecheck pass
- [ ] At least 5 unit tests pass per §C/D test cases
- [ ] Brief dev-log entry per project convention

For contract migration:

- [ ] `PulseAlertPublic` schema includes `dismissedAt` + `appliedAt`
- [ ] Resolver JOINs `pulseApplication` to populate `appliedAt`
- [ ] Existing consumers of `PulseAlertPublic` still compile (no breaking change)
- [ ] At least one integration test verifies timestamps are returned

For deadline card chrome cleanup:

- [ ] No remaining `#fafafa` / `#f9f9f9` / `#f2f4f7` literals in `apps/app/src/features/deadlines/`
- [ ] All cards use the canonical chrome from §B
- [ ] Visual diff vs Pencil node `Y8xrR` shows pixel-equivalent layout

### Phase 2 — Alert detail

- [ ] Pressing `D` dismisses (smoke test §I.1 passes)
- [ ] Dismiss button visible in footer
- [ ] Status chip renders in alert header with timestamp suffix
- [ ] Decision section renders via `<DecisionActions>` component
- [ ] Visual diff vs Pencil `BbQAK` pixel-equivalent

### Phase 3 — Rule library Overview tab

- [ ] Tabs strip renders (Overview · Review (12) · Sources · Audit)
- [ ] Active tab indicator matches design (`bottom 2px stroke accent`)
- [ ] 4 KPI cards render with live data
- [ ] Recent changes feed renders ≥5 rows
- [ ] Click `Review now →` navigates to `/rules?tab=review` (or `/rules/review`)

### Phase 4 — Rule library Review (Queue)

- [ ] URL `?ruleId=` works (set + read state, browser back works)
- [ ] Sheet drawer widened to 1080w
- [ ] Right column conditional render (coverage map vs rule detail)
- [ ] Queue list selected-row pattern matches Pencil `s0brvg`
- [ ] Detail panel uses summary-first card-stack
- [ ] Read more / Show all expanders work per §I.3

### Phase 5 — Rule library Review (Stream + Bulk)

- [ ] View toggle renders (Queue / Stream)
- [ ] Stream view scrolls
- [ ] Per-card Accept/Reject work
- [ ] Click checkbox → sticky footer appears
- [ ] Sticky footer Accept N / Reject N work
- [ ] Bulk modal includes Reject option
- [ ] Bulk modal per-rule note edit works

### Phase 6 — Polish

- [ ] Related rules section renders (or explicitly deferred to v1.1)
- [ ] K2yVqt deadline workflow hero has bar header
- [ ] All hover/focus/disabled states match Pencil `b7fa5Y`
- [ ] All truncation states match Pencil `AAMn4`
- [ ] Narrow viewport (768px) reflows correctly
- [ ] Keyboard nav follows `M5UKQ` order
- [ ] ARIA roles per `M5UKQ` § "ARIA contract"

---

## J.5 — Component reuse policy (READ THIS FIRST)

**Before scaffolding ANY new component, do this in order:**

1. **Grep the codebase** for an existing component that serves the same purpose. Search by:
   - Visual analogy — does any existing component render a pill/chip/badge/card/dialog with the same shape?
   - Semantic name — `Chip`, `Badge`, `Pill`, `Card`, `Dialog`, `Drawer`, `Toolbar`, etc.
   - File location — `packages/ui/src/components/`, `apps/app/src/components/`, `apps/app/src/features/{surface}/components/`.

2. **Check the Pencil component library** at node `lLC46`. The 8 reusable Pencil components map to 3 React components (§C/D/E above). If your need matches one of those — use it. Do not duplicate.

3. **If a partial match exists, EXTEND it before forking.** Add a `variant` prop, add a `size` prop, add a slot. Branching the component is almost always wrong.

4. **If no match exists, ONLY THEN create a new component.** When you do:
   - Place it at the lowest-shared scope (e.g., if used in both `features/alerts/` and `features/rules/`, put it in `apps/app/src/components/`, not in one feature folder)
   - Match the canonical chrome from §B exactly — same paddings, same tokens, same gaps
   - Match the Pencil reference pixel-for-pixel — open the relevant Pencil node and visually diff
   - Pay attention to subtle details: corner radius scale (§A), token usage (§A/G), focus/hover states (§B), keyboard accessibility, ARIA labels for status pills, RTL safety
   - Write at least 3 unit tests
   - Document props with JSDoc
   - Add a Storybook story if the project uses Storybook
   - Note the new component in the dev-log entry for the PR

**Specifically:**

| If you're rendering... | Use... | Not... |
|---|---|---|
| A lifecycle status pill (Awaiting / Applied / etc.) | `<AlertStatusChip>` (§C) | A new `<StatusBadge>` |
| A footer with Apply / Customize / Dismiss | `<DecisionActions>` (§D) | Three separate buttons in a row |
| A cross-reference row (code + name + description + chevron) | `<RelatedRuleRow>` (§E) | A custom div |
| A sectioned card with bar header + content | `<SectionCard>` (§H.3 spec) | Manual div + h3 |
| A page-level dialog with header + body + footer | shadcn `<Dialog>` + your content | Manual modal divs |
| A drawer that slides from the right | shadcn `<Sheet>` | Manual fixed positioning |

**If you create something new, the dev-log entry must answer:**
- Why didn't an existing component fit?
- What did you extend or copy from?
- Where will it be reused next?

If you can't answer those, you shouldn't be creating it.

**Specifically refuse:**
- Creating a second status chip implementation when `AlertStatusChip` already covers 6 lifecycle states
- Creating a second decision footer when `DecisionActions` exists
- Creating a "rule-flavored" chip / row / card when the alert-flavored one works visually (semantically rebrand via component name alias if needed: `export const RuleStatusChip = AlertStatusChip;`)

The goal: ONE component family, used across alert / deadline / rule / client surfaces with appropriate prop overrides.

---

## K. Anti-patterns Claude Code should refuse

If a task tempts these, STOP and ASK:

1. **Inventing tokens** — never add `$ddhq-foo-bar` without checking §A first. If it doesn't exist, add it to `preset.css` and document why.
2. **Freelance corner radii** — never use `6`, `10`, `14`, `16` for cornerRadius. Only `0 · 4 · 8 · 12 · 999`.
3. **Hex on theme-aware surfaces** — never write `bg-[#f9f9f9]`. Use the token. Exceptions in §G allowed-list only.
4. **Generic "icon + label" buttons without sizing specs** — every button matches one of: Primary / Secondary / Tertiary from §D. Don't freelance variants.
5. **`<div>` with manual flex when a `<Card>` or `<SectionCard>` component should be used** — abstract the chrome.
6. **Re-implementing `AlertStatusChip` variants inline** — always use the component. Pass `status` and `timestamp`.
7. **Adding new tRPC procedures without input validation via Zod** — every input must be Zod-parsed.
8. **Mutations without audit log entries** — every state change (accept, dismiss, reject, mark filed) logs to `audit.log`.
9. **Skipping the dev-log entry on commit** — project convention: every change ships with a `docs/dev-log/{date}-{slug}.md` describing what + why.
10. **Force-pushing or skipping hooks** — never use `--no-verify` or `--force` without explicit user approval.

---

## L. Final pre-merge checklist (every PR)

Before merging any phase:

- [ ] Type-check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] Visual diff vs Pencil reference (screenshot from `get_screenshot` MCP tool matches)
- [ ] No new hex leaks (grep `apps/app/src/` for `#[0-9a-f]{6}`)
- [ ] No new freelance corner radii (grep for `rounded-\[6px\]`, `rounded-\[10px\]`, etc.)
- [ ] PR description lists every Pencil node ID referenced
- [ ] Dev-log entry added under `docs/dev-log/`
- [ ] Smoke test recipes (§I) pass on local dev
- [ ] At least one screenshot in PR description showing the change

---

This appendix is the answer to "what does Claude Code need beyond the index?" Every component prop, every token, every API signature, every test case, every smoke recipe. Open it side-by-side with the matching Pencil node ID and you can implement without further design input.
