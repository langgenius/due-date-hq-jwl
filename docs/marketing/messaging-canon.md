# Marketing Messaging Canon — DueDateHQ

Living source of truth for the words the marketing site uses about itself.
Structure/architecture lives in `docs/dev-file/12-Marketing-Architecture.md`; this
doc owns the message layer. Last full alignment: 2026-07-22 (hero repositioning +
two audit sweeps; see dev-log `2026-07-21-marketing-hero-rule-change-repositioning.md`).

## 1. Category & core rule

- **Category self-description: `rule-change monitoring`** (for US CPA practices).
- **The object/event rule:** _deadline_ is the **object** (the thing that has a
  source and gets applied to clients); _rule change_ is the **event** (what we
  catch). "Catches when the IRS, a state, or FEMA **changes a rule or moves a
  deadline**" — never "deadline monitoring" as the category.
- Why: "deadline monitoring/tracking" is the passive-tracker category every CPA
  already owns (File In Time et al.). Email-referral visitors bounced on the old
  hero because it read as "I already have this."

## 2. Canonical vocabulary

**Feature nouns** (one canonical name per capability; do not synonym-drift):

| Noun                   | What it names                                                            |
| ---------------------- | ------------------------------------------------------------------------ |
| rule-change detection  | watching IRS / 50 states / FEMA and catching what changed                |
| client impact matching | mapping each change to the specific clients on the roster                |
| risk triage            | urgency-ranked ordering (URGENT/HIGH…) of what to handle first           |
| one-click apply        | pushing the new dates to every affected client (a.k.a. apply to clients) |
| multi-state coverage   | IRS + all 50 states + DC + FEMA                                          |
| readiness checks       | per-filing readiness status                                              |

**Product adjectives:** `proactive` · `precise` · `traceable`
(each pairs with a noun on the hero strip: detection→proactive, matching→precise,
apply→traceable).

**Banned / avoid:**

- `deadline monitoring` / `deadline tracking` as self-category (tracker box) —
  _exception:_ deliberately-targeted SEO surfaces may keep the searched phrase
  (QuickBooks-guide title/H1, state-page titles, URL slugs). Never in
  self-descriptions, schema, llms.txt, or OG art.
- bare `alert monitoring` (commodity — every tool alerts; ours _name the client_)
- `predictive` / `forecasting` (we read published changes; we do not predict)
- `radar` (brand-banned)
- house verbs on how-it-works stay `Watch · Match · Rank · Apply`.

## 3. Current canonical copy (en)

- **H1:** `Catching every rule change. Naming every affected client.`
- **Coverage badge:** `IRS · 50 states · DC · FEMA`
- **Subhead:** `The moment the IRS, a state, or FEMA publishes a change, DueDateHQ
tells you exactly which clients are hit — and applies the new dates in one click.`
- **Keyword strip:** Rule-change detection — proactive, the moment it publishes ·
  Client impact matching — precise, down to the client · One-click apply —
  traceable, source on every date
- **Org slogan / footer tagline:** `Rule-change monitoring for US CPA practices —
with a source on every date.`
- **Close finale (hero bookend):** `Next time a rule changes, you'll know exactly who.`
- zh-CN mirrors all of the above (hero: 抓住每一次规则变动。点名每一个受影响的客户。).
- Disaster-page A/B candidate (NOT the homepage): "FEMA declared a disaster…
  which of your clients qualify?"

## 4. Mirror surfaces — update ALL of these when the core message changes

The 2026-07-22 audits found the hero had ~20 stale mirrors. Checklist:

1. `Hero.astro` (en + zh: head, badge, sub, points)
2. `Close.astro` finale (serif bookend of the hero)
3. `Villain.astro` opening line
4. `Compare.astro` lead + footnote
5. `Creed.astro` (statement pair)
6. Footer tagline (`Footer.astro`, en + zh)
7. `index.astro` title + meta description
8. `how-it-works.astro` H1 + title + meta
9. `Pricing.astro` recap cards
10. Site meta defaults + org description: `src/i18n/en.ts`, `src/i18n/zh-CN.ts`
11. JSON-LD: `src/lib/structured-data.ts` (ORG_SLOGAN, Service name/serviceType,
    productDescription)
12. GEO identity: `src/pages/llms.txt.ts` + `llms-full.txt.ts`
13. Long-tail bodies: `src/lib/seo-content.ts` (comparison / alternatives / guides;
    self-descriptions only — keep targeted titles/slugs)
14. `works-with-your-stack` page + component (meta, CTA title, en + zh)
15. **OG images**: copy lives in `apps/marketing/scripts/generate-og.mjs` →
    `node scripts/generate-og.mjs` to regenerate `public/og/*.png` (what email &
    social previews render)
16. Outreach templates: `outreach-kit/send-outreach.mjs` (touch subjects/bodies
    must message-match the hero — v13 aligned)

Sweep command (variants matter — hyphen forms escaped one round):
`grep -rniE 'deadline[- _]?(change )?(monitoring|tracking)' src/ dist/`

## 5. Integrity notes

- Product Hunt badge removed 2026-07-22 (launch withdrawn 07-06; a "featured"
  badge claimed a status we don't hold). Restore only with a real live launch.
- Every claim on the site must trace to shipped capability (only-show-shipped).
- CTA button system: two tiers — `.m-cta` pill (hero/finale-level) and `.m-btn`
  dense 8px (page-level); compact-pill tier (7px/14px) for bars (`.nav__cta`,
  `.fb-bar__cta`). `--m-brand` is wordmark-only; CTAs use `--m-accent`.
  Exempt by design: nav scroll choreography, product-mock buttons, controls.
