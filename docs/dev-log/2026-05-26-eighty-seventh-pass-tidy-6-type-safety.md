# Eighty-seventh pass — Tidy 6/N: type-safety tightening (minimal scope)

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## Why this commit is small

Pass 6 was scoped to "tighten weak types, address remaining `any`
usage." Audited the codebase first:

| Shape                                | Count in `apps/app/src` | Verdict                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `: any` annotations                  |                   **0** | Already clean.                                                                                                                                                                                                                                                                                                                                 |
| `as any` casts                       |                   **0** | Already clean.                                                                                                                                                                                                                                                                                                                                 |
| `@ts-ignore` directives              |                   **0** | Already clean.                                                                                                                                                                                                                                                                                                                                 |
| `Record<string, unknown>` (non-test) |                      34 | 13 at JSON-parsing boundaries (legitimate). The other 21 are inside parser helpers for audit-event payloads, migration row data, and AI-evidence JSON — each one is a place where the **runtime shape is genuinely unknown** until the helper verifies it. Tightening these would force premature `as` assertions, which is worse, not better. |
| `: unknown` annotations              |                      89 | All legitimate (`JSON.parse` returns, untyped contract boundaries, event payloads).                                                                                                                                                                                                                                                            |
| `eslint-disable` directives          |                      40 | 39 are legitimate (`no-var` for test global setup, `no-console` in dev shims, `unbound-method` in React tests). **One** flagged a real orphan.                                                                                                                                                                                                 |

## What this commit does

Removes the one real type-safety issue: an `eslint-disable` directive
on a dead import block in `PulseDetailDrawer.tsx`.

`pulseAlertTone` and `pulseAlertToneLabel` were imported as
`_pulseAlertTone` / `_pulseAlertToneLabel` (the underscore-prefix
"keep this around" convention), with an `eslint-disable-next-line
@typescript-eslint/no-unused-vars` directive and a comment claiming
they were "retained for any future usage" since the drawer header
dot was removed 2026-05-26.

But:

- `pulse-alert-tone.ts` is alive — `needs-attention-card.tsx`
  imports both helpers and uses them in render. So the underlying
  module isn't going anywhere.
- The drawer's local import was just orphaned. The comment lies — it
  isn't "retained for future use," it's dead code with a justification
  comment attached.

Removed the 7-line import block + its preceding 3-line comment + the
eslint-disable directive. The helpers stay alive at their definition
site; consumers that need them already import directly.

Pass 1 missed this because Pass 1 looked for orphan top-level
function definitions, not orphan imports.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

Net: −8 lines in one file.

## Why I'm not tightening Record<string, unknown> further

Every non-test usage I inspected falls into one of two legitimate
patterns:

1. **JSON-parsing boundary helpers** like `readJsonRecord(s) →
Record<string, unknown> | null`. The whole point of these is to
   accept untrusted JSON and let the caller narrow with subsequent
   `readRecordString(record, 'key')` extractions. Tightening the
   return type would require an `as` cast somewhere, which is
   strictly worse.

2. **Audit event payloads** (`event.beforeJson` /
   `event.afterJson` / `event.metadata`) where the shape varies by
   `event.action`. The contracts type these as `unknown` by design;
   the renderer pattern-matches per-action.

Narrowing these in this codebase would be:

- A behavior change (assertions that throw at runtime instead of
  returning null), OR
- Type theater (`as Record<keyof MyType, ...>` that the compiler
  trusts but reality might not honor).

Both are worse than the current "honest unknown at the boundary,
helpers narrow per-call" pattern.

## Files

- `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
- `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-6-type-safety.md` (this file)
