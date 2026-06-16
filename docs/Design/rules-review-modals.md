# Rule-review action modals — canonical spec

> Source of truth for the action modals on `/rules/library` — the dialogs a
> reviewer opens to **accept**, **reject**, **confirm impact**, **bulk review**,
> and recover from an **accept failure / version conflict**. One shared shell,
> one gating model, one rule about what is real.
>
> Pencil reference: `duedatehq_work copy 2.pen` (blue-accent ddhq tokens, Geist;
> JetBrains Mono only for keycaps). Companion: the single-rule **detail panel**
> spec lives with `RuleDetailCompact` (Pencil `TkpJG`/`oei7Q`); the
> [DueDateHQ-DESIGN.md](./DueDateHQ-DESIGN.md) §4.11 primitive index governs the
> buttons / inputs / badges these modals compose. Memory mirror:
> `reference-rules-review-modal-family`.
>
> **Standing rule:** every datum and affordance traces to a real backend, or it
> is not built. The "Refused (fiction)" list in §5 is load-bearing — do not
> rebuild those without a backend first.

## 1. The family

| Role                          | Pencil node                  | React component                                      | File                                    |
| ----------------------------- | ---------------------------- | ---------------------------------------------------- | --------------------------------------- |
| Single accept (decision tool) | `TkpJG` / `oei7Q` / `I0zUhk` | `RuleDetailCompact` (`splitRail`)                    | `features/rules/rule-detail-drawer.tsx` |
| Reject                        | `toYTe` (reject half)        | `RejectReasonDialog`                                 | `features/rules/rule-detail-drawer.tsx` |
| Confirm impact                | `jpoZx`                      | `ConfirmImpactDialog`                                | `features/rules/rule-detail-drawer.tsx` |
| Accept error                  | `w8tiT` (error half)         | `RuleAcceptErrorDialog`                              | `features/rules/rule-detail-drawer.tsx` |
| 409 version conflict          | `zVX0E`                      | `RuleAcceptErrorDialog` (`code==='CONFLICT'` branch) | `features/rules/rule-detail-drawer.tsx` |
| Bulk review                   | `Fzzoq` / `s3LbR`            | `BulkReviewListModal`                                | `routes/rules.library.tsx`              |
| Affected-clients module       | `i7sVcU`                     | _(pattern, used inside detail panel)_                | —                                       |

## 2. Shared shell contract

Match the canonical reject card (`sKtWP`) exactly:

- Scrim `#10182899`; card fill `bg-components-panel-bg` (white), **radius 12**,
  1px `divider-subtle` inner stroke.
- **Header:** 36px (`size-9`) tinted **icon square, radius 8 (`rounded-lg`)** +
  title 16/600 `text-primary` + subtitle 13/400 `text-tertiary`, bottom 1px
  divider. Close affordance top-right; an `Esc` keycap chip (mono 10/600,
  `bg-subtle`, 1px `divider-regular`, radius 4) sits before the X — the dialog
  genuinely closes on Esc.
