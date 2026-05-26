# 87th pass · Layer C — interactive-primitive coverage

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Goal

Audit how well each interactive primitive in `@duedatehq/ui` is being
used across `apps/app`, then either (a) migrate clear ad-hoc parallels
to the primitive, or (b) document deferred patterns where the ad-hoc
shape encodes a design decision the primitive doesn't yet support.

## Coverage snapshot

Files in `apps/app/src` that import each primitive:

| Primitive    | Files importing |
| ------------ | --------------- |
| Button       | 60              |
| Badge        | 42              |
| Skeleton     | 29              |
| Alert        | 25              |
| Input        | 16              |
| DropdownMenu | 15              |
| Dialog       | 14              |
| Tooltip      | 13              |
| Table        | 13              |
| Popover      | 10              |
| Select       | 10              |
| Label        | 8               |
| Drawer/Sheet | 8               |
| Checkbox     | 7               |
| Tabs         | 2               |
| Switch       | 2               |

Ad-hoc parallels found across `apps/app/src/**/*.tsx`:

| Pattern                                               | Count |
| ----------------------------------------------------- | ----- |
| Raw `<table>` tags (would shadow the Table primitive) | **0** |
| Raw `<input>` tags                                    | 3     |
| `title="…"` HTML native tooltip                       | 6     |
| Raw `<button>` tags                                   | 108   |
| Badge-like spans (`rounded-full + px + text-xs`)      | 23    |
| Pill toggles (`rounded-full + border + px`)           | 9     |

### What the numbers say

**Table** has full coverage — zero raw `<table>` tags in product code.
This is the cleanest primitive boundary in the app.

**Input** has _effective_ coverage — only 3 raw `<input>` remain, and
all 3 are deliberate:

- `features/rules/coverage-tab.tsx:1576` and `:1733` — `type="checkbox"`
  with custom click-stop / key-stop behavior the Checkbox primitive
  doesn't expose.
- `features/migration/Step1Intake.tsx:539` — `type="file"` + `className="hidden"`,
  driven via a ref by a separate Button. Doesn't need primitive styling.

**Tooltip** primitive is preferred; remaining `title="…"` usages are
mostly icon-only buttons that get _both_ an `aria-label` and a `title`
as fallback for non-pointer users. Not drift.

**Raw `<button>` (108)** is the big number, but a deeper score-based
scan only found ~23 ad-hoc buttons that look like a Button-primitive
substitute. Most of those 23 are:

- **Combobox / select triggers** — chevron + value layout that needs
  full-width plus active-state handling the Button variants don't
  cover. Intentionally raw.
- **Card / row / tile** click targets — interactive surfaces that
  shouldn't look like buttons at all.
- **Toggle pills** — see below.

Two patterns are genuine drift and _should_ migrate; one extraction
ships in this pass.

## Layer C migrations shipped this pass

### C1 — `PulseConfidencePill` (extract two byte-identical inline pills)

**Before**: a 3-tone confidence pill (Low / Medium / High) was duplicated
across two Pulse surfaces:

- `apps/app/src/features/pulse/PulseDetailDrawer.tsx:638-647` —
  rendered Medium and High variants inline
- `apps/app/src/features/pulse/components/PulseAlertCard.tsx:537-552` —
  rendered all three variants inline

The Medium and High pills were _character-for-character identical_
between the two files.

**After**: single component at
`apps/app/src/features/pulse/components/PulseConfidencePill.tsx`
exporting `<PulseConfidencePill confidence="low" | "medium" | "high" />`.

- `PulseAlertCard` now: `<PulseConfidencePill confidence={lowConfidence ? 'low' : mediumConfidence ? 'medium' : 'high'} />`
- `PulseDetailDrawer` keeps its outer `!lowConfidence` gate (drawer
  context intentionally omits the Low variant) and calls
  `<PulseConfidencePill confidence={mediumConfidence ? 'medium' : 'high'} />` inside.

Visual: byte-identical to before. Pure deduplication.

## Deferred this pass

Documented now so the next pass has the inventory:

**C2 — Pill-toggle shape (`h-7 + rounded-full + border + px-3 + text-xs`)**

Three sites use a near-identical shape but with subtly different
palettes:

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx:4913` — chip toggle
- `apps/app/src/routes/obligations.tsx:10732` — chip toggle (uses
  template literal with active/inactive branches)
- `apps/app/src/routes/rules.library.tsx:1888` — chip toggle

These are all "click-to-toggle a filter" pills. Migrating to a single
`<ChipToggle>` primitive in `@duedatehq/ui` would unify hover/focus/
selected state across three of the app's biggest pages. Deferred
because (a) the three call-sites use slightly different palettes that
need a design call before the primitive's API is fixed, and (b)
shipping a new primitive belongs in a focused pass, not a sweep.

**C3 — Meta-label pill (`h-6 + rounded-full + border + bg-section + uppercase tracking-wide`)**

Five sites in Pulse + Client surfaces use the same "small uppercase
label pill" shape (the Medium-confidence pill was just two of them).
After C1, three remain:

- `features/clients/ClientFactsWorkspace.tsx:2661` — count badge
  ("9 warnings")
- `features/clients/ClientFactsWorkspace.tsx:5126` — sticky-status pill

Worth a Badge variant (`badge-meta` or similar). Deferred until the
ChipToggle work above; both should land together as a single
`Badge` variant pass.

**C4 — Combobox / select trigger shape**

8 sites all render the same `h-8/h-9 + w-full + border + chevron + bg`
trigger shape but each implements it raw:

- `components/primitives/iso-date-picker.tsx:164`
- `features/clients/ClientCombobox.tsx:76`
- `features/firm/timezone-select.tsx:67`
- `features/obligations/CreateObligationDialog.tsx:442` and `:603`
- `features/rules/generation-preview-tab.tsx:948`
- `routes/obligations.tsx:4033`, `:6650`, `:7314`

The `<Select>` primitive in `@duedatehq/ui` covers most of this, but
each call-site reaches for raw because they're paired with a
project-specific `Combobox` or `Popover` body. Worth a follow-up
exploring whether a `<TriggerShell>` primitive (just the shell, no
state machine) could be extracted from these 8.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app` (server's Cloudflare
  Workers-types errors remain pre-existing).
- C1 is a pure refactor; no visual diff possible.

## Cumulative tally (Layers A → C)

| Layer     | What snapped to a token / primitive | Sites                                 |
| --------- | ----------------------------------- | ------------------------------------- |
| A         | `tracking-eyebrow`                  | 33                                    |
| B1        | `disabled:opacity-50`               | 4                                     |
| B2        | `focus-visible:ring-…`              | 7                                     |
| C1        | `PulseConfidencePill` (extracted)   | 2 (5 pill blocks)                     |
| **Total** |                                     | **46 sites · 5 inline pills deduped** |
