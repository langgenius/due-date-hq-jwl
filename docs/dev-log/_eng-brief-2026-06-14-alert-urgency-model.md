# Eng brief — Alert list urgency model (deadline-proximity baseline)

_2026-06-14 · status: SPEC / not built · owner: TBD · author: design (Yuqi session)_

## TL;DR

The list already _has_ everything it needs to show urgency — we just don't use
it for every firm. `actionDeadline` is on every alert row, and a real server
scorer (`scorePulsePriority`) already produces an URGENT/HIGH tier. The only
thing missing is an **ungated baseline tier derived from the deadline itself**,
so a firm without the smart-priority permission still sees "this one is days
away" instead of a flat list. This brief specs that baseline and how it layers
under the existing smart-priority inset. **No new contract field is required.**

## Correction to the earlier framing

The task was originally scoped as "add a `nextActionDeadline` contract field +
scoring." On inspection that field is redundant:

- `PulseAlertPublicSchema.actionDeadline` already exists
  (`packages/contracts/src/pulse.ts:185`, `z.iso.datetime().nullable()`).
- It is derived server-side in the DB mapper as
  `parsedNewDueDate ?? protectiveActionDeadline ?? parsedEffectiveUntil`
  (`packages/db/src/repo/pulse/shared.ts:783`), so it already covers
  `deadline_shift` (new due date), `protective_claim_window` (promoted
  `protectiveActionDeadline`), and effective-window kinds (`parsedEffectiveUntil`).
- The public mapper passes it through unchanged
  (`apps/server/src/procedures/pulse/index.ts:239`).

So **the deadline contract is done.** Don't add a parallel field.

## What already exists (do not rebuild)

| Piece                                                           | Where                                                                                  | State                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `actionDeadline` on the row                                     | contracts/pulse.ts:185 · derived shared.ts:783                                         | ✅ shipping, every row                                             |
| Smart scorer `scorePulsePriority()` → `{score, level, reasons}` | packages/db/src/repo/pulse/shared.ts:877                                               | ✅ urgent ≥70 / high ≥45 / normal                                  |
| Score persisted at write-time                                   | `pulsePriorityReview.priorityScore` / `priorityReasonsJson`                            | ✅                                                                 |
| Tier + reasons exposed                                          | `PulsePriorityQueueItem` (contracts/pulse.ts) via `useAlertsPriorityQueueQueryOptions` | ⚠️ **gated** on `permissions.canViewPriorityQueue && !historyMode` |
| Row renders URGENT/HIGH pill + "Why?" inset                     | `PulseAlertRow.tsx` (`LEVEL_PILL`, `priority` prop)                                    | ✅ but only when `priorityById.get(id)` is populated               |
| Row already reads `actionDeadline`                              | AlertsListPage.tsx:1327 (a horizon filter)                                             | ✅ proves the field is reachable client-side                       |

## The actual gap

1. **Urgency is invisible to firms without the priority-queue permission.** The
   tier lives behind a second query (`priorityById`). No permission → no pill →
   the list reads flat, even though `actionDeadline` is sitting on each row.
2. **Deadline proximity is not, by itself, a tier.** `scorePulsePriority` only
   adds a protective-claim deadline bonus (+45 if `≤60 days`). A plain
   `deadline_shift` landing in 3 days gets no time-based weight on the list.

## Proposal — a two-layer urgency model

### Layer 1 — Deadline-proximity baseline (ungated, build this first)

A pure function of `alert.actionDeadline` + today. Available to **every** firm
because it needs no permission and no extra query — the field is already on the
row.

```ts
// apps/app/src/features/alerts/lib/urgency.ts  (NET-NEW, pure, unit-testable)
export type DeadlineProximity = 'overdue' | 'imminent' | 'soon' | 'scheduled' | 'none'

export function deadlineProximity(
  actionDeadlineIso: string | null,
  nowMs: number,
): { proximity: DeadlineProximity; days: number | null } {
  if (!actionDeadlineIso) return { proximity: 'none', days: null }
  const days = Math.ceil((new Date(actionDeadlineIso).getTime() - nowMs) / 86_400_000)
  if (days < 0) return { proximity: 'overdue', days }
  if (days <= 3) return { proximity: 'imminent', days } // ≤ 3 days
  if (days <= 14) return { proximity: 'soon', days } // ≤ 2 weeks
  return { proximity: 'scheduled', days } // further out
}
```

