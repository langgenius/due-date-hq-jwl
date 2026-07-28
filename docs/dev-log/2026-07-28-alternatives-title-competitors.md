# duedatehq: alternatives-page titles now own "competitors" + "vs" demand

2026-07-28

## Why

GSC (28d) shows the competitor cluster is a top demand source but ranks ~pos 40:
`taxdome competitors` (39 imp), `taxdome vs jetpack` (44), `karbon hq alternatives` (35),
`taxdome competitor` (32). The `/guides/*-alternatives` pages existed (taxdome 170 imp, karbon
156 imp) but their `<title>`/meta said only "alternatives" — capturing none of the equally-large
"competitors" query form.

## What

`alternativeRoundupPage()` title/description (EN + zh) now read
"{Tool} alternatives & competitors (2026): what CPA firms use — DueDateHQ", so all three
alternatives pages (TaxDome / Karbon / File In Time) target both query forms. Honest positioning
kept (source-backed deadline & rule-change monitoring _layer_, complement-not-replace). Ships on
next marketing prod deploy ([[reference_prod_deploy_staging_gap]]).

## Next (not this)

Dedicated "{A} vs {B}" pages for the highest "vs" queries (taxdome vs jetpack), and more
`[tool]-alternatives` entries — but rank is gated on authority (backlinks), not page count.
