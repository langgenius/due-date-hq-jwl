# Disaster cluster wave 2: GA/MS/MT/AZ conformity + L5 pages (2026-07-31)

## What

1. **L3 wave 2** — four new entries in `apps/marketing/src/lib/state-conformity.ts`
   (georgia, mississippi, montana, arizona), completing coverage of every state with an
   active federal notice (9 total). Facts agent-verified 2026-07-31 against official
   state sources; sources linked per section. Findings per state:
   - GA: own "up to 120 days" scheme — state dates diverge from the federal Aug. 20 in
     both directions; April-due payments expressly not relieved; paper-filer annotation.
   - MS: no notice yet for MS-2026-02 (verified negative); past notices matched federal
     income-tax dates, but the March 2025 event got none at all.
   - MT: conforms via standing "same extensions as the IRS" policy (MCA 15-30-2604),
     but claimed at filing (red-letter annotation / e-file letter); tribal-member
     exemption nuance (Form ETM) covered.
   - AZ: nothing announced for this or any recent disaster; only routes are A.R.S.
     §42-2079 director action (not exercised publicly) or Form 290 abatement (interest
     not abatable); ITR 96-4 tribal-member exemption covered; §42-1107(B) postponement
     ambiguity flagged as "confirm with ADOR".
2. **L5 pages** (3 new, all under /irs-disaster-relief/):
   - `state-conformity/index.astro` — explainer + directory; counts and cards derive
     from STATE_CONFORMITY (currently "9 verified, only 2 automatic").
   - `filing-relief-for-natural-disasters-act.astro` — P.L. 119-29 (H.R. 517, Jul 24
     2025): governor-request postponements + §7508A(e) 60→120 days; P.L. 119-21
     casualty-loss companion.
   - `disaster-related-extension-of-deadlines-act.astro` — P.L. 119-64 (H.R. 1491,
     signed Dec 26 2025): §6511(b)(2)(A) refund-lookback fix + §6303(b) collection
     notices. Corrects the circulating "January 2026" signing date.
     All legislation facts verified against congress.gov/govinfo (agent, 2026-07-31).
3. **Wiring:** content-metadata entries for all new slugs; llms.txt gains the
   conformity overview + legislation section; llms-full inherits via STATE_CONFORMITY;
   hub conformity section links the overview; cpa-response-playbook step 2 links the
   conformity family.

## Verification

`pnpm build`: 265 pages green. Dist checks: index page renders 9 state cards +
FAQPage; both act pages carry P.L. titles + FAQPage; AZ warn chip + ITR 96-4; GA
Oct. 13 divergent date present; llms.txt lists all 9 states + legislation section.
Live preview (marketing-4341): conformity index and P.L. 119-64 page screenshotted,
zero console errors. `pnpm run ci` scope-check + hooks at commit.
