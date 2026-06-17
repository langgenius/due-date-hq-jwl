# Section-header style — the eyebrow + card-title system

Canonical reference for **how a page titles its sections**. Written 2026-06-09
after Yuqi settled the /today section titles on `text-text-primary` and asked to
cross-reference the treatment across pages (Today ↔ Alerts ↔ Alert detail ↔
Deadline detail).

There are **three** header registers. They are not interchangeable — pick by the
header's _job_, not by taste. Getting the register right is what makes the app
read as one product.

---

## Register A — Section title (region anchor)

The title that anchors a major region of a **dense overview** page. Reads as a
confident, scannable signpost. Often paired with a right-aligned
`<TextLink>View all</TextLink>`. **One chip max beside the title** (2026-06-12
critique: "Alerts · 4 · LIVE" was chip-soup — a count chip AND a status chip on
one h2). When a section has both, the status chip keeps the title slot and the
count folds into the right-aligned link ("View all 4") so the number keeps one
home without crowding the anchor.

```
text-region-title text-text-primary
```

`text-region-title` is a SEMANTIC TEXT TOKEN (tokens/primitives.css:
`--text-region-title` 18px + paired line-height 1.25 / weight 600 /
letter-spacing −0.01em). Never hand-roll the recipe at a call site — change
the token, every region anchor follows (Yuqi: "text 细节应该直接改 token,
不是每次散写 css").

- **Title-case, NOT uppercase** (revised 2026-06-11 — Yuqi: at region scale the
  tracked-caps eyebrow read "lofi/weak"; proper titles elevate the page. This
  supersedes both the original 14px-caps spec and the interim demoted 11px
  eyebrow. Caps now live only in Register B.)
- **18px, not 16** (same-day audit revision): at 16px the region anchor
  collided with the 16px card headlines INSIDE the section (alert-card titles)
  — identical type, position doing all the work. One step up gives the page a
  real ramp: 28 page / 18 section / 16 item headline / 14 body / 13 fine print.
  (2026-06-12 critique revision: on /today the alert-card headline dropped a
  further step to 14/600 `text-row-anchor` so the monitor stops out-shouting
  the 14px Priorities work rows — the /today ramp is now 28 / 18 / 14 / 13.
  `text-item-title` 16px remains the item-headline tier on /alerts surfaces.)
  (Same-day second revision — Yuqi: "so many bold things, people lost focus":
  /today's repeated anchors — card titles AND client names — demoted again to
  14/**500**. The 600 budget on an overview page is the page title and the
  section anchors. The ONE urgency signal gets SIZE instead of company: the
  late countdown renders 16px red at weight 500 — third revision same day,
  Yuqi: red+bold was "tooooo strong"; **never double-highlight — one signal,
  one channel**. Importance = bigger, not bolder; repetition cancels weight.)
- **Color: `text-text-primary`** (gray-900). The section title is a primary read.
- **Canonical examples:** `/today` — "Alerts" (`needs-attention-section.tsx`),
  "Priorities" (`merged-brief-card.tsx`), "Daily Brief" (`daily-brief-card.tsx`,
  the in-banner variant).
- **Use when:** the page is a multi-region overview and the header is the loudest
  thing in its region.

## Register B — Field-group / micro label

A small label sitting **above a value, a group of rows, or a table column**, or a
section label **inside a panel / detail document**. Its job is to _recede_ — it
classifies the content below it without competing for attention.

```
text-[11px] font-semibold tracking-[0.5px] text-text-tertiary uppercase   (B1 — group band / column label)
text-xs    font-medium   tracking-eyebrow  text-text-tertiary uppercase   (B2 — detail-document field label)
```

- **Color: `text-text-tertiary`** (gray-500). Always recedes.
- **B1 — group bands & column labels:** `/today` lifecycle caption + table group
  bands; `/alerts` row meta labels. `text-[11px]` semibold.
- **B2 — detail-document field labels:** Alert detail (`AlertDetailDrawer.tsx`,
  "SOURCE EXTRACT" / "PROVENANCE") and Deadline detail
  (`ObligationQueueDetailDrawer.tsx`) field labels. `text-xs`/`text-caption-xs`,
  medium weight, `tracking-eyebrow` / `tracking-eyebrow-tight`.
- **Use when:** the label is metadata for the block below it, not a region anchor.

> **Register-B home (2026-06-16):** both B tiers now have ONE primitive —
> `FieldLabel` (`components/primitives/field-label.tsx`) with a `variant` prop:
> `field` (B2, 12px `tracking-eyebrow`, medium) and `group` (B1, 11px
> `tracking-eyebrow-tight`, semibold). Color (`text-text-tertiary`) + uppercase
> are baked in. New B-tier labels MUST use it — never hand-roll. The ~200 legacy
> hand-rolled labels (4 sizes × 2 weights × 5 trackings of the same
> tertiary-uppercase look) migrate ONTO it mechanically.
>
> **Sweep status (2026-06-17): COMPLETE.** Every hand-rolled Register-B label is
> now on `FieldLabel`. Batches 1–2 did the safe surfaces (**65 sites / 23 files**);
> batch 3 finished the rest (dev-log `fieldlabel-migration-batch3`):
>
> - **Detail drawers** (~44 sites): `AlertDetailDrawer`, `ObligationQueueDetailDrawer`,
>   queue `panels` — the deferred files, now done.
> - **App-wide stragglers** (15 sites / 13 files): clients (detail/peek/summary),
>   migration wizard (`SummaryMetric`/`SuccessModal`/`OnboardingSkipModal`),
>   `BlockerContextCard`, `CompletedKeyDates`, `splash`, `SurfaceSummaryStrip`,
>   `StatBand`, `BulkConfirmList`, `audit-event-drawer`, and the first real
>   `<label htmlFor>` form label (`generation-preview-tab`, enabled by the htmlFor
>   passthrough).
>
> Decisions made during the sweep (Yuqi):
>
> - **Table column headers** keep `<TableHead>` (+ its width/align classes) and
>   wrap the content in `<FieldLabel variant="group">` — they do NOT become a
>   bare FieldLabel.
> - **`<h3>`/`<h2>` heading-labels** that were really small-caps labels (not prose
>   titles) demote to `as="div"` FieldLabels.
> - **13px `text-caption` headers** normalize down to `group` (11px).
> - **Container-typography** (a `<nav>`/`<div>` whose caps classes style arbitrary
>   children, e.g. `Breadcrumb`, `PageHeader` eyebrow, a grid column-header _row_)
>   stays as-is — it is not a discrete label.
> - **Not converted:** badges/pills (own primitive), sentence-case `<label htmlFor>`
>   form labels (not Register B), `<DropdownMenuLabel>`, `text-sm` bands,
>   `tabular-nums` counts, and `text-column-label`-token labels (already canonical).
>
> (Both former follow-ups are now CLOSED, 2026-06-17: `field` renders
> `tracking-eyebrow` (0.08em), reconciled to the §3.3 canon — Yuqi confirmed the
> wider tracking; and `FieldLabel` forwards native attrs (`htmlFor`, `id`,
> `aria-*`) so `as="label"` form labels can join.)

## Register C — Card / panel title

The title of a **settings / billing / form card** — a calm, document-like
surface. **Title-case, NOT uppercase.**

```
text-base font-semibold text-text-primary          (16px card title)
```

- **Color: `text-text-primary`**, title-case.
- **Examples:** `/rules/library` "Status coverage" / "Recent changes";
  `/billing` "Choose a workspace tier"; `/practice`, `/settings/profile` panel
  titles.
- **Use when:** the surface is a self-contained card in a settings/forms register.
  Do **not** uppercase these — the calm register is intentional and distinct from
  the dense-overview eyebrow (Register A).

### One title per card (2026-06-11)

A `DetailSectionCard` band title is the card's ONLY title. Never repeat (or
near-repeat) it as an inner section header in the card body — Yuqi flagged the
alert detail's "The change" card opening with a second "Extracted facts" header
and the "Activity & notes" card opening with a second "Activity" header ("why
not call it extract facts, then we don't need another title repeating"). The
fix pattern, now canonical:

- **Rename the card to the content's real name** if the inner header was more
  accurate (alert detail GROUP 1 is now titled "Extracted facts").
- **Move secondary meta to the band's right slot** (`headerRight`) — the AI
  caveat ("AI parsed — verify before Apply") and the timeline read-out
  ("N events · oldest first") ride the gray band, not a second header line.
- Inner headers remain legitimate only for **sibling sub-sections** that need
  distinguishing from each other (e.g. "Source extract" vs "How confident we
  are" inside Source & confidence) — never for the card's lead content.

---

## Picking a register

| The header…                                       | Register                               |
| ------------------------------------------------- | -------------------------------------- |
| anchors a region on a dense overview page (Today) | **A** — 18px primary title-case        |
| labels a group of rows / a table column / a value | **B1** — 11px tertiary uppercase       |
| labels a field inside a detail drawer/document    | **B2** — 12px tertiary uppercase       |
| titles a settings/billing/form card               | **C** — 16px primary title-case (calm) |

---

## Cross-reference: the four named pages

| Page                         | Region anchors (A)                                 | Field/group labels (B)                        | Card titles (C) |
| ---------------------------- | -------------------------------------------------- | --------------------------------------------- | --------------- |
| **Today** (`/`)              | Alerts, Daily Brief, Priorities → **A, primary** ✓ | table column labels → B1 ✓                    | —               |
| **Alerts** (`/alerts`)       | list is a single table — no A-level region titles  | row meta labels → B1 ✓                        | —               |
| **Alert detail** (drawer)    | —                                                  | SOURCE EXTRACT, PROVENANCE, … → B2 tertiary ✓ | —               |
| **Deadline detail** (drawer) | —                                                  | field labels → B2 tertiary ✓                  | —               |

The detail drawers (alert + deadline) are deliberately **all Register B** — they
are calm documents, so they carry no loud Register-A titles. This matches the
"flat calm-document" detail-pane model (see `detail_pane_surface_model`).

## Cross-reference: other routes (current state)

Most non-overview pages have **no Register-A section titles** — they're either a
single table (`/clients`, `/deadlines`, `/audit`, `/members`) or a stack of
Register-C cards (`/billing`, `/settings*`, `/practice`, `/rules/library`,
`/calendar`, `/workload`). That is **correct** — Register A is specific to the
dense-overview register that, today, only `/today` occupies.

See `cross-route-consistency-matrix.md` → "Section header" row for the per-route
state and any open conversions.

## Decided (2026-06-09)

**Keep Register C** on settings/forms surfaces; reserve Register A for
overview-register pages (today `/today` only). Yuqi confirmed — the dense
uppercase eyebrow is NOT rolled into `/billing`, `/settings`, `/practice`,
`/members`, `/rules`; their title-case card titles stay. Revisit only if one of
those pages is redesigned into an overview layout.
