# Design-consistency pass — token de-burr, spacing snap, variant + copy hygiene

**Date:** 2026-06-30

First remediation batch from the design-consistency review (waves 1–7; full findings in `/findings.md`). All changes are token-/consistency-level and verified green before commit.

## Shipped

**Token de-burr (波4)**
- Removed `--text-md` (byte-identical to `--text-base`, 0 call-sites).
- Retired 5 dead util-color palettes (`yellow`/`teal`/`pink`/`rose`/`indigo`) — full ramps with zero semantic-token or component consumers.
- Removed `--background-neutral-subtle` (0 consumers) from light/dark/preset.

**Font-size → token (波4)**
- 21 arbitrary `text-[Npx]` swapped to the existing token utilities (`text-caption`/`-2xs`/`-micro`/`-sm`/`-lg`). Exact 1:1 px, no visual change.

**Button legacy alias → canonical (波3)**
- ~113 call sites migrated: `variant="outline"→"secondary"`, `"default"→"primary"`, `"destructive"→"destructive-secondary"` on `<Button>` only (Badge/Alert keep their own same-named variants). Visual no-op. Aliases remain in `button.tsx` pending a separate `defaultVariant` repoint (follow-up).

**Spacing snap to rhythm (波2)**
- 41 off-scale arbitrary spacings snapped: `18→px-4` (16), `11→px-3` (12), `10→gap-2.5`, `14→px-3.5`, `2→py-0.5`, `3→py-1`. 8 optical-alignment indents (icon/avatar/baseline) deliberately left off-scale.

**Structure (波1)**
- F-004: `notification-preferences-page` adopted the canonical settings wrapper (`mx-auto max-w-page-wide … px-4 pt-8 pb-12`) — was uncapped `p-4/p-6`.

**Exemptions traced (so the linter / later waves don't re-flag)**
- `check-token-discipline.mjs` EXCEPTIONS: readiness bar-segment `rounded-[1px]` (matches the existing tooltip-tip precedent).
- `semantic-light.css`: comment marking `--background-soft` as intentionally NOT a synonym of `--background-section` (they diverge in dark).

**Docs**
- New `docs/Design/copy-style-guide.md` — canonical verb/casing/punctuation table (波6).

## Verification
- `vp check` typecheck: 0 errors (33 pre-existing warnings).
- `check-token-discipline`: 5 pre-existing violations → 0 (removed 3 font + the radius via precedent-exception; added zero).
- Visual pass on `/today`, `/alerts`, `/deadlines`, `/notifications.preferences`: snaps render exact pixels, no misalignment; product reads visually coherent.

## Not in this batch (follow-ups)
Flag decisions + larger fixes (Button `ButtonGroup` primitive, EmptyState adoption, RulesPageShell/PageHeader unification, members SelectTrigger override) — tracked in `/findings.md`.
