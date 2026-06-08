# Build-Ready Specs: Penalty Exposure readout + Dashboard Daily Brief (2026-06-05)

**Author:** Yuqi (UX). Companion to [backend-ui-gap-specs-2026-06-05.md](backend-ui-gap-specs-2026-06-05.md). These two are the "most finished backend value, currently invisible" picks. Both are specified against the real component library, tokens, and contract payloads in this repo.

Design-system anchors used throughout:

- Money: `formatCents()` from `@/lib/utils` (cents → `$142,300` / `$142,300.56`).
- Metric tiles: `StatTile` (`@/components/patterns/stat-tile`) — frame `rounded-md border border-divider-subtle bg-background-default px-4 py-3`, value `text-xl font-semibold tabular-nums tracking-tight`, tones `neutral | critical | muted`. **DESIGN.md §7: severity color is scarce — never default to it.**
- AI authorship: `AiProvenanceBadge` (`@/components/primitives/ai-provenance-badge`), Astroid icon, `variant="inline" | "chip"`.
- UI atoms (`@duedatehq/ui/components/ui/*`): `card`, `collapsible`, `badge`, `tooltip`, `separator`, `alert`, `button`, `text-link`, `progress`, `skeleton`, `tabs`.
- Color tokens: `text-text-primary|secondary|tertiary|destructive|inverted`, `bg-background-default|section|subtle`, `bg-accent-default`, `border-divider-subtle`. Caption type: `text-caption-xs`, `text-sm`.

---

# Spec A — Penalty **Exposure readout**

## A.0 Design decision (read first)

The per-obligation **Risk tab was deliberately removed 2026-05-21** ([ObligationQueueDetailDrawer.tsx:1832](../../apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx)) because risk **inputs** (importance, late-filing count) belong on the client page (`ClientRiskInputsPanel`), not per-obligation. **We are not undoing that.**

What's missing is different: the per-obligation penalty **exposure output** — an itemized, daily-accruing penalty estimate with cited authority, computed by the backend and rendered **nowhere**. There's even a hardcoded fake `"≈$11,840 penalty exposure"` in the overdue band ([obligations.tsx:4635](../../apps/app/src/routes/obligations.tsx)). This spec surfaces the **real readout** (output, read-only) and kills the fake.

