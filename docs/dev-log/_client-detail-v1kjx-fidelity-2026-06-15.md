# Client detail — V1kJX fidelity pass (2026-06-15)

Yuqi: replicate Pencil V1kJX for the client detail page; first ensure the
client LIST is cohesive with /alerts, /deadlines, /rules/library.

## Finding: already substantially built to V1kJX
The detail page (ClientDetailWorkspace + ClientWorkPlanPanel + ClientDetailRail
+ ClientSummaryStrip) already matches V1kJX's structure end to end — breadcrumb
+ pager, identity header (name + health pill + meta row), the 5-cell StatBand
(JURISDICTIONS / BLOCKED / OPEN / FILED YTD / NEXT DUE), Filings/Setup/History
tabs, the filing table (DEADLINE/STATUS/INTERNAL DUE/OFFICIAL DUE/OWNER/⌄), and
a 360px right rail (Active Alerts [self-suppresses at 0] / Notes / Contacts).
The LIST page is already cohesive (same max-w-page-expanded container,
PageHeader + CountPill, StatBand, canonical table primitives, filter row).

## Pixel-match deltas closed (client-detail-specific chrome)
1. **Year header tag** (ClientWorkPlanPanel): "· current tax year" →
   "· *Current tax year*" (italic, leading capital) per V1kJX; "· projected"
   → "· *Projected*" to match.
2. **At-risk pill tone** (ClientDetailWorkspace): the health pill for
   statutory-late unextended filings went `warning` (amber) → `destructive`
   (red) to match V1kJX's destructive-hover At-Risk pill. At-risk is a
   genuine-risk state, not a config warning (the amber needs-facts chip stays
   amber, so the two read distinctly).

## Deliberately NOT changed — cohesion / canonical / no-fiction protected
- **Filing rows** use the shared `DeadlineRow` (also /deadlines). V1kJX's
  bespoke row (bare mono code + inline juris chip) would FORK that component
  and break the /deadlines cohesion that was the first explicit requirement.
  Cohesion wins — rows stay on DeadlineRow.
- **Breadcrumb** stays uppercase "CLIENTS" — the canonical PageHeader
  breadcrumb shared with /settings, /members; sentence-case here (per the
  mock) would break app-wide breadcrumb cohesion.
- **Open-filings pill** stays the canonical `Badge` (uppercase) — using a
  bespoke sentence-case pill would invent a one-off.
- **JURISDICTIONS cell** keeps its StateBadge seal (richer than the mock's
  bare "NY"; a shared primitive, adds recognition).
- **Contacts "Add contact" / compose** omitted — no add-contact / messages.send
  RPC; adding them would be fiction.

tsgo clean; console clean; both deltas verified live on Meridian Multistate.

## Round 2 — rail fidelity (Contacts + labels)
- Contacts card row rebuilt to V1kJX: avatar + STACKED name / role / email
  (was name·role inline + email below). Name 14/500 (was 600); role on its
  own muted line, suppressed when it would duplicate the name (demo
  placeholder sets both to "Primary contact"); email in JetBrains Mono
  (V1kJX h1oYYg).
- Rail section labels (NOTES, CONTACTS) → canonical `text-column-label`
  (11/600/+0.5) in tertiary, matching V1kJX (was bolder muted / caption-xs).
  Dropped the ScrollText leading icon on NOTES so the two rail cards share
  one bare-label treatment (V1kJX shows neither with a leading icon).
- Avatar stays md (32px); V1kJX's 36px isn't an AvatarSize step and a 4px
  one-off isn't worth a new size token.
