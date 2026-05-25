# Info-icon audit — 2026-05-25

> Survey of every "explain this" affordance in `apps/app/src`. Goal:
> one canonical treatment, drop low-signal duplicates, upgrade
> long-form copy from tooltip to popover. Code is unchanged — this
> doc is the audit + the proposed change list.

## 1. Inventory

The app uses two kinds of "info" affordances. The big one is
`ConceptHelp` / `ConceptLabel` (`features/concepts/concept-help.tsx`),
which is a `CircleHelpIcon` inside a Popover with a typed concept
dictionary. Beyond that there are three one-off icon usages.

### A. Concept dictionary — `<ConceptHelp>` / `<ConceptLabel>`

Single primitive, 24 call sites across 11 files. Icon, size, trigger
shape, popover behavior are all centralized.

- **Icon:** `CircleHelpIcon`
- **Size:** `size-3.5` (14px) inside a `size-6` (24px) button hit area
- **Color:** `text-text-tertiary`, hover → `text-text-primary`
- **Trigger:** `<button type="button">`, keyboard-focusable, `aria-label="Explain {label}"`, `focus-visible:ring-2`
- **Surface:** Popover (not Tooltip) — fires on hover and click, `delay=150`, `closeDelay=80`, `w-80`, `text-sm leading-relaxed`
- **Defined at:** `apps/app/src/features/concepts/concept-help.tsx:203-251`

| File                                        | Line | Context                            | Concept          | Tooltip content value                                                  |
| ------------------------------------------- | ---- | ---------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| features/pulse/AlertsListPage.tsx           | 233  | Alerts page subhead paragraph      | pulse            | yes — defines what Pulse is (regulatory signal)                        |
| features/pulse/PulseDetailDrawer.tsx        | 622  | "Affected clients" section header  | pulse            | weak — re-explains Pulse on a page already titled Pulse                |
| features/pulse/PulseDetailDrawer.tsx        | 698  | AlertTitle inside warning alert    | aiConfidence     | yes — clarifies "confidence" is a model signal, not user-set           |
| features/audit/audit-log-page.tsx           | 380  | Export dialog title                | auditTrail       | weak — dialog body already explains export contents                    |
| features/audit/audit-log-page.tsx           | 596  | PageHeader title                   | auditTrail       | yes — first-time visitors need the term defined                        |
| features/audit/audit-log-page.tsx           | 713  | "Event stream" CardTitle           | auditTrail       | no — duplicates the page-title popover already shown above             |
| features/rules/rules-console-primitives.tsx | 275  | Legend row "active"                | verifiedRule     | yes — explains practice acceptance                                     |
| features/rules/rules-console-primitives.tsx | 281  | Legend row "review"                | requiresReview   | yes — explains who must confirm                                        |
| features/rules/rule-detail-drawer.tsx       | 546  | RuleStatusInline pending           | candidateRule    | yes — pairs status badge with concept                                  |
| features/rules/rule-detail-drawer.tsx       | 563  | RuleStatusInline active            | verifiedRule     | yes                                                                    |
| features/rules/generation-preview-tab.tsx   | 1058 | "REMINDER READY" group header      | reminderReady    | yes — explains why this group fires reminders                          |
| features/rules/generation-preview-tab.tsx   | 1088 | "REQUIRES REVIEW" group header     | requiresReview   | yes                                                                    |
| features/migration/WizardShell.tsx          | 159  | Wizard `<h2>` "Import clients"     | migrationCopilot | yes — first surface CPA sees                                           |
| features/migration/Step3Normalize.tsx       | 221  | "Suggested tax types" uppercase h3 | defaultMatrix    | yes — explains the matrix concept                                      |
| features/migration/Step4Preview.tsx         | 76   | Safety check list item             | auditTrail       | weak — bullet text already says "captures every AI decision"           |
| routes/obligations.tsx                      | 1540 | Evidence column header             | evidence         | yes — clarifies what counts as evidence                                |
| routes/obligations.tsx                      | 2135 | PageHeader "Deadlines"             | obligation       | yes — defines obligation vs. generic task                              |
| routes/obligations.tsx                      | 5437 | "Deadline tip" inline label        | deadlineTip      | yes — disambiguates from rule descriptions                             |
| routes/practice.tsx                         | 497  | Card title "Smart Priority"        | smartPriority    | yes                                                                    |
| routes/practice.tsx                         | 520  | "Factor weights" Label             | smartPriority    | **dup** — same concept popover already in the CardTitle 23 lines above |
| routes/practice.tsx                         | 557  | "Urgency window" Label             | urgencyWindow    | yes — distinct from smartPriority                                      |
| routes/practice.tsx                         | 577  | "Late filing cap" Label            | lateFilingCap    | yes                                                                    |

