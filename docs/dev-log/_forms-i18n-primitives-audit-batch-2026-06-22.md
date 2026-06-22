# Forms / i18n / primitives audit batch — 8 vetted fixes

**Date:** 2026-06-22
**Surface:** `features/clients/CreateClientDialog`, `routes/settings.profile`,
`features/members/members-page`, `routes/rules.library`, `lib/utils`,
`primitives/value-diff`, `primitives/duotone-icon`,
`patterns/detail-section-card`, `patterns/empty-state`,
`features/notifications/notification-preferences-page`, `patterns/stat-band`

Net-new fixes from the 45-lens design-audit skill. Each was vetted against the
canon (tokens, fixed radius scale 4/8/12/999, form labels via `htmlFor`/`id`,
i18n via Lingui / Intl-locale).

## 1. Four unlabeled form selects (a11y)

- **CreateClientDialog** — the Entity-type and Importance `SelectTrigger`s had
  no programmatic label (their `FieldLabel`s lacked `htmlFor`). Added
  `id="client-entity-trigger"` / `id="client-importance-trigger"` + matching
  `htmlFor`, mirroring the already-correct Assignee select in the same file.
- **/settings/profile** — Language + Date-format selects were named only by a
  visual `<span>`. Gave the local `Field` an optional `htmlFor` (renders a real
  `<label>`), threaded an `id` prop through `LanguageSelect` / `DateFormatSelect`
  to their triggers (`settings-language-trigger` / `settings-date-format-trigger`).

## 2. Invite-member dialog autofocus

`members-page` invite dialog — the "Work email" Input now `autoFocus`es, matching
CreateClientDialog + the onboarding forms (dialog opens ready to type).

## 3. Third "review" hue removed (brand)

`rules.library` needs-review row tinted with hardcoded `orange-50/60` while every
other review signal uses the canonical violet. Swapped to `bg-status-review-tint/60`
(written as a literal, not `${REVIEW_BG_TINT_CLS}/60`, so the JIT scanner keeps the
utility) and corrected the comment. Verified the violet 60% utility lands in the
built CSS.

## 4. Locale-aware relative/date time (live zh-CN i18n bug)

`lib/utils` — `formatRelativeTime` returned hardcoded English ("just now",
"3h ago"); `formatDateTimePretty` + `formatDateTimeWithTimezone` hardcoded
`'en-US'`. All now pass `intlLocale()`; `formatRelativeTime` rewritten on
`Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' })` — no new catalog
strings, phrasing follows the active locale (zh-CN: "现在" / "3小时前"). Bucket
semantics unchanged. Under `en`, `intlLocale()` resolves to `'en-US'`, so the
existing utils tests (UTC / PDT assertions) stay green.

## 5. rounded-md (6px) → scale radius in primitives

6px is reserved-unused (scale is 4/8/12/999). Replaced `rounded-md`→`rounded-sm`
in the three fan-out primitives: `value-diff` compact chip, `duotone-icon` sm
chip, `detail-section-card` index badge.

## 6. EmptyState docstring + over-wide measure

Rewrote the docstring (described non-existent `empty`/`filtered`/`error`
variants) to the shipped API (`default | prominent`, `density`, `visual`). The
prominent description measure went `max-w-[560px]` (~80ch) → `max-w-[60ch]`,
under the 75ch readability ceiling.

## 7. Notification toggle — real optimism

`notification-preferences-page` removed the Save button claiming "optimistic",
but the Switch bound to server truth with no `onMutate`, so the thumb only moved
after the round-trip. Added a true optimistic write: `onMutate` cancels in-flight
fetches, snapshots, and patches the cache immediately; `onError` rolls back to the
snapshot then re-invalidates to truth. Key is reused from the query's own
`queryOptions.queryKey`.

## 8. StatBand proportion-bar labeling (data-viz a11y)

`stat-band` segments were color-only and `role="img"` could be unlabeled. Each
segment now carries a `title` ("N label"); the bar's accessible label falls back
to a "N label, …" summary from the segments when no `proportionBarLabel` is
supplied, so the bar is never an unlabeled image.

## Verify

- `pnpm -F @duedatehq/app exec tsgo --noEmit` — rc 0
- `pnpm exec vp run @duedatehq/app#build` — rc 0 (new violet-tint + 60ch
  utilities confirmed in `dist`)
- affected unit tests (`lib/utils`, `notification-preferences-page`) — 13 passed
