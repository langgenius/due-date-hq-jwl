# 2026-05-27 · Import wizard IA redesign (Steps 1-3)

## Context

The migration wizard at `/migration/new` is the first onboarding moment for a US small CPA firm switching tools. Two prior redesign passes had pushed in the wrong direction — motion-heavy, confetti, big editorial type — even though the project's Design Context (`.impeccable.md`) is explicit: brand personality is **calm · capable · sharp**, and **boldness lives in INFORMATION ARCHITECTURE, not typography/color/effects.**

This pass treats restraint as the design statement. The screens stay inside the existing `@duedatehq/ui` token system; the visual language is identical to the rest of the app. What changes is *how much* the user is asked to look at per state, and *where the AI's intelligence lands*.

## IA reductions per step

### Step 1 Intake (Step1Intake.tsx)

The previous step rendered **5 simultaneous zones** in the empty state: heading, paste textbox, upload dropzone, source-picker chips, 8-bullet source-export instructions, plus detection banners stacked underneath. The user opened Step 1 and had nowhere to look.

The redesign collapses Step 1 to **2 states with 1 primary affordance each**:

- **Empty state**: one big dropzone (~280px tall, 60% of body height), one calm headline ("Drop your client file."), one quiet "Paste a list instead →" link that *swaps* the dropzone for a textarea instead of rendering both, source chips below in a single small row prefaced with "Coming from a specific tool? (Optional)". The 8-bullet export-instructions card is **gone from default view** — clicking a chip now opens a per-chip inline disclosure (one chip, default closed), not a wall.
- **Detection state**: the dropzone collapses to a compact file card (filename · size · Remove link), and the AI determination becomes the structural hero — `[Source] · [N clients] · [N entity types] · [N states]` rendered as numbers-as-protagonists in sharp tabular-nums type. Override link is a quiet text link.

The empty → detection transition is a calm 280ms opacity-and-position fade through `motion`'s `AnimatePresence`, ease curve `[0.32, 0.72, 0, 1]` (matches the existing AlertsListPage / obligations panel). `useReducedMotion()` collapses it to an instant swap. No count-up animation, no confetti, no sparkle iconography.

Removed: 8-bullet export instructions from default view; `Detected export source` Alert (folded into the readout); `Preset mismatch` Alert reworded as `Looks like X instead`; `Paste rows` / `Upload file` all-caps `<Label>` titles; SSN trust-line moved inline with the empty-state primary; live row count integrated into the paste textarea footer.

### Step 2 Mapping (Step2Mapping.tsx)

The previous step buried every mapping row behind a "Review column details" disclosure. Burying the rows hid the AI's actual work — the user had to click to see whether the AI did anything right. There was also a 5-up `SummaryMetric` grid (Columns used · Ignored · Confidence · EIN · Exceptions) that fragmented one sentence's worth of state into five tiles.

The redesign:

- **Every row is a banner**, ≥56px tall, rendered immediately. No detail-disclosure gate. Source header + sample on the left, `→`, DueDateHQ destination + an always-visible "Change →" text link on the right, plus a plain-text confidence readout ("Auto-mapped · 95%" / "Needs review · 42%" / "Set by you").
- **Attention-first sort**: low-confidence rows float to the top, then user-overridden, then auto-mapped, then IGNORE. The user's spreadsheet column order is preserved as a stable secondary sort within each band.
- **Inline Edit affordance**: clicking "Change →" swaps the destination span for a `SearchableCombobox` (existing `@duedatehq/ui` primitive). No icon, no row-actions menu. The Edit literally sits beside the destination it changes.
- **5-up metric grid replaced** by one calm sentence in the header — `12 columns mapped · 1 needs review · 0 ignored` — that uses bold tabular-nums numbers as protagonists with muted connective tissue.
- Expanded body still shows AI reasoning + sample value; no new card surface inside — same elevation family as the row.

Confidence rendered as text, not as a colored tier dot — calm restraint per the brief. Attention-needed rows tint to `bg-components-badge-bg-warning-soft` (no `border-left` accent stripe — banned by the brief).