### B. One-off info icons (NOT routed through ConceptHelp)

| File                                      | Line | Context                                                                                     | Icon             | Size                          | Color                                                                    | Trigger shape                                                             | Content                                                                                     |
| ----------------------------------------- | ---- | ------------------------------------------------------------------------------------------- | ---------------- | ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| features/dashboard/actions-list.tsx       | 722  | "Actions this week · sorted by priority" caption                                            | `Info` (lucide)  | `size-3`                      | `text-text-tertiary` (inherited from caption)                            | bare `<span>` with `title=` attr — **not focusable**                      | "Sorted by Smart Priority — urgency × penalty × dependency. Open a row to see its factors." |
| features/migration/Step2Mapping.tsx       | 351  | Mapping-capability badge ("AI Mapper", "Import template", "Manual mapping")                 | `CircleHelpIcon` | `size-3.5`                    | `text-text-destructive` (red!)                                           | `<button>` Tooltip trigger, focusable                                     | "AI Mapper means AI suggested the fields." (and 2 sibling variants)                         |
| features/rules/generation-preview-tab.tsx | 797  | `RolloverMetric` + `RolloverColumnHeader` headers (13 instances in Annual Rollover preview) | `CircleHelpIcon` | `size-3.5` in `size-4` button | `text-text-tertiary`                                                     | `<button>` Tooltip trigger, focusable                                     | per-metric blurb, e.g. "Closed source-year obligations eligible for rollover…"              |
| routes/obligations.tsx                    | 3306 | "X days late" badge — replaces the dot when row is overdue                                  | `Info` (lucide)  | `size-3`                      | inherits tinted `text-text-destructive` / `text-text-warning` from badge | inside `<Badge variant="outline">`, no tooltip — **decorative-as-signal** | none — this is not an info affordance, it's an urgency mark                                 |

The last row (`obligations.tsx:3306`) is a false positive for this
audit: it's a lucide `Info` used as an iconographic mark inside a
late-days badge, not an "explain this" affordance. Flagged here so a
future reader doesn't mistake it for the same pattern.

## 2. Inconsistencies

