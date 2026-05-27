# Clients family — critique + revamp plan

**Date:** 2026-05-26
**Surfaces:** `/clients` (list) + `/clients/[id]` (detail)
**Method:** code-based critique (canonical doc `page-family-canonical.md` as the rubric; live-browser inspection deferred to designer)
**Status:** observations + recommendations; nothing landed yet
**Companion:** prior critique at `clients-list-and-detail-critique-2026-05-22.md` (still relevant; this layers on top)

The Clients family is the lowest-volume surface in the family
(/today, /alerts, /deadlines, /clients, /rules/library). It has
had ten passes of polish but still reads as the **least
canonical** of the five — the list page just absorbed the
directory pivot (PR #25), and the detail page is structurally
sound but visually inconsistent with the rest.

This doc captures both pages' current state, scores them against
the canonical, and proposes a revamp plan.

---

## §1. /clients (list) — current state

PR #25 has landed Phases 1-4 of the directory pivot:

- ✅ Retired the 3-tile StatTile strip
- ✅ Renamed `Done` → `Filed`; demoted `Filed` and `Opp.` to hidden
  by default; `Services` kept hidden (per Yuqi's reversal)
- ✅ PageHeader chip now reads `47` (not `47 Clients`)
- ✅ Inline search input + `/` hotkey + `q` URL param wiring
- ⏳ Remaining: `My clients` toggle chip; `FilterTrigger`
  adoption for dropdowns; canonical table-card frame +
  responsive page-size

### Heuristic scoring (Nielsen's 10, scored against the canonical)

| #         | Heuristic                      | Score     | Key issue                                                                                                                                                                                      |
| --------- | ------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status    | 3/4       | Title chip + scope filters communicate scope. Loading state OK. Missing a "filtered count" treatment ("12 of 47").                                                                             |
| 2         | Match system / real world      | 3/4       | "Filed" matches the terminal status count and carries header/cell help when enabled; "Owner" is the right CPA word. "Opp." abbreviation is opaque without the column toggle.                   |
| 3         | User control + freedom         | 3/4       | Reset clears all; `/` focuses search; Escape clears it. No range-select on rows yet.                                                                                                           |
| 4         | Consistency + standards        | 2/4       | **Diverges from canonical** — no canonical table-card frame, dropdowns use `TableHeaderMultiFilter` not `FilterTrigger`, table-header text uses uppercase kicker (`uppercase tracking-wider`). |
| 5         | Error prevention               | 3/4       | Filter dropdowns close on outside-click; row-click → detail (no irreversible action).                                                                                                          |
| 6         | Recognition rather than recall | 3/4       | Column headers visible; the count chip's number doesn't qualify what slice (filtered vs total).                                                                                                |
| 7         | Flexibility + efficiency       | 3/4       | `/` hotkey, ⌘K palette, `?q=` shareable. No `My clients` shortcut yet (Phase 5).                                                                                                               |
| 8         | Aesthetic + minimalist design  | 3/4       | Strip retirement made it MUCH cleaner. Table still reads frameless next to the canonical bordered card.                                                                                        |
| 9         | Error recovery                 | 3/4       | Empty filter result has a "Clear all" CTA. Search empty state has no analog (defaults to the table empty-row).                                                                                 |
| 10        | Help + documentation           | 2/4       | No surfaced hotkey hints. CPA discovers `/` only by accident.                                                                                                                                  |
| **Total** |                                | **28/40** | (improved from prior 29/40 — the directory pivot LOST a point on consistency by holding old chrome while gaining ground elsewhere)                                                             |

### List-page priority issues (after PR #25)

**P0 — Adopt canonical table-card frame** (page-family-canonical
§6). Currently the table renders edge-to-edge with no border;
/deadlines and /rules/library both use the bordered card. This
is the single biggest inconsistency.

**P1 — Adopt `FilterTrigger` primitive** for the
States/Entity/Owner dropdowns. Currently uses
`TableHeaderMultiFilter` with `trigger="toolbar"` — that
primitive predates the canonical shape and renders differently
from /deadlines' filter triggers.

**P1 — Filtered count semantics**: title chip stays `47` even
when the user has narrowed to 12 visible. Either:

- Show `12 of 47` when filters are active (per the brief), OR
- Keep `47` (total) and add a quieter "Showing 12" caption
  above the table (clearer separation).

**P2 — `My clients` chip** (Phase 5 of the brief). Once
implemented, sets `owner = [current user]` in one click. Common
CPA gesture; deserves a chip not a dropdown.

**P3 — Hotkey hint**: surface `/` somewhere subtle. Match the
J/K hint pattern from /deadlines pagination footer.

---

## §2. /clients/[id] (detail) — full critique

The detail page is **structurally richer** than the list but
**visually less canonical**. It has had its own redesign pass
(D-IA 4-tab restructure: Work / Client info / Discover / Activity),
but the chrome around the tabs hasn't kept up.

### Page anatomy (in render order)

```
PageHeader
  ↳ eyebrow: "← Clients" (back link)
  ↳ title: <ClientTitleSwitcher>{client.name}</ClientTitleSwitcher>
  ↳ identity chips: entity badge + owner pill + filing-state chips + readiness badge?
  ↳ subtitle: workplan summary text
  ↳ actions: ⋯ overflow + archive + "+ Create obligation"
ClientContactMetaRow  ← phone/email/website row
ClientActiveAlertsSection  ← Pulse alerts + extension/payment mismatches
ClientSummaryStrip  ← summary tiles (Open Filing, etc.)
<Tabs>
  Work     → filing plan, year-grouped, with sort
  Client info → 5 sections: compliance posture / jurisdictions / risk / onboarding / contact details
  Discover → suggested forms + future-business cues
  Activity → AI summary + notes + audit log
</Tabs>
[Right rail: 480px obligation panel when one is selected]
```

### Heuristic scoring (detail page)

| #         | Heuristic                      | Score     | Key issue                                                                                                                                                                                                                                                                                     |
| --------- | ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status    | 3/4       | Readiness badge, alerts band, summary tiles convey state. Some tiles read as decorative more than informative.                                                                                                                                                                                |
| 2         | Match system / real world      | 2/4       | "Compliance posture" is jargon — most CPAs would say "are we ready?" or "is anything blocking?" "Discover" tab name is fuzzy (recommendations? upsells? future filings?).                                                                                                                     |
| 3         | User control + freedom         | 3/4       | Tabs deep-linkable; switcher cycles clients. Back-link present.                                                                                                                                                                                                                               |
| 4         | Consistency + standards        | 1/4       | **Most-broken heuristic.** PageHeader carries 4-5 chip types in the title cluster; canonical pattern is 1 count chip. ClientSummaryStrip uses tile shape (not canonical for detail pages). Section headings use `TabSection` primitive (good) but tab body padding/spacing varies tab-to-tab. |
| 5         | Error prevention               | 3/4       | Archive button is destructive but lives in the actions cluster (low-distinction) — should be in the ⋯ overflow per canonical safety patterns.                                                                                                                                                 |
| 6         | Recognition rather than recall | 2/4       | The ⋯ overflow icon doesn't reveal what's inside until clicked; "Discover" tab name doesn't predict its contents. Identity chips in the title cluster blend together — readers can't tell entity-type from state-chip without reading the text.                                               |
| 7         | Flexibility + efficiency       | 2/4       | ClientTitleSwitcher (the cycle-clients arrows in the title) is power-user oriented but discoverable only by hover. No keyboard shortcut to jump to a tab.                                                                                                                                     |
| 8         | Aesthetic + minimalist design  | 2/4       | Lots of components at the top: PageHeader → ContactMetaRow → AlertsSection → SummaryStrip → Tabs. Four chrome layers before the tab content begins. Pixel-replica work was Figma-faithful but doesn't read as part of the same family as /deadlines or /today.                                |
| 9         | Error recovery                 | 3/4       | Archive is a destructive action with a confirm sheet (good). No undo for tab-level mutations.                                                                                                                                                                                                 |
| 10        | Help + documentation           | 2/4       | No hotkey hints. The "Discover" tab needs a one-line description ("Suggested rules + opportunities surfaced from your filings") that doesn't currently exist.                                                                                                                                 |
| **Total** |                                | **23/40** | Below the family average (~28). Pixel polish doesn't compensate for IA + naming inconsistencies.                                                                                                                                                                                              |

### Detail-page priority issues

**P0 — Title cluster reduction** (heuristic 4 + 6).

The h1 row currently contains:

- ← Clients eyebrow
- Client name (with cycle arrows)
- Entity badge
- Owner pill
- Filing-state chips
- Readiness badge (conditional)
- Subtitle workplan text below

That's **6 distinct elements** in the title cluster — twice the
canonical (title + 1 chip). The eye can't anchor; everything
competes.

**Recommendation:**

- Keep: title (client name) + 1 status chip (readiness OR
  next-due, whichever is most actionable for that client)
- Move to ContactMetaRow: entity badge, filing-state chips
- Move to a single OwnerPill in a quieter slot (e.g.
  ContactMetaRow), not the title cluster

**P0 — Tab name "Discover" → "Opportunities"** (heuristic 2 + 6).

"Discover" doesn't predict its contents. Rename to
"Opportunities" — that's what's in there. If "Suggested forms"
is also there, the tab title can be "Opportunities" with that
section labeled "Suggested forms" inside.

**P0 — "Compliance posture" → "Readiness"** (heuristic 2).

Already partially done on the list page ("readiness" filter).
The detail tab heading should match: `Client info` tab's first
section becomes "Readiness" — a word CPAs actually use.

**P1 — Adopt canonical PageHeader pattern** (heuristic 4).

Drop the identity-chip cluster from the title. Use the canonical
shape: `title=<noun + count chip>`, `actions=<2 outline buttons>`,
`description=optional 1-liner`. Identity chips move to a
ContactMetaRow row that uses the same shape across all four
tabs.

**P1 — Tab body density audit** (heuristic 8).

Each tab does its own spacing. Adopt a single canonical
inside-tab spacing: 24px gap between sections, h2 sm-semibold
(no ALL CAPS), section frame = inset surface (per
inset-surface-design-system.md).

**P1 — Archive lives in ⋯ overflow** (heuristic 5).

The standalone Archive button next to "Create obligation" reads
as a primary action equal weight to creating work. Move it
inside the ⋯ overflow menu where destructive actions belong.
The visible primary stays "+ Create obligation"; ⋯ owns Edit /
Archive / Delete.

**P2 — Tab-level keyboard shortcuts**.

`g w` → Work, `g i` → Client info, `g d` → Discover, `g a` →
Activity. Power-user pattern (matches Linear / Github).

**P3 — Identity-chip styling pass**.

If the chips stay in the title cluster (i.e. we don't take the
P0), at minimum apply visual differentiation: entity badge in
mono-tinted gray, state chips in their canonical state-tinted
bg, owner pill in accent. Currently they're all neutral-toned
and blend.

---

## §3. Cross-page consistency gaps

Comparing /clients list + detail against the canonical family
(/today + /alerts + /deadlines + /rules/library):

| Pattern          | /clients list                      | /clients detail            | Family canonical                 |
| ---------------- | ---------------------------------- | -------------------------- | -------------------------------- |
| Outer container  | regular variant ✓                  | regular variant ✓          | regular variant ✓                |
| PageHeader       | count chip = `47` ✓ (after PR #25) | 4-5 chip cluster ❌        | title + 1 count chip ✓           |
| Table chrome     | frameless ❌                       | n/a (no table on detail)   | bordered table-card ✓            |
| Filter trigger   | `TableHeaderMultiFilter` ❌        | n/a                        | `FilterTrigger` primitive ✓      |
| Section headings | n/a (table only)                   | `TabSection` sm-semibold ✓ | sm-semibold no-uppercase ✓       |
| Search input     | inline + `q` URL ✓ (PR #25)        | client-switcher arrows     | inline at toolbar start ✓        |
| Empty state      | inline empty row ✓                 | tab-level empty per tab    | section-internal dashed border ✓ |
| Pagination       | sibling div ❌ (no canonical card) | n/a                        | inside table-card, py-6 ✓        |

Two consistency wins close most of the gap:

1. Adopt the table-card frame on the list page (Phase 7 of the brief).
2. Reduce the detail page's title cluster to title + 1 chip.

---

## §4. Revamp plan

### List page (continuing PR #25)

Already in flight; finish what the brief specified:

- ⏳ Phase 5 — `My clients` toggle chip
- ⏳ Phase 6 — Adopt `FilterTrigger` primitive (P0 from this critique)
- ⏳ Phase 7 — Canonical table-card frame + responsive page-size (P0 from this critique)
- ⏳ Filtered count semantics — pick one (P1)
- Optional: hotkey hint in the toolbar or pagination footer (P3)

### Detail page (new pass — separate PR)

**Round 1 — IA + naming (P0 cluster)**

- Rename `Compliance posture` section heading → `Readiness`.
- Rename `Discover` tab → `Opportunities`.
- Move Archive button → ⋯ overflow.
- Move `description` from the workplan-summary subtitle to a
  PageHeader `description={t\`...\`}` slot if the canonical
  pattern fits, or drop it entirely.

**Round 2 — Title cluster reduction (P0)**

- Reduce title-cluster chips from 4-5 → 1 (readiness or
  next-due, whichever is more actionable).
- Move entity badge + filing-state chips → ContactMetaRow.
- Move owner pill → ContactMetaRow.
- ContactMetaRow becomes a single-line metadata strip: `Entity ·
States · Owner · Phone · Email`.

**Round 3 — Tab body density audit (P1)**

- One canonical gap (24px) between sections per tab.
- All section headings via TabSection (already done in Work
  tab; verify Client info, Discover, Activity).
- All section frames via inset-surface (per
  inset-surface-design-system.md) for visual coherence.

**Round 4 — Keyboard + help (P2/P3)**

- `g w` / `g i` / `g d` / `g a` tab shortcuts.
- Hotkey hint in the footer of each tab or in the page header
  meta area.

**Round 5 — `/critique` (verification)**

Re-run the critique after rounds 1-4 land. Target ≥30/40
heuristic score for both pages.

---

## §5. Decisions needed before implementation

These are choices that need a designer's call before any code
changes happen.

1. **Filtered count in the list-page title chip** — show `12 of
47` when filters active, or keep `47` total + separate
   "Showing 12" caption?

2. **Title chip on the detail page** — readiness badge or
   next-due summary? (Pick one. The other moves to
   ContactMetaRow.)

3. **`Discover` rename** — `Opportunities` (recommended) or
   `Suggestions`? They differ in tone (Opportunities = client
   business growth; Suggestions = system recommendations).

4. **Archive button placement** — confirm: move to ⋯ overflow.
   Keep "+ Create obligation" as the visible primary CTA.

5. **Tab-level shortcuts** — adopt `g w` / `g i` / `g d` / `g a`,
   or skip until other surfaces have similar tab shortcuts?

---

## §6. Related docs

- `page-family-canonical.md` — the rubric this critique scored
  against (§3 PageHeader, §6 table-card frame, §9 heading
  scale).
- `clients-list-and-detail-critique-2026-05-22.md` — prior
  critique. Many P0-P3 items there are now ✅ done; a few
  remain (mostly D-3-style "split ClientAlertsBand" which has
  morphed into ClientActiveAlertsSection).
- `client-page-information-architecture.md` — the 4-question
  IA model the detail page is built on. Still relevant for
  Round 1.
- `inset-surface-design-system.md` — section-frame canonical
  for Round 3 (tab body density audit).