### Step 3 Normalize (Step3Normalize.tsx)

The previous step had a wall of gray rows under a single "Cleaned value groups" section behind a "Review all groups" button, plus a parallel "Tax type defaults" section with the same visual treatment behind "Adjust tax type defaults." It read as one undifferentiated grid.

The redesign:

- **Categorize into per-field cards**: Entity types · States · Tax types · Other. Each card headline is the big tabular-nums count + subtitle (`all matched` / `all need review` / `N of M need review`). Categories with zero values render no card — no empty gray boxes.
- **Cards default expanded when anything needs review; collapsed otherwise.** All-matched categories live behind a one-click "Show" toggle so the user opens what they want to audit.
- **Items inside each card use the same banner-row pattern as Step 2.** Click to expand inline; rolled-up raw values appear in the expanded body.
- **Tax type defaults gets a distinct surface**: full `border-divider-strong` border (no border-left accent stripe — banned), heavier rim weight than the category cards above. A small "Saved as default" badge in `text-text-tertiary` text inside the header signals "lean-back preference" vs "lean-in review." The matrix controls themselves are unchanged.
- **Replaced the 4-up `SummaryMetric` grid** with a one-sentence header readout: `N groups ready · M need review · K clients affected`.

Removed: "Review all groups" gate; `Cleaned value groups` and `Tax type defaults` parallel surfaces with identical visual weight; the standalone exception count Alert (folded into the per-card subtitle).

## Detection-readout copy decisions

The detection readout reads as a single sentence: `Drake · 30 clients · 4 entity types · 12 states`. Bullet separator `·` (middle dot, U+00B7). Numbers `tabular-nums`. Source label first when known. Entity type and state counts derived client-side from the parsed paste by heuristic-matching `Entity` / `Type` / `State` column headers — Step 2 still owns authoritative mapping, but Step 1's job is to state a first-look determination, not to be the source of truth.

The accompanying status line picks between `Detected from the file structure.` (when the server-side `sourceManifest` is present) and `Source set from your selection.` (when the user picked a preset chip). The override link reads `Wrong source? Override →` as a quiet text link, never a button.

The ambiguous-detection language ("Looks like Drake or Lacerte — pick one") is queued for the existing `Preset mismatch` flow; this pass reworded that Alert to `Looks like {X} instead` with a `Switch to {X}` action, leaving the dual-pick UI for a follow-up since the existing detection pipeline returns a single suggestion.

## Copy strings introduced

All strings extracted by `pnpm --filter @duedatehq/app i18n:extract`. Each has a real zh-CN translation in `apps/app/src/i18n/locales/zh-CN/messages.po` (catalog now reports 0 missing).

Step 1:

- `Drop your client file.`
- `We'll read the columns, infer entity types and states, and prepare the import.`
- `Drop your file here, or click to browse`
- `CSV, Excel, ZIP, TXT, or IIF · up to 1,000 rows · 5 MB`
- `Reading your file…`
- `Upload your client export file`
- `Paste a list instead`
- `Or drop a file instead`
- `Header row + at least one data row.`
- `Coming from a specific tool? (Optional)`
- `AI determination`
- `Row 1,000 cap reached — split your export to import more.`
- `Detected from the file structure.`
- `Source set from your selection.`
- `Wrong source? Override`
- `Looks like {detectedPresetSuggestionLabel} instead`
- `You picked {selectedPresetLabel}, but the file matches {detectedPresetSuggestionLabel}.`
- `Switch to {detectedPresetSuggestionLabel}`
- `{rowEstimate, plural, one {~# row detected} other {~# rows detected}}`

Step 2:

- `Column mappings`
- `Auto-mapped · {pct}%`
- `Needs review · {pct}%`
- `Set by you`
- `Unknown confidence`
- `Ignored`
- `Change`
- `Change destination for {0}`
- `Choose a destination`
- `Search fields…`
- `No fields match.`
- `Sample value`
- `AI reasoning.`
- `Review the column mapping below and continue when it looks right.`
- `{0, plural, one {column mapped} other {columns mapped}}`
- `need review`
- `ignored`

