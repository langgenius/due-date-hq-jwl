# Rule review panel (splitRail) polish (2026-06-23)

Per-element feedback on the two-pane "Accept rule modal" (`RuleDetailCompact`
splitRail, opened from `/rules/library?...&scope=review&rule=…`). The brief:
"polish and elevate the review/detail panel" + sharpen the left=reference /
right=decision split, and keep design details consistent with other pages.

Done (5 of 6 items):

1. **Left facts — denser, quieter.** The facts column is read-to-verify, not
   acted on, so it cedes weight to the decision rail: section padding `py-5 →
   py-4`, header `pt-5 → pt-4` / `pb-1 → pb-0.5`, first-child `pt-3 → pt-2.5`.

2. **Activity footer — demoted.** It's the least-important content (version +
   history, no decision). Moved onto a muted strip (`bg-background-section/60`,
   `py-3.5`) pinned to the column foot, so it reads as secondary metadata set
   apart from the facts above and the rail beside it.

4. **Practice-review type sizes — unified.** The meta row mixed `text-base`
   (link / "No team notes yet") with `text-caption` (char count) — one row at
   two scales. Harmonized the row to `text-xs`, and the note-thread author/time
   to `text-sm`/`text-xs` (was `text-base`/`text-caption`).

5. **Locked-Accept reason — actionable.** "AI concrete draft is not ready." (a
   status with no next step → "why?") became "Generate the AI draft above to
   unlock Accept." — names the gate AND points at the Generate-draft button in
   the rail just above. (Two call sites in `CandidateReviewForm`.)

6. **Commit — bigger + more prominent.** The Accept/Reject bar was a wrapping
   `justify-between` row with `size="sm"` buttons and the gate reason crammed
   beside them (truncated). Restructured into an anchored commit zone: stronger
   top rule (`border-divider-regular`, `pt-4`), the gate status/reason on its
   own full-width line (no truncation — the new actionable copy reads in full),
   and full-height (default-size) buttons below with Accept stretched (`flex-1`)
   as the dominant primary.

Deferred:

3. **Decision rail "be more different".** Held deliberately — the right lever
   (without flattening the eyebrow→card-title hierarchy) needs a visual pass,
   and the local dev server's HMR was stale all session (the parallel session's
   active git resets/rebases disrupted it), so I couldn't iterate live. The
   item-6 commit prominence already shifts weight to the rail; will finish the
   surface/anchor differentiation once the preview is reloadable.

i18n: the one new string falls back to English (no interpolation); catalog
extraction left for the next i18n batch. `tsgo` clean.
