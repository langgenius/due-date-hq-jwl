# Alert / Deadline / Rule library detail — amendments

**Date:** 2026-06-09
**Status:** Design complete; engineering not started
**Source design file:** `~/Desktop/duedatehq_work.pen`
**Canonical Pencil nodes:** see `Pencil refs` block per task

This dev-log packages three parallel detail-surface amendments into one execution brief. Each section is independently shippable. Read the **Order of work** section before touching code.

---

## Order of work

```
1. Components / token migrations (no UX change)         [low risk, fast]
   ├─ Status chip refactor (alert)
   └─ Card chrome unification (deadline)

2. Alert detail · Decision + Related rules + Status chip [user-visible]
   ├─ Wire Dismiss handler (the kbd hint already promises it)
   ├─ Compute `awaiting_decision` from `status === 'matched'`
   └─ Add Related rules section (schema needed — defer if blocker)

3. Deadline detail · card-stack alignment              [refactor only]
   └─ Apply N2X10V bar-header card pattern to remaining tabs

4. Rule library review flow                            [biggest change]
   ├─ Step 4a: widen the existing Sheet drawer
   ├─ Step 4b: move from drawer → right-column takeover
   ├─ Step 4c: refactor BulkReviewModal
   └─ Step 4d: rebuild RuleDetailCompact in summary-first card-stack
```

---

## 1. Alert detail — `BbQAK`

### 1.1 Decision panel (NEW section at bottom of right rail)

**Why:** the right-panel evidence stack ends without a panel-level action surface. `Confirm 2` / `Exclude` are buried inside `AffectedClients`. Users finish reading and don't know what to do.

**Files to touch:**

- `apps/app/src/features/alerts/AlertDetailDrawer.tsx`
  - Add `<DecisionSection>` as the last sibling of the sections wrapper, ABOVE `<SheetFooter>` (or repurpose the footer — see open question below).
  - Mirror the canonical bar-header card pattern: cornerRadius 12, stroke `divider-subtle` 1 inner, fill `bg-default`, h36 bar with bg-subtle.
  - Use `DecisionActions` (Pencil component → React: needs scaffolding, see §1.5).

**Content (from design):**

| Slot | Content |
|---|---|
| Bar title | `Decision` |
| Bar right chip | `2h since alert created` — warning-hover bg / warning-text fg |
| Summary line | `Apply will shift 2 client deadlines from Apr 15 → Oct 15 and re-anchor 3 dependent tasks.` Geist 13/normal text-secondary |
| Primary | `Apply to {N} confirmed clients` (accent-solid fill, check icon, white text 14/600) |
| Secondary | `Customize per client` (outline, sliders-horizontal icon, primary text 14/500) |
| Tertiary | `Dismiss alert` (text link, x icon 12, text-tertiary) |
| Footer note | `lock-keyhole` + `Decisions are signed by your user account and logged in the audit ledger.` |

**Open question:** the existing `<SheetFooter>` at `AlertDetailDrawer.tsx:1742-1804` already hosts `Apply Deadline Exception`, `Apply reviewed set`, `Mark reviewed`, etc. Decide:

- **Option A** — replace SheetFooter with the new DecisionSection. Cleaner but breaks existing behavior in alerts of `review_only` shape.
- **Option B** — add DecisionSection as a NEW last evidence card, keep SheetFooter. Two action surfaces; busy.
- **Option C (recommended)** — make DecisionSection the new SheetFooter, generalize its `actions` prop so `Apply Deadline Exception` / `Mark reviewed` map onto the primary slot dynamically based on alert kind. One surface, polymorphic.

**Pencil refs:**

- Decision section design lives inside `BbQAK` as the last card (search by name `Decision`)
- Reusable component: `fJtAo` (`DecisionActions`)

### 1.2 Dismiss button (WIRE the existing kbd hint)

**Bug:** `AlertDetailDrawer.tsx:1762` shows `D → Dismiss` as a keyboard hint, but **no handler is implemented**. The hint lies.

**Fix:**

