# Rule Library — bulk-review polish + 409-aware accept error

Date: 2026-06-15 · Yuqi · frontend polish of the rule-review action modals
(batch continued from the toYTe reject dialog).

## Fzzoq — Bulk review modal (`BulkReviewListModal`)

The modal was already a faithful, honest implementation (backed metrics
only). Pencil-fidelity deltas applied, no behavior/data change:

- **Blocked-batch banner** at the top: when `previewBulkRuleImpact` reports
  `acceptReadyCount === 0` for the included rows, surface why up front
  instead of only in the footer caption. When every included row is blocked
  on a missing AI draft (`source_defined_requires_ai_review`), use the exact
  Pencil copy ("None of these can be accepted yet — each needs an AI concrete
  draft / Reject them here, or close and generate drafts first"); otherwise a
  generic "review individually" message.
- **Select-all / Clear** controls row with "N of M selected" (drives the
  `excluded` set; Select-all → include all, Clear → exclude all).
- **Single-jurisdiction subtitle** "Reviewing N rules in {state}" when the
  batch is one jurisdiction — via a **Trans-ternary**, not an interpolated
  `<Plural>` prop (lingui footgun: a `{var}` in a Plural string renders blank).
- **Locked Accept** shows a lock icon when gated (TkpJG/Fzzoq parity).
- Header icon square `rounded-xl` → `rounded-lg` (radius-scale consistency).

Metrics remain exactly the API's (`acceptReadyCount`,
`estimatedObligationCount`, classification + skipped counts) — no fabricated
"coverage lift" / "est. work" pills.

## zVX0E — 409 stale-version conflict (`RuleAcceptErrorDialog`)

`acceptTemplate` throws `ORPCError('CONFLICT', 'Rule template version has
changed.')` when `rule.version !== expectedVersion`. The error dialog now
branches on `error.code === 'CONFLICT'`:

- **Conflict** → amber/warning chrome (not red): "This rule changed since you
  opened it" · "A newer version was saved after you opened this one" ·
  "Reload to review the latest before accepting — retrying now would apply
  against an outdated version." Primary action is **Reload rule**
  (`invalidateRules()` → the panel re-renders with the fresh version, so the
  next accept sends the correct `expectedVersion`), **not** Retry — a retry
  would re-send the same stale version and fail again. Attempt counter + raw
  code chip are hidden (a conflict isn't a server fault).
- **Everything else** → unchanged red "Couldn't apply rule" + Retry.

### What was intentionally NOT built (no fiction)

- **No field-level merge UI** (Pencil zVX0E's side-by-side "their version /
  your draft" + per-field Keep theirs/mine segmented controls): the accept RPC
  doesn't return the conflicting field values, so a diff would be fabricated.
  The honest recovery is Reload.
- **No streaming in-flight modal** (Pencil w8tiT-A's step checklist / percent
  bar / "5 of 8 clients" / server-events footer): accept is a single RPC, not
  a streamed multi-step apply — the existing spinner/disabled "Applying…"
  button is the truthful in-flight state.
- **jpoZx** (confirm-impact) and the **w8tiT error dialog** were already built
  honestly (`ConfirmImpactDialog` / `RuleAcceptErrorDialog`) in earlier work —
  real aggregate `previewRuleImpact` stats only, no per-client fiction rows.

## Verification

`tsc` clean; lint 0 errors (1 pre-existing `_`-const warning). Bulk modal
verified live (overview "Start review" → 456 selected): controls row, locked
Accept with lock icon, over-100 preview message, Reject N all render; Select-all
correctly disabled when all selected. The 409 path isn't reproducible in the
local preview (needs a concurrent version bump) — the branch is keyed on the
source-confirmed `'CONFLICT'` code and the non-conflict path is unchanged.
