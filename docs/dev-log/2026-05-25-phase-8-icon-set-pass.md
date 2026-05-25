# 2026-05-25 — Phase 8: icon set pass + Actions row bug fix

## Why

Yuqi callouts on the Today + Deadlines surfaces:

- Today: replace the generic blue PulsingDot on the Pulse alert
  card with `lucide-Atom` (in accent blue) — reads specifically as
  "Pulse / AI signal" instead of "any indicator dot."
- Today: low-confidence chip icon swapped `AlertTriangle` → `Astroid`
  — matches the Atom family above, and a "warning triangle" was
  the wrong frame for "AI uncertainty" (it pretended low confidence
  is an error state).
- Today: "View N more →" overflow card recast as "+ N more" with a
  leading `lucide-Plus` — the arrow read like "go somewhere," but
  the click target opens the Pulse drawer in place. Plus is honest.
- Today: "Sorted by priority" caption next to the "Actions this
  week" h2 now carries a small `lucide-Info` icon with a title
  attribute explaining what Smart Priority is. Tells the reader
  the sort isn't arbitrary without expanding the visual weight.
- Today (bug): action row was rendering only the client name —
  prompt text invisible. Root cause: the Review button rendered
  always with `opacity-0` when collapsed, but still claimed
  ~100px of flex space, which on longer client names squeezed the
  `flex-1 truncate` prompt span down to nothing. Now the Review
  button only renders when expanded. Minor reflow on hover is a
  cleaner UX than a permanently-truncated prompt.
- Deadlines: "25 days late" badge now leads with `lucide-Info` (in
  the tinted text color) instead of a colored `BadgeStatusDot`.
  The dot collided visually with the Status pill in the next
  column (both were dot-led pills); the Info icon clusters as
  urgency context rather than a second status. Non-late states
  (future / today) keep the dot — tone is the only signal there.

## Shipped

`apps/app/src/features/dashboard/needs-attention-card.tsx`

- Imports: dropped `AlertTriangleIcon`, `ArrowRightIcon`,
  `PulsingDot`; added `Astroid`, `Atom`, `Plus`.
- Pulse identity mark: `<PulsingDot tone={tone} active ... />` →
  `<Atom className="size-4 text-state-accent-solid" ... />`.
- Confidence chip: `<AlertTriangleIcon className="size-3" />` →
  `<Astroid className="size-3" />`.
- Overflow card: `View {count} more →` →
  `<Plus className="size-3.5" /> {count} more`.

`apps/app/src/features/dashboard/actions-list.tsx`

- Imports: added `Info`.
- `SectionHeader`: added `<Info className="size-3" />` inside the
  "sorted by priority" caption span, with a `title` attribute
  explaining the priority formula.
- `ActionRow`: Review button now `{expanded ? <Button .../> : null}`
  instead of `opacity-0` rendering. Fixes the squeezed-prompt bug.

`apps/app/src/routes/obligations.tsx`

- Imports: added `Info`.
- `DueDaysPill`: late state leads with `<Info className="size-3" />`
  in the tinted text color; future / today state keeps the
  `BadgeStatusDot`.

## Verification

- `pnpm exec tsc --noEmit` (apps/app) clean
- `vp lint` 0/0 on the three changed files
- Lucide exports confirmed: `Atom`, `Astroid`, `Plus`, `Info` all
  ship in `lucide-react@1.14.0`.

## Closes Yuqi follow-ups

- Today: blue dot → Atom
- Today: AI confidence icon → Astroid
- Today: "View N more →" → "+ N more"
- Today: Info icon on "sorted by priority"
- Today: action prompt not rendering (bug)
- Deadlines: days-late badge icon → Info