- Grep for `'D' →`-style strings or `KeyboardShortcut` usage in `AlertDetailDrawer.tsx`
- Wire a handler that calls the same mutation `Reactivate/Re-apply` uses (look at its dismiss-style mutation). If no mutation exists, schema work needed:
  - DB already has `pulseFirmAlert.dismissedAt` (`packages/db/src/schema/pulse.ts:291`) and `status === 'dismissed'`
  - Add a `dismissAlert(alertId)` mutation in the alerts router that sets both
  - Add a tRPC procedure path: `alerts.dismissAlert`
- Render a `Dismiss alert` button in the new DecisionSection (or SheetFooter, per §1.1 decision).

### 1.3 Lifecycle status chip in `KeyChange` bar

**Why:** users can't tell at a glance whether someone already handled this alert.

**Already in code:**

- Status enum at `packages/db/src/schema/pulse.ts:8-25`: `'matched' | 'dismissed' | 'partially_applied' | 'applied' | 'reverted' | 'reviewed'`
- `AlertStatusBadge` component renders chips per status — already exists.

**Gap to close:**

1. **Contract migration** — expose `dismissedAt` and `appliedAt` in `PulseAlertPublic`:
   - File: `packages/contracts/src/pulse.ts:136-172`
   - Add optional fields `dismissedAt?: number` and `appliedAt?: number` (epoch ms).
   - Surface them in the API resolver that returns the alert detail (search for `pulseAlertPublicSchema` consumers in the alerts router).
2. **Display-only state rename** — keep DB `status === 'matched'`. In the badge component, render `'matched' → "Awaiting decision"` instead of `"Open"`. No schema migration.
3. **Time suffix in chip label** — once timestamps are exposed, format as `Awaiting decision · {timeAgo(createdAt)}` for matched, `Applied · {format(appliedAt, 'MMM d')}` for applied, `Dismissed · {format(dismissedAt, 'MMM d')}` for dismissed. Use `date-fns`.
4. **Render the chip in the KeyChange bar header** — not next to the title in the detail body. Position: after the icon, before the spacer.

**Pencil refs (status variants):**

| Variant | Component ID |
|---|---|
| Awaiting decision | `w4DBr` |
| Applied | `b75I5W` |
| Dismissed | `GzVzj` |
| Partially applied | `g770iB` |
| Reverted | `Cirrk` |
| Reviewed | `OMxu3` |

These are Pencil components — scaffold the React equivalent as a single `<AlertStatusChip status={...} timestamp={...} />` that switches color tokens + icon + label based on status.

### 1.4 Related rules section (NEW, schema work blocker)

**Why:** users finishing an alert want to know what other regs touch the same forms/clients. Today: no cross-references.

**Gap:** schema has no `related_rules` or `crossref` field on alerts.

**Recommendation: PARK until after §1.1-1.3 ship.** The schema migration + cross-ref linker is its own project. If you ship without it, that's fine — alert detail still works.

**If you want to ship it:**

- Schema: add `pulseAlert.relatedRuleIds: text[]` or a join table `pulseAlertRelatedRule(alertId, ruleId, relation)` where `relation: 'mirror' | 'safeharbor' | 'overlap'`
- Contracts: expose as `relatedRules: { code: string; name: string; description: string; relation: string }[]`
- UI: add a `<RelatedRulesSection>` between Notes and Decision in the sections wrapper. Use `RelatedRuleRow` (Pencil component `G0zYC`).

**Pencil refs:**

- Section design lives inside `BbQAK` (search by name `Related rules`)
- Row component: `G0zYC` (`RelatedRuleRow`)

### 1.5 Status chip + DecisionActions React scaffolding

The Pencil components (`AlertStatusChip` × 6, `DecisionActions`, `RelatedRuleRow`) need React equivalents.

**Suggested files:**

```
apps/app/src/features/alerts/components/
  AlertStatusChip.tsx      // switches on status, returns chip with icon + label + timestamp
  DecisionActions.tsx      // primary + secondary + tertiary slot props
  RelatedRuleRow.tsx       // tile + code + name + description + chevron
```

