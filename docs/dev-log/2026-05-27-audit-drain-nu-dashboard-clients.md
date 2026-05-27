# 2026-05-27 — Audit drain (Agent ν): dashboard + clients

Wave-2 mechanical drain pass on the dashboard, clients list, client
detail, and the ClientDetailDrawer peek. Owns:

- `apps/app/src/routes/dashboard.tsx`
- `apps/app/src/features/dashboard/*`
- `apps/app/src/routes/clients.tsx`
- `apps/app/src/routes/clients.$clientId.tsx`
- `apps/app/src/features/clients/CreateClientDialog.tsx`
- `apps/app/src/features/clients/ClientDetailDrawer.tsx`

ClientFactsWorkspace (5K LOC) intentionally not walked line-by-line —
the candidate list (#66) was a `memo` wrap that needs deeper stable-
reference analysis than the drain budget allows. Skipped.

## Shipped (12)

### Dashboard (routes/dashboard.tsx + features/dashboard/\*)

- **#31** — `Today` date pill used to disappear entirely while the
  dashboard query was in flight. Header read as "Today" with no
  anchor for several hundred ms while data hydrated. Added a
  `loading…` italic pill so the slot stays visually claimed and the
  user doesn't see a reflow when the real date arrives.
- **#37** — Exposure summary strip (`In review` / `Blocked` /
  `Waiting on client`) used to render nothing when all three counts
  were zero. Same shape as the `isLoading` skeleton above — caller
  couldn't tell "still fetching" from "all clear." Now renders a
  single `0 — All caught up` tile in the empty case so the slot
  affirmatively says "yes, this is empty on purpose." Routes to
  `/deadlines` so the user can still verify.
- **#38** — `ActionsSummaryTile` value used the same
  `text-lg font-medium` for `neutral` and `critical` tones, only the
  color flipped. At parity weight the destructive color alone
  didn't carry — eye scanned past "12 Blocked" the same as "47 In
  review". Bumped critical to `font-semibold` so weight + color
  reinforce each other on the one tile that earns the urgency.

### Clients list (routes/clients.tsx)

- **#62** — Title chip rendered `clients.length` (total) regardless of
  whether any filter was active. Misleading when 8 of 47 rows were
  visible. Now shows `N of M` when filtered, falls back to plain `M`
  when the filtered length equals the total. New msgid `{0} of {1}`.
- **#63** — `Import history` button had both `aria-label="Import
history"` AND `title="Import history"` set to the same string,
  duplicated against the visible "Import history" label. The
  redundant `title` was just a hover-tooltip of the visible text.
  Dropped the `title`; `aria-label` stays for future icon-only
  variants.

### Client detail (routes/clients.$clientId.tsx)

- **#68** — "Client not found" state used to offer only
  `Back to clients` — a one-way exit. Transient absences (stale
  cache, network blip) forced the user to navigate away and back
  to retry. Added `Try again` button (outline variant) that re-
  runs both the slug-lookup and the `clients.get` query. Back-to-
  clients stays as navigational escape, demoted to `ghost` so
  Try-again reads as the primary affordance. New msgid `Try again`.
- **#71** — Loading skeleton was a generic 3-block stack
  (`h-8 w-64`, `h-40 w-full`, `h-64 w-full`) that matched no
  particular layout. Replaced with a domain-specific shape:
  title-line + caption-line + 3 chip placeholders + 3 summary
  tiles + body block. The user sees the eventual page outlined
  rather than a generic content placeholder.

### Create client dialog (features/clients/CreateClientDialog.tsx)

