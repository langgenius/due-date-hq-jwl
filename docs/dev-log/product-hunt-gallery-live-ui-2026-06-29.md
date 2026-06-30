# Product Hunt gallery — rebuilt around real live-app UI (10-slide library + curated 7)

**Date:** 2026-06-29
**Files:**

- `docs/marketing/product-hunt-launch/generator.cjs` (all slide functions + shared `page()` wrapper)
- `docs/marketing/product-hunt-launch/images/ph-final-*.{png,html}` (10 slides), `images/alternates/*`, `images/preview.html`, `images/footer.*`
- `docs/marketing/product-hunt-launch/images/upload/` (curated 7 for PH, in order, + `UPLOAD.md`)

## Why

Yuqi: _"there are so many great UIs and visuals from the live product, why not have them in"_ — plus
a run of per-slide direction (light not navy; slim footer; 2/4 not 3/5; rules-review should use the
real review UI; ground cards on real lists; add /today + /clients).

The earlier deck used abstracted floating cards. The push was to make each slide read as the **real,
shipping app** and to show its breadth — while holding the integrity line (only depict shipped UI).

## What changed

- **House style → light + lockup + slim footer.** `page()` now renders 1270×**820** with the brand
  lockup top-left and a **slim footer baked in** (light on light slides, dark variant on the navy
  closer): `50 states + DC · Matched to clients · Sourced to the agency · Audit-logged · Early access
open · duedatehq.com`. (A fuller standalone footer with contact lives in `footer()` / `ph-footer`.)
  Headline pillar reworked: dropped the vague `AI-parsed` for the moat **Matched to clients**.
- **Cards grounded on their real lists** (dimmed + blurred behind the focal card): Sources → Sources
  list; Rules review → Jurisdictions queue (AL highlighted); Action → Alerts list.
- **Rules review** rebuilt from the dashboard to the **actual review card** (Review queue · Rule 3 of
  456 → AI-drafted rule + 87% High + source + impact → Reject / Accept rule + "recorded in the audit
  log"). Headline → **"Every rule is your call."**
- **Action** rebuilt to the alert-detail apply UI with the real **Affected-clients table**
  (client · IT-204 · Mar 1→Mar 15 · ✓) + Applied banner + Copy client email draft.
- **Completeness** now carries the real **Filing-status strip** (PathToFilingSummary: 6 stages,
  Waiting active, future faded) above a **2/4** doc ring.
- **Audit log** densified to real history (search + filters, Today/Yesterday day-groups, 8 rows,
  "Showing 1–8 of 1,284").
- **New surfaces brought in:** `/today` (Daily Brief + Priorities) and `/clients` portfolio
  (monogram + countdown hero + urgency spread).
- **Accuracy fix:** cover K-3 copy "all partnership filings" → **"partnerships with foreign activity"**
  (domestic-filing exception; a CPA would catch "all").

## Result

10-slide library, all 1270×820, every action shipped-only. Curated **7** for the PH carousel in
`images/upload/` (Cover → Monitoring → Action → Clients → Completeness → Rules review → Closer);
Today / Sources / Audit held back as strong extras. Regenerate: `node generator.cjs`.
