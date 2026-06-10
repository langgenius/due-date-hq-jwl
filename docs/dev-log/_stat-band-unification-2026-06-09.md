# Unify the "card summary" across four surfaces → shared `StatBand` (2026-06-09)

Four pages each rendered their own bespoke summary band at the top of a
table-bearing route. They looked almost the same but had drifted into four
separate implementations with cosmetic inconsistencies. Collapsed them onto a
single shared component so they're now **the same component with different
content**.

## Before (four divergent implementations)

| Surface | Component | Drift |
| --- | --- | --- |
| `/clients/[id]` | `ClientSummaryStrip` → `StatTile` ×3 | separate `rounded-md` interactive tiles, value-above-label, `text-xl` |
| `/rules/sources` | `SourcesKpiStrip` (bespoke) | one `rounded-xl` bordered card, **mono** values, vertical hairline dividers, `font-bold`/`text-muted` eyebrow, no sub |
| `/rules/library` (overview) | `OverviewStatsBand` (route-local) | borderless band, top/bottom hairlines, 32px values, colored subs |
| `/alerts/history` | inline grid cards | separate `rounded-xl` cards in a 2→3→6 grid, `text-[22px]` values |

The rule-library overview's `OverviewStatsBand` was the newest (synced to Pencil
`O0pyRO` `p0WeNy` earlier today) and the cleanest, so it became the canonical.

## After

New `apps/app/src/components/patterns/stat-band.tsx` — `StatBand`, promoted out
of `rules.library.tsx`. Visual contract is unchanged from `OverviewStatsBand`
(borderless, `border-y` hairlines, `py-7`, eyebrow · 32px value · optional sub,
2-up grid on narrow → flex on `sm`). Generalized with three opt-in knobs so all
four surfaces fit:

- `valueClass` per stat — tones the value (Sources' red "Failed fetches",
  Client's destructive "Blocked", muted empty slots).
- optional `sub` — omitted entirely when absent (Sources has no secondary
  metric; Client's three slots have none either).
- per-stat `onClick` / `href` / `ariaLabel` — interactive columns render as
  `<button>`/`<Link>` with a hover wash + focus ring. **This preserves the
  /clients/[id] drill-through** (Next filing → obligation drawer, Open filing →
  filtered `/deadlines`); inert slots stay a plain `<div>`.

Migrations:

- `rules.library.tsx` — deleted the local `OverviewStatsBand`, imported
  `StatBand`, swapped all three call sites (loading / caught-up / default).
- `sources-tab.tsx` — `SourcesKpiStrip` now builds `StatBandItem[]` and returns
  `<StatBand>`; dropped the bespoke band + now-unused `Fragment`/`cn` imports.
  (Loses mono values — a deliberate consistency win.)
- `AlertHistoryView.tsx` — `statCards` retyped to `StatBandItem[]`
  (`subTone`→`subClass`, added `key`); replaced the inline grid with `<StatBand>`.
- `ClientSummaryStrip.tsx` — rewritten onto `StatBand`; dropped the `compact`
  prop (and its call-site arg in `ClientDetailWorkspace.tsx`) since the band's
  own responsive reflow replaces the horizontal-scroll affordance.

## Notes

- `StatTile` (`components/patterns/stat-tile.tsx`) is still the canonical tile
  for `/today` / `/deadlines` / dashboard summary strips — untouched. Only the
  /clients/[id] anchor moved off it onto the band, to match the other three.
- No fiction added: every value/sub stayed wired to its existing source. Sources
  simply renders no subs rather than inventing secondary metrics.
- `rounded-[14px]` (old `KpiStrip`) and the per-surface radius drift are gone;
  the band has no card border at all.

Verified live (all four routes render the identical band, no console errors):
- `/rules/library` overview — unchanged canonical.
- `/rules/sources` — 397 · 474 · 0 · **1** (red).
- `/alerts/history` — 7 · 2 · 1 · 0 · 1 with colored subs.
- `/clients/[id]` — Form 1120 · 0 (muted) · 3; Next filing + Open filing render
  as `<button>` drill-through targets, Blocked (0) stays an inert `<div>`.

`tsgo` clean for all touched files (the two pre-existing errors in
`deadline-detail.tsx` and `rules.library.tsx`'s `JurisdictionRail` are unrelated).

## Round 2 — sub-caption parity (visual style, not just the component)

Same component ≠ same look: the Client and Sources bands were rendering
**2-line** columns (eyebrow + value, no sub) while the rule-library and alerts
bands were **3-line** (eyebrow + value + colored sub). In a `py-7` hairline band
the 2-line columns left dead vertical space and read as bare numbers — most
glaring on /clients/[id], where only 3 columns stretch edge-to-edge. Verdict:
the 3-line style is better (fills the band, adds real signal), so both holdouts
were brought up to it with **real** subs — no fiction:

- `ClientSummaryStrip` — Next filing → `Due {date}` (warning tone when overdue);
  Blocked → `Needs attention`/`None blocked`; Open filing → `{n} payment
  overdue`/`Payments current`/`Nothing open`. Pulls `paymentOverdueCount` (already
  computed by `useClientNextDue`) and an overdue check on `currentDueDate`.
- `SourcesKpiStrip` — Feeds → `{n} paused`/`All active` (from `counts.paused`);
  Rules derived → `From {feeds} feeds`; Fetched 24h → `of {feeds} feeds`; Failed
  → `Needs attention`/`All healthy`.

Verified live: /clients/[id] reads `Form 1120 · Due May 12` (warning) / `0 · None
blocked` / `3 · 1 payment overdue` (warning); /rules/sources reads `397 · All
active` / `474 · From 397 feeds` / `0 · of 397 feeds` / `1 · Needs attention`
(red). All four bands now share the eyebrow · 32px value · colored-sub rhythm.

## Round 3 — the actual `/clients` *list* summary (`ClientsKpiStrip`)

"Client page" meant the `/clients` **directory list**, not `/clients/[id]`. Its
summary (`ClientsKpiStrip` in `ClientFactsWorkspace.tsx`) was still a bespoke
`rounded-2xl` bordered card with vertical hairline dividers — the most divergent
of the lot. Ported it to the shared `StatBand` (kept the live Total clients ·
Active obligations · At risk counts + their captions/tones; dropped the bordered
card, the `rounded-2xl` freelance radius, and the custom skeleton in favor of
`StatBand`'s `loading`). Verified live: `10 · All set up` (green) / `19 · across 4
jurisdictions` / `5 · need attention` (red), now borderless + hairline-framed
like the rest.

The `/clients/[id]` detail change from rounds 1–2 stays (user chose "keep it
unified" when asked), so the band is now the one card-summary across **five**
surfaces: /clients, /clients/[id], /rules/sources, /rules/library, /alerts/history.
