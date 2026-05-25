# /rules/pulse follow-up batch — alerts page polish

**Date:** 2026-05-26
**Author:** Yuqi (design) + Claude
**Scope:** apps/app — Pulse alerts list (`/rules/pulse`) follow-up to the 13-item Vibma batch

## What changed

This is a follow-up commit on top of `b09c1c4f` (the first /rules/pulse batch).
After Yuqi re-reviewed the page, six items needed rework:

### Page header (rules.pulse.tsx)

- **Title format.** `Alerts (N)` parentheses → `Alerts · N` with a separate
  `font-mono tabular-nums text-text-tertiary` count span. Matches the
  pattern used on `/clients`, `/rules/library`, `/deadlines` where a
  title carries a count chip; the parentheses style was a one-off here.
  Required widening `RulesPageHeader.title` / `RulesPageShell.title`
  from `string` → `ReactNode` so the route could pass a JSX node.
- **Alert history button variant.** `outline` → `ghost`. Same reasoning
  as the `/deadlines` Columns button — header actions that are
  navigations (not destructive, not primary) should read quieter than
  the title.

### PulseAlertCard

- **State badge + jurisdiction text wrapped into a single framed pill.**
  Previously the SVG flag and the 2-letter code (`CA`, `NY`) sat as
  two separate elements with `gap-2` between them, which read as
  "icon … text" rather than as one chip. Now wrapped in a single
  `rounded-md border bg-background-default` pill that mirrors the
  AffectedClientsTable jurisdiction chip pattern.
- **Title bumped `text-lg` → `text-xl`.** Title is the row's anchor;
  the previous size felt timid against the surrounding metadata.
- **Confidence: LOW / MEDIUM / HIGH 3-tier qualitative scale.**
  Replaced the numeric `AI XX%` pill with the qualitative badge from
  the dashboard's Today card. Reasoning: `AI 45%` in destructive
  tone reads as a data point ("the model is 45% confident");
  `LOW CONFIDENCE` reads as a verdict ("do not trust without a human
  look") — the latter is what a CPA needs at scan distance.
  Thresholds match the existing PulseConfidenceBadge tone breaks:
  `< 0.5` LOW (destructive tone), `0.5–0.85` MEDIUM (warning tone),
  `≥ 0.85` HIGH (success tone).
- **Card background tracks the confidence level.** LOW gets the
  destructive tint (`bg-state-destructive-hover/30`), MEDIUM gets a
  faint warning tint (`bg-state-warning-hover/20`), HIGH stays
  neutral (`bg-background-subtle`). Lets the row stand out before
  the badge is even read.
- **Meta line restructured.** Confidence pill on the LEFT, change-kind
  in a framed pill on the RIGHT with `justify-between`. Previously
  both rendered as equal-weight caption chips at the leading edge,
  which made the change-kind read as a label prefixing the
  confidence.
- **Client names render as framed pills, not a comma-joined string.**
  Each affected client name now sits in a 2px-rounded white-bg pill
  (`rounded-sm border border-divider-subtle bg-background-default`),
  matching the AffectedClientsTable chip pattern in the drawer.
  Reads as "5 clients may be affected: [Acme] [Beta] [Gamma]
  +N more" — the pill shape signals entities, not free text.
- **Review-only sentence cleanup.** Removed italic (italic + small
  caption was reading as a footnote disclaimer and visually
  conflicting with the briefcase icon's "action you take"
  message); added a top border + `pt-2` so the action sentence
  reads as a separate unit from the impact line above it.
- **Needs-review copy.** `N need review` → `N flagged for review`.
  The new verb form pairs with the parent clause's "may be
  affected" and avoids the agreement-pluralization ambiguity
  ("1 need review" reads broken).

## Rationale roll-up

The first /rules/pulse pass (`b09c1c4f`) addressed the high-level
information-architecture problems on the page. This follow-up is
the typography / chip-shape / verbal-precision pass — the kind of
polish that doesn't change what's there, but tightens how it reads
when a CPA scans the page top-to-bottom at 9am with a coffee.

## Verification

- `pnpm exec vp check`: 0 errors, 5 pre-existing warnings.
- No new tests; visual-only refinements covered by existing rendering tests.
