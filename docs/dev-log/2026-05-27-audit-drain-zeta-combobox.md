# 2026-05-27 — Audit drain (zeta combobox): `SearchableCombobox` + 3 adoptions

## Why

Step 6-cont + Step 8 independently surfaced four findings that share the
same shape — a `<DropdownMenu>` / free-form `<Input>` doing the work of a
long-list picker without typeahead:

- **Q3.4** (P2) — Export-dialog client picker (`routes/obligations.tsx`)
  scroll-hunts past every client when a practice has > ~15.
- **Q4.3** (P2) — Bulk Assign-owner toolbar dropdown
  (`routes/obligations.tsx`) lists members flat; with 50+ members the
  list scrolls.
- **R5.3** (P1) — New-rule modal Tax-type input
  (`routes/rules.library.tsx`) is a free-form `<Input>` —
  "Income tax" / "income" / "Income" become three distinct facet
  values that poison the rule library's filter.
- **F-CB01** (P1) — `ClientCombobox` had reinvented the Popover + cmdk
  recipe inline; F-CB02 (`timezone-select`) already converged on the
  same shape. Neither was a shared primitive.

The audit notes flagged this cluster as "needs new primitive." This pass
extracts the recipe (`SearchableCombobox`) and migrates 3 of the 4
sites; the fourth (Q4.3) is documented as deferred — its bulk-toolbar
trigger style doesn't fit the form-select shape the primitive ships
with, and shoving a `triggerVariant` into the API to land it cheaply
felt premature for a wave-2 drain.

## What shipped

### 1. `packages/ui/src/components/ui/combobox.tsx` — `SearchableCombobox` primitive

Single-select searchable combobox built on the existing
`Popover` + `Command` (cmdk) primitives. Mirrors the recipe Yuqi
already shipped in `ClientCombobox` and `timezone-select`, exposed as
a small reusable surface:

```ts
<SearchableCombobox
  value={value}
  onValueChange={set}
  options={options}            // {value, label, keywords?, meta?, disabled?}
  placeholder="Select client"
  searchPlaceholder="Search clients…"
  emptyState={<Trans>No match.</Trans>}
  groupHeading="Existing"      // optional
  loading={query.isLoading}    // optional, gates the empty-state copy
  loadingState={<Trans>Loading…</Trans>}
  popoverMaxHeight={280}       // defaults to 280 to fit inside dialogs
  renderTrigger={(selected) => /* custom inner-button label */}
/>
```

API decisions (documented in the file header):

- Single-select only. Multi-select needs a different selection model;
  deferred until a real surface asks for it.
- Sync `options` only. Callers own data fetching — the primitive
  doesn't try to wrap `useQuery`. `ClientCombobox` is the example
  adapter (firm-scoped query → option list).
- `keywords` per option lets the cmdk filter match on EIN/state/raw
  snake_case codes without leaking those into the visible label.
