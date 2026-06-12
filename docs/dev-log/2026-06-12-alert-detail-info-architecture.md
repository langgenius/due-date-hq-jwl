# 2026-06-12 — Alert detail: information architecture + label ladder

Yuqi (twice): "i think you can do better — the text hierarchy and organisation
of information." Two structural fixes + a label ladder.

## 1. The key fact moves into the HERO

The page's most important block — the do-by-when deadline + countdown — was
buried inside a section called "Extracted facts". The hero now answers
identity → headline → BY WHEN in one glance:

- `AlertStructuredFields` gains `section: 'key-fact' | 'details'`: the
  action-deadline callout (date + countdown + evidence checklist) renders in
  the hero under the title; the details section renders only the fact grid +
  caveats. `DeadlineChangeCard` (old → new diff for deadline shifts) moves to
  the hero alongside it. Both hide when the header collapses on scroll (the
  spy nav + sections take over).
- Status dedup: `DeadlineChangeCard`'s status chip now renders only for
  TERMINAL states (applied/dismissed + resolution date) — pending was already
  the meta row's AwaitingDecisionChip, so the hero showed "awaiting" twice.

## 2. Sections named by meaning

"Extracted facts" (system-speak about provenance, duplicated by the "AI
parsed" caveat beside it) → **"Change details"** — matches the spy nav's
"Change" and describes content, not pipeline.

## 3. Label ladder (one voice per tier)

The section had NINE identical caps micro-labels — the critical and the
trivial dressed alike. Now:

- T1 hero title 22/600 → T2 focal mono date (24px+) → T3 section headers
  16/600 → **T4 subheads 13/600 sentence-case secondary** ("Evidence to
  gather", "Legal uncertainty", "Deadline change" — demoted from 16/600 which
  had stacked two same-tier headers) → T5 caps stat labels, RESERVED for the
  fact grid + the deadline eyebrow.
- "HIGH CONFIDENCE" caps → "High confidence" sentence case (tone color stays).
- AwaitingDecisionChip moved to the meta row's RIGHT cluster: identity reads
  left, status + provenance read right.
- Source-section publisher name mono → sans (mono restraint: dates/numbers
  only; a publisher name isn't data).

## Verify

tsgo clean. Instance 5189 (DOM-measured): key-fact callout precedes the spy
nav in document order; "Change details" title; facts section no longer
contains the callout; "Evidence to gather"/"Legal uncertainty" 13/600
sentence-case; "High confidence" 13/500 sentence-case; chip in the ml-auto
cluster; source name sans. Caps inside the section reduced to exactly the
stat register (deadline eyebrow + 6 grid labels).