Each takes the canonical chrome from the corresponding Pencil node — see node IDs above. Use shadcn primitives where they exist; fall back to plain `div` with token classes for chip/badge.

---

## 2. Deadline detail — `Y8xrR` family

### 2.1 Card-stack alignment

**Already in canonical pattern:** `qSa9z` (Recent activity), `u2jxP` (Penalty exposure), `bmwHb` (What's left to do), `K2yVqt` (Workflow hero).

**What changed in design this turn:**

- All cards normalized: `cornerRadius:12 · stroke:divider-subtle 1 inner · fill:bg-default · clip:true`
- `strokeAlignment:"inner"` added to qSa9z, u2jxP, bmwHb (was implicit center, drifted)
- `K2yVqt` padding `[14,18]` → `[16,20]` (uniform with content padding)
- `u2jxP` inner `plotF` padding `[20,24]` → `[16,20]`
- All inner content wrappers normalized to `padding:[16,20]`

**Engineering action:**

- Audit the React components that render these cards. Search for `cornerRadius` / `rounded-` / `border` mismatches.
- Apply the canonical token class to the card wrapper. If `<Card>` from shadcn is used, ensure variant matches.
- Compare side-by-side rendering against Pencil `Y8xrR` after change.

**No new sections.** This is a cleanup pass.

### 2.2 Status detail page tabs (rzzww, HThur, DeZE3, g8Bna2) — already aligned

These were swept earlier this turn (token migration, fiction removal, radius normalization). The Pencil designs are clean. Engineering should:

- Verify the Materials / Status / Record / Audit tab containers use the same card chrome
- Check the Status tab's workflow journey: stages should follow the asymmetric attention pattern (active stage ~40-50%, inactive ~10% each, future ghosted at 0.5 opacity)

**Pencil refs:**

- `rzzww` — Materials tab canonical
- `HThur` — Status tab
- `DeZE3` — Record tab
- `g8Bna2` — Audit tab

### 2.3 Right rail (deadline detail → `ziqF1`)

The 340-wide right rail of `rzzww` is a candidate for the wrapper-inline pattern (V2) rather than card-stack — see `docs/Design/rule-library-review-flow.md` for the pattern comparison. Not blocking; revisit if rail content grows.

---

## 3. Rule library detail — `RuleDetailCompact` migration

See companion doc: `docs/Design/rule-library-review-flow.md` for the full flow specification.

**This dev-log section is the execution path only.**

### 3.1 Step 1 — widen the existing Sheet (cheapest win, do this first)

**Why:** the current `<Dialog>` review modal is cramped — fixed header + fixed practice review eat ~300px of 720px viewport.

**Files:**

- `apps/app/src/features/rules/rule-detail-drawer.tsx` (the existing `<Sheet>`)
- `apps/app/src/features/rules/coverage-tab.tsx:2100-2288` (`BulkReviewModal` — leave alone in this step)

**Changes:**

1. Find the `<Sheet>` width prop. Currently it's likely `sm:max-w-2xl` or similar (~720px). Change to `sm:max-w-4xl` (~896px) or `sm:max-w-[1080px]` to match design.
2. Add a back-to-queue affordance in the sheet header for navigation between rules.
3. Wire the click handler on rule rows to open the sheet for that rule's ID (search for existing `setSelectedRuleId` state).

**Risk:** low. Same component, different size.

### 3.2 Step 2 — drawer → right-column takeover

**Why:** the rule library page (`coverage-tab.tsx`) shows a coverage map on the right. When a rule is selected, replace the map with the rule detail. This is the "in the design universe of alert/deadline detail" change.

**Files:**

- `apps/app/src/features/rules/coverage-tab.tsx`
- new route param: `useSearchParams` with `ruleId` (or push to URL)

**Changes:**

1. Add `?ruleId=` query param state to `CoverageTab`.
2. Conditional render the right column:
   - `ruleId == null` → `<JurisdictionCoverageMap />`
   - `ruleId != null` → `<RuleDetailCompact ruleId={ruleId} onBack={() => setRuleId(null)} />`
3. Rule list rows (the left rail) become `<Link>` setting `?ruleId=…` so browser back works.
4. The coverage map becomes a header strip at the top of the page (or moves to a collapsed sidebar) — doesn't disappear, just relocates.

**Migration risk:** medium. URL routing + state preservation. Test:
- Browser back button after opening a rule
- Direct URL with `?ruleId=` loads the right rule
- Multi-tab navigation
- Refresh holds state

### 3.3 Step 3 — refactor BulkReviewModal

**Why:** bulk modal currently does too much. Decouple it from single-rule review.

**Files:**

- `coverage-tab.tsx:2100-2288` (`BulkReviewModal`)
- `rule-detail-drawer.tsx:935-1062` (`RejectReasonDialog`) — REUSE here

**Changes:**

1. Add Reject button alongside Accept in the bulk modal footer. Wire to a bulk reject mutation (likely `rejectTemplate` × N).
2. Add per-rule mini-edit affordance:
   - Each row in the selected-rules list gets two icon buttons: `pencil` (open per-rule note dialog) and `eye` (open RuleDetailCompact in the right-column takeover).
3. Remove the AI concrete drafts collapse logic if it duplicates what RuleDetailCompact will show — moving deep-detail to the takeover.

**Pencil refs:**

- Bulk modal design is described in `docs/Design/rule-library-review-flow.md` § "Screen G"

### 3.4 Step 4 — rebuild RuleDetailCompact in summary-first card-stack

**Why:** today's component renders all sections fully expanded. Switch to summary-first with `Read more` per section.

**Files:**

- `rule-detail-drawer.tsx:218-312` (`RuleDetailCompact`)

**Changes:**

1. Wrap each section in a `<DisclosureCard>` that takes `summary` + `expanded` slots and a controlled `expanded` state.
2. Default `expanded={false}` for every section except the hero summary (which shows 2 lines + ellipsis).
3. Add the missing sections per Pencil `N2X10V`:
   - Practice review (textarea + team notes link + char count)
   - Activity (timeline of state transitions)
4. Bar header pattern: bar h36, bg-subtle, padding [16,20], title 13/600 + right slot for sub or chip.
5. Use `AlertStatusChip awaiting` (Pencil `w4DBr`) variant — semantically becomes `RuleStatusChip` but visual identical.
6. Decision footer: replace `AcceptCandidateButton` + `RejectCandidateButton` with `<DecisionActions primary={…} secondary={…} tertiary={…} />` driven by the `DecisionActions` component (§1.5).

**Pencil refs:**

- Summary-first inline panel: `N2X10V` (inside `GHObe`)
- 6 of 8 cards originally + Practice review + Activity added in latest turn
- Stale/alternate exploration NOT to ship: `qgiTf` (labeled stale)

---

## Contract migration summary

Required for §1.3:

```ts
// packages/contracts/src/pulse.ts (PulseAlertPublic)
{
  ...existing fields,
  + dismissedAt: z.number().int().optional(), // epoch ms
  + appliedAt: z.number().int().optional(),   // epoch ms
}
```

Required for §1.4 (Related rules, optional/deferrable):

```ts
// packages/contracts/src/pulse.ts (PulseAlertPublic)
{
  + relatedRules: z.array(z.object({
      code: z.string(),
      name: z.string(),
      description: z.string(),
      relation: z.enum(['mirror', 'safeharbor', 'overlap']),
    })).optional(),
}
```

No DB migration needed for §1.3 (timestamps already in DB). For §1.4 a join table is needed — see §1.4 paragraph.

---

## Done-when checklist

- [ ] `DecisionActions` React component scaffolded; renders alert detail footer with Apply / Customize / Dismiss
- [ ] Dismiss handler wired; pressing `D` or clicking the button dismisses the alert and updates `dismissedAt`
- [ ] `AlertStatusBadge` renamed (or extended) to `AlertStatusChip`; renders 6 variants with time suffix
- [ ] `PulseAlertPublic` exposes `dismissedAt` and `appliedAt`
- [ ] Deadline detail card chrome audited; mismatches fixed
- [ ] `RuleDetailCompact` sheet widened (step 1)
- [ ] `?ruleId=` routing in place; rule click opens detail in right column (step 2)
- [ ] Bulk modal has Reject + per-rule mini-edit (step 3)
- [ ] `RuleDetailCompact` rebuilt summary-first with all 8 sections (step 4)
- [ ] Related rules section deferred or shipped (decision logged)

---

## Parallel execution matrix

You can run multiple Claude Code sessions concurrently on this brief — IF and ONLY IF each session touches a disjoint set of files. Conflicts happen when two sessions edit the same file. Use this matrix to assign sections.

### File ownership per section

| Section | Files touched | Disjoint from |
|---|---|---|
| §1.1 Decision section (alert) | `apps/app/src/features/alerts/AlertDetailDrawer.tsx`<br>NEW `apps/app/src/features/alerts/components/DecisionActions.tsx` | §2, §3, §1.4 |
| §1.2 Dismiss handler | `apps/app/src/features/alerts/AlertDetailDrawer.tsx`<br>`apps/app/src/server/routers/alerts.ts` (or equivalent) | §2, §3 |
| §1.3 Status chip + contract | `packages/contracts/src/pulse.ts`<br>`apps/app/src/features/alerts/components/AlertStatusBadge.tsx` (rename → `AlertStatusChip.tsx`)<br>API resolver that returns alert detail | §2, §3.1, §3.2 |
| §1.4 Related rules | `packages/db/src/schema/pulse.ts` (NEW join table)<br>`packages/contracts/src/pulse.ts`<br>NEW `apps/app/src/features/alerts/components/RelatedRulesSection.tsx`<br>NEW `apps/app/src/features/alerts/components/RelatedRuleRow.tsx` | §2, §3 |
| §1.5 Component scaffolds | NEW `apps/app/src/features/alerts/components/*.tsx` only | §2, §3 |
| §2.1 Deadline card chrome | `apps/app/src/features/deadlines/**` (audit + token sweep) | §1, §3 |
| §2.2 Deadline detail tabs | `apps/app/src/features/deadlines/**/StatusTab.tsx`<br>`MaterialsTab.tsx`, `RecordTab.tsx`, `AuditTab.tsx` | §1, §3 |
| §3.1 Widen Sheet | `apps/app/src/features/rules/rule-detail-drawer.tsx` (width prop only) | §1, §2 |
| §3.2 Right-column takeover | `apps/app/src/features/rules/coverage-tab.tsx`<br>`apps/app/src/features/rules/rule-detail-drawer.tsx` | §1, §2 |
| §3.3 Refactor BulkReviewModal | `apps/app/src/features/rules/coverage-tab.tsx` (BulkReviewModal section) | §1, §2.1, §2.2 |
| §3.4 Rebuild RuleDetailCompact | `apps/app/src/features/rules/rule-detail-drawer.tsx`<br>NEW `apps/app/src/features/rules/components/*.tsx` | §1, §2 |

### Safe parallelization combinations

**2 sessions running concurrently — pick one from each column:**

| Session A (alert/rules) | Session B (different surface) |
|---|---|
| §1.1 Decision section | §2.1 or §2.2 (deadline) or §3.1 (rule sheet widen) |
| §1.2 Dismiss handler | §2.* or §3.* (any rule work) |
| §1.3 Status chip + contract | §2.* (deadline) — NOT §3 (rule work also reads `PulseAlertPublic`-style schemas; check first) |
| §1.4 Related rules | §2.* or §3.4 (rule rebuild touches different files) |
| §1.5 Component scaffolds | Any §2 or §3 |
| **§3.4 Rebuild RuleDetailCompact** (the big one) | **§1.1 or §1.2** (alert work is disjoint) |

**3 sessions running concurrently — pick disjoint trios:**

| Session A | Session B | Session C | Risk |
|---|---|---|---|
| §1.2 Dismiss handler | §2.1 Deadline chrome | §3.4 Rebuild RuleDetailCompact | ✅ low |
| §1.3 Status chip | §2.2 Deadline tabs | §3.3 Refactor BulkReviewModal | ✅ low |
| §1.1 Decision section | §2.1 | §3.1 Widen Sheet | ✅ low |
| §1.4 Related rules | §3.4 | (any §2) | ⚠️ medium — §1.4 + §3.4 may both touch component scaffolds; coordinate |

### What CAN'T be parallelized

- **Two sessions on the same §** — file conflicts guaranteed.
- **§1.3 + §3.4 simultaneously** — both read `PulseAlertPublic` and may need parallel contract updates. Land §1.3 first, then §3.4.
- **§3.2 + §3.3 simultaneously** — both touch `coverage-tab.tsx` extensively. Sequential.
- **§3.1 + §3.4 simultaneously** — both touch `rule-detail-drawer.tsx`. Land §3.1 first (trivial width change), then §3.4 (big rebuild).

### Coordination rules between sessions

1. **Branch per session.** Each Claude Code session works on its own branch named `feat/alerts-decision-section`, `feat/rule-rebuild`, etc. No shared trunk during the parallel window.
2. **No shared file touches.** Re-check the matrix before each session starts.
3. **Token / theme additions go through ONE session.** If you add a new `$ddhq-*` token to `preset.css`, that should NOT happen in two sessions at once. Pick the session most likely to need it, do the token addition there, merge first.
4. **`packages/contracts/*` is high-risk.** Only ONE session edits contracts at a time. §1.3 (alerts) and §1.4 (related rules) both touch `pulse.ts` — run them sequentially OR have one session do both contract edits.
5. **Commit + push frequently.** Long-lived branches with parallel sessions invite merge hell.

---

## How to invoke Claude Code (prompt template)

Copy this template for the FIRST session you start. Replace `{SECTION}` with the section ID (e.g. `§3.4`).

```
You are implementing a design redesign documented in
docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md
and docs/Design/rule-library-review-flow.md.

Read both docs first. Then execute {SECTION} end-to-end:

RULES OF ENGAGEMENT
- Touch ONLY the files listed in {SECTION}'s "Files to touch" / "Files".
- Open the Pencil mockup at the node ID listed in {SECTION} (via the Pencil MCP tool
  if available) and match it: same paddings, same tokens, same gaps, same spacing.
- Use the Pencil reusable components when scaffolding React equivalents — list:
  AlertStatusChip (w4DBr/b75I5W/GzVzj/g770iB/Cirrk/OMxu3), RelatedRuleRow (G0zYC),
  DecisionActions (fJtAo). Take props from the Pencil node; don't invent prop shapes.
- All colors via $ddhq-* tokens. No raw hex. If a token doesn't exist, add it to
  preset.css and document why.
- Card chrome is FIXED: cornerRadius 12, stroke $ddhq-divider-subtle 1 inner,
  fill $ddhq-bg-default, clip true. Bar header is h36, fill $ddhq-bg-subtle,
  padding [16,20], gap 8, title Geist 13/600. Content padding [16,20].
- If a design detail isn't in the doc OR the Pencil mockup, STOP and ASK.
  Don't improvise.
- Branch per session. Use feat/{slug} where {slug} matches {SECTION}.

DONE-WHEN
- Every checkbox in {SECTION}'s success criteria is checked.
- Type-check + lint clean.
- Manual smoke test of the happy path.
- New dev-log entry at docs/dev-log/{today}-{slug}.md with: what changed, why,
  Pencil node IDs referenced, files touched, any open questions raised.
- PR description lists every Pencil node ID you used.

PARALLEL SAFETY
Before starting, check the "Parallel execution matrix" section of the main dev-log.
If another session is running on a conflicting file, stop and tell me which sections
clash. Pick a disjoint section if available.
```

---

## How to start a SECOND parallel session

You already have a session working on **Rule review card-stack** (likely §3.4). You want to start another session in parallel without conflict.

**Recommended pairing:** §1.1 (Alert Decision section) OR §1.2 (Dismiss handler).

Both touch only `apps/app/src/features/alerts/*`. Zero overlap with rule-library files.

**Exact prompt for the second session:**

```
You are starting a second Claude Code session in parallel with another session
that is working on §3.4 (Rule review card-stack rebuild) in
apps/app/src/features/rules/.

DO NOT TOUCH ANY FILE UNDER apps/app/src/features/rules/.
DO NOT TOUCH packages/contracts/src/rules.ts.
DO NOT TOUCH the rule library's coverage-tab.tsx or rule-detail-drawer.tsx.

Your job is §1.1 (Alert Decision section) from
docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md.

Read that doc + docs/Design/rule-library-review-flow.md first for context.
Then execute §1.1 end-to-end.

Constraints:
- Files you may touch:
  - apps/app/src/features/alerts/AlertDetailDrawer.tsx
  - NEW apps/app/src/features/alerts/components/DecisionActions.tsx
  - NEW apps/app/src/features/alerts/components/AlertStatusChip.tsx (only if §1.3
    is part of your scope — confirm with user first)
- Pencil refs:
  - Decision section design lives inside Pencil node BbQAK (last card,
    name "Decision")
  - DecisionActions reusable component: Pencil node fJtAo
- Card chrome: cornerRadius 12, stroke $ddhq-divider-subtle 1 inner,
  fill $ddhq-bg-default, clip true.
- Bar header: h36, fill $ddhq-bg-subtle, padding [16,20], gap 8, title Geist 13/600.
- For the SheetFooter merger decision (Option A/B/C in §1.1), default to OPTION C
  (DecisionActions becomes the new SheetFooter; polymorphic primary slot per
  alert kind). If Option C feels wrong while implementing, stop and ask.

Branch: feat/alerts-decision-section
PR title: feat(alerts): Decision section with Apply / Customize / Dismiss

When done, PR + tag me. The other session will merge separately on its own
branch (feat/rules-detail-card-stack); no merge conflicts expected because file
ownership is disjoint.
```

**Alternative pairing if you want even smaller scope** — use §1.2 (Dismiss handler) instead. It's tiny, ~50 lines, and lands in hours.

**Prompt for §1.2 second session:**

```
You are starting a second Claude Code session in parallel with another session
that is working on §3.4 (Rule review card-stack) in features/rules/.

Your job is §1.2 (Dismiss handler) from
docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md.

The bug: AlertDetailDrawer.tsx line 1762 shows "D → Dismiss" as a keyboard hint,
but no dismiss handler is wired and no button exists. The hint lies.

DO NOT TOUCH features/rules/ — the other session owns it.

Fix:
1. Add a dismissAlert(alertId) mutation in the alerts tRPC router.
   It should set pulseFirmAlert.status = 'dismissed' and dismissedAt = Date.now().
2. Wire a handler in AlertDetailDrawer.tsx that calls the mutation when:
   - User presses 'D' (the existing kbd hint).
   - User clicks a new Dismiss button in the panel footer.
3. Add a Dismiss button to the SheetFooter (next to Apply Deadline Exception).
   Style: stroke $ddhq-divider-subtle, fill $ddhq-bg-default, cornerRadius 8,
   padding [8,14], gap 6, with 'x' lucide icon 14x14 fill text-tertiary and
   label Geist 13/500 fill text-primary. Match the Pencil tertiary action in
   the Decision section (fJtAo component).

Files you may touch:
- apps/app/src/features/alerts/AlertDetailDrawer.tsx
- apps/app/src/server/routers/alerts.ts (or wherever the alerts tRPC router lives)
- Test file if you add coverage

Branch: feat/alerts-dismiss-handler
PR title: fix(alerts): wire Dismiss handler + button (the D shortcut now works)

Smoke test:
- Open an alert detail
- Press D → alert dismisses, toast appears, drawer closes
- Click Dismiss button → same behavior
- Reopen the dismissed alert from history → status shows "Dismissed"
```

---

## Decisions logged (additions since the original brief)

### Map view for rule library — DECIDED: do NOT build

The question was whether to add a list/map toggle to the rule library page (parity with alerts) and whether to bridge the alerts map → rules map.

**Verdict: no.** Both are pattern parity moves without a real job-to-be-done.

Reasoning:
1. **Alerts are events, rules are applicability.** The map metaphor fits events naturally (they happen *somewhere*); for rules it's borrowed clothing.
2. **The reviewer's job is sequential.** "What's pending review?" is a queue question, not a map question.
3. **The coverage map already exists** in the right column as the default state. Promoting it to a top-level toggle would create redundancy.
4. **The right column is already double-booked** (rule detail when selected, coverage map when not). Adding a queue-only mode makes three states of one column.
5. **Maps are for analysis, not action.** Build a dedicated `/rules/coverage` analytics page if/when 3+ users ask for one. Don't pre-build it inside the reviewer workflow.

What to ship instead:
- **Click-to-filter from the coverage map** — click a state tile → queue rail filters to that jurisdiction. Best of both worlds, zero new screens.
- **Semantic bridges** between alerts and rules:
  - Alert detail: "**N affected rules in this jurisdiction →**" link → opens rule library filtered to those rules.
  - Rule detail: "**N pending alerts touching this rule**" badge in the bar.
- Both deeplink, both are direct, neither needs a shared map canvas.

Re-evaluate if 3+ reviewers explicitly ask for "geographic rule analysis." Until then, defer.

### Coverage map relocation after right-column takeover — DECIDED: header strip

When user clicks a rule, the right column shows rule detail. The coverage map moves to:

**Decision: a thin header strip at the top of the rule library page.**

The strip shows the legend only (`Active 47 · Pending 5 · Rejected 1 · Not covered 0`) and a small inline preview tilegram (5-6 most-relevant states). Clicking the strip expands the full grid back into view (modal/popover).

Alternative considered: collapsed left sidebar. Rejected because the left rail is already the queue list — can't double-book it.

### Status state rename `matched` → `awaiting_decision` — DECIDED: display only

Keep the DB enum `status === 'matched'`. The display label in `AlertStatusChip` renders `'matched' → "Awaiting decision"`. No data migration. Faster to ship, no rollback risk.

### Related rules — DECIDED: defer to v1.1

The schema work (join table + cross-ref linker) is its own project. Ship the alert detail without Related rules in v1. Revisit in v1.1.

### `pulseFirmAlert.dismissedAt` / `appliedAt` exposure — DECIDED: required

Contract migration required for the timestamped status chip. Land this BEFORE shipping §1.3.

---

## Updated done-when checklist

Replaces the original. Items above the line are blocking; below the line are nice-to-have.

**Blocking (must ship for v1):**
- [ ] §1.1 Decision section landed (Apply / Customize / Dismiss visible)
- [ ] §1.2 Dismiss handler wired (`D` shortcut works, button exists)
- [ ] §1.3 Status chip renders 6 variants with timestamp suffix
- [ ] §1.3 Contract migration: `dismissedAt` + `appliedAt` exposed in `PulseAlertPublic`
- [ ] §1.5 React components scaffolded for `AlertStatusChip`, `DecisionActions`, `RelatedRuleRow` (even if unused yet)
- [ ] §2.1 Deadline card chrome audit complete, mismatches fixed
- [ ] §3.1 Sheet widened (1080w)
- [ ] §3.2 `?ruleId=` routing in place, rule click opens detail in right column
- [ ] §3.3 Bulk modal has Reject + per-rule mini-edit
- [ ] §3.4 RuleDetailCompact rebuilt summary-first with 8 sections, uses bar-header card chrome
- [ ] Coverage map moves to header strip on rule-detail takeover

**Nice-to-have (v1.1+):**
- [ ] §1.4 Related rules section + schema + UI
- [ ] Click-to-filter from coverage map → queue rail
- [ ] Semantic bridges: alert "N affected rules" link, rule "N pending alerts" badge
- [ ] Per-field confidence ticks in ExtractedFacts (eng + product decision pending)
- [ ] Partial extraction state (em-dash + "Not in source" tooltip)
- [ ] Apply 0-matches empty state from Pencil `kpPeW` to live `G24tQh`
- [ ] Hover state spec for "View 3 more matched clients" expander
