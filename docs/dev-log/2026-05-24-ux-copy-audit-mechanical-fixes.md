---
title: 'UX copy audit — Unicode ellipsis, Title Case → sentence case, specific errors'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: typeset
---

# UX copy audit — mechanical fixes

## Why

You asked whether I'd run a dedicated UX copy audit. I had not — only
touched copy as side-effects of other batches. This pass covers
voice, tone, sentence case, verb choice, punctuation, error
clarity, loading copy, and CPA-domain fluency.

## Audit verdict

The codebase scored **8–9/10** across most categories. Most copy is
already on-voice (sentence case, "you" pronoun, "Couldn't [verb]"
error pattern, CPA-domain accuracy).

| Category                   | Score                | Notes                                                                                                                                                     |
| -------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button verb consistency    | 8/10                 | "Create" / "Add" / "Cancel" / "Archive" used semantically; some pending-gerund variation (Saving / Creating / Adding)                                     |
| Sentence vs Title Case     | 7/10 → 9/10 (fixed)  | **11 violations** fixed in this commit                                                                                                                    |
| Empty state copy quality   | 8/10                 | All 11 EmptyStates have title + reason + next action                                                                                                      |
| Error message clarity      | 6/10                 | "Couldn't [verb]" pattern is good; ~80% of `toast.error()` calls lack a `{ description }` with the next step — **deferred as editorial pattern decision** |
| Loading copy               | 9/10 → 10/10 (fixed) | `Loading X…` pattern dominates; 2 missing ellipsis fixed                                                                                                  |
| Punctuation discipline     | 7/10 → 9/10 (fixed)  | **5 three-dot `...` → Unicode `…`** fixed; zero exclamation marks; em-dash in comments not UI                                                             |
| Pronoun + audience         | 9/10                 | Second-person "you" throughout; no "we"                                                                                                                   |
| Number formatting          | 8/10                 | Counts use `Plural` macro; no raw integers in user-facing strings                                                                                         |
| Confirmation dialog copy   | 9/10                 | Title-as-question + named-change + matching CTA verb (the pattern landed last batch)                                                                      |
| CPA-domain accuracy        | 9/10                 | "Form 1040" / "K-1" / "8879" used correctly; ConceptLabel + tooltips scaffold non-obvious terms                                                           |
| Placeholders + helper text | 9/10                 | Ghost-text hints ("Search clients…"), specific format hints ("Use EIN format ##-#######")                                                                 |

## What changed (mechanical fixes only)

### 1. Five three-dot `...` → Unicode `…` ellipses

| File                                    | Was                           | Now                         |
| --------------------------------------- | ----------------------------- | --------------------------- |
| `clients/ClientFactsWorkspace.tsx:3379` | ``t`Saving...` ``             | ``t`Saving…` ``             |
| `clients/ClientFactsWorkspace.tsx:3470` | (same)                        | (same)                      |
| `clients/CreateClientDialog.tsx:509`    | ``t`Creating...` ``           | ``t`Creating…` ``           |
| `firm/timezone-select.tsx:87`           | ``t`Search timezone...` ``    | ``t`Search timezone…` ``    |
| `keyboard-shell/CommandPalette.tsx:271` | ``t`Search or navigate...` `` | ``t`Search or navigate…` `` |
| `routes/obligations.tsx:4553`           | `<Trans>Saving...</Trans>`    | `<Trans>Saving…</Trans>`    |

The product's typographic convention (and what's used everywhere
else — 30+ places) is the single-glyph `…`. Three dots reads as
unfinished thought; the Unicode ellipsis is the editorial mark.

### 2. Eleven Title Case → sentence case

Buttons and table headers should use sentence case per the
established voice ("Sentence case for buttons + menu items"). All
11 inspected violations were real:

