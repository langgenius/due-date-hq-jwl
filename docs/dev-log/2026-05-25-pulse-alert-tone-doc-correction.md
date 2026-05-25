# 2026-05-25 — Correct `pulseAlertTone()` to match doc + update Pulse docs

## Why

Yuqi reminded me: "如果涉及设计和UX，你要及时更新相应文档" —
when UX changes ship, update the canonical design doc, not just
the dev-log.

Re-reading `docs/Design/pulse-vocabulary.md` §"severity scale"
after Phase 1 (`951e94d7`) shipped, I noticed my `pulseAlertTone()`
helper diverged from the documented intent:

The doc says:

- `urgent` (warning) = open && impact > 0 && confidence ≥ LOW
- `informational` (info) = open && (no impact OR confidence < LOW)
- `resolved` (success) = applied / partially / dismissed / etc.

My helper said:

- `error` if very-low-confidence
- `success` if applied/partially OR no impact
- `warning` if impacted

Two divergences:

1. **Low confidence escalated to `error` (red)** — wrong. The doc
   has been clear since 2026-05-21: low confidence DEMOTES urgency
   to informational ("we don't know enough yet, FYI"), not escalates
   it. The accompanying "AI 46%" badge already signals AI quality;
   the dot's job is alert _urgency_. Red alarm on an alert the AI
   itself isn't sure about trains alarm fatigue. This was an
   accidental preservation of the old `drawerTone()` bug.

2. **No-impact open alerts mapped to `success` (green)** — wrong.
   Green is reserved for resolved states. An open alert with no
   client impact is `informational`, not `resolved`. Green tells
   the CPA "you can close this surface"; an open alert is still
   open.

## What changed

### `apps/app/src/features/pulse/pulse-alert-tone.ts`

Rewrote the helper to match the doc:

```ts
if (RESOLVED_FIRM_STATUSES.has(alert.firmStatus)) return 'success'
if (impacted > 0 && !lowConfidence) return 'warning'
return 'normal'
```

`RESOLVED_FIRM_STATUSES` now includes the full closed-state set:
applied / partially_applied / dismissed / reverted / reviewed.

The companion `pulseAlertToneLabel()` got rewritten accordingly —
`normal` reads "Informational alert — FYI, low confidence or no
client impact", `warning` reads "Active alert — clients may be
affected", etc.

### `docs/Design/pulse-vocabulary.md`

- Severity scale table now lists `normal / info` (matching the
  PulsingDot tone token) instead of the ambiguous `info / muted`.
- New §"Canonical implementation: `pulseAlertTone()`" section
  documents the helper, the tone-mapping table, the companion
  label function, and the history (why the helper exists, why
  the first revision was wrong).

### `docs/Design/DueDateHQ-DESIGN.md` §4.3 (Pulse Banner)

- Adds the rule: "tone 必须通过 `pulseAlertTone(alert)` helper
  计算 — 不允许在 banner / card / drawer 各自手写 tone 公式".
- Adds the rule: every `<PulsingDot>` must pass a `label` (via
  `pulseAlertToneLabel`) so the dot has a hover tooltip + aria-label.
- Explicit note: low-confidence alerts go `normal`, not `error`.

### Memory rule

Added `feedback_design_docs_on_change.md` to user memory listing
the design doc map (DESIGN.md / pulse-vocabulary / status-taxonomy /
etc.) and the rule: when a commit changes a design semantic,
update the canonical doc in the same commit. Don't only write
dev-log entries — those are implementation history, the doc is
the source of truth.

## Verification

- tsc clean
- lint 0/0 (665 files)
- The 7 reviewed items from Phase 1 are unchanged — same dots
  appear in the same places, just the colour mapping is now
  doc-compliant
