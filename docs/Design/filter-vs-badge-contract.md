# Filter vs Badge — visual contract

**Date:** 2026-05-22
**Status:** Authoritative for /clients/[id] today; sweep other surfaces
when they're touched next.
**Why this doc exists:** the two patterns kept blurring into each other
(notably the 3 "summary chips" on the Filing plan header that looked
filterable but were inert). One sentence per pattern:

| Pattern    | What it is                                                                                                       | Visual contract                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Badge**  | A static, read-only state indicator. Tells the user what something **is**. Never triggers anything when clicked. | Pill, no chevron, no hover-lift. Tone color carries semantic meaning.                                   |
| **Filter** | An interactive trigger that **narrows** a list or table to a subset. Tells the user what they can do.            | Pill **plus** `▾` chevron (or filled active state). Hover/focus ring. Opens a popover or toggles state. |

If a chip has a count number but no chevron, it's a badge. If it shows
a label and arrow, it's a filter trigger. Never style a badge to look
clickable, never style a filter without an affordance.

## Concrete rules

1. **Badges never carry a chevron-down icon.** That icon belongs to
   filters and switchers exclusively.
2. **Filters always carry a chevron-down icon** (or an obvious active
   state like a filled fill + `×` clear).
3. **Counts in a badge stay inert.** A standalone number like
   `[3 overdue]` is a badge. To make it a filter, wrap it with a
   chevron, hover ring, and a real popover.
4. **Color tone semantics differ.**
   - Badge tone = status: success / warning / destructive / info /
     secondary / outline.
   - Filter trigger = neutral by default. Active-state filter gets a
     pressed-state background (`bg-state-base-hover-alt`), not a tone
     color.
5. **Hover behavior differs.**
   - Badges have no hover state.
   - Filters have a clear hover (cursor-pointer + ring or underline).

## Where each lives today

### Badges (read-only state)

- `ClientFilingStateChips` — `[PA] [NJ] +2` in the title row.
  Communicates which states this client files in.
- `ObligationStatusReadBadge` — the status pill in a filing-plan row
  (read-only display of the obligation's lifecycle state).
- `ClientReadinessBadge` (in the table) — `Needs facts` / `Ready` chip.
- `Current tax year` chip in the Filing plan year section.
- Entity-type chip (`[C-CORP]`, `[LLC]`) in the title row.

### Filters (interactive narrowing)

- `TableHeaderMultiFilter` on every column header that filters its
  column (Entity, State, Owner, Status, Readiness, Source, Tier,
  Package). The trigger reads `Header label ▾`.
- `SurfaceSummaryStrip` chips on `/clients` action strip when they
  carry the `onClick` + `active` props (At risk / Waiting on client
  toggles). They look like badges but are wired to filter the
  underlying table, so the chevron / active-pill treatment makes the
  distinction clear.

## Anti-patterns we've now retired

| Where                                     | What it was                                                                                                                 | Why it was wrong                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Filing plan header                        | 3 chips `[{N} overdue] [{N} need review] [{N} payment-linked]` with `warning` / `outline` tones, no chevron, no click       | Looked clickable (tone change on non-zero count), but nothing happened on click. Tonality matched a filter, behavior matched a badge. |
| Year section header                       | `[Current tax year]` chip + counts pushed to the far right of the row via `ml-auto`                                         | Created a "content at two ends" visual that orphaned the year heading on wide screens.                                                |
| `ObligationStatusBadge` (local divergent) | Custom labels (`Complete` / `Needs review` / `Waiting`) different from queue's canonical labels (`Filed` / `In review` / …) | One status, two vocabularies. Replaced with canonical `ObligationStatusReadBadge` from `status-control.tsx`.                          |

## Implementation pattern for new filters

```tsx
<TableHeaderMultiFilter
  trigger="header"
  label={t`Status`}
  open={open}
  onOpenChange={setOpen}
  options={statusOptions}
  selected={selected}
  onSelectedChange={setSelected}
/>
```

## Implementation pattern for new badges

```tsx
<Badge variant="success">
  <BadgeStatusDot tone="success" />
  Active
</Badge>
```

## When in doubt

If you can answer "what does clicking this do?" without saying "it
opens a list of options to filter by" — it's a badge, drop any chevron
and any hover state. Otherwise it's a filter; give it a chevron and a
real trigger.