- `popoverMaxHeight` defaults to 280px (Yuqi Today #30 cap) so any
  embed inside a dialog won't outgrow its parent.
- Strict-optional-aware (`exactOptionalPropertyTypes: true`) — never
  forwards literal `undefined` to cmdk / Base UI.

Test: `apps/app/src/components/searchable-combobox.test.tsx` — 5
jsdom checks covering trigger render (placeholder vs selected,
muted color, `renderTrigger` override, ARIA exposure, disabled).

### 2. Q3.4 — Export-dialog client picker now searchable

`routes/obligations.tsx`. Was a `DropdownMenuRadioGroup`
listing every facet client flat. Replaced with `SearchableCombobox`
backed by an adapter (`exportClientComboboxOptions`) that folds
`state` into row meta and `[state, county]` into search keywords
so partial typing ("CA", "Marin") still surfaces the client.

### 3. R5.3 — New-rule Tax-type field now picks from canonical codes

`routes/rules.library.tsx`. Was an `<Input placeholder="e.g. income,
sales, payroll">` — three users typed three variants of the same
concept, creating noisy facet values downstream.

The fix curates `COMMON_TAX_TYPE_CODES_BY_JURISDICTION` (a per-
jurisdiction subset of `lib/tax-codes`'s `TAX_CODES` table) and
feeds it to `SearchableCombobox`. The user-facing label uses
`formatTaxCode`; the raw snake_case shows as tertiary meta + as a
keyword so a CPA who already knows "1120s" still narrows quickly.

The list is curated rather than pulled wholesale from `TAX_CODES`
because (a) `tax-codes.ts` isn't owned by this agent and (b) the
full table includes duplicate-label codes (e.g. `ca_100` /
`ca_100_franchise`) that would clutter the picker. A v2 pass can
expose `TAX_CODES` keys via a helper export from `tax-codes.ts`.

A "create new tax type" affordance is intentionally not added in
this iteration — the SearchableCombobox shape is single-select-from-
list. When a fresh code is needed we'll layer a `+ Add custom` row
behind the empty state.

### 4. F-CB01 — `ClientCombobox` refactored onto the primitive

`apps/app/src/features/clients/ClientCombobox.tsx`. The component
dropped from 178 lines of inline Popover/cmdk wiring to ~90 lines
that own the firm-clients query + the option-shape adapter. All
the trigger and popover styling moved into the primitive.

Behavior preserved:

- 280px popover cap (Yuqi Today #30) — passed via `popoverMaxHeight`.
- Single-line row with name + state·entity meta + check icon.
- Search matches on name + state + EIN — folded into `keywords`.
- "Loading clients…" empty-state copy gated on `clientsQuery.isLoading`
  + `options.length === 0`.

One small behavior shift: the original gated the query on `open ||
value !== null` so a closed-and-empty combobox never fetched. The
refactor fetches once on mount (unless `disabled`), trading a single
`listByFirm` roundtrip for losing one stateful hook + matching the
shape of the primitive. The mutation is `limit: 500`, cached in
TanStack Query — the impact is one extra cache fill per page that
mounts the picker.

## What was deferred (and why)

- **Q4.3 — Bulk Assign-owner toolbar dropdown.** The trigger is a
  ghost `<Button size="sm">` inside the `FloatingActionBar`, not a
  form-select. Retrofitting the primitive to support a button-style
  trigger would either bloat the API with a `triggerVariant` enum
  or force the caller to disable the primitive's built-in trigger
  and pass a fully-custom one — both feel premature for a wave-2
  drain. Carrying it as **deferred to a v2 pass once a second
  bulk-toolbar picker surfaces**; the primitive will gain a `menu`
  trigger variant when there are two consumers.
- **F-CB02 — `timezone-select` (firm).** Already a searchable
  Popover + cmdk implementation. Could be migrated to the
  primitive but would only delete ~30 lines; the behavior is
  identical. Scheduled for a follow-up cleanup pass where multiple
  consumers move at once.
- **F-HF02 — Popover search input clear-X.** Out of scope for the
  primitive extraction; cmdk's `<CommandInput>` doesn't expose a
  clear affordance and adding one belongs in `command.tsx`, which
  isn't on the owned list for this agent.

## Verification

- `pnpm exec tsc --noEmit` — clean from `apps/app`.
- `pnpm test --run` — 391/391 pass.
- `pnpm i18n:extract` then `pnpm i18n:compile --strict` — strict pass;
  5 new zh-CN msgids translated.

## Files changed

- `packages/ui/src/components/ui/combobox.tsx` (NEW, ~250 lines)
- `apps/app/src/components/searchable-combobox.test.tsx` (NEW, ~160 lines)
- `apps/app/src/routes/obligations.tsx` (Q3.4 adoption)
- `apps/app/src/routes/rules.library.tsx` (R5.3 adoption + curated tax-type lookup)
- `apps/app/src/features/clients/ClientCombobox.tsx` (F-CB01 refactor)
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.{po,ts}` (5 new msgids)

## Findings status

| ID     | Status                              |
| ------ | ----------------------------------- |
| Q3.4   | Shipped (SearchableCombobox)        |
| Q4.3   | Deferred (needs menu-trigger variant) |
| R5.3   | Shipped (canonical-code picker)     |
| F-CB01 | Shipped (primitive + refactor)      |
| F-CB02 | Verified pre-existing (no work)     |
| F-HF02 | Out of scope                        |
