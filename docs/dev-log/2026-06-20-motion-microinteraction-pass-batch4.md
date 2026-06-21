# App-wide motion / micro-interaction pass — batch 4

_2026-06-20 · continuation (batches
[1](2026-06-20-motion-microinteraction-pass.md) /
[2](2026-06-20-motion-microinteraction-pass-batch2.md) /
[3](2026-06-20-motion-microinteraction-pass-batch3.md))_

The clean low-risk remainder from the [catalog](../Design/motion-microinteraction-catalog-2026-06-20.md):
app-wide press feedback on the toggle primitives + a sweep of single-class feedback
transitions and `animate-in` entrances. All on-grammar, all reduced-motion-safe, no
new imports, no `AnimatePresence`.

## Shipped (13)

App-wide primitives (press feedback, matches the Button's `active:scale`):

- **Segmented** — `active:scale-[0.97]` on segments
- **ToggleChip** — `active:scale-[0.97]`
- **Switch** — explicit `duration-150` on the thumb (documents intent)

Call-sites:

- **Login** field errors — fade + 1px slide-in on appearance (both OTP + email errors)
- **EmptyState ghost-card deck** — fade + slide-in entrance
- **ClientsEmptyState** "Explore with sample data" chip — arrow nudges on hover +
  press scale
- **DeadlineRow** "Filed" affirmation — zoom-in when a row goes terminal
- **ClientSummaryStrip** clickable stat cells — `active:scale-[0.99]` press
- **ChecklistItemRow** — `transition-colors` → `transition-all` (catches the
  received-state decoration change)
- **EntityAuditActivityPanel** rows — hover tint for scannability
- **Rules DisclosureCard** body — fade + slide-in on expand
- **Onboarding StepDots** — `transition-colors` on the active dot

## Skipped (with reason)

- Sources coverage-row hover tint — those rows aren't clickable; a hover-bg would
  imply false interactivity.
- Wrapping the prominent EmptyState root for an entrance — would double-animate the
  ghost-deck that already animates.

## Verification

tsgo 0; build green; no new i18n strings. These are single-class additions of the
same `active:scale` / `transition-*` / `animate-in` recipes used throughout the app.

## Deferred tail (still in the catalog — needs live verification)

The genuinely medium-risk remainder is `AnimatePresence` exit/height + keyframe work:
FloatingActionBar exit, clear-filters width-collapse, previous-stages height
accordion, post-accept rule-row exit-slide, RuleYearDiff/Splash/NextStep staggers,
sources tbody crossfade, StatusRing SVG-arc fill, the in-drawer apply-success
celebration, AuditKpiStrip count-bump keyframe, CollapsibleSearch width. These want
reliable live verification (jank/exit-timing risk) — left in the catalog rather than
shipped blind while the preview harness is flaky on opening drawers.
