# Dev log — unify table design across Today / Alerts / Deadlines (2026-06-09)

Yuqi feedback (/deadlines): "unify the table design across Today, Alerts and
Deadlines. same border, same rounded corners, same header row height, same
header row text size and colour, and style."

The three tables had drifted:

- **Today** (`features/dashboard/actions-list.tsx`) + **Deadlines**
  (`routes/obligations.tsx`): wrapper `rounded-[14px]` + `border-divider-subtle`.
- **Alerts** (`features/alerts/components/PulseAlertRow.tsx`): `rounded-[12px]`
  - `border-divider-regular` — already the canonical card per
    `docs/Design/table-canonical-style.md`.

`rounded-[14px]` also violates the fixed corner-radius scale (12 wrapper / 8 /
4 / 999 / 0 — 14 is freelance).

## Changes (brought Today + Deadlines back to the canonical)

**Wrapper** → `overflow-hidden rounded-[12px] border border-divider-regular
bg-background-default` on all three (Alerts unchanged).

- Today: 14→12, subtle→regular.
- Deadlines: 14→12, subtle→regular; `<th>` first/last corner radii 14→12. The
  bordered card now applies in **both** modes (was panel-open only, full-page
  was frameless). Done safely: `overflow-hidden` + `flex-1` stay gated to
  panel-open, so the full-page **sticky column header still pins to the page**
  and the content-sized card never leaves a tall empty rectangle on short sets.

**Group-band header rows** → canonical eyebrow `bg-background-subtle` +
`text-[11px] font-semibold tracking-[0.5px] text-text-tertiary uppercase`,
matching the Alerts day-band:

- Today status band ("NOT STARTED" / "IN REVIEW"): `text-secondary` →
  `text-tertiary`, `py-1` → `py-1.5`.
- Deadlines group band ("OVERDUE" / "THIS WEEK"): label `text-xs` primary
  tracking-wide → `text-[11px]` tertiary tracking-[0.5px]; cell `py-2` →
  `py-1.5`. The leading tone dot (red/amber) + count still carry urgency.

The Deadlines column-label header (`FORM`, `CLIENT`, `JURISDICTION`, …) was
already canonical (11px/600/uppercase/tertiary on `bg-background-section`).

No new design decision — this enforces the existing
`docs/Design/table-canonical-style.md` (12px / divider-regular), so the doc
needs no update; the surfaces are now back in compliance.

Verified live (dev preview): all three render, no Vite/console errors, deadlines
sticky header preserved.
