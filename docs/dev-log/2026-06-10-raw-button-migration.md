# Raw `<button>` audit + migration

Date: 2026-06-10

Yuqi: "audit the buttons! do not miss anything."

Exhaustive audit of every raw `<button>` in `apps/app/src` (~162) — full
categorized inventory in `docs/Design/raw-button-audit-2026-06-10.md`:
~70 CONVERT, ~63 CUSTOM-OK (legit raw), ~29 already-canonical primitives.

Key finding: the icon buttons don't map cleanly to `Button`'s `icon-*` scale
(de-facto `size-6/7 + rounded-lg` vs `icon-xs` = size-7/rounded-md, `icon-sm` =
size-8/rounded-lg) — so converting normalizes sizes ±1-2px. Yuqi chose to **snap
to the scale**.

Migrated **~29 sites** (icon → `<Button variant="ghost" size="icon-xs|sm">`,
text → `<TextLink>`, CTAs → `<Button>`). Added a **`success`** TextLink variant
for the green "Undo". `blocked-by-chip` correctly left raw (bordered chip).
Hot files under active concurrent edits (obligations.tsx, dashboard.tsx,
daily-brief-card, merged-brief-card) deferred; Cluster-D toggle/filter chips left
for per-item design calls. See the audit doc's "Migration status" section.

Verify: tsgo 0 errors (aggregate); `vp check` clean on all 26 touched files.
