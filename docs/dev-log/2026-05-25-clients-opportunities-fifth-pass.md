# 2026-05-25 — /clients + /opportunities fifth pass

## Why

Two pages of follow-up feedback:

- `/clients` — 5 items focused on the action-strip banner +
  StatTile chrome + the table's client-name typography + state
  pill.
- `/opportunities` — 4 items reinforcing the consistency
  direction. Yuqi flagged the row's information organization as
  "weird" and wants the actions in a vertical column on the right
  like Alerts, with the client name moved to the top left.

## Shipped — /clients (5 items)

### #1 + #2 — Banner cleanup

- **#2**: dropped the 3px amber left rail Yuqi flagged as "ugly"
- Also removed the `shadow-state-warning-hover-alt` ring that
  sat with it — the standard `variant="warning"` chrome already
  carries enough callout weight against a white page surface
- Removed the dotted-underline + font-medium prose styling on the
  message so the banner reads as one cohesive amber block, not a
  bordered tile with a linkified paragraph inside
- **#1**: Fix-now button switches `variant="default"` →
  `variant="destructive"` (red). Semantically appropriate — the
  missing-facts state IS a destructive blocker on the rule
  library (rules silently skip these clients until fixed), so
  the action that resolves it earns the red CTA

### #3 — StatTile sublabels dropped

ClientsStatTile was carrying verbose sublabels ("overdue
obligation" / "client owes docs" / "client flagged by a Pulse
alert") next to the value. Yuqi: "follow rule library's summary
card" — the rule library's StatTile has label + value only (the
"Watched" tile reserves the sublabel slot for the paused-sources
count). Dropped the sublabels here; the uppercase caption label
already names what the count represents.

### #4 — Client name bumped text-base

Table client-name cell was inheriting `text-sm` from the
`[&_td]:py-2` block override. Bumped to `text-base font-medium`
so the row's primary identity sits a scale tier above the
supporting cells. Other cells stay at the default text-sm via
the table's body override.

### #5 — State column adopts the Pulse drawer pill

Was a row of bare StateBadge SVG marks. Now the **primary** state
renders as a full rounded-full pill matching the Pulse drawer's
jurisdiction chip:

```tsx
<span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-divider-regular bg-background-default pl-0.5 pr-2 text-xs">
  <StateBadge code={primary} size="xs" />
  <span className="font-mono font-medium tabular-nums text-text-primary">{primary}</span>
  <span className="text-text-secondary">{primaryFull}</span>
</span>
```

Additional states (when a client files in multiple jurisdictions)
stay as bare StateBadge motifs so the row width stays bounded.
The `+N` overflow chip on the tail mirrors the previous
treatment. Column width bumped 160px → 220px so the primary pill
("CA · California") fits without truncation at default font
size.

## Shipped — /opportunities (4 items)

### #1 + #3 — StatTile already matches (no-op + comment)

Already shipped on the previous /opportunities sweep. The
`OpportunitiesStatTile` shape is identical to the rule library
`StatTile` (border + bg-background-default + caption-tier label

- text-xl semibold value). No additional change needed.

### #2 + #4 — OpportunityRow restructured

Was: a CSS grid with content on the left and **client name +
actions in a single horizontal cluster on the right** — the
client name read as "one of the action buttons" because they
shared the same flex row. Yuqi: "weird way of organising
information" + "put the actions in a vertical row, like Alerts.
move the CLient name to the left top."

Rewritten to match the PulseAlertCard layout:

```tsx
<article className="flex items-start gap-6 py-4">
  {/* Content column (flex-1) */}
  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
    <header>
      {/* Icon + Client name link (TOP LEFT) + Kind/Severity/Timing chips */}
    </header>
    <h2>{title}</h2>
    <p>{summary}</p>
    {evidence chips}
  </div>
  {/* Action column (vertical) */}
  <div className="flex shrink-0 flex-col items-stretch gap-1">
    <Button>Open client</Button>  {/* primary, on top */}
    <Button variant="ghost">Snooze</Button>
    <Button variant="ghost">Dismiss</Button>
  </div>
</article>
```

Header row reads: icon → client name → chips. The client name
is now the row's lede (linked, font-semibold) so the CPA scans
"whose opportunity is this?" before reading the kind/severity.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Banner: dropped left rail + shadow, Fix-now → destructive
  - StatTile: dropped sublabel slot
  - States column: full pill primitive matching Pulse drawer
  - Client name cell: text-base font-medium
  - State column width: 160px → 220px
- `apps/app/src/features/opportunities/opportunities-page.tsx`
  - OpportunityRow rewritten to flex-row content + vertical
    action column matching PulseAlertCard

## Verification

- `vp check` → 1450 files formatted, 0 lint/type errors across
  667 files
