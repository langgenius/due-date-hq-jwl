# Migration Wizard — Copy + i18n audit (2026-05-25)

Scope: `apps/app/src/features/migration/` — 4 in-wizard steps (no Step5; the
post-import "genesis" overlay lives inside `Wizard.tsx`) plus `WizardShell.tsx`,
`Stepper.tsx`, and the two helper modules `intake-files.ts` and
`mapping-target-labels.ts`. Survey only — no code changed. Implementation pass
should land in a follow-up commit.

The wizard is dense with copy. Most user-visible strings are wrapped in
`<Trans>` / ``t`...` `` / `<Plural>`, which is good. The largest single gap is a
block of plain-English helper text that flows back to the UI from
`intake-files.ts` and from `friendlyParseError` inside Step 1.

## 1. Per-step inventory

| Step                   | File                         | Strings reviewed                                       | i18n coverage                                                                                                                                      | Top issues                                                                                                                                                                                                           |
| ---------------------- | ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell / chrome         | `WizardShell.tsx` (543 L)    | ~30 (titles, aria, footer buttons, transition overlay) | Strong — `<Trans>` / `t` throughout                                                                                                                | Long sr-only line repeated twice; "Discard import" confirmation copy is fine; transition overlay copy is solid                                                                                                       |
| Stepper                | `Stepper.tsx` (68 L)         | 4 step labels + 1 aria-label                           | Step labels translated; **`aria-label="Wizard steps"` is bare English**                                                                            | Minor — single aria-label miss                                                                                                                                                                                       |
| 1 — Intake             | `Step1Intake.tsx` (1153 L)   | ~40 visible strings + 11 preset export guides          | Mostly strong; **`friendlyParseError` (L1141-1151) returns plain English**, leaking into the parse-error alert                                     | Two `<Trans>` text bodies are very long (L364-369 source examples, L527-530 mapper explainer); upload hint mixes three concerns in one line; `unsupportedUploadMessage` returns plain English (see intake-files row) |
| 2 — Mapping            | `Step2Mapping.tsx` (503 L)   | ~25 visible                                            | Strong — all `<Trans>` / `t` / `<Plural>`                                                                                                          | "Automatic field matching is unavailable — using default suggestions" is a long alert title; "AI Mapper" / "Import template" capitalization conflicts with Step 1 body; subhead is developer-y telemetry             |
| 3 — Normalize          | `Step3Normalize.tsx` (318 L) | ~15 visible                                            | Mostly strong; **two bare-English `aria-label`s** (L159, L217), and **two `<Trans>` strings bake English plurals into the source** (L56, L245-249) | Title says "values" even when count is 1; matrix Plural uses backtick interpolation inside the Plural form (fragile)                                                                                                 |
| 4 — Preview            | `Step4Preview.tsx` (132 L)   | ~12 visible                                            | Mostly strong; **`row {err.rowIndex + 1}` (L122) is plain English**                                                                                | "You're about to create" trails off into a list with no terminal colon; "Safety" aria-label bare English (L63)                                                                                                       |
| Wizard.tsx (post-step) | `Wizard.tsx` (796 L)         | ~12 toast + dialog + overlay strings                   | Mixed — **3 baked-in plurals in `t` / `<Trans>`** (L404, L524, L645, L648)                                                                         | Genesis overlay says "obligations created" / "{n} clients imported" regardless of count                                                                                                                              |
| Helpers                | `intake-files.ts` (782 L)    | 12 `unsupportedUploadMessage` branches + 2 fallbacks   | **None — all plain English**                                                                                                                       | Largest single i18n gap; these strings flow into the parse-error alert                                                                                                                                               |
| Helpers                | `mapping-target-labels.ts`   | ~50 field labels                                       | All `t`-tagged                                                                                                                                     | Solid                                                                                                                                                                                                                |

## 2. i18n bugs (untranslated strings + plural-form bugs)

**Untranslated strings reaching the UI** (highest priority — these are English-only regardless of locale):

