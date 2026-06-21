# Bolder design proposals 1–5

_2026-06-22_

The five greenlit "bolder" proposals from the post-audit shortlist (6–7, the
data-dependent heatmaps, are held until the underlying data is verified). Two of
the five turned out to be **largely already shipped** by prior onboarding/empty-
state/motion work, so those became *increments* rather than net-new builds —
called out below honestly rather than re-pitched.

## 1 · First-run headline — bigger welcome

The first-run chooser (`routes/dashboard.tsx`) already had a warm header (a "Get
started" eyebrow + a 32px `text-section-title` h2 + a friendly subtitle) — it does
**not** read like a form, so the proposal's premise was stale. The genuine
increment: bump the headline one tier to `text-display-large` (36px) for real
first-run hero presence on the otherwise-empty dashboard. (Token is registered in
the tailwind-merge font-size group + present in the prod CSS — no `cn()` strip.)

## 2 · Snappier detail-header transition

`obligations/queue/ObligationQueueDetailDrawer.tsx` — the page-mode hero header +
its title carried `transition-all duration-300`. Tightened both to `duration-200`
so the hero collapse on scroll feels responsive rather than sluggish. Pure class
change.

## 3 · Hero countdown "comes alive" — NOT digit-counting

The proposal wanted the overdue hero number to "tick up" on load. **Rejected the
literal version**: the value is rendered by the shared `DueCountdownText`
primitive with the digit baked inside an i18n `<Plural>` ("#d late") — counting it
would fork the "one primitive, one truth" vocabulary AND break translation, and a
*counting overdue figure* trivializes a serious signal (against "urgency gets
size, not gimmicks"). Delivered the spirit instead: the overdue hero countdown
gets a brief scale + fade settle on mount (a `motion.span`, `MOTION_DURATION.enter`
/ `EASE_APPLE`), so it reads as present without the gimmick or the i18n break.

## 4 · Apply "audit seal" — enhanced the just-shipped celebration

The apply-success celebration shipped earlier today as a calm green "Applied".
This elevates it to the bolder proposal: the check now **stamps down like a seal**
(`scale 1.6→1` + a slight rotate settle) over the row's fade, and the line names
the win — **"Applied to N clients"** (the real `appliedCount`, via `<Plural>`).
`AlertDetailDrawer.tsx` threads `appliedCount` into `DrawerActions`. zh-CN
translated.

## 5 · All-clear navy skyline — atmosphere behind the coffee

The `/today` all-clear (`dashboard/merged-brief-card.tsx`) already had the
"coffee, not confetti" celebration. Rather than replace it, added a **faint navy
skyline at rest** behind it — a decorative, `aria-hidden` SVG anchored at the
bottom, `--color-brand-ink` at 0.07 opacity, masked to fade upward so it never
competes with the coffee disc or the copy. "The firm's city, quiet, nothing on
fire."

## Verification

`tsgo` 0 · `i18n compile --strict` 0 (one new string, zh-CN translated: "Applied
to # clients" → "已应用到 # 个客户") · production build green · **app tests 550
passed / 2 skipped** (baseline). Live: `/today` + `/deadlines` render with a clean
console. The motion beats (hero settle, seal stamp) and the gated empty-states
(first-run headline, all-clear skyline) are build/test/pattern-verified rather
than filmed — they only appear behind specific account states the demo doesn't
hit, the same honest harness limitation noted across the motion batches.

## Held

Proposals **6** (week-at-a-glance StatusRing heatmap) and **7** (jurisdiction
exposure heatmap) need verified per-day / per-jurisdiction aggregation before they
can be built without fiction — left pending a data check.
