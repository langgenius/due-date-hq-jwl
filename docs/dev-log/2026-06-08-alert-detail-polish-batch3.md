# /alerts detail — polish batch 3

Date: 2026-06-08

Yuqi review of the alert detail (deadline-shifted). Concrete fixes:

- **Source → external link** (AlertDetailDrawer): the header source ("IRS Disaster
  Relief") is now an external `<a>` (sourceUrl, target=\_blank) with an
  ExternalLink icon + hover underline; plain-text fallback still hover-underlines.
- **Date always includes year**: header date `formatRelativeTime` → "May 18, 2026"
  (formatDatePretty alwaysShowYear).
- **Section eyebrows → sentence case**: all the `font-mono uppercase` section
  eyebrows (Deadline change, Activity, Affected clients, Extracted facts, Source
  extract, Provenance & confidence, AI confidence, Source & audit) → plain
  `text-[12px] font-semibold text-text-secondary` sentence-case titles.
- **DeadlineChangeCard frame**: dropped the red left border for a calm rounded
  white card (`rounded-lg border border-divider-subtle bg-background-default p-4`).
- **Consistent AI signal**: one shared `AiExtractedSignal` (Astroid + "AI-extracted"
  - identical tooltip) used by both the DeadlineChangeCard and Extracted-facts
    headers (was two bespoke treatments).
- **Provenance big number smaller**: confidence % `text-2xl` → `text-sm`.
- **Source-extract footer lighter**: `text-text-tertiary` → `text-text-muted`.
- **Rail inactive dimmed** (AlertListRail): inactive RailItems `opacity-60
hover:opacity-100` (badges included); active stays full + left accent.
- **Rail title → back to list**: the rail head "Alerts" is now a button that
  closes the detail and returns to /alerts (wired via closeDrawer).

## Verify

tsgo clean; /alerts detail at 1512×861 — external-link source, "May 18, 2026",
sentence-case eyebrows, framed DeadlineChangeCard, unified AI-extracted signal,
dimmed inactive rail rows.
