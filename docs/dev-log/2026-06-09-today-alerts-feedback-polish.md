# Dev log — /today + /alerts feedback polish (2026-06-09)

Iterative page-feedback round across the dashboard (`/`) and the alerts surface
(`/alerts` list + detail drawer). All changes are UX polish + one structural
regroup; no contract or data changes. Verified live in the dev preview.

## Dashboard `/`

**Actions this week** (`features/dashboard/actions-list.tsx`)
- "Why now" reason line shows by **default**; only the leading corner glyph is
  hover-revealed. The glyph is `absolute`-positioned in the cell's left gutter
  so the prompt + reason lines stay **flush-left in both rest and hover** (no
  indent jitter when the icon appears).
- Review action dropped its dedicated trailing column. It's now an
  absolutely-positioned overlay anchored to the row's right edge, revealed on
  hover/focus, with a left-fading gradient mask (row hover tone) so it reads
  cleanly over the due-date cell without obscuring the action prompt. Divider
  `colSpan` 8→7.
- Section title "Actions this week" is now a link to the deadlines list (via
  `onOpenAll`); the redundant right-aligned "View all deadlines" link removed.

**Alert card** (`features/dashboard/needs-attention-card.tsx`)
- Confidence read-out (`conf N%`) + its separator: hidden at rest, fade in on
  card hover (opacity reserves width, tier color resolves on hover).
- Client avatars gated on real impact (`impacted > 0`), not just the presence of
  affected-client names.
- Change-kind label ("Deadline shifted", …): hidden at rest, fades in on hover
  and **stays muted gray** (no accent-tone switch).
- Removed the hover **border** — hover is carried by the background step alone.

**Alerts section** (`features/dashboard/needs-attention-section.tsx`)
- Section title "Alerts" links to `/alerts`; the right-aligned "View all" link
  removed (dropped now-unused `useNavigate` / `TextLink`).

**Monitoring chip** (`features/alerts/components/MonitoringChip.tsx`, shared)
- Label tone dropped to `text-muted` (applies to both /today + /alerts).

## /alerts list

**Toolbar** (`features/alerts/AlertsListPage.tsx`)
- Removed the sticky filter toolbar's bottom border (page-wash fill + padding
  carry the separation).

**Row** (`features/alerts/components/PulseAlertRow.tsx`)
- Day-divider date label stepped `text-secondary` → `text-tertiary` (lighter).
- Condensed the row's type system: dropped the lone 10px size and the `bold`
  weight tier (semibold is the heaviest), unified eyebrow tracking to `0.3px`,
  removed one-off `-0.1px`/`±0.2px` micro-trackings. Removed the redundant
  "· confirmed by N sources" head clause (the bottom confidence pill already
  carries the source count).

## /alerts detail drawer (`features/alerts/AlertDetailDrawer.tsx`)

- Header: light-gray fill (`bg-background-subtle`), **no** bottom border.
- Hero "Deadline change" card: light-gray fill, no border (matches its sibling).
- Footer action measure + top BackStrip: `mx-auto` centered to the 760px column.
- **Collapsing header on scroll**: past 16px the title drops 22→16px + clamps to
  one line, the summary dek hides, padding shrinks — reclaiming reading room.
- **Body regrouped** from a flat `divide-y` of ~14 mixed flat-sections + floating
  tinted boxes into **four white cards on a gray wash**, each with an eyebrow
  label: **The change · Affected clients · Source & confidence · Activity &
  notes**. Group 2 ("Affected clients") consolidates to a single `<h3>` header
  (carrying the count + selection summary); the inner overlay/review sections
  dropped their own headers to avoid a duplicate heading (the one remaining
  heading keeps the `getByRole('heading', {name:/Affected clients/})` E2E specs
  green). Group 2 is guarded so it never renders empty.
- Rounded-corner audit: normalized every freelance `rounded-md` (6px) in the
  drawer to the canonical scale — `rounded-lg` (8px) for box/button surfaces,
  `rounded-sm` (4px) for the kbd chips; group cards use the 12px wrapper radius.

## Notes
- The grouping went through one design fork: "white cards on gray wash, 4
  groups". Labels were first omitted then re-added at Yuqi's request.
- Canonical design record: `docs/Design/today-alerts-feedback-amendments-2026-06-09.md`.
