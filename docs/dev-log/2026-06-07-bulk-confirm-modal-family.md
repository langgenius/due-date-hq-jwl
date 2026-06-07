# Bulk-action confirmation modal family

Date: 2026-06-07

Pencil `X4t2E` — a reusable confirmation-dialog family for bulk actions,
standardized on the shared `AlertDialog` primitive. The design ships three
patterns and we capture all three in one component so every bulk call site
gets identical confirmation chrome.

## What shipped (NO contract/DB change)

- `apps/app/src/components/patterns/bulk-confirm-dialog.tsx` (new)
  - `BulkConfirmDialog` — header (icon tile · title · description), optional
    middle slot, Cancel / primary footer. `tone` prop selects the pattern:
    - `neutral` — reversible commit (e.g. "Mark 12 deadlines as filed"). Dark
      icon tile, primary commit button. Optional follow-on `BulkConfirmOption`
      checkbox.
    - `destructive` — irreversible removal (e.g. "Delete 8 rules"). Red icon
      tile + `BulkConfirmWarnCard`, destructive-primary button, optional
      `confirmPhrase` type-to-confirm guard that disables the primary until the
      user types the phrase exactly.
    - `accent` — broadcast/apply (e.g. "Apply 4 alerts to clients"). Accent
      icon tile + accent primary.
  - Helper exports: `BulkConfirmList` (selected-item preview, capped at N +
    "+ M more"), `BulkConfirmWarnCard`, `BulkConfirmOption`.

## Wiring

- `apps/app/src/features/alerts/AlertsListPage.tsx` — the floating bulk-action
  bar's **Dismiss** previously fired `orpc.pulse.bulkDismiss` immediately. It
  now routes through `BulkConfirmDialog` (destructive tone) with a
  `BulkConfirmList` preview of the selected alert titles. Confirm fires the
  same batch mutation; the primary disables while the mutation is pending.

## Tokens

Pencil's neutral primary is dark `#101828`; mapped onto the app's `default`
(primary) Button variant rather than introducing a dark-button token, keeping
one commit-button vocabulary. Icon tiles use existing
`bg-state-{accent,destructive}-hover` / `bg-text-primary` tokens.

## Notes / future call sites

The destructive type-to-confirm path and the accent apply path are built and
typed but not yet wired to a live call site — the alerts Dismiss demonstrates
the destructive variant against a real RPC. The "Apply alerts to clients" bulk
action remains gated on per-alert source verification (see AlertDetailDrawer
F-041), so it stays disabled at the bar; when that backend lands, the accent
variant of this component is the intended confirm surface.