- `Step1Intake.tsx:1141-1152` — `friendlyParseError` returns four hard-coded English strings (`"Paste or upload to continue."`, `"We couldn't find a header row..."`, `"XLSX couldn't be parsed..."`, `"We couldn't read that file..."`). Renders inside the parse-error `<Alert>` at L597.
- `intake-files.ts:139-165` — `unsupportedUploadMessage` returns 12 + 1 fallback strings, all plain English. Renders inside the parse-error alert via `onParseError(unsupportedUploadMessage(err.upload))` at `Step1Intake.tsx:307`.
- `intake-files.ts:215, 236` — `Could not read ${entryName}; it was ignored.` and `Selected ${selected.fileName} from ${candidates.length} readable files.` (warning manifest, surfaced at `Step1Intake.tsx:571`).
- `Step4Preview.tsx:122` — `row {err.rowIndex + 1}` rendered as a literal `<span>` for each bad row.
- `Step3Normalize.tsx:159` — `aria-label={`Normalized value for ${row.rawValue}`}`.
- `Step3Normalize.tsx:217` — `aria-label="Suggested tax types"`.
- `Step4Preview.tsx:63` — `aria-label="Safety"`.
- `Stepper.tsx:30` — `aria-label="Wizard steps"`.

**Plural-form bugs** (English plural baked into source — singular case reads wrong):

- `Step3Normalize.tsx:56` — `<Trans>We organized {normalize.rows.length} values — review if needed</Trans>` says "values" even when `rows.length === 1`.
- `Step3Normalize.tsx:245-249` — `<Plural value={cell.appliedClientCount} one={\`# ${entityType.toUpperCase()} × ${state} client\`} other={...}>`. The `one`/`other` strings use JS template interpolation of variables inside the Plural form; Lingui catalog extraction expects ICU placeholders, so the entity + state tokens won't be translatable as named variables.
- `Wizard.tsx:404` — ``t`${result.clientCount} clients, ${result.obligationCount} obligations created` `` (toast description). Both count nouns are baked.
- `Wizard.tsx:524` — ``t`${pendingRevert.clientCount} clients · ${pendingRevert.obligationCount} obligations removed` `` (revert toast).
- `Wizard.tsx:645` — `<Trans>obligations created</Trans>` (genesis overlay caption — singular case still says "obligations").
- `Wizard.tsx:648` — `<Trans>{genesis.clientCount} clients imported</Trans>` (same).

## 3. Concrete change list

Each line: `file:line | current | proposed | reason`.

