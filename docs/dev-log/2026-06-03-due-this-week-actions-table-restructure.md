# 2026-06-03 — `/today` IA pass: "Due this week" + Actions table restructure

> Triggered by Yuqi's `/critique 对于 Action, filing, obligation, form 的决定`. Two
> independent reviewers (IA-product-model lens + UX-writing-mental-model
> lens) returned converging P0/P1 findings on the canonical naming
> decision shipped on 2026-06-03 in commit \[VmcdD restoration]. This
> pass executes Plan A from the critique synthesis.

## Decisions documented (the actual product call)

| Layer                                                                 | Word used                                     | Rationale                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| User-facing noun (sidebar, page title, URL, count chips, primary CTA) | **Deadline**                                  | Already canonical per 2026-05-25 UI audit P0 #3 — no change                                                                                                                                                                                                                                                   |
| User-facing verb (dashboard `/today` section heading)                 | ~~"Actions this week"~~ → **"Due this week"** | Reviewer A + B independently flagged "Actions" as PM language not CPA speech ("12 due this week" is how a CPA actually phrases the Monday triage). The verb/noun split with `/deadlines` (Deadlines) violated the canonical-noun-per-concept rule.                                                            |
| Type 1 label (filing return submission)                               | ~~"Filing"~~ → **"Return"**                   | Resolves the "three-fil collision" Reviewer B flagged: type=filing + form column showing 1120-S + status pill "Filed" = three near-synonyms in 200ms scan. Renaming the LABEL (not the DB enum) defangs the collision without a 90+ rule-catalog migration. CPAs say "this is a 1065 return" in conversation. |
| DB / API enum value                                                   | `'filing'` (unchanged)                        | Canonical PDF §3.1 type name. Same pattern as DB `obligation` vs UI `Deadline` — DB is the storage layer, UI is the presentation layer; they're allowed to diverge. **Saves ~180 file change cascade** (90+ rule definitions in `packages/core/src/rules/index.ts` + DB migration + test fixtures).           |
| Status pill                                                           | "Filed" (unchanged)                           | Distinct from "Completed" — preserves anti-pattern §10.3 "Filed ≠ Done". With type now labeled "Return", a row reads as `Return                                                                                                                                                                               | 1120-S | Filed` — one fil-stem, not three. |

### Decisions deferred to a future pass

- ~~**TYPE icon column with text label**~~ — **Landed in same pass** after Yuqi's follow-up "不应该叫 details, 还是应该区分开来更specific" feedback. See "Phase 5 update" below.
- **Statutory chip as relative gap** ("+14d to law" / "law passed N days ago") — currently the STATUTORY column shows a plain date string. Relative phrasing would make the firm-internal-vs-law buffer scannable. Wants a small utility next to `daysUntilDueFromAsOf`.
- **`/deadlines` queue surface column rename** — the queue still uses the older column shape; needs the same TYPE / FORM/TASK / STATUTORY pass once Dashboard's stabilizes.

## Phase 5 update — TYPE + FORM/TASK split (same-pass follow-up)

