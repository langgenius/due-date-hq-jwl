# Form-control radius cohesion → rounded-xl

_2026-06-18 · design-call #5 of the pass-2 backlog_

After the height fix (h-9) earlier today, the editable controls were cohesive
among themselves at `rounded-lg` (8px) — but Button is `rounded-2xl` (16px, the
2026-06-16 "bigger rounded corners" change), so a button beside an input in a
form had a jarring 8-vs-16 corner mismatch. The §4.8 radius doc was also stale
(still showed the pre-2026-06-16 `rounded-[10px]`/`rounded-lg` button values).

## Decision (Yuqi)

Bump the editable controls up to `rounded-xl` (12px) — a softer corner family
much closer to the buttons (and already matching `FilterTrigger`, which was
h-9 rounded-xl).

## What changed

- `Input`, `Textarea`, `SelectTrigger`, `Combobox` trigger, `IsoDatePicker`
  trigger: `rounded-lg` → `rounded-xl`. (SearchInput wraps `Input`, so it
  follows for free.) Popups — SelectContent, Combobox list, the calendar day
  cell — keep their own radius; only the form-field trigger changed.
- §4.8 doc: corrected the stale Button radius table to the shipped
  `rounded-xl`/`rounded-2xl` values, and added a Form-control radius note
  (controls = h-9 rounded-xl; popups unchanged).

## Verification

- `tsgo` 0; 543 app tests pass; build green.
- **Live (/preview gallery):** Input / Select / Textarea computed
  `border-radius` = **12px** (rounded-xl), up from 8px.
