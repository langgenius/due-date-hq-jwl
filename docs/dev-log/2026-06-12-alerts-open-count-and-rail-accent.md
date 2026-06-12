# 2026-06-12 — Alerts: "9 open" count + drop the rail's left accent bar

Two small, fresh-complaint fixes from Yuqi's /alerts review.

## 1. "9 active" → "9 open"

Yuqi: "'9 active' is confusing — it's Needs-reviewed + Active, so why 'active'?"

The header / rail-head CountPill counts every **unresolved** alert (the Review
queue + the Active queue combined = 9), but labelled it "active" — which both
mis-describes the number and collides with the **Active** tab right below it.
Relabelled to **"N open"** in both sites:

- `apps/app/src/routes/alerts.tsx` (page-header pill)
- `apps/app/src/features/alerts/components/AlertListRail.tsx` (detail-rail head)

Count source unchanged (`useActiveAlertCount`) — only the word.

## 2. Rail active item: fill wash only, no left accent bar

Yuqi: "the side border doesn't work when the item sits next to a floating
sidebar on the left."

The alert rail abuts the app's floating icon sidebar, so the active item's 2px
left accent bar (the canonical hover-accent-bar motif) doubled up against the
sidebar's edge and read as a clash. For THIS rail, selection + hover are now
carried by the bg wash alone (`bg-state-accent-hover` active, neutral
`hover:bg-state-base-hover` inactive). The left-bar motif still applies to rows
that don't border the sidebar.

## Verify

- `npx tsgo --noEmit -p apps/app` — clean.
- Live at 1512×861: header reads "9 open"; active rail item has
  `border-left-width: 0px`, `#eff4ff` fill, sitting flush against the sidebar
  with no clash.