Step 3:

- `Your firm's tax type defaults`
- `Saved as default`
- `Your uploaded file stays unchanged.`
- `Your uploaded values were already clean — nothing needed standardizing.`
- `{count, plural, one {entity type} other {entity types}}`
- `{count, plural, one {state} other {states}}`
- `{count, plural, one {tax type} other {tax types}}`
- `{count, plural, one {other value} other {other values}}`
- `all matched`
- `all need review`
- `{exceptionsCount} of {totalCount} need review`
- `{reviewedClientCount, plural, one {# client affected} other {# clients affected}}`
- `All raw values`
- `need state review`
- `Adjust tax type defaults` / `Hide tax type defaults` (reused)
- `{0, plural, one {group covers} other {groups cover}}`
- `{0, plural, one {group ready} other {groups ready}}`
- `{0, plural, one {needs review} other {need review}}`
- `{0, plural, one {value group standardized cleanly.} other {value groups standardized cleanly.}}`
- `{0, plural, one {client} other {clients}}`
- `{0, plural, one {# client affected} other {# clients affected}}`

## Files touched

Implementation:

- `apps/app/src/features/migration/Step1Intake.tsx` — empty → detection states, single primary affordance, inline source-chip disclosure.
- `apps/app/src/features/migration/Step2Mapping.tsx` — banner-row list, attention-first sort, inline SearchableCombobox destination editor, one-sentence summary.
- `apps/app/src/features/migration/Step3Normalize.tsx` — category cards (entity types · states · tax types · other), distinct surface for Tax type defaults, banner-row item pattern.

Deletions (unused after the redesign):

- `apps/app/src/features/migration/wizard-delight.ts` — leftover from a prior bold-redesign attempt; imported `canvas-confetti` (forbidden by this brief) and was unreferenced anywhere.
- `apps/app/src/features/migration/SummaryMetric.tsx` — the 4-tile metric grid is replaced by sentence-level readouts in Step 2 and Step 3.

Tests:

- `apps/app/src/features/migration/Step2Mapping.test.tsx` — rewrote assertions for the always-visible banner list (no "Review column details" gate); added a low-confidence-first sort assertion.
- `apps/app/src/features/migration/Step3Normalize.test.tsx` — rewrote assertions for per-category cards; verifies the default-expand behaviour for exception-bearing categories and the Show toggle for all-matched categories.
- `apps/app/src/features/migration/Wizard.test.tsx` — the `pasteRows` helper now opens the "Paste a list instead" toggle first (Step 1's default is the dropzone); end-to-end flow assertions match the new banner-row Step 2 and categorized Step 3.

i18n:

- `apps/app/src/i18n/locales/zh-CN/messages.po` — 54 new translations added (catalog reports 0 missing after `pnpm --filter @duedatehq/app i18n:extract`).

## Validation

- `pnpm --filter @duedatehq/app exec vp check` — 0 errors. Two pre-existing `no-array-index-key` warnings remain in `notifications-page.tsx` and `workload-page.tsx` (unrelated to this pass).
- `pnpm --filter @duedatehq/app exec vp test --run src/features/migration/` — 60 tests pass across 9 files (Step1Intake, Step2Mapping, Step3Normalize, Step4Preview, Wizard, WizardShell, state, continue-rules, mapping-target-labels).
- `pnpm --filter @duedatehq/app i18n:extract` — 0 missing zh-CN translations.

## What's NOT in this pass (deliberately)

- The dual-source ambiguous detection ("Drake or Lacerte — pick one") is queued; the existing `prepareUploadFile` pipeline returns a single suggested preset, so adding a two-chip picker requires a contract change. The current code surfaces the single suggestion via a `Looks like X instead` Alert plus a `Switch to X` button, which is the current pipeline's honest read.
- `Step4Preview.tsx` is untouched — the brief said "leave alone unless visually clashing," and it isn't.
- `state.ts`, `intake-files.ts`, `migration-summary-view-model.ts`, and the API surface are unchanged. Only render and copy moved.