- **#73** — Copy was `Add a manual client record to the active
practice directory.` — formal phrasing ("manual record",
  "active practice directory") for a routine action. CPAs add
  clients often; the dialog should sound like the action.
  Rewrote as `Add a client to this practice.` New msgid.
- **#74** — EIN placeholder `12-3456789` read as a real-looking EIN
  (could be confused for a suggested value or the EIN already on
  file). Swapped trailing digits for Xs (`12-XXXXXXX`) so the
  placeholder reads as "format example", not "valid number."
- **#75** — State input had CSS uppercase but stored the raw
  unmodified value. If a user typed `ca` they saw `CA` (correct)
  but a copy-out, validation re-display, or non-CSS surface would
  expose the lowercase original. Uppercased the value on change so
  what-you-see matches what-you-store. (`submit` path was already
  uppercasing, but that's too late for in-flight UI.)
- **#77** — Cancel button used `variant="outline"` — same weight as
  the primary `Create client`. Wave-1 X1 sweep landed the canonical
  "dialog Cancel uses ghost" pattern. Realigned: Cancel now `ghost`
  so Create stays the eye anchor in the binary.
- **#80** — Notes textarea has a 5000-char schema ceiling but didn't
  surface the count anywhere — users typing a long note had no
  signal until submit returned a validation error. Added an inline
  counter next to the label (`{noteLength} / 5000`) that appears
  once the user starts typing and flips to destructive tone over the
  limit. Stays silent at zero so empty state isn't noisier than it
  needs to be. `aria-live="polite"` so AT users get the count as
  they go.

### Client detail drawer (features/clients/ClientDetailDrawer.tsx)

- **#84** — Loading state's `SheetTitle` was `sr-only` — AT users
  heard "Loading client…" but sighted users just saw three grey bars
  with no header label. Promoted the title to a visible heading
  (`text-lg font-semibold`); semantics unchanged for AT. Dropped one
  of the skeleton bars since the visible title already claims the
  vertical space.
- **#86** — Identity-chip row rendered `entity` as its first chip,
  even though the caption line directly above already said
  "S corp · 1 open deadline". Two surfaces of the same entity label
  at different scales read as duplicate metadata. Dropped the chip;
  `state` and `readiness` stay because they're unique signals not
  echoed elsewhere in the header.

## Skipped — rationale per finding

- **#30** — already shipped in a prior pass (see comment in
  `routes/dashboard.tsx:202`).
- **#32** — already shipped (see comment in `routes/dashboard.tsx:169`).
- **#33** — copy research, not a mechanical fix.
- **#34** — Review button mount-on-expand is intentional (comment
  in `actions-list.tsx:277` explains the fix for the layout-collapse
  bug). Acceptable.
- **#35** — `role="button"` on the row + panel `<div>`s is
  deliberate, documented at `actions-list.tsx:308-311`. Switching
  to real `<button>` would break the tooltip-trigger usage inside
  the panel.
- **#39** — `All deadlines` link hover (`muted → tertiary`) matches
  the canonical pattern used by `View all alerts` link in the
  parallel `needs-attention-section.tsx`. Both consistent.
- **#40** — date-handling skip per brief; would need a careful test.
- **#41** — `Alerts` section pulls a flat 50-row history with no
  time-window filter; the heading would be misleading if it claimed
  one. Section is not actually bounded by a window today, so the
  "last 7 days" suffix would be wrong copy.
- **#42** — informational, no P0/P1 to act on.
- **#43** — already shipped (see comment in
  `needs-attention-section.tsx:192`).
- **#44** — already handled at `needs-attention-section.tsx:221`
  (loading branch emits its own neutral copy).
- **#64** — already shipped in
  `routes/clients.tsx:404`.
- **#65** — design call (split-button vs separate). Skipped.
- **#66** — `ClientFactsWorkspace` `memo` wrap on a 5K-LOC component
  with many prop closures needs stable-reference audit at the
  callsite before it's safe to ship as mechanical. Out of scope for
  this drain.
- **#67** — `replace` history on filter URLs is the canonical pattern
  across the app (dashboard, deadlines, audit). Switching just
  /clients to `push` would diverge from the family. Skipped.
- **#69**, **#70**, **#82**, **#85** — acceptable per brief.
- **#72** — needs server work (uniqueness check).
- **#76** — needs product call.
- **#78** — already shipped (see comment in
  `CreateClientDialog.tsx:513`).
- **#79** — defensive; current behavior fine.
- **#81** — already shipped (see comment in
  `CreateClientDialog.tsx:273`).
- **#83** — `NextDueLine` `Date.now()` would need `asOfDate` plumbed
  through the drawer — drawer doesn't accept it today. Punted.
- **#87** — `SheetContent` renders an automatic close button via
  `showCloseButton` (default `true`). No work needed — see
  `packages/ui/src/components/ui/sheet.tsx:75-83`.

## Translations

4 new msgids: `{0} of {1}`, `Add a client to this practice.`,
`loading…`, `Try again`. CPA-vocab adherence: 客户=client,
事务所=practice.

## Workflow checks

- `cd apps/app && pnpm exec tsc --noEmit` — clean.
- `cd apps/app && pnpm i18n:extract` — 4 new msgids surfaced,
  all translated.
- `cd apps/app && pnpm i18n:compile --strict` — passed.
