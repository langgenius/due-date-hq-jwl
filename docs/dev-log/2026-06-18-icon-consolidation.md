# Icon consolidation — rename-twins + AI marker

_2026-06-18 · executes the icon-audit findings #1 + #3 (Yuqi approved)_

## What changed

A codemod across all lucide-importing files (49 code files touched):

**#1 rename-twins → one canonical name each (pixel-identical).** lucide keeps
deprecated aliases for renamed icons, and the app used both names for the same
glyph. Verified each pair maps to the same icon node via lucide's export map,
then merged:

- `AlertCircle` / `AlertCircleIcon` / `CircleAlert` → **`CircleAlertIcon`**
- `AlertTriangle` / `AlertTriangleIcon` / `TriangleAlert` → **`TriangleAlertIcon`**
- `CheckCircle2` / `CheckCircle2Icon` / `CircleCheck` → **`CircleCheckIcon`**
  (left `CircleCheckBig` alone — genuinely a different, bigger glyph)
- `MoreHorizontal` / `MoreHorizontalIcon` → **`EllipsisIcon`**

**#3 AI marker → one glyph (Yuqi: Sparkles).** `Astroid*` + `WandSparkles*` →
**`SparklesIcon`** (the convention; `PulseAlertRow` had been using two AI glyphs
at once). This one is a real visual change on the AI-confidence pill / AI-boundary
chips (Astroid diamond → Sparkles), which is the intended consolidation.

Follow-ups: deduped the lucide imports in 5 files that had imported both names of
a merged pair (PulseAlertRow, rule-detail-drawer, practice, preview + the
`/icons` gallery, which was regenerated). Fixed a stale `AlertCircle` comment in
readiness-indicator.

## Deferred

`X` vs `XIcon` import-naming (audit #2) — held. A blind regex on common words
(`Check`, `Plus`, `Circle`, `Clock`) would corrupt them inside strings /
identifiers, and it's cosmetic (both forms render + typecheck). Wants a real
codemod (ts-morph), not regex.

## Verification

- `tsgo` 0 (validated all merges + caught every dup-import, which were then
  fixed); `vp check` clean; 543 tests pass; build green; i18n untouched.
- **Live `/icons`:** unique glyph count **177 → 171**; `SparklesIcon` present;
  `AstroidIcon` / `WandSparklesIcon` / `AlertCircleIcon` absent; `CircleAlertIcon`
  present. Twin merges are pixel-identical so no other surface changes; the AI
  pills now show Sparkles (gated surfaces — consume the same renamed import).
