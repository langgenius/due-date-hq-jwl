# 2026-06-12 Rule Library Jurisdiction Default Scope

## Summary

- Updated the Rule Library jurisdiction detail pane so opening or switching to a state defaults to the Review tab when that jurisdiction has pending-review rules.
- If the selected jurisdiction has no pending-review rules, the detail pane falls back to Active so the table does not open on an empty review view.

## Verification

- Added route-level coverage for review-first defaulting, active fallback, and rail-driven state switching.
