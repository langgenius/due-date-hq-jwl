# /today + /alerts — feedback amendments (2026-06-09, canonical)

Canonical design decisions from the 2026-06-09 page-feedback rounds. Supersedes
the noted prior decisions; cross-reference `alert-card-design.md`,
`today-actions-table-style.md`, `section-header-style.md`.

## Reveal-on-hover rules (dashboard)

- **Actions row "Why now"**: the reason text is ALWAYS visible (primary triage
  signal). Only the leading corner glyph is hover-revealed, and it's positioned
  out of flow (absolute, in the cell's left gutter) so the prompt + reason lines
  are flush-left aligned in BOTH states — the icon never indents the text.
- **Alert card**: confidence read-out and change-kind label are HIDDEN at rest
  and revealed on hover; opacity (not display) reserves layout so the meta row
  never reflows. The change-kind label stays muted gray on hover (no accent
  switch). Client avatars render only when there is real client impact.
- **Alert card hover** = background step only. No hover border.

## Section titles are the navigation (dashboard)

Each /today section title is the link to its full surface, and the separate
right-aligned "View all" link is removed:
- "Alerts" → `/alerts`
- "Actions this week" → the deadlines list

The MonitoringChip label sits at `text-muted` (quiet ambient status, not a
second title). Shared component → /today and /alerts render identically.

## /alerts list row

- Day-divider date label = `text-tertiary` (lighter than the rows).
- Condensed type system — sizes {11, 12, 13, 15}px, weights {medium, semibold}
  (no `bold` tier), eyebrow tracking unified to `0.3px`. No redundant source-
  corroboration clause in the head (the bottom confidence pill carries it).
- Sticky filter toolbar has NO bottom border.

## /alerts detail drawer — surface + structure

This SUPERSEDES the earlier "flat calm-document / no card frames" model for the
ALERT detail pane (the deadline detail pane is unchanged — still flat on warm
gray; do not assume parity).

- **Surface**: gray-wash body (`bg-background-subtle`) + gray header (no bottom
  border) carrying **white group cards** (`rounded-[12px] border
  border-divider-subtle bg-background-default p-6`).
- **Four groups, each with an eyebrow `<h3>`** (11/600 uppercase tracking-[0.5px]
  tertiary): **The change · Affected clients · Source & confidence · Activity &
  notes**. Card boundaries + the eyebrow + inner sub-headers form a clean
  2-level hierarchy.
- "Affected clients" group: ONE `<h3>` header (count + selection summary); inner
  overlay/review tables carry no own header. Keep exactly one "Affected clients"
  heading for the E2E heading specs. The group is visibility-guarded
  (`showClientsGroup`) so it never renders empty.
- **Collapsing header**: the gray masthead shrinks on body scroll (title 22→16px
  + 1-line clamp, summary hidden, padding reduced) to free reading room.
- Header / body / footer / BackStrip all share a **760px centered** content
  measure (`mx-auto`), chrome spans full width.
- **Corners**: canonical scale only (12 wrapper / 8 box·button·table / 4 compact
  / 999 pill / 0 inner). No freelance `rounded-md` (6px) in the drawer.