Thresholds (3 / 14) are a starting point — tune against real data. Keep `nowMs`
injected (not `Date.now()` inside) so it's testable and matches the existing
horizon filter at AlertsListPage.tsx:1327.

### Layer 2 — Smart-priority tier (existing, stays an enhancement)

The current `priorityById` tier + reasons inset stays exactly as-is for firms
with `canViewPriorityQueue`. It is strictly _richer_ than Layer 1 (it weighs
needs-review, confidence, impact, preparer-requested). When present it **wins**
the leading pill; Layer 1 fills in when it's absent.

```
effectiveTier(alert) =
  priorityById.get(alert.id)?.level            // Layer 2 if present
  ?? proximityToTier(deadlineProximity(alert.actionDeadline, now))  // Layer 1 fallback
```

where `proximityToTier`: `overdue|imminent → urgent`, `soon → high`, else `normal`.

This means: **no firm sees a flat list**, and firms with the smart queue keep
the better signal. One pill, one source of truth per row, no double-cueing.

## List-row visual treatment (per the red-restraint rule)

One urgent cue per row — do not stack a red pill _and_ red text _and_ a red bar.
Reuse the existing `LEVEL_PILL` styling; add only a quiet **time tag** so the
"why" of a baseline-urgent row is legible without the priority inset:

- `imminent` / `overdue`: existing URGENT pill (destructive red) **+** a small
  mono time tag `3d left` / `2d overdue` in `text-destructive`, sitting in the
  bottom meta strip (not the title). Pill OR tag carries the red — they're the
  same signal, so this is one cue expressed twice positionally, acceptable; if
  it reads as double, drop the tag's color and keep it neutral mono.
- `soon`: HIGH pill (amber-free, per existing LEVEL_PILL `high`) + neutral mono
  `9d left`.
- `scheduled` / `none`: no pill, no tag. Silence is the signal.

The time tag is `font-mono` (it's a number/duration — passes the mono-restraint
rule). Never put it in the title row.

## Optional Layer-2 promotion (separate, larger, do NOT bundle)

If product later wants the smart tier ungated, promote `level` + `priorityScore`
onto `PulseAlertPublicSchema` and set it in `toAlertPublic` from the stored
`pulsePriorityReview` row, retiring the second query. This has **permission
implications** (the score currently signals firm-internal triage and is
deliberately gated) — treat as its own decision, not part of this baseline.

## Phased build plan

1. **Layer 1 lib + tests** — `lib/urgency.ts` (`deadlineProximity`,
   `proximityToTier`, `effectiveTier`) + a small unit spec. No UI yet. Pure,
   safe, mergeable alone.
2. **Wire `effectiveTier` into the row** — replace the
   `priority ? LEVEL_PILL[priority.level] : null` selection with
   `effectiveTier(alert)`, passing `now` down from the page. Keep the existing
   inset untouched. Verify a no-permission firm now shows pills.
3. **Time tag in the meta strip** — add the mono `Nd left` tag per the treatment
   above; A/B the colored-vs-neutral imminent tag against the red-restraint rule
   live at ~1465px.
4. **Tune thresholds** against real `actionDeadline` distribution; consider
   moving the proximity calc server-side onto the row only if the client calc
   proves hot (it won't — it's O(rows)).

## Guardrails

- **Do not fake urgency off cache/availability.** Tier must come from
  `actionDeadline` (real field) or the real `priorityById`, never "is priority
  data loaded yet."
- **One cue per row** (red-restraint memo). Pill and time tag are the _same_
  signal — if they read as two, neutralize the tag.
- `now` is injected, never `Date.now()` inline — keeps it testable and
  consistent with AlertsListPage.tsx:1327.
- Layer 2 stays gated. This brief does **not** ungate the smart score.
