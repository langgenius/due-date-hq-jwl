# Cursor affordance sweep — 2026-06-09

Product-wide pass assigning the correct mouse cursor to every interactive
element. Visual/affordance only — no contract, data, or behaviour changes
(className strings only).

## Why now

We're on **Tailwind CSS v4**. v4's Preflight dropped v3's `button { cursor:
pointer }` reset, so a raw `<button>` (and any Base UI primitive that renders
one — `Checkbox`, `Switch`, `Select.Trigger`, combobox triggers, etc.) now
shows the **default arrow** at rest instead of the hand pointer. The shared
`<Button>` already bakes `cursor-pointer`, but every hand-rolled `<button>`,
`role="button"`, and `onClick` div/row across the app was silently sitting on
the arrow cursor — a quiet but pervasive affordance regression.

## Convention applied

Canonical doc: [docs/Design/cursor-affordance-convention.md](../Design/cursor-affordance-convention.md).

- **Clickable that triggers an action** → `cursor-pointer` (raw `<button>`,
  `role="button"`, `onClick` on div/tr/li/span, base-ui triggers rendered as
  bare buttons, `<label>` wrapping a checkbox/radio).
- **Disabled** → `cursor-not-allowed` (rest-state pointer + `disabled:cursor-not-allowed`).
- **Informational tooltip trigger** → `cursor-help` (matches the existing
  PulseRelevanceMatrix / PulseAIBoundaryChip / AlertCard pattern).
- **Left untouched** (already correct): the shared `<Button>`, `<a href>` /
  `<Link>` (browser default), and the deliberate `cursor-default` /
  `cursor-text` / `cursor-help` call-sites.

## Highest-leverage fixes — shared primitives (`packages/ui`)

These propagate to every usage app-wide. Each rendered a Base UI `<button>`
that only set `disabled:cursor-not-allowed`, missing the rest-state pointer:

| Primitive         | Fix                                                                            |
| ----------------- | ------------------------------------------------------------------------------ |
| `checkbox.tsx`    | `cursor-pointer` on the Root box                                               |
| `switch.tsx`      | `cursor-pointer` on the Root track                                             |
| `select.tsx`      | `cursor-pointer` on `SelectTrigger`                                            |
| `combobox.tsx`    | `cursor-pointer` on the trigger button                                         |
| `text-link.tsx`   | `cursor-pointer` on `textLinkVariants` (canonical inline-link, ~58 call-sites) |
| `collapsible.tsx` | `cursor-pointer` merged onto `CollapsibleTrigger`                              |

(Already correct upstream and left alone: `Button`, `Tabs`/`TabsTrigger`,
`Segmented`, `DropdownMenu`/`Select`/`Command` items via `overlayRowClassName`,
`Card` interactive variant, `Sidebar` menu/trigger, `Table` rows at call-site.)

## App sweep

~130 cursor utilities added across ~60 files in `features/*`, `routes/*`,
`components/patterns`, and `components/primitives` — raw close/back/toggle/
expand/sort/peek buttons, segmented `role="radio"` toggles, custom Popover/
Dropdown triggers rendered as bare buttons, clickable rows/cards, and
checkbox/radio labels. Each feature area was swept independently; intentional
`cursor-default` (non-tappable rows) and `cursor-help` (tooltips) were preserved.

One correction: the "About Actions this week" Sparkles tooltip trigger in
`actions-list.tsx` carried `cursor-default` — switched to `cursor-help` to match
the product's info-tooltip convention.

## Verification

Live computed-`cursor` scan (`getComputedStyle`) across the major routes —
every `button`/`[role=button|checkbox|switch|tab|radio|combobox]` checked:

| Page           | Interactive elements | Wrong cursor |
| -------------- | -------------------- | ------------ |
| /alerts        | 60                   | 0            |
| /dashboard     | 35                   | 0            |
| /clients       | 59                   | 0            |
| /deadlines     | 151                  | 0            |
| /settings      | 20                   | 0            |
| /rules/library | 99                   | 0            |

424 interactive elements verified, 0 on the default arrow. `vp fmt` clean on
all touched files.

## Follow-up review pass

Closed the gaps from the first pass:

- **False-positive scan** (cursor-pointer _class_ on a non-interactive element
  with no clickable self/ancestor — ignoring CSS inheritance): 0 across every
  route and overlay.
- **Full route coverage** — added /clients/[id], /deadlines/calendar, /workload,
  /members, /billing, /notifications, /reminders, /audit on top of the original
  six. All 0/0 **except** /reminders, which surfaced one real gap (below).
- **Overlays opened + scanned**: alert detail (inline, 53 buttons), an open
  dropdown menu, and the CreateObligationDialog (selects/comboboxes/checkboxes
  in a modal) — all clean.
- **Tests**: `vp test run` over the edited areas — 51 files, 341 passed, 2
  skipped, 0 failures.

One real fix from this pass: `TaxCodeLabel` (`components/primitives/tax-code-label.tsx`)
rendered its info `TooltipTrigger` as a bare Base-UI `<button>` with no cursor in
the default (non-`asChild`) branch — only the inner label span had `cursor-help`,
so the trigger button itself sat on the arrow. Set the trigger to `cursor-help`
(matching its own `asChild` branch). Pre-existing, not a regression from this
sweep; propagates everywhere tax codes render with a tooltip.
