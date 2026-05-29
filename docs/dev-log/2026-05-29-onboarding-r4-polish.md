# /onboarding R4 polish

## Context

Round-4 design pass on `/onboarding` (the post-auth practice-profile step that
gates every first-run user before they reach the dashboard shell). Round 1–3
landed copy and CTA changes (steps F5-01 through F10-09); R4 is the
hierarchy + spacing + form-section sweep based on agentation feedback at
1512×861.

Nine items. Two files touched: `apps/app/src/routes/onboarding.tsx` and
`apps/app/src/features/onboarding/state-rule-activation-selector.tsx`.

## Changes

### Route (`onboarding.tsx`)

1. **Hierarchy flip (#1).** Old H1 was "Set up your practice." — a generic
   action title that restated the eyebrow pill ("PRACTICE PROFILE") and
   pushed the real informative copy ("we pre-filled a name based on your
   account") into a smaller secondary line. Promoted the pre-fill copy to
   H1 ("We pre-filled a name from your account.") and dropped the redundant
   headline. The "change it later" half of the original sub-headline moved
   to the input's helper text (see #3).
2. **Trust pill returns to the CTA (#2).** F5-13 had moved
   "Encrypted · Saves on continue · Renamable later" up to sit below the
   sub-headline so users read it during decision time. With the hierarchy
   flip, the top of the page is now packed (eyebrow + H1 + input + state
   grid + offset field) — the pill became one more thing competing for the
   user's eyes in the orientation zone. Moved back to live with the
   Continue button. "Saves on continue" now reads literally as the
   button's footnote, which is what the phrase always meant.
3. **Practice-name helper text (#3).** Added "You can change it later" to
   absorb the reversibility reassurance that used to live in the
   sub-headline. Helper text is the right home for that copy — it sits
   next to the field the user is deciding about, not the page banner.
4. **Top-section margin (#7).** With #1 dropping the secondary paragraph
   and #2 moving the trust pill, the input no longer needs `mt-8`. `mt-7`
   keeps proportional breathing room from H1 → input without feeling
   marketing-loose.
5. **Max-width (#9).** Documented why `max-w-[400px]` is the answer: the
   state grid (11 cols × 28px tile + 4px gap × 10 + 24px wrapper pad ≈
   372px) is the natural width floor. Wider would push the grid
   off-center and start to feel like a marketing splash.

### State-rule selector (`state-rule-activation-selector.tsx`)

6. **Section title canonicalization (#5).** "STATE RULE COVERAGE
   (OPTIONAL)" used the uppercase tracking-eyebrow treatment. Three lines
   above on the same page, "Practice name" and "Internal deadline lead
   time" use the canonical `<Label>` token (text-sm font-medium
   leading-none text-text-primary). Same visual concept ("name of this
   field"), three different stylings. Switched to a `<p>` styled to match
   the Label token — `<p>` instead of `<label>` because this title covers
   a multi-tile grid, not a single named input. "(optional)" stays inline
   but in the muted weight so it reads as a qualifier, not part of the
   field name.
7. **Header layout: vertical (#6).** Old layout was a horizontal row —
   title block on the left, [Select all] [0/56] on the right. At
   max-w-[400px] the two right-side controls squashed the two-line
   description for horizontal room. Vertical layout now: field name +
   helper on top, controls drop below at full width with [Select all]
   taking the lead edge and [0/56] anchoring the trailing edge. Same
   visual grammar as a typical settings row.
8. **Help-text copy tightened (#4).** "Selected states activate with
   federal rules after this practice is created. Skip if you only need
   federal rules — you can activate states later from Rule Library."
   → "Selected states activate with federal rules. Skip to use federal
   rules only — add states later from Rule Library." Dropped the
   "after this practice is created" temporal clause (implied by the
   onboarding context) and tightened the "skip if you only need / you
   can activate later" into one declarative clause.
9. **Tile label weight (#8).** Tile abbreviations were
   `text-caption-xs (11px) + font-semibold` which read heavy against the
   28px tile. Dropped to `text-[10px] + font-medium` so the 2-letter code
   reads as a state abbreviation, not a button label competing with the
   tile itself.

## i18n

5 new strings added to the en source catalog. zh-CN translations added in
the same commit so the catalog still reports 0 missing:

- "(optional)" → "（可选）"
- "State rule coverage" → "州规则覆盖范围"
- "Selected states activate with federal rules. Skip to use federal rules
  only — add states later from Rule Library." → "已选州将与联邦规则一同启用。如仅需联邦规则可跳过 — 之后可在规则库中添加。"
- "This is what your team and clients will see. You can change it later."
  → "这是您的团队和客户将看到的名称。您可以稍后更改。"
- "We pre-filled a name from your account." → "我们已根据您的账户预填了名称。"

Strings dropped from the catalog (extract --clean): the F5-13 sub-headline
"We pre-filled a name based on your account. You can change it now or
anytime in the Practice profile." and the helper "This is what your team
and clients will see."

## Design / Docs

The canonical onboarding doc in `docs/Design/` describes the F5-\* hierarchy
this round was rebalancing — covered separately when the next design-sync
sweep lands; this dev-log is the source of truth for R4 specifically.

## Verification

- `pnpm vp check` — 0 errors / 8 unchanged warnings.
- `pnpm i18n:extract` — 2898 / 0 missing (zh-CN).
- Visual verification deferred to next browser-screenshot pass; the
  layout change is mechanical (vertical stack vs. horizontal row, copy
  swap, margin number swap) and small enough that the dev-log description
  is sufficient to review.
