# 2026-05-26 — Pulse deadline-shift Apply: source-verification gate (F-041)

## Why

From the Step-9 AI-visibility audit, **F-041 — P0**:

> Pulse "Deadline shift: old → new" is the most consequential AI output and has no
> "verify against source" confirmation step. An AI hallucinating a deadline shift
> causes the firm to file late or early. The Apply button should have a
> "I have verified against the source" checkbox or at least a confirmation modal
> that surfaces the source excerpt. No checkbox, no apply.

Before this change, the Pulse drawer's `Apply deadline exception` button fired
the mutation immediately. The CPA had nothing standing between them and a
filing-date change that could be wrong — and a wrong AI date extraction here is
not a UX paper-cut, it's a "client gets penalty notice from the IRS" failure.

The Step-9 audit ranked this as one of five remaining P0 trust-calibration
gaps. The other four either require server-contract changes (audit-log
`actor_type`, per-item AI provenance) or are partial fixes that already shipped
(F-009 extraction caveat banner, F-011 evidence-label "AI" prefix). F-041 was
the highest-impact P0 that could ship purely on the client.

## What

A new `PulseApplyVerificationDialog` intercepts `handleApply` on the Pulse
detail drawer. Before the `applyMutation` fires, the dialog surfaces:

1. **The deadline shift** the AI proposes — original date (struck through,
   tertiary) → arrow icon → new date (warning amber, semibold). Same warning
   tone as `PulseStructuredFields` so the visual language is consistent across
   the drawer body and the verification gate.

2. **Authority + issued date** — clickable link to the official source page
   (opens in new tab, `rel="noopener noreferrer"`), plus the publication date
   the AI extracted from.

3. **The verbatim source excerpt** — same blockquote treatment as
   `PulseStructuredFields`, capped at 6 lines via `line-clamp-6` so the dialog
   stays scannable when the source notice is verbose.

4. **A required checkbox** — "I have read the official source and verified the
   new deadline date." The Apply button stays `disabled` until checked. The
   label is intentionally verbose: it's a specific claim that we want in the
   audit log if there's ever a review for a wrong filing.

### Mechanics

- `handleApply` no longer calls `applyMutation.mutate` directly — it now opens
  the verification dialog. The actual mutation lives in a new `runApply`
  function fired from the dialog's submit handler.
- `applyVerificationOpen` + `applyVerified` state added alongside the existing
  reason-capture / review-request dialog state.
- Both state values reset on alert change and drawer close (same reset blocks
  that already clear `reviewDialogOpen`, `reasonAction`, etc).
- The dialog stays open during the mutation (`aria-busy={pending}`) so the
  user retains context if the request fails. On success the upstream
  `applyMutation.onSuccess` calls `onClose()`, which triggers the drawer-close
  reset and clears the dialog state for next time.
- Mounted in both panel-mode and sheet-mode renders so the gate is consistent
  across `/rules/pulse` and any off-route Pulse drawer.

### Why the gate doesn't appear on `review_only` alerts

The drawer footer's `DrawerActions` component routes `onApply` vs
`onMarkReviewed` based on `reviewOnly` (see `PulseDetailDrawer.tsx` L1154). For
review-only alerts there's no date change to verify — those route through
`onMarkReviewed`, which has its own reason-capture dialog. The verification
gate is therefore only reachable when `actionMode === 'due_date_overlay'`.

## Liability framing

The Step-9 audit doc puts it clearly: "A wrong AI extraction here = the firm
files late or early." This is the highest-stakes, least-undoable failure mode
in the product. One explicit confirmation step is cheap insurance against a
class of fundamentally non-recoverable mistakes. Compare to the existing
reason-capture pattern on dismiss/snooze (PulseReasonDialog) — those are also
single-acknowledgement gates, and they cover lower-stakes decisions.

The dialog is intentionally not "scary." It's not a `destructive` AlertDialog
with red headers. The signal we want to send the CPA is **"slow down and check
the source,"** not **"this action is dangerous."** The destination state
(applying a deadline shift) is the correct behavior in the success case — we
just want one breath between intent and execution.

## What changed

- `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
  - New imports: `Checkbox`, `ArrowRightIcon`, `ExternalLinkIcon`, `formatDate`.
  - New state: `applyVerificationOpen`, `applyVerified`.
  - `handleApply` refactored: opens dialog instead of firing mutation. New
    `runApply` does the actual `applyMutation.mutate`.
  - Reset blocks updated to clear the new state on alert change + drawer close.
  - New `applyVerificationDialog` element rendered in both panel + sheet modes
    as a sibling of `reviewRequestDialog` and `reasonDialog`.
  - New `PulseApplyVerificationDialog` component (~85 lines, mirrors the
    structure of `PulseReviewRequestDialog`).

## Validation

- `pnpm exec tsc --noEmit` — clean (apps/app).
- `pnpm test --run src/features/pulse` — all 5 Pulse tests pass (drawer,
  alerts-list, structured-fields).
- Full apps/app test run shows 13 pre-existing failures in
  `src/routes/rules.library.test.tsx` from missing `useKeyboardShortcutsBlocked`
  provider — confirmed via `git stash` to be unrelated to this change.

## Follow-ups

The Step-9 audit flagged four other P0s that would compound with this gate:

- **F-035** — Audit log gets a real `actor_type` for AI writes. Then the
  verification checkbox's "I verified" claim is queryable against the actual
  AI write. _Server schema change._
- **F-008** — AI-generated checklist items get a provenance flag. _Server
  contract change._
- **F-009** — Pulse structured fields surface extraction spans, not just the
  raw excerpt blob. _Extraction pipeline change._
- **F-022** — AI markers drop on user edit. _Already partially shipped on the
  Step-9 agent branch for Migration Step 2; needs widening._

None of these are required for this change to be defensible — but
all four would make the verification claim more powerful.
