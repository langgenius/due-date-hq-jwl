# Rule Library — reject dialog rebuilt to Pencil toYTe

Date: 2026-06-15 · Yuqi · frontend polish of the rule-review action modals

Continuing the action-modal fidelity pass (after TkpJG). `toYTe` is the
"reject & defer modals" board — two dialogs. Only the **Reject** half is
backed by real mutations; the **Defer** half is not built (see below).

## Reject dialog (`RejectReasonDialog`, rule-detail-drawer.tsx)

Rebuilt to match toYTe:

- 480 → **540px**, `Ban` icon in the destructive icon square (was OctagonX).
- Header subtitle now carries the **rule identity** (`rule.title`, truncated)
  plus a consequence line ("Will be marked Rejected and skipped in your
  library.") — Pencil folds both into one subtitle; we stack them to avoid an
  i18n interpolation footgun.
- **Esc chip** in the header (the dialog genuinely closes on Esc).
- Tracked-caps eyebrow "WHY ARE YOU REJECTING?".
- Reason picker is now **two-line cards** (label + static guidance): firm
  policy / source unreliable / duplicate / other. Selection uses the **accent**
  blue (matches Pencil — selection is accent even in the destructive modal).
- Internal note textarea is **always visible** (was "Other"-only). For preset
  reasons the typed note is appended to the persisted `reason` string
  (`"{label} — {note}"`) so an always-visible field never silently discards
  input; for "Other" the note still *is* the reason (required).
- Footer: left helper hint + Cancel + **`destructive-primary`** (solid red)
  "Reject rule" with leading ban icon. (The legacy `destructive` variant maps
  to `destructive-secondary` — a soft white/red treatment; toYTe's primary is
  solid red, so `destructive-primary` is correct and is the wired, app-wide
  variant.)

## Defer — intentionally not built (no fiction)

toYTe's second dialog is a snooze/date-picker "Defer review". There is **no
rule defer/snooze backend**: `snoozedUntil` exists only on obligation
*instances* (deadlines), not on rule review tasks (which only
accept/reject/supersede). A date-picker defer modal would be a net-new feature
(mutation + schema column + queue-resurface logic), not polish — so it's
omitted per the "no fiction on canvas" rule.

## Verification

`tsc` clean; lint 0 errors (1 pre-existing `_`-prefixed-const warning). Verified
live on the Alabama income-tax rule: solid 540px dialog, two-line reason cards
with accent selection, internal note, destructive-primary action. (The faded
first screenshot was a mid-enter-animation frame — both dialog contents measure
opacity 1 / opaque white once settled.)
