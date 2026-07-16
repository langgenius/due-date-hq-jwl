# GTM batch — widget/API, weekly digest, Ads test, society kit (2026-07-16)

Four distribution plays, all fed by the one verified disaster dataset:

1. **Embeddable widget + free data API** (main, commit c18006dd8): `/widget/deadline-alerts.js`
   (data inlined at build — no CORS; Shadow DOM; attribution backlink), `/data/disaster-notices.json`
   (free feed), `/widget` docs page with live preview. 208 pages build clean.
2. **Weekly digest** (PR branch d07e31f90): `outreach-kit/build-digest.mjs` renders an email-ready
   weekly digest (new-this-week cards / due-within-30d / also-live table, alert design language).
   First draft: Jul 16 — 4 new (LA/MS/WI/MI), WA 21 days out. Scheduled task `weekly-deadline-digest`
   drafts it every Friday 9am (review-only). Regenerated disaster-notices.json with issuedOn/fema.
3. **Google Ads test plan**: `docs/marketing/google-ads-disaster-intent-2026-07.md` — paste-ready
   campaign (per-state ad groups, keywords incl. relief-code terms, RSA copy, negatives, $10–15/day,
   kill/keep criteria). Prereq: wire PUBLIC_ALERT_FORM_ACTION first.
4. **Society distribution kit**: `docs/marketing/society-distribution-kit-2026-07.md` — 9 societies'
   editorial contacts (researched from their sites), priority = MSCPA (Jul 13 relief, nothing posted)
   then LCPA (augmentation) / WSCPA (missed WA). Pitch + ready-to-publish member notice included.
   Two date corrections applied vs raw research (WA→Aug 5, HI→Aug 20 still live).

Loop: monitor catches new relief → dataset update → society summary + firm alert + widget/digest
refresh, same day.
