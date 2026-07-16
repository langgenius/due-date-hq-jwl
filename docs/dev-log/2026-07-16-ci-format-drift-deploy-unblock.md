# 2026-07-16 — CI format drift fix, main deploys unblocked

## Symptom

duedatehq.com stayed on the old disaster-page titles all day despite the SEO commit
(`96137b3db`) being on origin/main since morning. Root cause chain:

1. `vp check` was failing on main — formatting drift in 58 files (mostly `build.mjs`-
   generated cpa-tools HTML committed unformatted, plus outreach artifacts) and one
   unused `const scope` in `outreach-kit/send-outreach.mjs` (landed via PR #117).
2. CI job red → `deploy-staging` (which `needs: ci` and serves duedatehq.com via the
   `due-date-hq-marketing-staging` worker) never ran.
3. So the push-to-deploy pipeline everyone assumed was working was silently parked.

Same failure mode as the four July dev-logs about cpa-field-guide format drift: the
generated HTML isn't run through `vp check --fix` before committing.

## Fix

- `vp check --fix` across the repo (60 files).
- Removed the unused `scope` declaration (send-outreach.mjs:284) — the plain-text
  body uses `forms` directly.
- `vp check` now: 0 errors, 1 pre-existing warning (non-blocking).

## Rule going forward

After regenerating cpa-tools deploy HTML (or any generated artifact), run
`pnpm exec vp check --fix` **before** committing. CI failure on main doesn't just
fail a badge here — it blocks production deploys of duedatehq.com.