**Recommended placement:** a read-only `ObligationExposurePanel` mounted **inside the existing Summary tab** of the drawer, directly under `PathToFilingSummary`. This honors the "no per-obligation risk-input tab" decision (it's a readout, not an editor) and needs no new tab/nav. _Alternative:_ revive `risk` as a read-only tab (the enum value + deep-link still exist) — same panel, different wrapper. Recommendation: **Summary-panel**, gated to obligations where the readout is meaningful (filing/payment types; hide for `internal_review`).

## A.1 Data availability (critical for phasing)

`ObligationQueueRow = ObligationInstancePublic.omit({ estimatedExposureCents, exposureStatus, exposureCalculatedAt })`. So:

| Field                             | On `row`/`detail` today? | Notes                                                        |
| --------------------------------- | ------------------------ | ------------------------------------------------------------ |
| `accruedPenaltyCents`             | ✅ yes                   | Penalty **as of today**, growing daily                       |
| `accruedPenaltyStatus`            | ✅ yes                   | `ready` / `needs_input` / `unsupported` — drives panel state |
| `accruedPenaltyBreakdown[]`       | ✅ yes                   | Itemized accrued lines                                       |
| `penaltyBreakdown[]`              | ✅ yes                   | Itemized "if filed late" lines                               |
| `missingPenaltyFacts[]`           | ✅ yes                   | What's needed to compute                                     |
| `penaltySourceRefs[]`             | ✅ yes                   | Cited authority                                              |
| `penaltyAsOfDate`                 | ✅ yes                   | "Accrued through {date}"                                     |
| `estimatedTaxDueCents`            | ✅ yes                   | Tax driving the penalty                                      |
| `penaltyFormulaLabel` / `Version` | ✅ yes                   | Provenance                                                   |
| **`estimatedExposureCents`**      | ❌ **omitted**           | Top-line total estimate                                      |
| **`exposureStatus`**              | ❌ **omitted**           | —                                                            |
| **`exposureCalculatedAt`**        | ❌ **omitted**           | Freshness                                                    |

**Phase 1 (no contract change):** render the full panel driven by `accruedPenaltyStatus` + `accruedPenaltyCents` + `accruedPenaltyBreakdown` + `missingPenaltyFacts` + `penaltySourceRefs`. This is the live "what's accruing right now" readout and is 100% available today.

**Phase 2 (`[contract]` PR — un-omit the 3 fields):** add the estimated-total hero + replace the fake queue-band placeholder with the real `estimatedExposureCents` summed per band. One-line change to `ObligationQueueRowSchema.omit(...)`.

## A.2 Component tree

```
ObligationExposurePanel({ row })                     // panels.tsx, new export
├─ <Card> (variant matches AuthorityResponsePanel chrome)
│  ├─ Header: "Penalty exposure" + AiProvenanceBadge(variant="chip",
│  │          generatedAt=exposureCalculatedAt) + "as of {penaltyAsOfDate}"
│  ├─ <ExposureHero>            // state-dependent — see A.3
│  ├─ <Separator/>
│  ├─ <PenaltyBreakdownList items={accruedPenaltyBreakdown}/>   // accordion
│  └─ <PenaltyBasisFooter refs={penaltySourceRefs}/>
└─ (renders null when obligationType is internal_review)
```

Sub-components (all in `panels.tsx`, reusing existing primitives):

- **`ExposureHero`** — switch on `accruedPenaltyStatus` (Phase 2: prefer `exposureStatus`).
- **`PenaltyBreakdownList`** — maps each `PenaltyBreakdownItem` to a `<Collapsible>` row: trigger shows `label` (left) + `formatCents(amountCents)` (right, `tabular-nums`); content shows `formula` in `text-caption-xs text-text-tertiary` and an `inputs` key/value grid via the existing `DetailRow` primitive.
- **`PenaltyBasisFooter`** — maps each `PenaltySourceRef` to a `TextLink` to `url`, wrapped in a `Tooltip` whose content shows `sourceExcerpt`, `Effective {effectiveDate}`, `Reviewed {lastReviewedDate}`.

## A.3 The three states

### State `ready` — there is a real number

```
┌─ Penalty exposure  ✦AI  · as of Jun 5, 2026 ─────────────────┐
│                                                              │
│   $4,210   accrued penalty                                   │   ← text-3xl font-semibold
│   ▲ growing ~$62/day · failure-to-file + failure-to-pay      │   ← text-sm text-text-secondary
│                                                              │
│   ────────────────────────────────────────────────────────  │
│   Failure to file        $1,860   ▸                          │   ← Collapsible row
│   Failure to pay         $1,240   ▸                          │
│   Interest               $1,110   ▾                          │
│      0.5%/mo × $12,400 balance × 3 mo                         │   ← formula, caption-xs
│      Balance due: $12,400 · Months late: 3                   │   ← inputs, DetailRow
│   ────────────────────────────────────────────────────────  │
│   Basis: IRC §6651(a)(1) ↗  ·  IRC §6601 ↗                    │   ← PenaltyBasisFooter, tooltips
└──────────────────────────────────────────────────────────────┘
```

- Hero value tone: **`text-text-primary`** by default. Only escalate to `text-text-destructive` when the obligation is genuinely overdue/at-risk (`row.status === 'overdue'` band) — per §7, don't make every dollar red.
- "growing ~$/day" only when derivable from the breakdown; otherwise omit the trend line.
- Money everywhere via `formatCents`.

### State `needs_input` — backend can't compute yet

```
┌─ Penalty exposure ───────────────────────────────────────────┐
│  ⓘ Estimate incomplete                                        │   ← <Alert> tone=info
│  To estimate exposure we need:                                │
│    ☐ Balance due                                              │   ← from missingPenaltyFacts[]
│    ☐ Months late                                              │
│  [ Add these inputs → ]                                       │   ← Button → penalty-inputs dialog
└──────────────────────────────────────────────────────────────┘
```

- Render `missingPenaltyFacts[]` as a checklist.
- The button opens the **existing** penalty-inputs editor (`clients.updatePenaltyInputs`, already wired from `dialogs.tsx` / `parseMoneyCents`). Pass the obligation's client id. This converts a dead end into the one action that fixes it.

### State `unsupported` — not modeled for this type/jurisdiction

```
┌─ Penalty exposure ───────────────────────────────────────────┐
│  Penalty estimation isn't available for this obligation yet.  │   ← EmptyPanel primitive
└──────────────────────────────────────────────────────────────┘
```

Quiet. No alarm color. Use the existing `EmptyPanel` from `primitives.tsx`.

## A.4 Loading & edge cases

- Loading (detail query pending): the drawer already gates on `detail`; reuse its skeleton. Within the panel, if `accruedPenaltyBreakdown` is empty but a total exists, show the hero only (no accordion).
- Mount guard: `if (row.obligationType === 'internal_review') return null`. For `deposit` (no penalty surface today) the status will be `unsupported` → quiet empty state, which is correct.
- a11y: hero number gets an `aria-label` spelling out the currency; collapsible rows use the `Collapsible` primitive's built-in `aria-expanded`.

## A.5 Where it mounts (exact)

In `ObligationQueueDetailDrawer.tsx`, the `summary` `TabsContent` (`grid gap-3` block at ~line 1874), add `<ObligationExposurePanel row={row} />` after `<PathToFilingSummary>` and before `<ActiveStageDetailCard>`. No tab-trigger change needed.

## A.6 Phase 2 — kill the fake placeholder

Once `estimatedExposureCents` is un-omitted: in `routes/obligations.tsx:4630`, replace the static `"≈$11,840 penalty exposure"` with the summed `formatCents(Σ row.estimatedExposureCents)` for the band's rows. Add the estimated total as a second line in `ExposureHero` ("if filed late: $X").

---

# Spec B — Dashboard **Daily Brief** card

## B.0 Purpose & placement

A server-generated narrative of the firm's day with citations linking each claim to a specific obligation. `dashboard.load` already returns it as `brief`; `routes/dashboard.tsx` never reads it. Mount a `DashboardBriefCard` at the **top of the dashboard body**, above the triage/actions table, full-width.

## B.1 Data (`DashboardBriefPublic`, dashboard.ts:167)

`{ status: pending|ready|failed|stale, text, citations[], generatedAt, expiresAt, errorCode, aiOutputId }`. Each citation: `{ ref:int, obligationId, evidence:{ sourceType, sourceId, sourceUrl } | null }`.

## B.2 Component tree

```
DashboardBriefCard({ brief, scope, onScopeChange, onRefresh, refreshing })
├─ <Card className="bg-background-section ...">
│  ├─ Header row:
│  │   ├─ Astroid icon + "Your daily brief"
│  │   ├─ <BriefScopeToggle value={scope}/>        // 'firm' | 'me' segmented
│  │   ├─ <BriefFreshnessChip status generatedAt/> // see B.3
│  │   └─ <Button variant=ghost onClick=onRefresh> RefreshCw  // hidden unless ready/stale/failed
│  └─ Body: <BriefProse text citations/>           // see B.4
└─ returns null when brief == null
```

## B.3 Status → chrome (`BriefFreshnessChip`)

| `status`  | Chip                                                             | Refresh button | Body                                                                |
| --------- | ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| `ready`   | `Badge` muted "Updated {relativeTime(generatedAt)}"              | shown          | prose                                                               |
| `stale`   | `Badge` warning "Outdated"                                       | **emphasized** | prose (dimmed)                                                      |
| `pending` | `Badge` + spinner "Generating…"                                  | hidden         | `Skeleton` 3 lines; poll via `refetchInterval` until status≠pending |
| `failed`  | `Badge` destructive "Couldn't generate" + `errorCode` in tooltip | "Retry"        | `Alert` with quiet copy                                             |

Use `RelativeTime` primitive for `generatedAt`. Respect `expiresAt`: once past, nudge status presentation toward "stale" even if server still says ready.

## B.4 Prose + citations (`BriefProse`)

- Tokenize `text` on `[n]` markers. Each `[n]` → a **citation chip**: small `Badge` (`text-caption-xs`, `tabular-nums`) labeled `n`, resolved via `citations.find(c => c.ref === n)`.
- **Click** → open that `obligationId` in the obligation drawer (reuse the dashboard's existing row→drawer nav; the dashboard already links obligations).
- **Hover** → `Tooltip` showing `evidence.sourceType` and, if `evidence.sourceUrl`, a "View source ↗" `TextLink`. If `evidence == null`, the chip still links to the obligation, tooltip reads "Open deadline."
- Render unmatched `[n]` (no citation) as plain text — never a dead chip.
- Type: body `text-sm leading-relaxed text-text-secondary`, chips inline-baseline.

```
┌─ ✦ Your daily brief        [Firm ▾]  · Updated 2h ago   ⟳ ─┐
│                                                            │
│  3 returns are overdue [1][2][3] and the Acme 1120-S       │
│  extension needs a signature today [4]. CA FTB shifted a   │
│  franchise deadline affecting 4 clients [5].               │
│                                                            │
└────────────────────────────────────────────────────────────┘
   [4] hover → "8879 e-file authorization · View source ↗"
       click → opens Acme 1120-S obligation drawer
```

## B.5 Scope toggle (`BriefScopeToggle`)

- Segmented `firm | me`. Default `firm` for owner/manager, `me` otherwise (read role from session).
- Changing scope re-runs `dashboard.load` with `briefScope` (input already supports it) — or, cheaper, calls `requestBriefRefresh({ scope })` then polls. Persist choice in URL/nuqs (`?brief=me`) for shareable/return state.

## B.6 Backend wiring

- Read `data.brief` from the existing `dashboard.load` query (no new query).
- **Refresh:** wire the unused `dashboard.requestBriefRefresh({ scope })`. On `{ queued: true }`, optimistically set chip to "Generating…" and start polling `dashboard.load` (or rely on its `refetchInterval` while `status === 'pending'`).
- Invalidate `dashboard.load` on refresh success.

## B.7 States / edges

- `brief === null` → render nothing (feature-flagged-off firms).
- Empty `citations` → render `text` plainly.
- `failed` with `errorCode` → don't expose raw codes in body; tooltip only.
- a11y: chips are `<button>` with `aria-label="Citation {n}: open {clientName} {taxType}"` derived from the cited obligation if resolvable.

---

# Suggested sequencing

1. **Brief card P1** (read `brief`, render prose+chips, freshness chip) — pure additive, no contract touch, highest visible payoff.
2. **Brief refresh + scope** (wire `requestBriefRefresh`, poll, toggle).
3. **Exposure panel P1** (accrued readout in Summary tab) — no contract touch.
4. **Exposure P2** (`[contract]` un-omit 3 fields → estimate hero + kill fake queue placeholder).

---

# 2026-06-08 amendment — Daily Brief shipped to Pencil qYrr3

The Brief card (step 1–2 above) shipped, then was rebuilt 1:1 to Pencil
`qYrr3` after Yuqi flagged the first cut as "so random":

- **Shell**: white with a single hairline border (`border-divider-subtle`),
  **no shadow**, `rounded-2xl`, padding `py-4 px-[18px]`.
- **Title row**: sparkles (accent) + "Daily Brief" 18/600 + a single **status
  dot** (green fresh / amber outdated / red failed) + a mono uppercase **age
  label**. The dot is the only freshness cue.
- **Toggle**: Firm/Me pill track (`bg-background-section`); active = white pill +
  hairline border + 600, inactive = borderless 500.
- **Refresh**: icon-only ghost (`refresh-cw`), no text label.
- **Body**: 14/normal in primary ink; `[n]` citations render as tight accent
  pills (`bg-state-accent-hover`, mono 11/600).

Display sourcing fix (same date): the brief now loads via `findBriefForDisplay`
(most recent brief on-or-before today) rather than an exact `asOfDate` match, so
it persists and shows its own staleness instead of vanishing at the date
roll-over. Exact-match `findLatestBrief` is retained for the refresh path.
