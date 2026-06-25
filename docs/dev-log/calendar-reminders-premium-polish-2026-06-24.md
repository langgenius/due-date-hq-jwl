# Calendar + Reminders — premium integration cards + honest delivery summary

**Date:** 2026-06-24  
**Files:** `apps/app/src/features/calendar/calendar-page.tsx`, `apps/app/src/features/reminders/reminders-page.tsx`

## What changed

### /calendar — `calendar-page.tsx`

**Connected badge (line ~485):**  
Replaced the `variant="default"` (blue) "Active" badge with `variant="success"` + `CheckCircle2Icon` + "Connected". The badge now reads as a calm success signal when a feed is subscribed, neutral outline when not. `CheckCircle2Icon` imported from lucide.

**Date values no longer monospace (line ~671):**  
`IntegrationKeyValueRow` value span dropped `font-mono text-xs` — dates like "May 20, 2026, 4:00 AM CDT" are human-readable text, not machine output. Now renders as plain `text-sm text-text-secondary`.

**"How to subscribe" card (bottom) — branded provider notes:**  
Replaced the three single-line `IntegrationNote` items (all sharing a generic `CalendarDaysIcon`) with a new `IntegrationNote` component that renders:

- A `ProviderMark` glyph distinct per provider: Google = 4-dot colour-quadrant grid, Apple = solid circle with clip-path, Outlook = "O" lettermark in accent colour
- A numbered 3-step instruction list in `text-xs text-text-secondary`
- A subtle `rounded-lg border border-divider-subtle p-3` card wrapper (no raw hex, canonical radius 8)

Card title changed from "Subscription notes" to "How to subscribe". Description updated to be actionable.

### /reminders — `reminders-page.tsx`

**Delivery summary band (new `DeliverySummaryBand` component):**  
Rendered above the recent-sends table when `reminders.length > 0`. Counts derived entirely from the loaded `ReminderRecentSend[]` array:

- `sentCount` — `deliveryStatus === 'sent'` count (real field on `ReminderRecentSend`)
- `failedCount` — `deliveryStatus === 'failed'` count (real field on `ReminderRecentSend`)

Layout: `bg-background-subtle rounded-lg border` band with `CheckCircle2Icon` (green) for sent, `XCircleIcon` (red) for failed. Failed count only shows in red when `failedCount > 0`; otherwise shows calm "no failures" in tertiary. "Last 20 reminders" qualifier is honest — matches the query `limit: 20`.

No fabricated delivery rates, no sparklines, no external data shape referenced.

**Template status badges (line ~296):**  
Added `BadgeStatusDot` inside the Active/Paused badges — `tone="success"` for active, `tone="disabled"` for paused. Makes the state more visually distinct at scan speed.

**Dialog Subject/Body → `Field`/`FieldLabel` (line ~471):**  
Replaced hand-rolled `<label className="grid gap-2 text-sm"><span className="font-medium">` wrappers with canonical `<Field>` + `<FieldLabel htmlFor="...">` primitives. IDs wired: `reminder-template-subject` and `reminder-template-body`. Matches the active-toggle `Field` already in the dialog.

**Skeleton shape:**  
`RecentSendsPanel` loading skeleton height bumped from `h-12` to `h-[52px]` to match real row height (name + sub-text + potential failure-reason row).

## Data grounding

| Summary number      | Source field                                     | Real? |
| ------------------- | ------------------------------------------------ | ----- |
| Sent count          | `ReminderRecentSend.deliveryStatus === 'sent'`   | Yes   |
| Failed count        | `ReminderRecentSend.deliveryStatus === 'failed'` | Yes   |
| "Last 20" qualifier | `listRecentSends({ limit: 20 })` query param     | Yes   |

## No fiction added

- No delivery rate % (would require total-ever count, not loaded)
- No sparkline (no time-series data in the loaded set)
- No email preview content

## DEFERRED

- Distinct Google/Apple/Outlook SVG brand assets — current treatment uses token-only CSS shapes as placeholders; real SVG marks would require a new icon-set entry or a brand-assets package
- Apple `ProviderMark` clip-path approximation is functional but not a literal apple silhouette
