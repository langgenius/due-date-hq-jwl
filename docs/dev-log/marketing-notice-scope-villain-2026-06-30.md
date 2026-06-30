# Marketing — Notice filing/payment scope + Villain copy

**Date:** 2026-06-30.

Lands two marketing-home edits onto `main` as a purely additive delta (no revert of
main's newer hero or `-ink` token work — applied as the commit's own diff, not a
whole-file copy from the diverged branch).

## Notice.astro — filing vs. payment scope

Each example notice now declares whether the change affects **filing**, **payment**, or
both (`scope: ['filing' | 'payment']`), surfaced as a "Applies to" row of scope tags.
Payment takes the warm/urgent tint (it's the one with penalty teeth — an extension to
file is never an extension to pay); filing stays neutral. Lead copy updated to name the
distinction. Both locales. New `.scopetag--payment` uses main's `--m-urgent-ink` token.

## Villain.astro — copy + contrast

Answer-section eyebrow → "Never the last to know" (EN) / "再也不是最后一个知道的" (zh);
two dark-surface body opacities nudged down (0.72→0.66, 0.7→0.6).

## Verify

- `pnpm -F @duedatehq/marketing dev` → homepage: each Notice example shows an "Applies to"
  row with filing/payment tags; Villain answer eyebrow reads "Never the last to know".
- `grep m-ok-ink Notice.astro` still present (main's token refinement preserved).
