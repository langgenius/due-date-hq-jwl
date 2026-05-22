# Rule Library Source Banner Removal

## Change

Removed the green `All {total} sources watched` button from the Rule library
coverage section. The top-level Rule library summary already carries source
coverage context, so the inline banner was redundant chrome.

## Scope

- `apps/app/src/features/rules/coverage-tab.tsx`
- Lingui catalogs for the removed copy

## Design / Docs Alignment

No `DESIGN.md` update is required. This removes a redundant local CTA and keeps
the existing Rule library IA and token model intact.