| File                            | Was                                      | Now                 |
| ------------------------------- | ---------------------------------------- | ------------------- |
| `obligations.tsx:4642`          | `Save Extension` (button)                | `Save extension`    |
| `billing.success.tsx:133`       | `Open Billing` (button)                  | `Open billing`      |
| `audit-log-page.tsx:576`        | `Open Obligations` (secondary action)    | `Open obligations`  |
| `members-page.tsx:115`          | `Open Obligations` (secondary action)    | `Open obligations`  |
| `workload-page.tsx:143, :198`   | `Open Obligations` (2 buttons)           | `Open obligations`  |
| `billing.tsx:262`               | `Open Obligations` (secondary action)    | `Open obligations`  |
| `ClientFactsWorkspace.tsx:2878` | `FORM` (column header, all-caps outlier) | `Form`              |
| `ClientFactsWorkspace.tsx:2887` | `Internal Deadline` (column header)      | `Internal deadline` |
| `ClientFactsWorkspace.tsx:2896` | `Official Deadline` (column header)      | `Official deadline` |
| `obligations.tsx:5096`          | `Deadline Tip` (ConceptLabel)            | `Deadline tip`      |
| `obligations.tsx:7647`          | `Check Materials` (button)               | `Check materials`   |

Notably the filing-plan column-header row had THREE different
casings within one table: `FORM` (all-caps), `Internal Deadline`
(Title Case), `Status` / `Estimated tax` (sentence case). All
five headers now match sentence case.

Proper nouns left as-is: `Apple Calendar`, `Smart Priority`, `Pulse`
(these are brand / feature names per the established voice).

### 3. Two loading-copy missing ellipsis

| File                            | Was                             | Now                              |
| ------------------------------- | ------------------------------- | -------------------------------- |
| `ClientDetailDrawer.tsx:207`    | `Loading client`                | `Loading client…`                |
| `migration/WizardShell.tsx:505` | `Generating your deadline list` | `Generating your deadline list…` |

Pattern was `Loading X…` everywhere else; these two missed the
ellipsis.

### 4. One generic error → specific

| File                             | Was                                 | Now                    |
| -------------------------------- | ----------------------------------- | ---------------------- |
| `migration/Step2Mapping.tsx:175` | `Something went wrong` (AlertTitle) | `Couldn't map columns` |

The title was a vague "something went wrong" banner with the
specific cause in the description below. Matches the app-wide
"Couldn't [verb]" pattern; the description still carries the
detailed error.

## Editorial decisions still open (not mechanical)

These need your call — I didn't touch them:

1. **`toast.error()` descriptions**: ~80% of error toasts lack a
   `{ description: ... }` with a next-step. The current fallback
   leaks raw RPC error text. Should we standardize on always
   passing a human-friendly "Check your network and try again" style
   description, or accept the current per-error treatment?
2. **Pending-state verb consistency**: I now use "Saving…" /
   "Creating…" / "Disabling…" / "Removing…" — each matches its
   action verb. Alternative: standardize on a single "Saving…"
   pattern (less specific, simpler). I prefer the per-action
   gerund — more meaningful — but it's a call.
3. **"Remove" vs "Delete"**: every destructive action uses "Remove"
   (softer, firm-centric). "Delete" not currently used. Confirm
   that's the standard or relax it.
4. **"Obligations" as a destination name**: the sidebar nav label is
   "Deadlines" (not Obligations), but secondary CTAs still say
   "Open obligations". Two naming conventions for the same route.
   Suggest: align the buttons with the sidebar — "Open Deadlines" or
   "Go to Deadlines"? Or leave as-is so URL hints come through?

## Verification

- `pnpm check` → 1389 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.

## Files touched

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- M `apps/app/src/features/clients/CreateClientDialog.tsx`
- M `apps/app/src/features/clients/ClientDetailDrawer.tsx`
- M `apps/app/src/features/firm/timezone-select.tsx`
- M `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
- M `apps/app/src/routes/obligations.tsx`
- M `apps/app/src/routes/billing.tsx`
- M `apps/app/src/routes/billing.success.tsx`
- M `apps/app/src/features/audit/audit-log-page.tsx`
- M `apps/app/src/features/members/members-page.tsx`
- M `apps/app/src/features/workload/workload-page.tsx`
- M `apps/app/src/features/migration/WizardShell.tsx`
- M `apps/app/src/features/migration/Step2Mapping.tsx`
