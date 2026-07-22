---
title: 'Marketing hero — "rule change" repositioning + keyword strip'
date: '2026-07-21'
area: marketing
---

# Marketing hero — "rule change" repositioning + keyword strip

Email-referral visitors were bouncing without scrolling. Diagnosis: the hero H1 said
"Deadline monitoring for US CPA firms" — the exact category a CPA's existing software
already claims, so the 5-second read was "I already have this." The differentiator
(watching sources for changes + naming affected clients) never surfaced above the fold.

## What changed

- **H1** → "Catching every _rule change_. Naming every affected client." Progressive
  verbs carry the always-watching feel; "rule change" (not "deadline") avoids both the
  tracker category and the too-narrow deadline framing; "naming" carries the precision.
- **Subhead** → "The moment the IRS, a state, or FEMA publishes a change, DueDateHQ
  tells you exactly which clients are hit — and applies the new dates in one click."
  The onboarding promise (paste list, ~10 min) stays.
- **Keyword strip** — revived the orphaned `.hero__points` (CSS + data existed; markup
  had been dropped) as a full-width 3-column band under the hero: the canonical feature
  nouns each paired with a product adjective — Rule-change detection (proactive) ·
  Client impact matching (precise) · One-click apply (traceable). Inspired by how
  File In Time anchors its category keywords as an on-page strip.
- **Title/meta** aligned to the H1 (email link previews pull these — message match).
- **Villain**: "A deadline moves —" → "A rule changes —". **Compare**: "when the rules
  themselves change" + footnote. zh-CN mirrored throughout.

## Canonical vocabulary (agreed with Jerry, 2026-07-21)

Feature nouns: rule-change detection · client impact matching · risk triage ·
one-click apply (apply to clients) · multi-state coverage · readiness checks.
Product adjectives: proactive · precise · traceable.
Avoid: "deadline monitoring/tracking" (tracker category), bare "alert monitoring"
(commodity), "predictive" (overclaim), "radar" (banned).

## Follow-up (same day)

- Coverage badge confirmed by Yuqi as "全部都覆盖了" → now `IRS · 50 states · DC · FEMA`
  (en + zh).
- Outreach audit: every claim in touches 1–3 and the REPLY playbook checked against
  shipped capabilities — all true (watches IRS/states/FEMA, official notice per change,
  one-click update, ~10-min onboarding, free in beta). One correction: the touch-1
  template (v12 → v13 in `send-outreach.mjs`) still led with "deadline monitoring" /
  "moves a filing deadline" — now "rule changes, matched to your affected clients" /
  "changes a rule or moves a deadline", message-matching the new hero. CSV Subject1
  values are vestigial (track detection only); the script subject governs all touch-1s.

## Open

- A/B candidate for the disaster pages: "FEMA declared a disaster… which of your
  clients qualify?" (kept off the homepage).

## CTA unification pass (same day)

Audit found three drifts against the two-tier button system (`.m-cta` pill for
hero/finale-level CTAs, `.m-btn` dense 8px for page-level):

- **FoundingBanner `.fb-bar__cta`** — used `--m-brand` (reserved for the wordmark
  per the token contract) with an 8px radius next to pill nav CTAs. Now: accent
  fill, pill radius, weight 500, system hover — joins the compact-pill family
  (same 7px/14px tier as `.nav__cta`).
- **WorksWithStack CTAs** — hand-rolled pill duplicating `.m-cta` at 12px/22px.
  Replaced with `.m-cta m-cta--primary` / `m-cta--ghost`; one-off CSS deleted.
- **TrustPage `.trustpg__close-btn`** — `.m-btn` metrics but 20px inline padding;
  aligned to 18px + token-based transition (kept as the on-dark inversion).

Exempt by design: `.nav__cta` scroll choreography (commented intent),
`.mini__applybtn` (product-mock UI, not a marketing CTA), `.pr__toggle-btn`
(control). Verified in dev: banner/nav/hero/WWS CTAs all share accent #22488c,
pill radius, weight 500, in two size tiers (15px hero · 13px bars).
