# Google Ads how-to-buy operating doc

2026-07-31. Docs-only; no app or marketing-site code changed.

Yuqi asked how to actually buy Google Ads ("怎么买") after choosing paid search as the
fast-lane channel for the Aug-5 WA window. Added
`docs/marketing/google-ads-how-to-buy-2026-07-31.md`:

- Account-setup walkthrough (Expert Mode escape hatch, billing is post-pay, ignore the
  Google sales "free optimization" calls, look for the new-account credit offer).
- The three default traps to switch off: search partners + Display network, auto-apply
  recommendations, broad-match keywords.
- Campaign A pointer: reuse `google-ads-disaster-intent-2026-07.md` unchanged, but lead
  with the WA ad group until Aug 5, then pause it.
- Campaign B (new, `tool-intent-2026-07`): five ad groups built from GSC
  striking-distance queries (file-in-time / taxdome / karbon / canopy alternatives +
  category terms), each landing page curl-verified 200 on prod today; trademark-safe RSA
  copy; negatives; $10/day, $8 CPC cap; same two-week kill/keep criteria as campaign A.
- Week-1 conversion plan: Formspree opt-in submissions (endpoint verified live via 405 on
  GET) + UTM landings; gtag conversion deferred to week 2. Includes a pre-spend
  self-test-submit step so paid clicks never land on a dead form.

Boundary respected: account creation and card entry are Yuqi's own steps; everything
else in the doc is paste-ready.