- **Eyebrow:** `text-caption-xs font-semibold tracking-eyebrow uppercase`
  (`text-tertiary` to match the detail panel's eyebrows).
- **Footer:** top 1px divider, white fill; right cluster = ghost/outline
  secondary + filled primary. Optional left-aligned helper hint stating the
  gate or consequence.
- Radius scale **12 / 0 / 8 / 999 / 4** — never freelance 6/10/14.
- Selection state is **accent blue** even inside a destructive (red) modal.
- Shadow: keep it restrained (border + bg contrast do the lift). The Pencil
  cards carry `blur 56` — **ignore that**, it violates the restrained-shadows
  rule.

## 3. Per-modal notes

### Reject (`RejectReasonDialog`, toYTe)

540px · `Ban` icon in the destructive square. Subtitle = rule identity
(`rule.title`, truncated) + consequence ("Will be marked Rejected and skipped
in your library"). Reason picker = **two-line radio cards** (firm policy /
source unreliable / duplicate / other) with accent selection. Internal note
**always visible**; for preset reasons the typed note is appended to the
persisted reason (`"{label} — {note}"`) so nothing is silently discarded; for
"Other" the note _is_ the reason (required). Footer hint + `destructive-primary`
(solid red) action. Mass reject lives in the bulk modal (two-click armed).

### Confirm impact (`ConfirmImpactDialog`, jpoZx)

Shown before committing a single accept. Populated **only** with real aggregate
`previewRuleImpact` data: estimated deadlines + entity distribution. No
fabricated per-client rows, no notify/backfill checkboxes, no "reversible 24h"
band (none of those have a backend).

### Bulk review (`BulkReviewListModal`, Fzzoq)

720px. Header (`Layers` icon) → **blocked-batch banner** (when
`acceptReadyCount===0`; AI-draft case gets exact copy) → **Select-all / Clear**
row with "N of M selected" → checkbox list (jurisdiction chip + title + type +
readiness badge + eye-preview) → required review note (logged to audit) →
metric band → footer (`Reject N` destructive-outline · Cancel · `Accept N`
locked w/ lock icon). Single-jurisdiction subtitle "Reviewing N rules in
{state}" via a **Trans-ternary** (never an interpolated `<Plural>` prop — it
renders blank). Metrics are exactly the API's; no invented pills.

### Accept error / 409 conflict (`RuleAcceptErrorDialog`, w8tiT / zVX0E)

480px. Branches on `error.code`:

- **`'CONFLICT'`** (server throws `ORPCError('CONFLICT')` on
  `rule.version !== expectedVersion`) → **amber/warning** chrome: "This rule
  changed since you opened it" · "A newer version was saved after you opened
  this one" · "Reload to review the latest…". Primary = **Reload rule**
  (`invalidateRules()` → panel re-renders fresh, next accept sends the correct
  version), **not** Retry. Attempt counter + code chip hidden.
- **anything else** → red "Couldn't apply rule" + the server message + Retry.

## 4. Gating model

- **Accept** unlocks only when the AI concrete draft is ready (`readyCount>0`).
  A gated Accept reads as _locked_ (lock icon + "unlocks once the draft is
  ready"), not merely greyed.
- **Reject** requires the review note (the note serves both the accept
  `reviewNote` and the reject `reason`; `maxLength 1000`; logged to audit).
- **Bulk** reads `previewBulkRuleImpact` →
  `readyCount / estimatedObligationCount / skipped[] / classificationCounts`.
  Skip reasons map to warning badges
  (`source_defined_requires_ai_review`="Needs AI draft review",
  source_changed / drifted, substantive, invalid_template). Batch cap = 100
  (`BULK_ACCEPT_BATCH_MAX`) — over that the preview isn't fired (say so, don't
  spin). Mass reject is a two-click armed destructive action.
- **Status is observed, never picked** — these modals act on review _events_
  (accept/reject); there is no generic "set status" dropdown.

## 5. Refused (fiction) — do not build without a backend

- **Defer / snooze a rule review** (toYTe's second dialog): no backend.
  `snoozedUntil` exists only on obligation _instances_ (deadlines). A
  date-picker defer modal would be a net-new feature.
- **Streaming in-flight apply** (w8tiT's step checklist / % bar / "5 of 8
  clients" / server-events footer): accept is a single RPC, not a streamed
  multi-step apply. The existing spinner / disabled "Applying…" button is the
  truthful in-flight state.
- **Field-level merge UI** (zVX0E's side-by-side "their version / your draft"
  - per-field Keep-theirs/mine segmented controls): the accept RPC returns no
    conflicting values, so a diff would be fabricated. The honest recovery is
    Reload.
- **Confirm-impact extras** (jpoZx's per-client table, notify-owners /
  backfill-quarters checkboxes, "reversible within 24h" band): no backend
  signal. Show only the real aggregate counts.

## 6. Open / not-yet-designed

- Draft-**ready** accept variant (the gate cleared) — interaction TBD.
- Long-title clamp in the single accept hero.
- Affected-clients (>0) block inside the single accept modal (`i7sVcU` pattern
  exists; wiring to real per-client impact is backend-blocked).

See `reference-status-propagation-spec` and `feedback-no-fiction-on-canvas`
for the surrounding contracts.