After Yuqi reviewed the first pass and said "DETAILS" was still too generic ("不应该混为一谈" → I'd just swapped lying for vague), we extended the work:

- **`DashboardTopRowSchema` (contracts) gains `obligationType: ObligationTypeSchema`** — was previously deferred but the user explicitly chose `TYPE | FORM/TASK` over a single generic column. One field add to the schema; everything else cascades.
- **Port `DashboardTopRow.obligationType: ObligationType`** mirrors the contract.
- **DB `DashboardRawRow.obligationType: ObligationType`** added; SELECT extends with `obligationType: obligationInstance.obligationType` (the column already exists on the schema; just wasn't projected before).
- **Server `toTopRow()`** threads it through.
- **Test fixtures**: `packages/db/src/repo/dashboard.test.ts` (10 fixtures) + `apps/app/src/features/dashboard/actions-list.test.tsx` (1 fixture) gain `obligationType: 'filing'`.
- **`actions-list.tsx` ActionsTable** rebuilt to 6 columns: `CLIENT / TYPE / FORM/TASK / DUE / STATUTORY / STATUS`:
  - **TYPE** (130px): icon + 1-word label from `useObligationTypeLabels()`. Icons via new `OBLIGATION_TYPE_ICON` map — FileTextIcon (Return) / BanknoteIcon (Payment) / CoinsIcon (Deposit) / ClipboardListIcon (Information) / SendIcon (Client task) / ClipboardCheckIcon (Internal review). 6 obligation types stay visually distinct per Yuqi's "区分开来更specific".
  - **FORM / TASK** (280px): split header acknowledges polymorphism (form code for return/information; payment description for payment/deposit; task description for client_action/internal_review). Cell is still `<TaxCodeBadge code={row.taxType}>` + inline grey WHY sublabel.
  - DUE / STATUTORY / STATUS unchanged from Phase 3.
- **Lingui**: `extract` + `compile` re-ran. New msgids registered: `Type`, `Form / Task`, `Return`. zh-CN translations added: `类型`, `申报表 / 任务`, `申报`.

Quote from Yuqi: "我觉得不应该叫details。还是应该区分开来更specific" → drove the rebuild.

## Final column shape

```
CLIENT          | TYPE         | FORM / TASK       | DUE     | STATUTORY  | STATUS
────────────────|──────────────|───────────────────|─────────|────────────|──────────
ACME Co.        | 📄 Return    | 1120-S            | in 3d   | Mar 15     | In review
                |              | K-1 cascade from..|         |            |
ACME Co.        | 💵 Payment   | Q2 estimated      | in 5d   | Apr 15     | Not started
XYZ Inc.        | 🪙 Deposit   | Sep 941           | today   | Sep 15     | Filed
```

## Phase 6 — /today residual drift + dead-code prune (same-pass follow-up)

After Yuqi asked "also work on Today's page", spawned an independent audit (general-purpose reviewer agent) over the full /today surface excluding ActionsTable. Found and fixed:

### P1 user-visible fixes

- `actions-list.tsx` empty-state copy `"Import your client list to start tracking filing deadlines."` → `"…tracking deadlines."` — "filing" drift after the type rename to "Return".
- `DashboardStatusLifecycleStrip` made responsive: `Card` gains `!flex-wrap`; each cell gains `min-w-[140px]`. Below ~960px the strip wraps to 2 rows instead of clipping the "Waiting on client" label.
- `DashboardStatusLifecycleStrip` aria-label: `t\`${count} ${cellLabels[cell.key]}\`` → `t\`${count} deadlines: ${cellLabels[cell.key]}\``. Screen-reader users now hear "5 deadlines: Filed" instead of bare "5 Filed".

### P2 microcopy fix

- `needs-attention-section.tsx` empty state `"No active alerts — nothing needs your review right now."` → `"No alerts — nothing needs your review right now."` — drops residual "active" qualifier that drifted from the "{N} active" → "{N} urgent" chip change.

### Dead-code prune (~325 lines removed)

- `dashboard.tsx`: removed `useCurrentUserName` import + `userName` const + `void firstNameFromDisplay(userName)` + `void todayGreetingPrefix()` + function definitions `formatTodayHeaderWithWeekday`, `todayGreetingPrefix`, `firstNameFromDisplay`. All served the greeting eyebrow that Pencil VmcdD retired. (~40 lines net)
- `actions-list.tsx`:
  - removed `ActionRow` function entirely (~404 lines) — the hover-expand row component superseded by `ActionsTableRow` (canonical Table primitive). Last caller went away in Phase 3.
  - removed `internalDueDateFromOfficial` helper — only `ActionRow` used it.
  - removed `useState` import (no longer used).
  - removed `useCurrentFirm` import + `currentFirm` / `internalDeadlineOffsetDays` machinery — only fed dead `ActionRow`.
  - removed `hoveredId` / `setHoveredId` state and the `__never__` suppression that kept lint quiet about dead state.

### Decisions deferred (intentionally)

- **"Filed" → "Done" in LifecycleStrip** — reviewer flagged that "Filed" is semantically wrong for non-filing types (payment / deposit / client_action / internal_review). Kept "Filed" because (a) it's the canonical status name per `project_status_taxonomy.md`, (b) the user explicitly chose to keep `Filed` in the earlier /critique question, and (c) decoupling strip labels from status labels would create its own divergence. The drift surfaces only for payment-track rows whose status mistakenly lands on `done` instead of `paid`; that's a deeper data-model issue worth a separate pass.
- **Unused `needDecisionCount` / `blockedCount` / `waitingOnClientCount` / `*Delta` props** on `DashboardActionsList` — flagged but touches both the component prop interface and the `dashboard.tsx` call site. Worth its own targeted commit so the route-loader change is reviewable in isolation.
- **Provocative: drop strip, replace with in-page filter chips** — meaningful architectural alternative; surfaced but not adopted unilaterally. Worth raising with Yuqi as a standalone IA question.

### File metrics

- `apps/app/src/features/dashboard/actions-list.tsx`: 1154 → 869 lines (-285)
- `apps/app/src/routes/dashboard.tsx`: 428 → 388 lines (-40)
- Net: **-325 lines** of dead/drift code; all surfaces now typecheck-clean and lingui-clean.

### Lingui catalog

- New msgids: `{count} deadlines: {0}`, `Import your client list to start tracking deadlines.`, `No alerts — nothing needs your review right now.`
- zh-CN translations added.
- Obsolete msgids auto-marked (`#~`) by extract.

## Phase 7 — Pencil VVMj9 + xxNFC alert-card polish + "Action" revert

Yuqi pushed back on the "Actions this week" → "Due this week" rename: "the concept of Action does not exist anymore in the product? but I do feel like it is useful and attractive." Agreed — the reviewers in Phase 3 applied "canonical-noun-per-concept" too rigidly. A verb-led triage surface ("what should I DO this week") is persona-honest, not vocabulary drift; it complements the noun-led sidebar/URL/page-title ("Deadlines"). Reverted.

### Section heading reverted

| Surface                       | Before Phase 7  | After Phase 7                                  |
| ----------------------------- | --------------- | ---------------------------------------------- |
| `/today` dashboard section h2 | "Due this week" | **"Actions this week"**                        |
| `/today` dashboard count chip | "{N} due"       | **"{N} awaiting"**                             |
| Sidebar / URL / page title    | "Deadlines"     | "Deadlines" (unchanged — canonical noun stays) |

### Pencil VVMj9 polish — `NeedsAttentionCard` (/today alerts)

Pencil node VVMj9 puts the **title** (with a leading tone icon) on top of the alert card, followed by a source meta row and client chips — all inset to align with the title text's start. The previous implementation had the source row on TOP (inside `<CardHeader>`) and title BELOW it.

Restructured + componentized:

- **New primitives**, each fully self-contained, every chrome element ships from a DS primitive:
  - `<PulseToneIcon>` — leading 18×18 icon. Maps `changeKind` → icon shape (`CalendarClockIcon` for deadline_shift, `FilePenLineIcon` for filing_requirement, `SatelliteDishIcon` for source_status, etc.) and `pulseAlertTone()` → text color. Low-confidence alerts override to `AlertTriangleIcon` in destructive tone regardless of change kind.
  - `<PulseSourceMeta>` — canonical "source · timestamp" row. Wraps `<RelativeTime>` and resolves firm timezone internally so callers don't plumb it.
  - `<PulseAffectedClientChips>` — chip list with overflow tail. Every chip is `<Badge variant="outline">`; overflow tail is quiet caption text.
- `NeedsAttentionCard` rebuilt with these primitives. No hand-rolled JSX chrome remains — every element flows through the design system.
- Title row gets the tone icon + headline; source meta row + client chips are inset (`pl-[34px]`) to align with the title text's start, matching Pencil's `padding: [0, 34]` content offset.

### Pencil xxNFC polish — `PulseAlertCard` (/alerts page)

Pencil node xxNFC reshapes the alert card on the dedicated alerts page. The previous implementation had a left-rail state pill + content column + kebab `<DropdownMenu>` on the right. Pencil shows the top of the card as a single **meta cluster** (change-kind + state + form + confidence chips on the left, three discoverable action buttons on the right), with title + summary stacked below.

New primitives:

- `<PulseChangeKindChip>` — colored "Deadline Shifted" / "Filing Rule Changed" chip. Wraps Badge (variant=info, shape=square, size=lg).
- `<PulseJurisdictionChip>` — small jurisdiction-code pill ("CA"/"NY"/"FED"). Wraps Badge (variant=outline, shape=square) with uppercase override.
- `<PulseFormChip>` — mono-font form code chip ("IRS 1120-S"). Wraps Badge with `font-mono`. Optional — caller passes the first form from the alert detail when available.
- `<PulseAlertActionsRow>` — Snooze / Archive / Dismiss as three `<Button variant="outline" size="sm">` icon buttons with Tooltips. **Replaces the kebab DropdownMenu** — Pencil's design treats the actions as parallel discoverable verbs.

`PulseAlertCard` restructured:

- Top row: meta cluster (chips) + actions row (icon buttons). Both DS-primitive-only.
- State pill no longer a left-rail anchor — it sits inline with the other chips.
- Title bumped to `text-base font-semibold` (Pencil specifies the alert card title as a card-emphasis weight).
- Form chip surfaced from the detail query that was already mounted for client names — no extra fetch.

### File metrics

| File                                                        | Before | After   | Delta |
| ----------------------------------------------------------- | ------ | ------- | ----- |
| `apps/app/src/features/pulse/components/PulseAlertCard.tsx` | 709    | 581     | -128  |
| `apps/app/src/features/dashboard/needs-attention-card.tsx`  | 290    | 192     | -98   |
| **New primitives created**                                  | 0      | 6 files | —     |

New primitive files:

- `apps/app/src/features/pulse/components/PulseToneIcon.tsx`
- `apps/app/src/features/pulse/components/PulseSourceMeta.tsx`
- `apps/app/src/features/pulse/components/PulseAffectedClientChips.tsx`
- `apps/app/src/features/pulse/components/PulseChangeKindChip.tsx`
- `apps/app/src/features/pulse/components/PulseJurisdictionChip.tsx`
- `apps/app/src/features/pulse/components/PulseFormChip.tsx`
- `apps/app/src/features/pulse/components/PulseAlertActionsRow.tsx`

### Verification

- `pnpm --filter @duedatehq/contracts exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/ports exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/db exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/server exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/app exec tsc --noEmit` — clean
- `pnpm test --run src/features/pulse/components/PulseAlertCard.test.tsx` — 4/4 passing
- `pnpm --filter @duedatehq/app exec lingui extract && compile` — clean

### Doctrine update — "Action" in DueDateHQ vocabulary

Adding to the rules in PRD §3.1 (already updated in Phase 5):

| Surface family                                                        | Word                          | Rationale                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar nav, page title, URL, primary CTA, count chip on `/deadlines` | **Deadline**                  | Canonical noun. Matches CPA spoken language ("the deadline got pushed").                                                                                                                                                           |
| Dashboard `/today` triage section heading + chip                      | **Action**                    | Verb-action framing for the Monday triage surface. The persona's mental model on this surface is "what do I need to DO this week" (active), not "what deadlines exist" (passive). Legitimate persona-driven UX writing, not drift. |
| DB / API contract                                                     | `obligation`                  | Storage-layer term. Never appears in UI.                                                                                                                                                                                           |
| Obligation type 1 (return submission)                                 | DB `filing` / UI **"Return"** | DB-vs-UI split documented in Phase 2.                                                                                                                                                                                              |

The /today section uses BOTH "Actions" (in the section h2) AND "Deadlines" (in the "View all" link to /deadlines). That's intentional — the heading is the verb-framed section identifier; the link is the noun-anchored navigation target. Both words coexist meaningfully on the same page.

## Phase 8 — Pencil VmcdD exact replication + DS-first componentization

Yuqi's prompt: "use the mcp to replicate the design in Node ID: VmcdD … ensure type style are in component, the Form badge is component, status is component, Due date format is component, so we can use them later. care about the border, and every detail … assign tokens and variables if you can — ensure consistency across the product. Also ensure there is consistent max width, responsive, edge cases, empty information design, fixed height/width needed for the UI."

Earlier phases experimented with adding TYPE + FORM/TASK columns and renaming "Actions" → "Due"; Yuqi pulled both back. This phase is a clean alignment to Pencil VmcdD's exact 5-column shape, with every chip / label / cell now living as a DS primitive.

### New primitives

| File                                                       | Purpose                                                                                                                                                                                      | Pencil reference                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `apps/app/src/components/primitives/due-date-label.tsx`    | Canonical "X days late" / "in Nd" / "today" countdown label with payment-overdue precedence, terminal-state quality-stat tone, lingui Plural pluralization. Replaces inline `RowMeta` forks. | VmcdD `D` text ("Filed 76 days late") |
| `apps/app/src/features/dashboard/lifecycle-strip-cell.tsx` | Single cell of the /today status lifecycle strip — icon + 28/600 value + 12/500 muted label, internal padding, divider on cell index > 0, rounded corners on first/last.                     | VmcdD `Y12FTm` cells                  |

### Updated primitives

- **`<TaxCodeBadge>`** — chrome restyled to Pencil's `fc` chip spec: `bg-background-subtle` + `font-mono font-bold` + `rounded-[5px]` + `px-3 py-1` + `border-divider-subtle` hairline. Drops the previous `outline pill` chrome that read as a generic badge. Used by ActionsTable FILING column and any future surface that wants a code-chip.

### Components retained from Phase 7

- `<PulseToneIcon>` — leading tone-coded icon on alert cards
- `<PulseSourceMeta>` — "source · timestamp" row
- `<PulseAffectedClientChips>` — chip list with overflow tail
- `<PulseChangeKindChip>` / `<PulseJurisdictionChip>` / `<PulseFormChip>` / `<PulseAlertActionsRow>` — /alerts page composition

### Card / table chrome

**`NeedsAttentionCard` (Pencil VVMj9):**

- ❌ Removed border (Pencil's stroke is disabled-fill, renders as no visible line)
- ✅ `min-h-[160px]` so 3 cards in a row stay vertically aligned
- ✅ `justify-between` on the outer button pushes the affected-clients row to the bottom edge regardless of title height
- ✅ `bg-background-subtle` resting / `bg-background-default` hover — same lift cue as before, no border to compete
- ✅ Empty state for `impacted === 0`: quiet caption "No matching clients — we'll flag any new matches." (renders only after the detail query resolves; loading skeleton suppressed to avoid flash)
- ✅ Rounded corners: `rounded-2xl` (16px) matches Pencil's `cornerRadius: 16`

**`ActionsTable` (Pencil VmcdD `kVxX8`):**

- ✅ 5 canonical columns: CLIENT 240 / ACTION 320 / FILING 180 / INTERNAL DUE 220 / STATUS fill + chevron-down end column
- ✅ Header `bg-background-section` + bottom 1px border + `[11px] font-semibold tracking-[0.5px] uppercase text-text-tertiary` labels
- ✅ Row: `px-5 py-4` (Pencil [16, 20]) + bottom 1px border + center align
- ✅ Container `rounded-[12px]` + `border-divider-subtle` + `overflow-hidden`
- ✅ ACTION column restored — drives off `useActionPrompt()` per Pencil's verb-action triage framing
- ✅ Payment-late caption rendered as a sibling of the status badge in the STATUS cell

**`DashboardStatusLifecycleStrip` (Pencil VmcdD `Y12FTm`):**

- ✅ `min-h-[120px]` (Pencil fixed `height: 120`)
- ✅ `rounded-[10px]` (Pencil `cornerRadius: 10`)
- ✅ `bg-background-default` + `border border-divider-subtle`
- ✅ 6 `<LifecycleStripCell>` instances — `px-10 py-3` (Pencil [12, 40]) + `min-w-[140px]` defensive minimum so labels never clip
- ✅ Cell value: `text-[28px] leading-none font-semibold tracking-[-0.5px]` (Pencil 28/600 letterSpacing -0.5 lineHeight 1)
- ✅ Cell label: `text-xs font-medium text-text-muted` (Pencil 12/500 text-muted)

**Page chrome (`dashboard.tsx`):**

- ✅ Padding `px-16 py-8` at md+ (Pencil [32, 64]), `px-4 py-6` on mobile
- ✅ Section gap `gap-8` (32px between PageHeader / Alerts / Actions sections) — was `gap-6` (24px)
- ✅ `max-w-page-expanded` (1440) cap preserved

### Token consistency table

| Surface                                | Border radius         | Justification              |
| -------------------------------------- | --------------------- | -------------------------- |
| Alert card (`/today` VVMj9)            | `rounded-2xl` (16px)  | Pencil `cornerRadius: 16`  |
| Action rows container (`/today` VmcdD) | `rounded-[12px]`      | Pencil `cornerRadius: 12`  |
| Lifecycle strip (`/today`)             | `rounded-[10px]`      | Pencil `cornerRadius: 10`  |
| Form chip / TaxCodeBadge               | `rounded-[5px]`       | Pencil `cornerRadius: 5`   |
| Status pill (Filed/Completed)          | `rounded-full` (pill) | Pencil `cornerRadius: 999` |
| Client chip                            | `rounded-lg` (8px)    | Pencil `cornerRadius: 8`   |

Different radii per surface are intentional — Pencil's design hierarchy uses radius to distinguish content tiers: large surfaces (cards) get more, dense chips get less. The consistency is _which radius for which tier_, not "everything the same radius."

### Typography consistency table

| Element                                | Size / weight                    | Pencil reference                                                   |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| Section h2 ("Actions this week")       | 20/600 (`text-lg font-semibold`) | Pencil `fontSize: 20, fontWeight: 600`                             |
| Status count value                     | 28/600 -0.5 LS                   | Pencil `fontSize: 28, letterSpacing: -0.5`                         |
| Card title                             | 16/500 lh 1.4                    | Pencil `fontSize: 16, fontWeight: 500, lineHeight: 1.4`            |
| Action prompt / Client name (row body) | 14/500                           | Pencil `fontSize: 14, fontWeight: 500`                             |
| Due date column                        | 14/normal text-tertiary          | Pencil `fontSize: 14, fontWeight: normal, text-tertiary`           |
| Status pill label                      | 12/600                           | Pencil `fontSize: 12, fontWeight: 600`                             |
| Filing code chip                       | 12/700 JetBrains Mono            | Pencil `fontSize: 12, fontWeight: 700, fontFamily: JetBrains Mono` |
| Header column label                    | 11/600 LS 0.5 uppercase          | Pencil `fontSize: 11, fontWeight: 600, letterSpacing: 0.5`         |
| Source meta / client chip              | 13/normal text-tertiary          | Pencil `fontSize: 13, text-tertiary`                               |

### Verification

- All 5 workspaces `tsc --noEmit` — clean
- `pnpm --filter @duedatehq/app exec lingui extract && lingui compile` — clean
- New zh-CN translation added for `"No matching clients — we'll flag any new matches."`

## Phase 9 — Triage redesign: /today answers "what's most important, what's next"

Yuqi's roadmap (2026-06-04) reframes /today from a flat priority-sorted list into a true triage surface. The 8 [待] items + 1 [待·demo] all landed in this pass. [方向] items remain on the longer roadmap.

### New primitives

| File                                                         | Purpose                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/app/src/features/dashboard/severity-section.tsx`       | `<SeveritySectionHeader>` + `severityToTier()` helper + `TIER_ORDER` constant. Plain-language urgency copy per tier ("Act today or risk missing the deadline" / "Move this week to stay ahead" / "On your radar — not urgent yet").                                                                                                          |
| `apps/app/src/components/primitives/readiness-indicator.tsx` | `<ReadinessIndicator>` "Docs N/M · missing X" chip with success/warning/destructive tone per readiness. Per-type denominators stubbed via `READINESS_TOTAL` map (filing=3, info=2, payment=1, etc.) until the canonical §3.2 readiness checklist contract lands. Already supports an optional `verified` count for the source state machine. |
| `apps/app/src/features/dashboard/extension-chip.tsx`         | `<ExtensionChip>` rendered next to the status pill when row.status === 'extended'. Tooltip carries the anti-pattern §10.1 disclaimer ("Filing extension applied. Payment side is NOT extended").                                                                                                                                             |

### ActionsTable restructure — severity-tiered + 2D triaged

**Before** — one flat table, rows sorted by Smart Priority. Tier carried by per-row `data-tone` only.

**After** — `<ActionsTieredSections>` buckets rows by tier (Critical / High / Upcoming), each tier rendered as its own `<ActionsTable>` preceded by a `<SeveritySectionHeader>`. Within each tier, rows sub-sort by readiness × status:

- **Ready to work** (status ∈ {pending, in_progress, review, done, extended, paid}) — workable now
- **Waiting on client** (status === 'waiting_on_client')
- **Blocked** (status === 'blocked')

When a tier contains >1 subgroup, the table body interleaves quiet subgroup-divider rows (`"READY TO WORK" / "WAITING ON CLIENT" / "BLOCKED"` as section labels). Single-subgroup tiers skip the divider for visual density.

### Extension downscaling (item 1.5)

`resolveTier(row)` checks `row.status === 'extended'` and demotes one notch (Critical → High, High → Upcoming). The extension only quiets the FILING urgency; payment-overdue status surfaces independently via `<DueDateLabel>` precedence + the status-cell "Pay Nd late" caption. Anti-pattern §10.1 holds.

### New columns

| Column       | Width | Source                                                       | Purpose                                                                    |
| ------------ | ----- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| CLIENT       | 220   | row.clientName                                               | Name                                                                       |
| ACTION       | 280   | useActionPrompt + topPriorityFactors                         | Verb prompt + Critical-only "Why now: K-1 cascade · high penalty" sublabel |
| FILING       | 130   | TaxCodeBadge                                                 | Form code chip                                                             |
| READINESS    | 180   | **NEW** ReadinessIndicator                                   | Primary triage signal — "Docs 1/3 · missing 2"                             |
| INTERNAL DUE | 150   | DueDateLabel                                                 | Relative countdown                                                         |
| STATUS       | fill  | ObligationStatusReadBadge + ExtensionChip + Pay-late caption | Composite                                                                  |
| (chevron)    | 40    | ChevronDownIcon (neutral text-tertiary)                      | Row click hint                                                             |

### Quiet rows (item 1.3)

Severity is carried entirely by the section header — rows stay neutral:

- Chevron: `text-text-tertiary` (no status-color)
- No left rail, no per-row tone frame
- Hover: subtle `bg-state-base-hover`

### Why-now inline (item 1.2)

`topPriorityFactors(row)` was previously gated behind hover expansion. For **Critical rows only**, it now renders inline as a quiet `text-xs text-text-tertiary` sublabel under the action verb — prefixed with "Why now:" so the CPA can scan urgency reasoning without expanding the row. High/Upcoming rows stay quiet — the eye should land on Critical context first.

### Sorted-by-priority wording (item 1.8)

The "Sorted by priority" subtitle was already retired in the 2026-06-03 VmcdD pass. Row interaction is click-to-open-drawer (not hover-to-expand) — works on touch + screen-share. Verified.

### Demo-data honesty (item 2.7)

`NeedsAttentionCard` empty-state branching tightened:

- `impacted > 0 + names loading` → render count only (no "No matching" caption — that's a lie while data is in flight)
- `impacted > 0 + names loaded` → render count + chips
- `impacted === 0 + detail loaded` → quiet "No matching clients — we'll flag any new matches"
- `impacted === 0 + detail loading` → nothing (suppress flash)

The user-reported "No matching clients" message previously appeared while the detail query was still pending — that's now suppressed.

### Source state machine (item 1.7)

`<ReadinessIndicator>` already accepts an optional `verified` prop. When the contract gains a `verifiedAttachmentCount` field on `DashboardTopRow`, the chip will automatically split "attached but unverified" from "verified-usable" with a trailing `(N unverified)` caption. UI ships ready; data is the only gate.

### Verification

- All 5 workspaces `tsc --noEmit` — clean
- `pnpm --filter @duedatehq/app exec lingui extract && lingui compile` — clean

### What's NOT in this pass ([方向] items only)

Per Yuqi's explicit [方向] markers, the following are documented for future iteration but NOT shipped:

- Group 2 (Alerts deepening): relevance scoring + authority role + FEMA matching + false-positive feedback loop + dry-run preview
- Group 3 (Client facts): field provenance, drift alerts, read-only connectors, Excel/SharePoint connectors
- Group 4 (Sources & subscriptions): service-line muting, SOS as separate source family, BNA as backstop, modular plans
- Group 5 (Workflow & state): firm-capacity reconciliation, alert customization granularity
- Group 6 (Security/compliance): AI never auto-verifies, full PII vocabulary, append-only audit, residency/AI-processing dashboard
- Group 7 (Positioning): Wedge = rules-change → matched-clients; demo opens with Alert not triage

Open question carried forward (Group 3): can client information auto-sync, and which fields stay CPA-locked.

## Phase 10 — Front-end inspection: alignment + bg + padding

Yuqi screenshot feedback: "not left aligned. the padding you need to work on. You need to really inspect the front end code. also the background is too dark."

### Issue 1: Jagged left edges

The page had a stair-step misalignment because section-outer content (`Alerts` h2, `Actions this week` h2, lifecycle strip, `Critical` tier header) was inset by `px-3` (12px) on top of the page's `px-16` (64px) padding — landing at 76px — while table outer wrappers + cards sat flush at 64px. The 12px difference read as broken alignment.

**Fix**: dropped `px-3` from every section-outer container so they all share the page-padding edge (64px at md+). Table cell `px-5` is unchanged — that's the canonical column inset INSIDE the table.

| File                                            | Change                                                       |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `severity-section.tsx` `SeveritySectionHeader`  | wrapper `px-3` → none                                        |
| `needs-attention-section.tsx` alerts header row | `px-3` → none                                                |
| `needs-attention-section.tsx` cards grid        | `grid items-stretch gap-3 px-3` → `grid items-stretch gap-3` |
| `actions-list.tsx` `summaryStrip` wrapper       | `<div className="px-3">` wrapper removed                     |
| `actions-list.tsx` `ActionsListHeader`          | wrapper `px-3` → none                                        |
| `actions-list.tsx` loading skeleton row         | `px-3` → none                                                |

Result: H1 "Today", section h2's, tier headers, alert cards, lifecycle strip, ActionsTable wrapper all share the same 64px left edge at md+. Inside the table, CLIENT cells are inset by 20px (cell padding) — a deliberate readable rhythm, not a misalignment.

### Issue 2: Alert card bg too dark

`bg-background-subtle` resolves to `gray-100` (≈ #f5f5f5) which read as muddy against the white page wash, especially with cards next to each other.

**Fix**: `bg-background-subtle` → `bg-background-section` (gray-50 ≈ #fafafa) on `NeedsAttentionCard`. Hover lifts to `bg-background-subtle` — provides the visible click cue without the resting-state mud.

### Issue 3: Lifecycle strip cell padding

`px-10` (40px) was authored against Pencil's `[12, 40]` mock at canvas scale (cells ~240px wide). At our actual render width with 6 cells sharing the strip width, 40px horizontal padding ate roughly half the cell and left the big `28/600` value floating in dead space.

**Fix**: `LifecycleStripCell` `px-10` → `px-5` (40px → 20px). Numbers now sit at a comfortable inset without floating.

### Token reference (semantic-light.css)

| Token                       | Resolves to | Use                                                |
| --------------------------- | ----------- | -------------------------------------------------- |
| `background-default`        | `#ffffff`   | Pure white surface (page, ActionsTable)            |
| `background-default-subtle` | `gray-25`   | Faintest tint                                      |
| `background-section`        | `gray-50`   | Quiet inset (alert cards, table header)            |
| `background-subtle`         | `gray-100`  | Slightly stronger inset (button hover, code chips) |

### Verification

- All 5 workspaces `tsc --noEmit` — clean
- `lingui extract && compile` — clean

## Phase 11 — Drop ActionsTable border + ship the 4 deferred chip primitives

### ActionsTable container — Pencil VmcdD `kVxX8` exact

Per Pencil's `kVxX8` frame the Action rows container has stroke **disabled** — earlier code added a hairline border. Dropped: `<div className="overflow-hidden rounded-[12px] border border-divider-subtle bg-background-default">` → `<div className="overflow-hidden rounded-[12px] bg-background-default">`. The rounded clip + internal row borders + header bg-section now carry the visual frame.

### Internal section gap fix

`needs-attention-section.tsx` outer + `actions-list.tsx` tier-wrapper + section element switched from `gap-3` (12px) → `gap-4` (16px) to match Pencil's `gap: 16` on the Alerts section frame.

### Deferred primitives (4 new components — ready for wiring)

| File                                                                    | Purpose                                                                                                                                                                                                                                                                                                                                           | Group       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `apps/app/src/features/pulse/components/PulseRelevanceMatrix.tsx`       | "Match N/5" chip + per-dimension tooltip (state/county/entity/form/service-line). Two render modes — compact chip (`<Badge>` with hover-expand) and verbose inline (5 dimension chips in a row). Reads from a `RelevanceDimensions` object the caller pre-computes; ships data-agnostic so backend can supply real per-firm match evidence later. | Group 2     |
| `apps/app/src/features/pulse/components/PulseAuthorityRoleChip.tsx`     | Authority class chip — Formal / Commentary / Precedent. Includes `inferAuthorityRole()` heuristic mapping common source-name substrings to the canonical 3 classes (so an unmodified `source: "FL DOR Bulletin"` already classifies as Formal). When the contract gains `authorityRole`, the chip reads it directly with no signature change.     | Group 2     |
| `apps/app/src/features/pulse/components/PulseAIBoundaryChip.tsx`        | "Human verifies · ✦" chip making the AI/human authority boundary explicit. Tooltip: "AI extracted this from the source. A reviewer must confirm before applying — DueDateHQ never marks an alert verified automatically." Anti-pattern §10 hardline.                                                                                              | Group 5 + 6 |
| `apps/app/src/components/primitives/readiness-indicator.tsx` (Phase 9d) | Already ships an optional `verified` count for the source state machine (Group 2 item 1.7). When backend supplies per-source verified state, the chip splits "attached" from "verified-usable" with `(N unverified)` caption.                                                                                                                     | Group 2     |

### Deferred items that REMAIN deferred (backend / data-model gated)

| Item                                                                      | Group | Why deferred                                              |
| ------------------------------------------------------------------------- | ----- | --------------------------------------------------------- |
| FEMA county-level matching + two-stage Apply                              | 2     | Needs FEMA data source ingestion                          |
| False-positive feedback loop (writes facts back)                          | 2     | Needs `client_fact_correction` contract + write-back path |
| Dry-run preview before Apply                                              | 2     | Needs `pulse.dryRun()` server procedure                   |
| Field provenance (source + confirmer + time) per fact                     | 3     | Needs `provenance` join table + contracts                 |
| Read-only fact-feed connectors (QuickBooks / Karbon / Excel / SharePoint) | 3     | Needs connector platform                                  |
| Drift alert (external vs CPA-confirmed)                                   | 3     | Needs provenance + diff engine                            |
| Service-line muting on sources                                            | 4     | Needs service-line model on `firm_profile`                |
| SOS registration as separate compliance source family                     | 4     | Needs source taxonomy revision                            |
| Modular plan (federal / state / international)                            | 4     | Needs billing-plan model                                  |
| Source completeness / blind-spot dashboard                                | 4     | Needs coverage analytics                                  |
| Firm capacity reconciliation                                              | 5     | Needs capacity data model                                 |
| Full PII redaction vocabulary                                             | 6     | Needs PII engine                                          |
| Audit append-only enforcement                                             | 6     | Needs DB-level write protection                           |
| Data residency / AI processing compliance panel                           | 6     | Needs settings UI + compliance copy                       |

These are documented for the next contract / backend pass.

## Phase 12 — 9-item screenshot feedback round

Yuqi's screenshot review surfaced 9 specific issues. All landed.

| #   | Issue                                                          | Fix                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a  | Alert cards too far apart, "client list at bottom feels empty" | Dropped `justify-between` on outer button; switched gap-3 → gap-2; removed `min-h-[160px]` so content packs to top                                                                                                      |
| 1b  | "Not full rounded corners for client name"                     | Client chips already use `<Badge variant="outline">` (pill default) — no change needed in code; visual confirmed                                                                                                        |
| 1c  | "When there is no matching clients, it seems too empty"        | Replaced bare text caption with `<CheckCircle2Icon> + "No clients matched — monitoring continues"` in a tinted pill                                                                                                     |
| 2   | Monitoring badge "padding too tight"                           | `<Badge variant="outline">` → `<Badge variant="outline" size="lg">` (h-5 px-2 → h-6 px-2 py-1.5)                                                                                                                        |
| 3   | Date "June 3" wrong size — should match "Today"                | `text-xl` → `text-2xl` on the date span (loading state too)                                                                                                                                                             |
| 4   | "Synced 1m ago" needs a refresh icon                           | Added `<button>` with `<RotateCwIcon>` next to the synced label; clicking calls `dashboardQuery.refetch()`; icon spins while `isFetching`                                                                               |
| 5   | "Why does only this one have Low Confidence?"                  | `<LowConfidenceBadge>` wrapped in `<Tooltip>`: "The AI extracted this alert's details with confidence below 50% — review before applying. Other alerts on the page cleared the threshold and don't carry this flag."    |
| 6   | "Client list can be close to top"                              | Same fix as 1a — dropped `justify-between` so affected-clients row sits directly under source meta                                                                                                                      |
| 7   | "What is this? And the Critical 10 — are they the same?"       | Dropped the `{N} awaiting` chip from the section h2. Tier section headers (Critical N / High N / Upcoming N) now carry the truth; aggregate was redundant when most rows landed in one tier, confusing when they split. |
| 8   | "So much gap at the bottom?" (lifecycle strip)                 | Dropped `min-h-[120px]` — content height + padding now drive the strip's height (~80px instead of 120px).                                                                                                               |
| 9   | "You need to signal this" (TableCell click affordance)         | Added `group` on `<TableRow>`. Chevron-down gains `group-hover:text-text-primary` + `transition-colors` so on row hover the chevron darkens — clearly signals interactivity without re-introducing per-row tone.        |

### Verification

- All 5 workspaces `tsc --noEmit` — clean
- `lingui extract && compile` — clean

## Phase 13 — /alerts page (Pencil xxNFC) — wire deferred chips + UX fixes

| #   | Issue                                            | Fix                                                                                                                        |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Showing AI status twice like two Low"           | Dropped duplicate `<PulseConfidencePill>` from card FOOTER. Top meta cluster keeps the single confidence pill.             |
| 2   | Badge "8 ongoing" red doesn't make sense         | `variant="secondary"` → `variant="outline"` (no tint at all).                                                              |
| 3   | "Do we need plus sign for all of them" (filters) | `<FilterTrigger>` default `leadingIcon` removed (was `PlusIcon`). All filter triggers now ship without the leading + icon. |
| 4   | Missing Sources button                           | Added `<Button render={<Link to="/rules/sources">}>` with `<SatelliteDishIcon>` to PageHeader actions.                     |

### Deferred primitives wired (3 of 4 from Phase 11)

| Primitive                  | Where in PulseAlertCard                | Visibility rule                                                           |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `<PulseAuthorityRoleChip>` | Top meta, after Form chip              | Always — heuristic infers Formal/Commentary/Precedent from `alert.source` |
| `<PulseAIBoundaryChip>`    | Footer (replaces duplicate confidence) | When `alert.confidence < 1`                                               |
| `<PulseRelevanceMatrix>`   | Footer, next to AI boundary            | Always — stubs dimensions from alert fields via local helper              |

### Phases 14, 15, 16 — substantial scope, deferred to next pass

**Phase 14 — Collapsed sidebar (Pencil nFa0K)**: existing `<Sidebar>` primitive already implements the collapsed-mode chrome (rail-accent active state, dot-shrinking badges, hairline separators, size-8 icon-only nav). User can verify by clicking the `<SidebarCollapseToggle>` in the header. No new code needed.

**Phase 15 — Two-tier sidebar (Pencil NgQKn — rail + Clients context panel)**: substantial new architectural pattern. Requires per-nav-item context panel registry, new client-search primitive, Pinned/Recent state. Own PR.

**Phase 16 — Map view (Pencil RMS9y — alerts-by-state map)**: substantial new visualization. Requires map library decision (Mapbox / Leaflet / custom SVG), US states GeoJSON, per-state alert aggregation, click-to-filter interaction. Own PR.

### Verification (Phase 13)

- All 5 workspaces `tsc --noEmit` — clean
- `lingui extract && compile` — clean

## Code changes

### `apps/app/src/features/dashboard/actions-list.tsx`

1. **Section heading and aria-label** — all four "Actions this week" instances → "Due this week"; count chip "{N} awaiting" → "{N} due". Heading + chip now share the same noun, so a CPA reads one signal not two competing ones.
2. **`ActionsTable` columns reworked** — from `CLIENT / ACTION / FILING / INTERNAL DUE / STATUS` to `CLIENT / DETAILS / DUE / STATUTORY / STATUS`:
   - `ACTION` column dropped (redundant with form code that follows immediately).
   - `FILING` → `DETAILS` (Reviewer A P0: "Filing" forces a lie for 3 of 6 obligation types — payment/deposit/client_action/internal_review have no form code). "Details" is type-neutral and carries the form chip + an inline grey WHY sublabel (top 2 Smart Priority factors, e.g. "K-1 cascade from BCD").
   - `INTERNAL DUE DATE` → `DUE` — the previous label said "internal" but the body content was countdown to the OFFICIAL date. "Due" honestly describes what the column shows.
   - New `STATUTORY` column — renders `formatDatePretty(row.currentDueDate)` as quiet tertiary tabular-nums text. Gives the at-a-glance read of the law deadline next to the firm's working countdown; directly serves anti-pattern §10.1 "Extension ≠ payment" surfacing.
3. **WHY content promoted to row** — `topPriorityFactors(row).join(' · ')` was previously only visible in the hover-expansion panel (the `<dl>` "Why now" row). Now it ships as an inline `text-xs text-text-tertiary` caption under the form chip in the DETAILS cell. Reviewer B was explicit: the content is the best microcopy in the spec; only the column label "WHY" was amateur. Result: header dropped, sublabel kept.

### `apps/app/src/features/dashboard/needs-attention-section.tsx`

- Alerts count chip "{N} active" → "{N} urgent" (Reviewer B P3: "active" is vague; "urgent" parallels the Due-this-week chip's specific language).

### `apps/app/src/features/obligations/obligation-type.ts`

- `useObligationTypeLabels().filing` label `t\`Filing\``→`t\`Return\``. The hook is dormant in current renders (queue label cluster retired in earlier distill), but updating it now ensures any future caller — type filter chip, drawer header, queue facets — picks up the canonical "Return" label without re-litigating.

### Lingui catalogs

- `extract` regenerated `en/messages.po` + `zh-CN/messages.po`. Old msgids (`{count} Actions this week`, `Actions this week`, `{count} awaiting`, `{totalAlertCount} active`) auto-marked obsolete (`#~`). New msgids (`Due this week`, `{count} due`, `{totalAlertCount} urgent`) added.
- zh-CN translations added: `{count} 项到期`, `{totalAlertCount} 项紧急`. (`Due this week` auto-matched to `本周到期` via msgmerge.)
- `compile` rebuilt `messages.ts` for runtime.

## Verification

- `pnpm --filter @duedatehq/app exec tsc --noEmit` — clean.
- `pnpm --filter @duedatehq/app exec lingui compile` — clean.
- Visual QA pending (Yuqi to refresh `/today` after sign-in via `?role=manager`).

## Memory + PRD updates

- `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/project_product_model.md` — annotated the §3.1 type list with: DB enum is `filing` (canonical per PDF §3.1); user-facing label is `Return`. Same DB/UI split pattern as `obligation`/`Deadline`.
- `docs/PRD/obligation-row-PRD.md` — §3.1 table gains a UI-label column noting "Return" as the user-facing copy for the `filing` type.

## Decisions audit trail

Followed the `/critique` synthesis report 2026-06-03 — Reviewer A (IA/product-model lens) and Reviewer B (UX writing/mental-model lens) ran independently. Both flagged:

- **P0 FORM column lies for 3 of 6 types** → solved by `FORM` → `DETAILS` rename.
- **P0 three-fil collision** → solved by `Filing` → `Return` LABEL (DB stays `filing`).
- **P1 "Actions this week" verb/noun drift** → solved by → `Due this week`.
- **P1 6 unlabeled type icons fails learnability** → DEFERRED (needs contract change).
- **P2 "WHY" as column header is amateur** → solved by removing header, keeping content as inline grey sublabel.

The two reviewers' convergent P0/P1 findings gave high confidence the changes are correct independent of any single perspective; the divergent provocative alternatives (Reviewer A's "collapse information + client_action" / Reviewer B's "Track filing" CTA) were not adopted because they would change behavior beyond what the critique scope mandates.

## Phase 18 — Canonical Table style + all-surface sweep (2026-06-04)

> Trigger: Yuqi → "remember the current table style and format, the components and all of the details. ensure all of the tables in this app are having the same style" → I baked the /today canonical chrome into the `<Table>` primitive defaults. Yuqi follow-up: "did you miss anything" → admitted I'd only updated the primitive, not the ~70 callsites with explicit className overrides. Yuqi: **"sweep ALL surfaces"** → this phase.

### Primitive change (the source of truth)

`packages/ui/src/components/ui/table.tsx` ships these defaults — every table inherits them automatically, no callsite override needed:

| Element         | Style                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<TableHeader>` | `bg-background-section` + `border-b border-divider-subtle` + transparent hover on child rows                                                     |
| `<TableHead>`   | `px-5 py-3 text-left align-middle text-[11px] font-semibold tracking-[0.5px] text-text-tertiary uppercase whitespace-nowrap` (canonical 11/600)  |
| `<TableBody>`   | `bg-background-default` + `[&_tr:last-child]:border-0`                                                                                           |
| `<TableRow>`    | `border-b border-divider-subtle transition-colors even:bg-background-section/40 hover:bg-state-base-hover has-aria-expanded:bg-state-base-hover` |
| `<TableCell>`   | `px-5 py-4 align-middle whitespace-nowrap`                                                                                                       |
| `<TableFooter>` | `border-t border-divider-subtle bg-background-section font-medium`                                                                               |

The outer wrapper around `<Table>` stays callsite-controlled so each surface can opt into the right framing (regular bordered card, tier-accent Critical band, sticky-shell, etc.). Canonical recipe: `<div className="overflow-hidden rounded-[12px] border border-divider-subtle bg-background-default">`.

Documented in `docs/Design/table-canonical-style.md`.

### Surface-by-surface sweep

Every table file edited to strip overrides that:

- **Restated the new canonical** (redundant noise) — e.g. inline `border-b border-divider-subtle`, `hover:bg-state-base-hover`, `transition-colors`, `align-middle`, `px-5 py-4` on cells, `text-left` on heads.
- **Re-stated the OLD canonical** (would silently win and prevent the new style from applying) — e.g. `bg-background-subtle` on TableHeader (old gray-100), `text-sm font-medium normal-case tracking-normal text-text-secondary` on TableHead (sentence-case header — the lone holdout from the sixty-fifth-pass decision that came before a canonical existed).

Structural overrides preserved: column widths (`w-[NNNpx]`), `text-right` / `text-center` alignment, sticky-header solid bg, compact-density opt-ins (`[&_td]:py-2 [&_td]:text-sm` for dense data queues), and surface-specific selection / hover tints (e.g. /deadlines + /clients use `bg-state-accent-hover` to preview detail-panel selection).

**Files swept** (14):

| File                                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/dashboard/actions-list.tsx`                | Stripped redundant `px-5 py-4 align-middle` from every TableCell + `border-b border-divider-subtle transition-colors even:bg-background-section/40 hover:bg-state-base-hover` from the row className. Only `cursor-pointer focus-visible` survives on rows; only `text-base font-medium text-text-secondary` style cells survive. The /today table now lives entirely off the primitive.                                                                                                                                                                                                                                                                                                                                                                  |
| `features/audit/audit-log-table.tsx`                 | Dropped `bg-background-default/50` (alpha-50 was the old TableBody token; new canonical is solid). Kept intentional deviations `[&_tr]:border-b-0 [&_td]:py-3 align-top` because audit log is paragraph-row formatting. Dropped row-level redundant `hover:bg-state-base-hover`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `features/clients/ClientFactsWorkspace.tsx`          | Dropped per-TableHead `text-sm font-medium normal-case tracking-normal text-text-secondary` override on every column — the canonical 11/600 uppercase now applies. Kept the dense-table body opt-ins (`[&_td]:py-2 [&_td]:text-sm`) and the accent-tone hover. Skeleton variant aligned too.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `features/clients/ClientWorkPlanPanel.tsx`           | Raw `<table>` + `<thead>` + `<tr>` + `<th>` + `<tbody>` + `<td>` MIGRATED to the canonical `<Table>` family. Filing-plan body now inherits the same chrome as every other table. Audit L3 a11y intent (row/column semantics) preserved because the primitive renders proper table elements underneath.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `features/members/members-page.tsx`                  | Dropped redundant `hover:bg-transparent` on header row. Compact admin-table treatments (`h-9` + `[&_td]:py-1.5`) kept as intentional.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `features/pulse/components/AffectedClientsTable.tsx` | Dropped `h-10 text-left text-sm` on every TableHead — these were the old-canonical signature. Kept compact body density (`[&_td]:py-2 [&_td]:text-sm`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `features/rules/coverage-tab.tsx`                    | Dropped per-head `text-xs font-medium text-text-secondary` (every column). Changed sticky `bg-background-default` → `bg-background-section` so the sticky header inherits the new canonical inset tone. Compact `h-12 + py-2` cells kept as intentional dense-matrix treatment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `features/rules/sources-tab.tsx`                     | Dropped `bg-background-subtle` on TableHeader, `hover:bg-transparent` on header row, `hover:bg-state-base-hover` on data row. Kept `h-10` compact source row + `px-1/px-2 py-1.5` compact cells.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `features/rules/temporary-rules-tab.tsx`             | Dropped `bg-background-subtle` on TableHeader + `hover:bg-transparent` on header row + per-head `px-0` width-zeroing. The temp-rules table now reads as the same family as the rest of the rules surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `features/workload/workload-page.tsx`                | No edits — already minimal; only intentional `[&_tr]:border-b-0 [&_td]:py-3` opt-out for compact admin lists survives.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `features/reminders/reminders-page.tsx`              | No edits — same as workload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `features/migration/Step2Mapping.tsx`                | No edits — already minimal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `routes/obligations.tsx` (/deadlines)                | Largest sweep. Dropped the old-canonical per-head override `text-sm font-medium normal-case tracking-normal text-text-secondary` (Yuqi's sixty-fifth-pass call that pre-dated a canonical) — /deadlines was the lone holdout forcing sentence-case headers; now reads as one family with /today. Dropped `bg-background-default` body bg. Added `[&_tr]:even:bg-transparent` to TableBody to opt OUT of the canonical zebra striping — /deadlines clusters welded same-client rows via `border-b-0` and zebra would tint alternate rows differently, breaking the visual weld. Group-header row dropped redundant `border-b border-divider-subtle hover:bg-state-base-hover`. Per-data-cell `align-middle` reinforcement dropped (canonical default now). |
| `routes/rules.library.tsx`                           | Dropped the per-entity-column `text-caption-xs font-medium uppercase tracking-eyebrow-tight text-text-tertiary` override on every entity head (the canonical 11/600 uppercase now applies). Sticky TableHeader override dropped (canonical bg-background-section is now the right solid color for sticky). Added `[&_tr]:even:bg-transparent` to TableBody (state group-headers interleave with rule rows; DOM-position zebra would be semantically wrong). Stripped redundant `hover:bg-state-base-hover` from GroupHeaderRow + RuleTableRow.                                                                                                                                                                                                            |
| `routes/preview.tsx` / `routes/practice.tsx`         | No edits — already minimal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Zebra-stripe opt-out — when and why

The canonical `<TableRow>` now ships `even:bg-background-section/40` zebra striping. This helps simple flat tables (where adjacent same-color rows blur together) but FIGHTS tables that interleave semantic groups with data rows:

- `/deadlines` — same-client rows are welded into clusters via `border-b-0` on the row + a continuous left rail. Zebra would tint cluster members differently, defeating the weld. **Opted OUT** at TableBody via `[&_tr]:even:bg-transparent`.
- `/rules/library` — state group-headers interleave with rule data rows. Zebra based on DOM position would tint headers and rules unpredictably. **Opted OUT** the same way.

Surfaces that benefit from canonical zebra (no opt-out): /today actions-list, audit log, AffectedClientsTable, sources-tab, temporary-rules, members, workload, reminders, Step2Mapping, preview, practice.

### Verification

- `pnpm --filter @duedatehq/contracts exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/ports exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/db exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/server exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/ui exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/app exec tsc --noEmit` — clean (after fixing a JSX-comment-in-ternary-expression parse error introduced by my initial edit on obligations.tsx line 3873 — the comment moved out of the JSX expression slot to a JS comment before the `return (`)
- `pnpm vp fmt --write` ran on all 13 swept files

### Take-away

The canonical Table style is now a SINGLE primitive change — `packages/ui/src/components/ui/table.tsx` — that propagates to every table in the app automatically. The 14 callsites stripped their version-of-truth override stacks; future new tables that just write `<Table><TableHeader>…</TableHeader><TableBody>…</TableBody></Table>` get the canonical style for free without thinking about it.

When deviating, the rule is in `docs/Design/table-canonical-style.md`:

- Canonical wrapper recipe is documented (rounded-[12px] + border-divider-subtle + bg-background-default + overflow-hidden).
- Compact-table opt-ins (`[&_td]:py-2 [&_td]:text-sm`) and zebra opt-outs (`[&_tr]:even:bg-transparent`) are named patterns, not freeform deviation.
- Per-surface justifications live in code comments next to each remaining non-canonical override, dated and signed.
