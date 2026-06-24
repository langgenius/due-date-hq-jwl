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

## Native endpoint — `POST /api/leads` (built)
Built the lead-capture endpoint on the product server (chosen over a 3rd-party form
service):
- **`packages/db`**: `marketingLead` schema (`src/schema/marketing-lead.ts`) +
  hand-written migration **`0080_marketing_lead.sql`** (resolves via the existing
  `./schema/*` wildcard export — no barrel change).
- **`apps/server`**: `routes/leads.ts` — public `POST /api/leads`: null-guard →
  honeypot (`_gotcha` non-empty → silent ok, no write) → zod validation (name 1..200,
  email, capped optionals, tools[] ≤20×80) → Drizzle insert (id uuid + `cf-connecting-ip`
  + UA) → `{ok:true}`; try/catch via `logServerError` → 500. Mounted in `app.ts`
  right after `/api/demo` with permissive no-credentials CORS (POST/OPTIONS) +
  `rateLimitMiddleware`. Test `routes/leads.test.ts` (valid insert / honeypot drop /
  bad email → 400) passes; `@duedatehq/db` + `@duedatehq/server` typecheck clean.
- **Marketing form**: defaults `formAction` to `getAppHref('/api/leads')` (the
  app/server origin; `PUBLIC_QUESTIONNAIRE_ACTION` still overrides). Submit is now
  enabled; JS fetch-POSTs JSON + swaps the form for an inline thank-you; native POST
  is the no-JS fallback. Verified: submit intercepts (no navigation), fetch fires,
  error state on failure, success panel on `{ok:true}`.

## ⚠️ To go live (deploy steps the team owns)
1. **Apply the migration**: `pnpm db:migrate:remote` (and `pnpm db:migrate:local`
   for local) — table `marketing_lead` doesn't exist until applied.
2. **Deploy `apps/server`** (the new route) and the marketing site.
3. (Optional) override `PUBLIC_QUESTIONNAIRE_ACTION` if you'd rather post to a Tally/
   Formspree form than the native endpoint.
4. (Optional next) read leads — they're rows in `marketing_lead` (D1); add an admin
   view or an email-on-new-lead later.

## Verified
All routes 200 (incl. both new `/get-started`). Form: 14 fields, name+email required,
submit disabled (no endpoint), `:has(:checked)` tint works, back-link → /pricing.
Home hero CTA → `/get-started`; no "Start free" left on home; Pricing promo + CTA
present. EN + zh parity.
