# 2026-06-08 — Calendar sync 500 fix (demo-seed invalid UUID)

## Symptom

Page feedback: "Calendar sync does not work." On /deadlines, the Calendar
sync popover's RPCs (`calendar.listSubscriptions`, `upsertSubscription`,
`regenerateSubscription`) all returned **500 "Output validation failed"**.

## Root cause

The calendar feature is fine — the **demo seed** generated malformed UUIDs.
The `calendar_subscription` seed row used `sid('681', i, 1)`, a **3-char**
id prefix. `uuid(prefix, seq)` builds `${prefix}000000-0000-4000-8000-…`, so
a 3-char prefix overflows the first UUID group to **9 chars**
(`681000000-0000-4000-8000-…`). `CalendarSubscriptionPublicSchema.id` is
`z.uuid()`, which rejects the 9-char group → output validation throws on
every calendar.\* read. (Every other entity uses a 2-char prefix → valid
8-char group. `upsert` uses `crypto.randomUUID()`, but when the seeded "my"
row already exists it updates+returns that row, so it 500'd too.)

## Fix (3 layers, all consistent)

- **Generator** `packages/db/seed/generate-demo.ts`: `sid('681', …)` →
  `sid('71', …)` (unused 2-char prefix → `71000000-…`, valid).
- **Committed artifact** `mock/demo.sql`: replaced `681000000-` →
  `71000000-` on the 5 calendar_subscription rows (matches the regenerated
  generator output exactly; no other table uses that id).
- **Live local D1** (worktree preview): `UPDATE calendar_subscription SET id
= '71000000' || substr(id, 10) WHERE id LIKE '681000000-%'`.

## Verify

- `calendar.listSubscriptions` now returns **200** with a valid `feedUrl`
  (`http://localhost:8787/api/ics/<token>.ics`).
- The Calendar sync popover shows the working state (feed URL input + Copy
  URL + Regenerate) instead of erroring.
- No frontend change — the button stays; it just works now.
