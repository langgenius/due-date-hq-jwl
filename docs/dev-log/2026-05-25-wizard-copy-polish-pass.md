# 2026-05-25 — Wizard #40 final pass: copy polish + length fixes + i18n bugs

## Why

Closes every remaining item from
`docs/Design/wizard-copy-audit-2026-05-25.md`:

- Plural-form bug #2 — `Step3Normalize` matrix row was using JS
  template interpolation inside `<Plural>` `one`/`other`, so the
  entity × state tokens couldn't be extracted as named ICU
  placeholders.
- Untranslated `friendlyParseError` strings leaking into the
  parse-error Alert.
- 11 cross-step consistency edits (verb voice, "needs review"
  phrasing, AI mapper casing, alert title cleanups).
- 2 length fixes (38-word Step 4 alert, 30-word Step 3 penalty
  readiness paragraph).
- Step 4 `row {n}` untranslated bare-English span.

## Shipped

### `Step3Normalize.tsx`

- **Plural-form #2 split (L245-249)**: the matrix row originally
  baked entity × state inside the `<Plural>` template strings
  via `cell.entityType.toUpperCase()` etc. Lingui extracts the
  `one`/`other` strings literally, so those expressions weren't
  becoming named ICU placeholders. Split: the entity × state
  kicker now renders as data (uppercase mono span) outside
  `<Plural>`, and `<Plural>` carries only the count + "client(s)"
  noun. Catalog message simplifies to
  `{count, plural, one {# client} other {# clients}}`.
- **"needs human review" → "needs review"** (L70-71): canonical
  phrase across all 4 steps.
- **Alert title "Data cleanup warning" → "Couldn't organize some
  values"** (L80): aligns with the wizard's consistent "Couldn't…"
  error voice (Step 1, Step 2, Wizard toasts).
- **Default tax type explainer**: 23-word sentence → 9-word
  sentence ("Default tax type suggestions apply only where
  imported rows do not already include tax types." → "These
  defaults apply only to rows without tax types.").
- **Penalty readiness paragraph dropped entirely** (L241-246):
  30 words threading three concepts (penalty readiness +
  estimated tax due + owner count) on a screen where users are
  deciding tax-type defaults. Penalty readiness has its own
  concept popover + Step 4 surface — it doesn't belong here.

### `Step1Intake.tsx`

- **`friendlyParseError` → `friendlyParseErrorDescriptor`
  (L1213-1224)**: the function used to return bare English. Now
  returns a Lingui `MessageDescriptor` via the `msg` macro; the
  caller resolves through `i18n._()` at React render time. Same
  shape as `unsupportedUploadMessageDescriptor` in
  `intake-files.ts`.
- **Intro paragraph trim (L429-437)**: 28 words → 22 words.
  "give us a head start on payment and penalty context" (wordy
  - abstract) → "help us flag penalty risk" (concrete + the
    actual user outcome).
- **Upload hint split (L513-522)**: mixed file types + action +
  limits in one run-on line. Split into two lines — primary
  names the file types, secondary carries 1,000-row / 5-MB
  limits in mono tabular nums.
- **AI mapper explainer rewrite (L567-572)**: 25 words → 19
  words, verb-led. "The AI mapper runs first. Selecting an
  import template adds source context and provides default
  suggestions if AI is unavailable." → "Pick a source to add
  context. The AI mapper runs either way; templates also fill
  defaults if AI is unavailable." Lowercase "AI mapper" in body
  prose (uppercase "AI Mapper" stays on the Step 2 badge as a
  proper-noun label).
- **"That file doesn't contain any rows…" rewrite (L209)**:
  action-led ("Add a header and at least one row, then
  re-upload") instead of stating-the-problem prose.
- **Alert title "Couldn't parse the input" → "Couldn't read
  your data"** (L678): "the input" is developer prose; "your
  data" matches the user's mental model.

### `Step2Mapping.tsx`

- **H2 "Review and confirm column mapping" → "Review the column
  mapping"** (L110): the Continue button already handles the
  "confirm" half.
- **Confidence stats reword (L114-125)**: "Average confidence
  87% · EIN detected 100%" → "87% average confidence · EIN
  found" (only when true). Leads with the number; "100% EIN
  detected" reads like a binary state, not a percentage.
- **Fallback alert title "Automatic field matching is
  unavailable — using default suggestions" → "AI mapping
  unavailable"** (L145-146): alert titles should be punchy; the
  description below already explains the fallback.
- **"# columns need your review" → "# columns need review"**
  (L184-189): drops "your" — canonical phrase.

### `Step4Preview.tsx`

- **"You're about to create" → "You're about to create:"**
  (L33): terminal colon — was trailing off into the list with no
  punctuation.
- **Alert title "Ready to generate your deadline list" →
  "Ready to generate deadlines"** (L92): trims redundancy with
  the "Import & Generate" CTA below.
- **38-word alert body collapse (L93-99)**: split rejected →
  cut. The original threaded mappings, suggestions, rules, AND
  the four output types into one paragraph; new version names
  only what `Import & Generate` produces. Users already
  confirmed the inputs in Steps 2-3 — restating them here was
  noise.
- **"# rows need attention" → "# rows need review"** (L109-113):
  aligns with canonical phrase.
- **`<span>row {n}</span>` → `<span><Trans>Row {n}</Trans></span>`**
  (L122-128): the row marker was bare English. Step 2's
  BadRowsPanel already renders capitalised `Row` via `<Trans>`;
  Step 4 now matches.

### `WizardShell.tsx`

- **Transition title "Generating your deadline list…" →
  "Generating deadlines…"** (L531): same trim as Step 4 alert.

## Files touched

- `apps/app/src/features/migration/Step1Intake.tsx`
- `apps/app/src/features/migration/Step2Mapping.tsx`
- `apps/app/src/features/migration/Step3Normalize.tsx`
- `apps/app/src/features/migration/Step4Preview.tsx`
- `apps/app/src/features/migration/WizardShell.tsx`

## Verification

- `vp check --fix` → markdown / JSX formatting fixed
- `vp check` → 0 lint/type errors across 674 files
- Spot-check on n=1 for every Plural: matrix reads "LLC × CA · 1
  client" (correct singular); Step 2 alert reads "1 column needs
  review"; Step 3 reads "1 value needs review"; Step 4 reads
  "1 row needs review".

## What this closes

After this commit, `wizard-copy-audit-2026-05-25.md`'s entire
§3 change list and §2 bug list are landed. The audit doc
itself stays as a reference; the wizard is now consistent on:

- Voice — all "Couldn't…" error titles, all alert titles ≤ 7
  words, all body copy ≤ 22 words.
- "needs review" — single phrase across all 4 steps.
- "AI mapper" — lowercase in body prose, "AI Mapper" on the
  Step 2 badge.
- i18n — every visible string flows through `<Trans>` / ``t` `` /
  `<Plural>` / `MessageDescriptor`; no bare English left.
