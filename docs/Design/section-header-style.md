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
confident, scannable signpost. Often paired with a count `<Badge>` and a
right-aligned `<TextLink>View all</TextLink>`.

```
text-lg leading-tight font-semibold tracking-[-0.01em] text-text-primary
```

- **Title-case, NOT uppercase** (revised 2026-06-11 — Yuqi: at region scale the
  tracked-caps eyebrow read "lofi/weak"; proper titles elevate the page. This
  supersedes both the original 14px-caps spec and the interim demoted 11px
  eyebrow. Caps now live only in Register B.)
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

> **Known drift (B):** tier-2 tracking + size vary across surfaces
> (`tracking-eyebrow`, `tracking-eyebrow-tight`, `tracking-wider`,
> `tracking-[0.5px]`; `text-[11px]` vs `text-xs` vs `text-caption-xs`; medium vs
> semibold). The COLOR (tertiary) and uppercase are consistent. A size/tracking
> unification is a mechanical follow-up — tracked, not yet swept.

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

---

## Picking a register

| The header…                                       | Register                                |
| ------------------------------------------------- | --------------------------------------- |
| anchors a region on a dense overview page (Today) | **A** — 16px primary title-case         |
| labels a group of rows / a table column / a value | **B1** — 11px tertiary uppercase        |
| labels a field inside a detail drawer/document    | **B2** — 12px tertiary uppercase        |
| titles a settings/billing/form card               | **C** — 16px primary title-case (calm)  |

---

## Cross-reference: the four named pages

| Page                         | Region anchors (A)                                | Field/group labels (B)                        | Card titles (C) |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------- | --------------- |
| **Today** (`/`)              | Alerts, Daily Brief, Priorities → **A, primary** ✓ | table column labels → B1 ✓                    | —               |
| **Alerts** (`/alerts`)       | list is a single table — no A-level region titles | row meta labels → B1 ✓                        | —               |
| **Alert detail** (drawer)    | —                                                 | SOURCE EXTRACT, PROVENANCE, … → B2 tertiary ✓ | —               |
| **Deadline detail** (drawer) | —                                                 | field labels → B2 tertiary ✓                  | —               |

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
