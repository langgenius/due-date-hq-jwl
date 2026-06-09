# /today dashboard polish pass — 2026-06-09

A 12-item page-feedback batch from Yuqi on `/today`, plus a corner-glyph asset
swap. Visual polish only — no contract or data changes.

## Changes

| #     | Item                                        | Fix                                                                                                                                                                                                                                                                                       |
| ----- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —     | Corner glyph                                | Replaced the stroked elbow on the WHY-NOW subline with the supplied filled 9×9 quarter-turn corner SVG (`fill="currentColor"`, `text-text-muted`). `actions-list.tsx`.                                                                                                                    |
| 1 / 8 | Import clients button taller                | `h-7 → h-8`, `px-1.5 → px-2`, hover `px-3 → px-3.5`. `dashboard.tsx`.                                                                                                                                                                                                                     |
| 2     | Alerts header lighter                       | h2 `text-text-muted` (gray-400) → `text-text-disabled` (gray-300). `needs-attention-section.tsx`.                                                                                                                                                                                         |
| 3     | Sparkles tooltip more designed              | Primitive padding `px-3 py-2 → px-3.5 py-2.5` (`tooltip.tsx`); Sparkles tooltip restyled — accent-icon + 13/600 title row over a hairline-separated 12/normal relaxed body. `actions-list.tsx`.                                                                                           |
| 4     | Form codes monospace                        | Dropped the `font-sans`/`tracking-normal` override on the alert-card form badge so it inherits `TaxCodeBadge`'s canonical `font-mono tracking-tight` — same as the /alerts table. `needs-attention-card.tsx`.                                                                             |
| 5     | Regenerate brief: gray + flicker            | Button gray → accent ink (`text-text-accent`, white hover chip). Body skeleton now only shows on a **cold** generate (`isPending && !brief.text`) — regenerating an existing brief keeps the prose on screen, so the card no longer flashes blank→skeleton→prose. `daily-brief-card.tsx`. |
| 6     | Refresh dashboard flicks                    | Instrumented a refetch live: **0 nodes added/removed** in the Actions section — `keepPreviousData` already keeps the table stable. The visible flicker was the shared brief card (both buttons invalidate `dashboard.load`), fixed by #5.                                                 |
| 7     | ShortcutHintChip no rounded corner on hover | The xs Button's 6px radius under `[corner-shape:squircle]` flattened the corners. Bumped to `rounded-lg` (8px). `kbd.tsx`.                                                                                                                                                                |
| 9     | Alert card hover border                     | Added `border border-transparent` at rest + `hover:border-divider-regular` (no layout shift). `needs-attention-card.tsx`.                                                                                                                                                                 |
| 10    | Avatar ring darker than fill                | Ring `ring-background-section` (#f9fafb) → `ring-[#d7dbe2]` — one notch darker than the `#e9ebf0` avatar fill. `needs-attention-card.tsx`.                                                                                                                                                |
| 11    | Actions this week title too light           | h2 `text-text-muted` (gray-400) → `text-text-tertiary` (gray-500). `actions-list.tsx`.                                                                                                                                                                                                    |
| 12    | Note down the table style                   | New canonical reference: `docs/Design/today-actions-table-style.md`.                                                                                                                                                                                                                      |

## Note — headers #2 and #11 now diverge

The Alerts and Actions-this-week section eyebrows were an intentional **parallel
pair** (both `text-text-muted`). This pass splits them per Yuqi's explicit
per-element feedback: Alerts → lighter (gray-300), Actions → darker (gray-500).
Net effect inverts their relative weight (Actions now reads heavier than
Alerts). Flagged for confirmation — easy to re-unify if the divergence reads
wrong on the live page.

## Verify

- `npx tsgo --noEmit -p apps/app` — clean.
- Live at 1512px: corner SVG renders; Alerts `rgb(208,213,220)` / Actions
  `rgb(103,111,131)`; chip radius 8px; alert-card form code `Geist Mono`; avatar
  ring `rgb(215,219,226)` @1.5px; Import "+" now 32px; refetch churns 0 nodes.
- Daily Brief regenerate flicker: brief was in `failed` state during this
  session, so the cold-generate skeleton path still shows (expected). The
  warm-regenerate no-flick path is wired but should be eyeballed once a brief is
  live.

---

## Round 2 (same day) — header color + corner + cross-page sweep

Follow-up feedback on the same surface, plus a request to propagate the changes
across pages and cross-reference to Today / Alerts / Alert detail.

### Tweaks

| Item                              | Fix                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Both section titles → **primary** | Round 1 had split them (Alerts lighter, Actions darker). Yuqi reversed: both "ALERTS" + "ACTIONS THIS WEEK" → `text-text-primary`. This settles the **Register A** section-title treatment. `needs-attention-section.tsx`, `actions-list.tsx`. |
| Avatar ring lighter               | Round 1's `#d7dbe2` → `#e2e5ea` (a faint rim just below the `#e9ebf0` fill). `needs-attention-card.tsx`.                                                                                                                                       |
| Corner glyph even smaller         | `size-[7px]` → `size-[5px]`. `actions-list.tsx`.                                                                                                                                                                                               |

### Cross-page design-system pass

Mapped section headers across every route (Explore sweep) and codified the
system instead of mass-editing:

- **New canonical doc:** `docs/Design/section-header-style.md` — defines the
  three header registers (A region-anchor 14px primary uppercase / B field-group
  tertiary uppercase / C card-title 16px primary title-case) and cross-references
  Today ↔ Alerts ↔ Alert detail ↔ Deadline detail.
- **`cross-route-consistency-matrix.md`** — added the three header registers to
  §0 and a new §6 per-route audit.
- **`today-actions-table-style.md`** — corner now 5px; section header documented
  as Register A primary.

**Key finding:** Register A (the uppercase-primary eyebrow) is specific to the
`/today` overview register. Other routes correctly use Register **C** card titles
(title-case) or are single tables — the apparent "divergence" is register-correct,
not broken. So **no mass header conversion was applied**; converting
settings/billing/practice/rules card titles from C → A is flagged as a design
call (default rec: keep C). Detail drawers (alert + deadline) are already
consistent at Register B2 (tertiary), matching the calm-document model.

### Verify

- `npx tsgo --noEmit -p apps/app` — clean.
- Live: both section titles `text-text-primary`; avatar ring `#e2e5ea`; corner 5px.
