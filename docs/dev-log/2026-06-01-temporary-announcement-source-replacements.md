---
title: '2026-06-01 · Temporary announcement source replacements'
date: 2026-06-01
author: 'Codex'
---

# Temporary announcement source replacements

## Summary

- Replaced the AK, NH, and VT temporary announcement sources with verified official tax news and
  media pages.
- Replaced WY's rules-and-regulations watch page with the Wyoming Excise Tax Division Taxing Issues
  newsletter page.
- Added a generic linked-PDF announcement parser so PDF index/list pages download candidate PDFs,
  extract deterministic text with `pdfjs-dist`, and send the PDF text into Alert extraction.

## Notes

- WY Taxing Issues uses Google Drive PDF links. The parser normalizes Drive `file/d/<id>/view`
  links to a download URL for fetching while keeping the official source URL as the human-readable
  Drive view URL.
- Linked PDFs are still filtered for tax-announcement relevance before fetching, so ordinary forms,
  matrices, and unrelated PDFs do not become Alert candidates.
- If a linked PDF cannot be fetched or parsed, the parser suppresses the link-only HTML item instead
  of sending a low-context PDF title into Alert extraction.
- WY's Taxing Issues source is a sales/use/lodging/excise tax update newsletter, not a disaster
  relief signal.

## Rollout

- Before turning on the WY URL change in an existing environment, reset the monitoring baseline for
  `wy.temporary_announcements` so the current historical Taxing Issues PDFs become baseline content
  rather than backfilled Alerts.

## Validation

- Passed:
  - `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
  - `pnpm --filter @duedatehq/ingest test -- src/ingest.test.ts`
  - `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/jobs/pulse/ingest.test.ts`
  - `pnpm check`
- `pnpm rules:check-sources` completed source probes but exited `1` because
  `nh.temporary_announcements` returned HTTP 403 from `https://www.revenue.nh.gov/news-and-media`.
  The other replaced sources probed successfully:
  - `ak.temporary_announcements`: 200 HEAD
  - `vt.temporary_announcements`: 200 HEAD
  - `wy.temporary_announcements`: 200 HEAD
- Existing external probe limitations remain visible in the source checker output, including adapter
  smoke 403s for AZ/MI/RI, timeouts for KS/ND/OH-related probes, and no parsed candidates from the
  NV feed.
