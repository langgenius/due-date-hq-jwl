# Alert detail variants — affected-clients table → Pencil KwfpP

_2026-06-15_

First piece of the alert-detail variant pass (new Pencil refs KwfpP /
c5ArV1 / gsl8K). The detail panel is already generic, so the source-status
(c5ArV1) and low-confidence-scope (gsl8K) variants render in the MASYz
structure; the concrete gap was the affected-clients table.

## What

`AffectedClientsTable` restructured to the KwfpP columns:
**Client · Entity · Location · Current → New · Match** (apply variant).

- **Entity** (new) — humanized `entityType` (LLC / S-corp / Sole prop / …)
  via a label map; the contract already carries `entityType`.
- **Location** (new) — `state · county` (was tucked under the client name).
- **Current → New** — the old/new dates collapse into one arrow column
  (struck current → live new) instead of two separate columns.
- **Form** column dropped — the alert already names the form; KwfpP omits it.
- Dates now use `formatDatePretty` ("Jun 2") not `formatDate` (raw ISO — that
  helper is for machine/sort use).
- Footer wording → "View all N affected clients" (KwfpP).
- The `review` variant inherits Client · Entity · Location (no date/apply
  columns).

Verified live on the deadline-shift alert: columns + formatted dates render.

## Also this session (feedback batches, same surface)

- Detail: white fact/source-meta grids, typographic quote mark, bigger
  section gaps, eyebrow spacing, collapsing top-bar title on scroll.
- List: plain (non-badge) Review count, unified pill/state-badge height,
  redesigned day-band date, width parity with /deadlines, dimmed unselected
  rail items.

## Next in the variant pass

- Per-variant polish: source-status (c5ArV1) "rules to re-verify" + primary
  action; low-confidence (gsl8K) banner prominence.
- Complete the three Pencil mocks in the .pen file.
