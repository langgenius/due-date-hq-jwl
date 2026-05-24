# 2026-05-25 — Phase 7: Migration Wizard polish (6 items)

## Why

Phase 7 of Yuqi's 89-item review — Migration Wizard had 10 flagged
items concentrated in two places: the wizard header
(monospace breadcrumb + mystery green dot + redundant Step N / 4)
and the Stepper component (monospace uppercase labels, left-
aligned). Six items shipped in this commit.

## Shipped

### #32, #33, #34, #39 — Wizard header rebuild

The header was a monospace breadcrumb:
`● Import / Step N / 4` with a small green dot.

- **#32, #39**: Green dot had no documented meaning. Hovering told
  the user nothing. **Dropped the dot entirely** — the title +
  Stepper below carry the context.
- **#33**: `font-mono` made "Import" read as a code path, not a
  title. **Promoted to `text-base font-semibold` regular case
  "Import clients"** so it reads as the wizard's actual heading.
- **#34**: "Step N / 4" duplicated the Stepper directly below it.
  **Dropped the breadcrumb** — Stepper is now the single source
  of truth for progress.

### #35, #36 — Stepper rebuild

- **#35**: Step labels were `font-mono tracking-[0.08em] uppercase
text-xs` — read as code, not as navigation. **Switched to
  sentence-case `text-sm`** matching the body type elsewhere.
  Active step gets `font-medium` for emphasis instead of the
  weight-only differentiation. Also `"Dry-Run"` → `"Dry run"` to
  match the new casing.
- **#36**: Stepper row was left-aligned (`px-4`). **Now centered
  via `justify-center`** so the visual rhythm matches the wizard's
  centered content area below. Step1/4 in the breadcrumb is gone
  per #34, so this single visual is the only progress indicator.

### #38 — Combine duplicate prose

Step 1 Intake had two paragraphs that said related things:
"We'll figure out the shape — paste or upload" then "Columns named
Estimated tax due, Owner count, or Owners can help prepare payment
and penalty context." **Joined into one paragraph** as two
sentences so the reader doesn't have to bridge the split.

## Deferred

### #37, #40, #41 — Modal style consistency / audit content / xx-or-xx layout

- #37 "ensure this modal pop up is in the same style as others" —
  the wizard uses a custom `WizardShell` (panel-style) rather than
  `<Dialog>` because it's a multi-step persistent workspace. The
  "same style as others" comparison needs a side-by-side audit
  with `<Dialog>` callsites to decide if convergence is desirable.
  Deferred as a separate audit task.
- #40 "audit here的所有的文字UX内容" — full-step copy audit. Real
  i18n work across all four steps. Deferred to a dedicated copy
  pass.
- #41 "xxxx or xxxx left/right" — paste-or-upload layout change.
  Looking at the existing Step1Intake, the two paths
  (paste textarea + file upload zone) ARE side-by-side at
  comfortable density; only `compact` density stacks them. Yuqi's
  feedback may apply to compact viewports — needs viewport
  inspection.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/features/migration` 0/0 (21 files)

## Closes Yuqi review items

- Today (wizard cluster): **#32, #33, #34, #35, #36, #38, #39** (7
  items addressed — though #32 and #39 were the same green-dot
  question, counted once)
- Deferred: **#37, #40, #41**

Combined with Phases 1-6 (38 items closed), the review is at
**44 / 89**.