1. **Two icons for the same job.** The concept primitive uses
   `CircleHelpIcon`, but `actions-list.tsx:722` uses lucide `Info`
   for an identical role ("the sort isn't arbitrary, here's the
   formula"). One icon, one mental model — pick one.
2. **Non-focusable info affordance.** `actions-list.tsx:722` is a
   bare `<span>` with `title=`. Keyboard users get nothing; screen
   readers get nothing reliably. Every other info trigger in the app
   is a `<button>` with `aria-label` and `focus-visible:ring`.
3. **Red help icon.** `Step2Mapping.tsx:351` ships the
   `CircleHelpIcon` in `text-text-destructive`. The icon explains a
   badge — it isn't itself an error. The `destructive` styling came
   from the badge it sits next to. The destructive color is for
   error / risk, not for "click to learn more."
4. **Tooltip used where Popover is warranted.** The Rollover preview
   headers (`generation-preview-tab.tsx:797`, ×13 callers) carry
   60-100+ character explanations inside a `Tooltip` with
   `max-w-[280px]`. Tooltips are for ≤1 line; this content reads
   like a glossary entry and competes with the popover treatment
   the concept primitive already gives every other glossary entry.
5. **Duplicate popovers on the same concept, same screen.**
   `practice.tsx:497` (CardTitle "Smart Priority") and `:520`
   ("Factor weights" Label) both open the exact same
   `smartPriority` popover, 23 lines apart in the same card.
6. **Duplicate `auditTrail` popovers on the audit page.** Three
   `auditTrail` triggers on `/audit`: the PageHeader (`:596`), the
   export dialog title (`:380`), and the "Event stream" CardTitle
   (`:713`). Three popovers, one definition.
7. **Low-signal duplicate inside the migration wizard.**
   `Step4Preview.tsx:76` puts an `auditTrail` popover on the
   safety-check bullet "Audit log captures every AI decision."
   The sentence already explains it; the popover only repeats the
   sentence with extra chrome.
8. **Sizing fork inside one file.** `actions-list.tsx:722` uses
   `size-3`; every other free-floating info icon in the app is
   `size-3.5`. Per `docs/Design/icon-sizing.md`, free-floating icons
   in `text-caption`/`text-xs` context can be `size-3`, but the
   concept primitive renders at `size-3.5` regardless of caller
   font size — so the surfaces drift apart.

## 3. Recommendations

### Standard treatment (the one true info affordance)

- **Icon:** lucide `CircleHelpIcon`. Retire lucide `Info` as a
  help-text glyph; reserve it for the late-days badge (urgency
  mark) and similar non-affordance signals.
- **Size:** `size-3.5` (14px), inside a `size-6` button hit area
  for tap targets ≥24px. Matches concept primitive.
- **Color:** `text-text-tertiary`, hover/focus
  `text-text-primary`. Never destructive / warning.
- **Trigger:** `<button type="button">` with explicit
  `aria-label="Explain {label}"` and
  `focus-visible:ring-2 focus-visible:ring-state-accent-active-alt`.
  No bare `<span title="…">`.
- **Surface:**
  - **Tooltip** (≤ ~70 chars, single line, no markup) for cells &
    inline marks where opening a popover would be heavy.
  - **Popover** (`w-80`, `text-sm leading-relaxed`, headed by a
    title) for any glossary-style entry. This is what concept-help
    already does — keep using it as the default for "what does
    this term mean."

### Drop (low-signal duplicates)

- `routes/practice.tsx:520` — `ConceptHelp concept="smartPriority"`
  next to "Factor weights" Label. The CardTitle above already has
  it. Keep one per card.
- `features/audit/audit-log-page.tsx:380` — `ConceptLabel
concept="auditTrail"` on the export dialog title. The dialog
  description below already explains the bundle.
- `features/audit/audit-log-page.tsx:713` — `ConceptLabel
concept="auditTrail"` on the "Event stream" CardTitle. The page
  title (`:596`) carries the same popover; the card heading
  doesn't need a third copy.
- `features/migration/Step4Preview.tsx:76` — the bullet text
  already paraphrases the definition.
- `features/pulse/PulseDetailDrawer.tsx:622` — `ConceptLabel
concept="pulse"` on "Affected clients" section header inside the
  drawer that is already titled with the alert. Re-defining Pulse
  inside a Pulse drawer is noise. Keep the one on the list page
  (`AlertsListPage.tsx:233`).

### Keep + standardize

- All other `ConceptHelp` / `ConceptLabel` sites — the primitive
  is the right shape. No code change needed; they already meet
  the standard.

### Upgrade (Tooltip → Popover)

- `features/rules/generation-preview-tab.tsx` Rollover headers
  (`RolloverHelpTooltip`, used by `RolloverMetric` and
  `RolloverColumnHeader`, 13 callers). Content is glossary-grade
  and 60-100+ chars. Convert to Popover and, where the term maps
  to an existing concept (e.g. "Will create" ≈ `reminderReady`,
  "Review" ≈ `requiresReview`), point the trigger at
  `ConceptHelp` instead of carrying inline copy.
- `features/dashboard/actions-list.tsx:722` — replace the bare
  `<span title>` with a real `<ConceptHelp concept="smartPriority">`
  attached to the "sorted by priority" caption. Same icon, same
  surface as every other Smart Priority explainer, focusable.

### Recolor / restructure

- `features/migration/Step2Mapping.tsx:328-360`
  (`MappingCapabilityHelp`) — drop `text-text-destructive` on the
  help button. The destructive tone belongs to the
  `Manual mapping` badge it sits next to, not to the "click to
  learn what this means" affordance. The tooltip body can stay
  red on the Manual-mapping variant (that's a warning context);
  the icon should be tertiary like the rest.

## 4. Per-file change list

- `apps/app/src/features/dashboard/actions-list.tsx`
  - L3: drop `Info` from the lucide import (no other usages).
  - L717-723: replace the `<span title=…><Trans>· sorted by
priority</Trans><Info … /></span>` with
    `<ConceptLabel concept="smartPriority">… sorted by priority</ConceptLabel>`
    or an inline `<ConceptHelp concept="smartPriority" />` after
    the caption. Removes the non-focusable affordance and unifies
    the icon.
- `apps/app/src/features/migration/Step2Mapping.tsx`
  - L349: change button className from `text-text-destructive` to
    `text-text-tertiary hover:text-text-primary`. Optionally narrow
    the size from `size-5` to `size-6` to match the concept
    primitive's hit area.
  - Consider folding into `ConceptHelp` with a new
    `aiMapper` / `importTemplate` / `manualMapping` concept entry;
    today the copy lives only in this file.
- `apps/app/src/features/rules/generation-preview-tab.tsx`
  - L786-806 (`RolloverHelpTooltip`): swap Tooltip for Popover
    (`w-80`, `text-sm leading-relaxed`, with a title). Or, ideally,
    delete the helper and route each header through
    `ConceptHelp` with new concept IDs (`rolloverWillCreate`,
    `rolloverReview`, etc.) so the glossary lives in one place.
  - L1058, 1088: already correct.
- `apps/app/src/routes/practice.tsx`
  - L520: delete the `<ConceptHelp concept="smartPriority" />`
    next to "Factor weights" (the CardTitle popover at L497
    suffices). Keep L557 and L577 — they cover distinct concepts.
- `apps/app/src/features/audit/audit-log-page.tsx`
  - L380: unwrap `<ConceptLabel>` → keep `<Trans>Audit evidence
package</Trans>` plain.
  - L713: unwrap `<ConceptLabel>` → keep `<Trans>Event
stream</Trans>` plain. The PageHeader at L596 retains the
    popover.
- `apps/app/src/features/migration/Step4Preview.tsx`
  - L76: unwrap `<ConceptLabel>` → keep the bullet plain. The
    Wizard `<h2>` already carries `migrationCopilot`; audit-trail
    detail belongs on the audit page, not in a passing bullet.
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
  - L622: unwrap `<ConceptLabel>` → keep `<Trans>Affected
clients</Trans>` plain. L698 (AI confidence) stays — it
    explains a distinct concept inside an alert.
- `apps/app/src/routes/obligations.tsx`
  - L3306 (lucide `Info` in late-days badge): unchanged. This is
    an urgency mark, not an info affordance — flagged in the
    inventory only to prevent future confusion.

Net effect: one icon (`CircleHelpIcon`), one size (`size-3.5` /
`size-6` hit area), one color (`text-text-tertiary`), one trigger
shape (focusable `<button>`), one surface choice (Popover by
default, Tooltip only for ≤1-line content), and roughly 6 noise
popovers removed.
