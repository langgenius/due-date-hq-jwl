# Dashboard — typography token bump (28 / 18 / 14 / 13)

Branch: `design/preview-integration` (continuing 2026-05-20 polish).

## Why

Designer feedback on the previous typography pass: "I am finding it
really hard to read." The size ladder I shipped was too flat —
section headers (20px) sat too close to the page title (24px), and
row bodies (12-13px) made the action queue strain to scan.

Designer specified two concrete token changes:

- `--text-xl: 20px → 18px` — section labels feel like labels, not
  competing headers.
- `--text-2xl: 24px → 28px` — the page title and the KPI numerals
  land hard; the eye gets one clear anchor per surface.

The 28 / 18 gap is intentional: ten pixels of difference is enough
that the eye stops conflating "Today" with "Pulse alerts".

## Changes

### Token bump

`packages/ui/src/styles/tokens/primitives.css`

```diff
- --text-xl: 20px;
- --text-2xl: 24px;
+ --text-xl: 18px;
+ --text-2xl: 28px;
```

These are primitive tokens — the change cascades to every callsite
of `text-xl` / `text-2xl`. Audited the 22 files using these classes
to confirm no surface needs an exception.

### Dashboard text bumps (readability)

The body and chip sizes weren't moving with the tokens — they're
classes like `text-sm` / `text-base` that the local primitives
override to 12px / 13px. To make the dashboard more readable I bumped
specific surfaces:

| Surface                 | Before             | After              |
| ----------------------- | ------------------ | ------------------ |
| Action row client name  | `text-base` (13px) | `text-md` (14px)   |
| Action row task prompt  | `text-sm` (12px)   | `text-base` (13px) |
| Penalty / date pills    | `h-7 text-sm`      | `h-8 text-md`      |
| Expanded detail panel   | `text-sm`          | `text-base`        |
| Section nav links       | `text-sm`          | `text-base`        |
| Source warning banner   | `text-sm`          | `text-base`        |
| Pulse card source       | `text-sm`          | `text-base`        |
| Pulse card title        | `text-base`        | `text-md`          |
| Pulse card client chips | `text-sm`          | `text-base`        |
| Exposure tile label     | `text-sm`          | `text-base`        |

Vertical breathing room: action row `py-3 → py-3.5`.

### No double arrows

When two `↗` icons sit in the same visual cluster — e.g. a `View all`
nav link next to a `Review` primary button — the page reads as
duplicate chrome. Adopted the rule **filled/primary buttons take no
arrow** (the button itself signals action); text-link nav (`View all`,
`Open full queue`) carries the single arrow.

Applied to:

- `needs-attention-section.tsx` Review button: dropped `ArrowUpRightIcon`.
- `actions-list.tsx` expanded "Open in Obligations" button: dropped
  `ArrowUpRightIcon`.

### Page H1 line-height

`apps/app/src/routes/dashboard.tsx` H1 was `leading-7` (28px) —
identical to the new font-size after the token bump, so the line
sits with no room to breathe. Switched to `leading-tight` (1.25) so
the 28px H1 gets a 35px line-box.

### DESIGN.md

- Size ladder table now carries pixel values alongside Tailwind class
  names so future readers don't have to grep the primitives file.
- Added a `Don't` entry: never stack two `↗` arrows in the same
  visual area. Documented the button-no-arrow / link-arrow rule.

## Out of scope

- "Add deadline" CTA on the dashboard header — backend supports it
  (`obligations.createBatch` with `generationSource: 'manual'`) but
  there's no UI yet. Worth a dedicated dialog spec.
- Hover-popover preview on action rows (alternative to click-expand)
  — designer is open to it; not built this turn.