- `Step1Intake.tsx:348` | `Where is your data coming from?` | (keep) | Strong intake hook. No change.
- `Step1Intake.tsx:363-369` | `Paste or upload — we'll figure out the shape. Columns like Estimated tax due, Owner count, or Owners give us a head start on payment and penalty context.` | `Paste or upload — any shape works. Columns like Estimated tax due, Owner count, or Owners help us flag penalty risk.` | Trim 8 words. "Give us a head start on payment and penalty context" is wordy and abstract; "flag penalty risk" is the actual user outcome.
- `Step1Intake.tsx:473` | `Drop CSV / Excel / ZIP / TXT / IIF here or click to choose · max 1000 rows · 5 MB` | Two lines: primary `Drop a CSV, Excel, ZIP, TXT, or IIF file` + secondary `Up to 1,000 rows · 5 MB` | Mixes file types with limits; "click to choose" is implied by the click affordance. Use 1,000 with comma for readability.
- `Step1Intake.tsx:527-530` | `The AI mapper runs first. Selecting an import template adds source context and provides default suggestions if AI is unavailable.` | `Pick a source to add context. The AI mapper runs either way; templates also fill defaults if AI is unavailable.` | Verb-led, drops "provides", clarifies the optional path. ~30% shorter.
- `Step1Intake.tsx:552` | `That file doesn't contain any rows. Upload a CSV, TSV, or XLSX with a header and at least one data row.` | `That file has no data rows. Add a header and at least one row, then re-upload.` | Action-led.
- `Step1Intake.tsx:543` | `We block SSN-like patterns before sending anything to the AI.` | (keep) | Reassurance copy reads well.
- `Step1Intake.tsx:595` | `Couldn't parse the input` | `Couldn't read your data` | "the input" is developer prose; "your data" is the user's mental model.
- `Step2Mapping.tsx:110` | `Review and confirm column mapping` | `Review the column mapping` | "and confirm" is the Continue button's job. Drop redundancy.
- `Step2Mapping.tsx:117-121` | `Average confidence 87% · EIN detected 100%` | `87% average confidence · EIN found` (omit when no EIN) | Leads with the number; "100% EIN detected" is binary, not a percentage — just say "found".
- `Step2Mapping.tsx:145` | `Automatic field matching is unavailable — using default suggestions` | `AI mapping unavailable` (alert title only; existing body explains the fallback) | Alert title should be punchy. Detail belongs in the description.
- `Step2Mapping.tsx:175` | `Couldn't map columns` (smart apostrophe) | (keep, but escape as `Couldn&apos;t map columns`) | Matches the `&apos;` style used at L595 of Step1 and elsewhere — consistent JSX escaping.
- `Step2Mapping.tsx:184-188` | `# column needs your review` / `# columns need your review` | (keep) | Good `<Plural>` usage.
- `Step2Mapping.tsx:208` | `Your column` (column header) | (keep) | Right voice.
- `Step3Normalize.tsx:56` | `We organized {n} values — review if needed` | `<Plural value={n} one="We organized # value — review if needed" other="We organized # values — review if needed" />` | Fix baked-in plural.
- `Step3Normalize.tsx:60-65` | `# value needs human review` / `# values need human review` | `# value needs review` / `# values need review` | "Human review" is awkward — the user is the human. Drop "human"; the Step 2 plural already uses "needs your review" (which is also fine, pick one).
- `Step3Normalize.tsx:72` | `Data cleanup warning` | `Couldn't organize some values` | Matches the wizard's "Couldn't…" alert pattern used elsewhere.
- `Step3Normalize.tsx:225-230` | `Default tax type suggestions apply only where imported rows do not already include tax types.` | `These defaults apply only to rows without tax types.` | 50% shorter. "Suggestions apply where rows do not include" is verbose; "apply only to rows without" is the same statement.
- `Step3Normalize.tsx:231-236` | `Penalty readiness is computed from the confirmed tax type plus any estimated tax due and owner count columns mapped in Step 2.` | Move to a help tooltip on the "Penalty readiness" concept, or drop entirely from this surface. | Too long for a step body — three nested concepts.
- `Step4Preview.tsx:30` | `Ready to import` | (keep) | Concise, verb-ready.
- `Step4Preview.tsx:33` | `You're about to create` | `You're about to create:` (terminal colon) — or rewrite as `This import will create` | Trails off into a list with no punctuation. Colon or "will create" both fix it.
- `Step4Preview.tsx:90` | `Ready to generate your deadline list` | `Ready to generate deadlines` | "Your deadline list" is two extra words. The CTA already says "Import & Generate".
- `Step4Preview.tsx:93-98` | `The numbers above are computed from your confirmed mappings, tax type suggestions, and active practice rules. Import & Generate will create clients, deadlines, evidence, and audit records.` | Split into two short lines, or move the second sentence to a tooltip on the CTA. | 38 words in one alert. Wizard alerts should be ≤ 20 words.
- `Step4Preview.tsx:122` | `row {err.rowIndex + 1}` | `<Trans>Row {rowNumber}</Trans>` (and capitalize "Row" — matches Step 2 BadRowsPanel L440 which already says `<Trans>Row</Trans>`) | Untranslated + lowercase inconsistent with Step 2.
- `Wizard.tsx:404` | ``t`${a} clients, ${b} obligations created` `` | Use `<Plural>` for each count, or compose two `<Plural>` calls | Singular case currently reads "1 clients, 1 obligations created".
- `Wizard.tsx:460` | `Import & Generate` | (keep) | Good. The `&amp;` HTML escape is correct since this is JSX text.
- `WizardShell.tsx:485` | `Preparing your mapping` | (keep) | Solid transition copy.
- `WizardShell.tsx:531` | `Generating your deadline list…` | `Generating deadlines…` | Same trim as Step 4.

