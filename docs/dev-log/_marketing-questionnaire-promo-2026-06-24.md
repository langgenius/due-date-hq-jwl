# Marketing — questionnaire promo ("3 months of Team free") (2026-06-24)

Pricing-strategy change (team decision): **DueDateHQ is no longer framed as "free
during the beta."** Pricing is real; the path to free is a short **questionnaire →
3 months of the Team plan free**, framed as a *launch campaign* (not a "free
period") so there's no awkward "free period ended, now pay" moment later. Decision
to **reframe site-wide** (not just Pricing) and to **build the form**.

This supersedes the old locked "beta-free / nothing to pay today" stance.

## What changed

### New page — `/get-started` (+ `/zh-CN/get-started`)
- `components/GetStartedPage.astro` (locale-aware) + thin EN/zh route wrappers.
- Offer hero (`Launch offer` · "Get 3 months of Team, free.") + a short,
  low-friction form: name + work email (required), firm, practice focus (radio),
  tools used (checkboxes), one optional pain-point textarea. Accessible
  (fieldset/legend, labels, focus rings); selection state via `:has(:checked)`
  (accent tint + filled box). On-brand `--m-*` + `.m-cta` submit.
- **Submission**: the marketing site is **static** (Cloudflare static assets, no
  backend), so the `<form method="POST">` posts to a **configurable endpoint** —
  `PUBLIC_QUESTIONNAIRE_ACTION` (a Tally / Formspree / Getform / Worker URL the
  team owns; that's their account + their lead data). Includes a hidden `source`
  field + a honeypot (`_gotcha`). **Until the env is set, the submit is disabled
  with an honest "opens shortly" note** — no dead-end POST.

### Reframe (EN + zh)
- **Hero**: 4th bullet "Free during the beta — no card" → "3 months of Team, free —
  just tell us about your practice"; primary CTA "Start free" → "Get 3 months free".
- **Close**: primary CTA → "Get 3 months free"; trust row → ["3 months of Team,
  free", "No card to start", "Data stays in your practice"].
- **Pricing**: beta note reframed ("Pricing is real — … your first 3 months on the
  Team plan are free. No card to start.") + a "Get 3 months free →" CTA in the note;
  tag "Beta" → "Launch offer". Plan cards / checkout wiring untouched.
- **Nav**: CTA label "Start free" → "Get started".

### CTA repointing
- Added `getStartedHref(locale)` to `lib/app-url.ts` (→ `/get-started`).
- The "start" CTA across every page (nav + home hero/close) now points to
  `/get-started`, not the app signup. Swapped `getCtaHref` → `getStartedHref` in all
  `src/pages/**` except `legacy.astro` (preserved old page keeps the app link).
  Sign-in still → app login (`getAppHref('/login')`).

## ⚠️ One thing the team must do to go live
Set **`PUBLIC_QUESTIONNAIRE_ACTION`** (in wrangler/env) to a real form endpoint:
- Easiest: create a **Tally** or **Formspree** form, paste its POST URL. The fields
  post as `name`, `email`, `firm`, `focus`, `tools` (multi), `pain`, `source`.
- Or I can add a lead-capture **Worker** endpoint to `apps/server` (bigger; PII
  handling — would want a privacy note). Until set, the form shows "opens shortly".

## Verified
All routes 200 (incl. both new `/get-started`). Form: 14 fields, name+email required,
submit disabled (no endpoint), `:has(:checked)` tint works, back-link → /pricing.
Home hero CTA → `/get-started`; no "Start free" left on home; Pricing promo + CTA
present. EN + zh parity.
