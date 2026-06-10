# Dev log — Daily Brief readability (2026-06-10)

Yuqi: My-work 模式下 brief 太乱太大，不够清晰不够有条理 — 要尽量简洁直观。

Root cause: the consumer flattens the AI's structured output (headline / items /
footer) into newline-joined text, and the card rendered that blob in ONE `<p>` —
HTML collapsed the newlines into a wall of prose with citation chips floating
mid-sentence.

## Rendering (works for already-stored briefs, no regeneration needed)

- `brief-text.ts` parses the stored format back apart (headline / `N. summary
Next: nextCheck [refs]` items / trailing footer) + strips model-added label
  prefixes ("Weekly triage brief:"). Unit-tested; unknown shapes (no numbered
  items) fall back to the original paragraph so content is never lost.
- `DailyBriefCard` now renders: one medium-weight lead line, then one compact
  line per item — why-clause in primary ink, "Next: …" step in tertiary,
  citation chips inline — and DROPS the footer (generic compliance closer:
  bulk, not information).

## Prompt (`brief@v1`, body-only edit per the in-place precedent)

- headline ≤ 14 words, no label prefixes; summary ≤ 16 words leading with the
  filing/payment subject; nextCheck ≤ 14 words imperative; no repeated urgency
  adjectives ("This critical…" × N); omit the footer instead of writing a
  generic compliance reminder.

## Drive-by: zh catalog ICU arg mismatches (NaN family)

The Today page showed「已逾期 NaN 天」— a `#, fuzzy` zh translation referencing
`{daysAbs}` while the msgid passes `{paymentLateDays}` → undefined → NaN.
A catalog scan found 15 such fuzzy entries with mismatched/missing ICU args
(seats, import wizard counts, rule-library facets, "Select all", feed-rotate
copy…). All re-authored against their msgids; `lingui compile --strict` +
extract idempotent. ~88 other fuzzy-flagged entries remain semantically
unreviewed but argument-safe.
