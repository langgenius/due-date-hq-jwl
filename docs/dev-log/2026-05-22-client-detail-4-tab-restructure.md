---
title: 'Detail body: 4-tab restructure (Work / Client info / Discover / Activity)'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Detail body — sections → 4 tabs

Yuqi flagged:

> Compliance posture 算是 client info 吗? 你认为放到 Tab 里面会是更
> 好的设计展示方式吗?

Answer: yes to both. Compliance posture (EIN, tax year, owners,
activity-scope flags) is identity / configuration — client info, not
daily work. And the body has outgrown the flat-stacked-collapsibles
shape: too many sections, daily-driver content buried under
quarterly-edit content. This commit pivots the body to a 4-tab layout.

## Reversing the earlier V14 decision

V14 (2026-05-22 earlier) chose sections-not-tabs explicitly. Two
objections it had to tabs:

1. **Tabs hide count info.** Fixed: tab labels carry an attention
   chip (status dot today; counts in future).
2. **Daily-driver shouldn't be behind a click.** Fixed: default to
   the Work tab + URL-bind so deep links land on the right tab. The
   daily user lands on Work every time, no extra click.

Plus the body kept growing — V14's flat layout was already 7+
collapsibles before factoring in the Activity wrapper. Past that
density, tabs separate concerns better than scroll.

## The 4 tabs

```
ALERTS                  ← global signal, ABOVE tabs
SUMMARY STRIP           ← Next due / At risk, ABOVE tabs

[Work *]  [Client info • ]  [Discover]  [Activity]
```

- **Work** (default) — Filing plan. What CPAs hit 90% of the time.
- **Client info** — Compliance posture (EIN / tax year / owners /
  scope flags) + Filing jurisdictions + Risk profile + Onboarding
  state + Import source. The "who is this client?" tab. Attention
  dot appears on the label when readiness has missing required
  facts.
- **Discover** — Suggested forms + Future business cues. Reference /
  future-business surfaces. Suggested forms is `defaultOpen` since
  it's the primary content of this tab.
- **Activity** — AI summary (default open) + Notes block + Audit
  log. Heavier queries gate on the tab being active.

Alerts + summary strip stay **above** the tabs — they're global
"is something wrong with this client?" signals that apply
regardless of which tab is open.

## URL contract

- `?tab=work` (default)
- `?tab=info` — drop here from Quick-fix flow when `Needs filing
state` chip is clicked (later — current chip still scrolls to
  `client-filing-jurisdictions`)
- `?tab=discover`
- `?tab=activity`

The earlier `?work=open` / `?activity=open` URL params are retired;
their state no longer exists. Single `?tab=...` replaces both.

## Compliance posture relocation

Compliance posture used to live in the daily-driver area right
under the filing plan. It's now in **Client info**, treated as
identity facts (which it is). The CPA who needs to verify
"is this client's Foreign Accounts flag on?" or "what's their EIN?"
opens the Client info tab — those questions aren't part of the
"what do they owe?" daily read.

## Files

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Replaced `?work=open` + `?activity=open` query state with a
    single `?tab=work|info|discover|activity` (default `work`)
  - Added `Tabs / TabsList / TabsTrigger / TabsContent` imports
  - Restructured the body into 4 tabs
  - Moved `ClientCompliancePosturePanel` from Work area → Client
    info tab
  - Moved CONFIGURE sub-sections (Import source / Filing
    jurisdictions / Risk profile / Onboarding state) → Client info
    tab (no more CONFIGURE / DISCOVER `SectionLabel` rows)
  - Moved DISCOVER sub-sections (Suggested forms / Future business
    cues) → Discover tab
  - Moved Activity sub-content (AI summary / Notes / Audit log) →
    Activity tab; dropped the now-redundant outer Activity
    DetailSection wrapper
  - Attention dot on Client info tab when `missingFilingState`
- M en + zh-CN messages (3 new strings — `Work` / `Client info` /
  `Discover` — translated)
- A this dev-log

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app i18n:compile --strict` → clean
- Manual:
  - Open any client → lands on Work tab, sees Filing plan only
  - Switch to Client info → sees Compliance posture (heavier panel)
    - 4 config DetailSections collapsed
  - Client info tab has a red dot when `Needs filing state`
  - Switch to Discover → Suggested forms expanded by default,
    Future business cues collapsed
  - Switch to Activity → AI summary expanded, Notes inline, Audit
    log collapsible
  - Deep-link `/clients/[id]?tab=info` lands on Client info
    immediately
  - Active alerts + summary strip stay above the tabs regardless
    of which tab is active

## What's NOT in this commit

- **Tab counts beyond the readiness dot.** Future polish: show
  "Discover (3)" when 3 suggested forms could be adopted. Hook into
  `SuggestedFormsCatalogPanel`'s gap count.
- **Updating the IA doc** to reflect the tab pivot. The current
  `client-page-information-architecture.md` still describes V14
  sections; needs a v2 amendment recording this commit's
  rationale. Tracked as follow-up.
- **The user-journey strategic doc** (separate effort).
  `clients-user-journey-2026-05-22.md` still queues the
  workspace-vs-dashboard question; tabs don't resolve that — they
  organize content within whichever model is chosen.

## What's next

- IA doc amendment (separate doc commit, no code)
- Tab counts (`Discover (3)`, `Activity (12 events)`)
- Sweep other surfaces for filter-vs-badge per the contract doc
- Sequencing doc's remaining P1 batch (next-due cell split,
  ENTITY+TIER column trim, etc.)
