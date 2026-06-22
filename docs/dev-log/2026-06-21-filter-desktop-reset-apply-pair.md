# Desktop filter — Reset / Apply footer reads as the reference's clean pair

_2026-06-21 · ref filter sheet #3 (facet sections as toggle-chip groups + a
prominent staged Apply). Desktop only — no bottom-sheet, no continuous slider._

The `ObligationFiltersPopover` footer (apps/app/src/routes/obligations.tsx) had a
busy three-action composition: a "N filters staged" caption + a tiny ghost
**Reset** link (only rendered when staged > 0) on the left, then a ghost
**Cancel** + primary **Apply** on the right. Against the reference filter sheet's
clean two-button couplet, the Reset didn't read as Apply's counterpart — it was a
caption-sized link that appeared/disappeared, and Cancel was a third button
duplicating affordances that already close-without-applying.

Surgical change (footer only — tab architecture untouched):

- **Reset → outline button**, persistent, `flex-1`, `disabled` when nothing is
  staged (instead of vanishing, so the pair never reflows).
- **Apply → primary filled**, `flex-1`, keeps the trailing `ArrowRightIcon`.
- The two now split the band evenly as one deliberate Reset | Apply pair —
  exactly the reference register (Reset = outline, Apply = primary filled).
- **Cancel folded.** The header already carries an Esc chip, and ✕ /
  outside-click / Esc all cancel-without-applying, so the redundant Cancel button
  was removed to keep the pair clean.
- Staged-count caption kept as a quiet line above the pair (real state, no
  fiction).

No new strings — Reset / Apply / the staged-count `<Plural>` all already existed.

## Already satisfied (left as-is, per spec)

- **(b) facet OPTIONS** — the `ObligationFacetSearchList` rows already read in the
  reference's chip/row register: checkbox-fill on select, a `bg-background-subtle`
  selected wash, medium-weight selected label, and a trailing grey count pill.
  Clear selected state present. No change.
- **(c) Condition tab Due-window / Triage** — already tidy grouped chip sections:
  a `CapsFieldLabel variant="group"` eyebrow over a `flex-wrap` of `ToggleChip`
  pills (canonical engaged-filter chrome: accent tint + accent border + accent
  text on select). No change.

## Verify

tsgo `--noEmit` rc 0; `vp run @duedatehq/app#build` green (warnings are
pre-existing chunk-size / dynamic-import notes, unrelated).
