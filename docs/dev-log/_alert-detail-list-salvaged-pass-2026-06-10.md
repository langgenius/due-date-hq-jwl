# Alert detail + list + rail — salvaged agent pass (2026-06-10)

Three parallel agents began the alert overhaul (detail+parity, list toolbar,
rail content+contrast) per Yuqi's feedback, but all hit a platform-wide request
throttle and died at the verify/commit step. They had already written
substantial edits (≈252 insertions / 57 deletions across 4 files) that compile
clean (tsgo: no alert errors) and were formatted. Salvaging them here rather
than discarding the work.

Files (intent per the briefs — NEEDS A VISUAL VERIFICATION PASS):
- `AlertDetailDrawer.tsx` — detail overhaul + parity with the deadline detail
  (Extracted-facts rename, de-frame, meta→header, footer non-overlap + kbd hints
  to header, breadcrumb, white header, bottom padding, Mark-reviewed→advance).
- `AlertsListPage.tsx` — toolbar spacing/one-line/font-size + "8 active"/LIVE
  badge height parity.
- `components/AlertListRail.tsx` — lift too-grayed rows + bring row content to
  parity with the main /alerts list.
- `components/AlertStructuredFields.tsx` — consistent medium-weight field values.

KNOWN: agents errored before reporting, so per-item completeness is unverified.
Follow-up: visually verify the alert detail + list once the throttle clears;
also still pending — the deadline tab-content consistency pass (that agent died
before editing; deadline files clean).