## 4. Cross-step consistency findings

- **"AI Mapper" capitalization.** Step 2 badge (L284, 320) uses title-case `AI Mapper`; Step 1 body (L528) uses lowercase `AI mapper`; Step 1 SSN line (L543) uses `the AI`. Pick one — recommend lowercase `AI mapper` everywhere except where it's a proper-noun badge label. Step 1's body sentence and Step 2's "Re-run AI" button should agree.
- **Step body verb tense.** Step 1 title is interrogative ("Where is your data coming from?"), Step 2 is imperative ("Review and confirm column mapping"), Step 3 is past-tense ("We organized N values"), Step 4 is descriptive ("Ready to import"). Four different voices in four steps. Recommend imperative or descriptive throughout (e.g. Step 3 → "Review the organized values"). The Stepper labels are all noun-forms ("Intake / Mapping / Normalize / Dry run") which is fine as nav but doesn't anchor body copy.
- **"Review" target noun.** Step 2 plural says "columns need your review" (L185); Step 3 plural says "values need human review" (L62); the in-row badge says "Needs review" (L172, L277); Step 4 says "rows need attention" (L109). Four different phrasings for the same concept. Recommend `needs review` consistently — drop "your" (Step 2) and "human" (Step 3); switch Step 4 to "rows need review" too.
- **"Couldn't…" error voice.** Step 1 (L595, L604), Step 2 (L175) and the Wizard toasts (L197, L272, L345, L396, L516) all start `Couldn't <verb>`. Step 3 alert (L72) breaks the pattern with "Data cleanup warning". Recommend Step 3 → "Couldn't organize some values".
- **Apostrophe escaping.** Mostly `&apos;` inside `<Trans>` blocks (Step 1 L364, L504, L552, L595, L604; Step 2 L150, L156), but Step 2 L175 and the Wizard toast strings use the typographic apostrophe `'`. Either works in JSX text, but pick one for grep-ability.
- **Counts shown with `font-mono tabular-nums`.** Step 1 ready-count (L611), Step 2 confidence stats (L118-121), Step 4 list items (L38, L42) — all consistent and correct. No change.
- **Em-dash vs middot.** Wizard.tsx revert toast uses `·` separator (L524); Step 2 stats use `·` (L118); Step 1 upload hint uses `·` (L473). All consistent. Step 3 title uses `—` (L56) for an aside, which is correct usage.
- **Stepper labels vs. body headings.** Stepper says `Normalize`, Step 3 body says "We organized N values" — the user lands on a step labelled with a verb but reads a sentence in past tense. Either rename the Stepper step ("Cleanup" / "Review values") or change the Step 3 H2 to "Review organized values".
- **Preset names.** `PRESET_LABELS` (L38-50) and `SOURCE_PRODUCT_LABELS` (L82-95) duplicate the same product names. Risk of drift if one is updated. Not a copy bug, but worth flagging — these strings are vendor names so they aren't translated (correct), but they should share a single source.

## Summary

The wizard is in solid shape on i18n discipline overall — `<Trans>` / ``t` `` /
`<Plural>` are used consistently in the step bodies. The two real bugs are:
(1) `intake-files.ts` + `friendlyParseError` returning plain English error
messages, which leaks untranslated text into the user-facing alert; and (2)
six plural strings (Step 3 title, Step 3 matrix list, three Wizard toasts, the
genesis overlay) that bake the English plural form into either a `<Trans>` or
a ``t` `` template, so the singular case reads ungrammatically.

The copy itself is mostly tight, but Step 3 and Step 4 each carry one 30+ word
alert/paragraph that should be split, trimmed, or moved to a tooltip. The
biggest cross-step polish wins are voice consistency (Step 3's past-tense H2
is the outlier) and unifying "needs review" / "needs your review" / "needs
human review" / "needs attention" to a single phrase.
