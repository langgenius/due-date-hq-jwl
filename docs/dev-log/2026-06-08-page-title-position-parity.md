# Page title at the same position across pages

Date: 2026-06-08

Yuqi (/deadlines #1): "ensure the big page title is always at the same position."
Root cause was cross-page: /today + /deadlines use top padding pt-6 (24px), but
RulesPageShell (/alerts, /rules) used pt-8 (32px) — so the title jumped 8px when
navigating between them. /deadlines already matched /today; /alerts was the
outlier.

## Fix

RulesPageShell content wrapper `pt-8` → `pt-6` (rules-console-primitives.tsx). Now
/today, /deadlines, /alerts, /rules all seat the page title at the same 24px top.

## Verify

tsgo clean; /alerts title now sits at the same top position as /deadlines at
1512×861; page otherwise unchanged.
