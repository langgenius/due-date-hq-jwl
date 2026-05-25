---
title: 'Commit 4: D-5 Work section flat + D-3 cont positive status chip'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Client detail — flatten Work + positive chip primitive

Fourth commit from `docs/Design/clients-list-and-detail-critique-2026-05-22.md`.
Two visual-only changes that share the same detail-page surface.

## D-5 — Drop the outer card frame on the Work section

### Before

```
[ Work  ▾ ]                                    ← collapsible card header
└─ [ Filing plan card ]                        ← inner card
   [ Compliance posture card ]                 ← another inner card
   [ CONFIGURE label ]
     [ Import source ▾ ]
     [ Suggested forms (duplicate!) ]          ← bug — rendered both here AND in DISCOVER
     [ Filing jurisdictions ▾ ]
     [ Risk profile ▾ ]
     [ Onboarding state ▾ ]
   [ DISCOVER label ]
     [ Suggested forms ▾ ]
     [ Future business cues ▾ ]
```

Three levels of nested cards. The outer "Work" wrapper was a
collapsible header that nobody collapses — daily-driver content
shouldn't sit behind a progressive-disclosure gate.

### After

```
Filing plan card
Compliance posture card

CONFIGURE                                       ← flat section label
  Import source ▾
  Filing jurisdictions ▾
  Risk profile ▾
  Onboarding state ▾

DISCOVER
  Suggested forms ▾
  Future business cues ▾
```

Concrete changes:

1. **Dropped the outer `<DetailSection title="Work">`.** Its children
   render directly in the page body.
2. **Retired the `?work=open` URL state.** No longer needed; the
   `useQueryState('work', …)` hook + `isWorkOpen` derivation are
   gone.
3. **Bug fix: deduped `SuggestedFormsCatalogPanel`.** Previously
   rendered twice — once bare inside CONFIGURE, once inside a
   `Suggested forms` DetailSection in DISCOVER. The bare instance
   came from an earlier copy-paste that never got cleaned up. Now
   it only lives in DISCOVER, where its semantics fit (reference
   surface, not a daily edit).
4. **Inner CONFIGURE / DISCOVER DetailSections stay.** Those are
   intentional collapsibles — editing surfaces a CPA visits during
   onboarding + quarterly, not daily. Their per-section collapsible
   behavior is correct.
5. **Activity section unchanged.** Activity stays a URL-bound
   collapsible (default closed) because it lazy-loads heavier AI
   summary + audit log queries.

### Visual rhythm

The page body now reads top-to-bottom in one scan:

```
Header (title + chips + actions)
Source meta (quiet)
Active alerts (when present)
Summary strip
─────────────────────────────────────
Filing plan          ← daily read, no chrome
Compliance posture   ← daily read, no chrome
─────────────────────────────────────
CONFIGURE
  (collapsible editing surfaces)
─────────────────────────────────────
DISCOVER
  (collapsible reference surfaces)
─────────────────────────────────────
Activity ▾           ← lazy, collapsed
```

No nested cards.

## D-3 cont. — Positive status chip primitive

The "All on track" subtitle chip used to render as an inline span
with `text-text-success` + check icon. Now it uses the existing
`Badge variant="success"` primitive — same visual, but consumes the
shared design token instead of ad-hoc utility classes.

Why this matters: the design system already has `success` /
`warning` / `destructive` Badge variants, but the app was relying
on "absence of red" as the implicit positive in many places. Using
the primitive in the most visible positive moment (detail subtitle)
sets the pattern for sweep elsewhere — queue empty state, rule
library "in good standing", etc. Those are tracked in P1 of the
sequencing doc; this commit is just step 1.

## Files

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Removed outer `<DetailSection title="Work">` wrapper around
    Work-tab content
  - Retired `workOpenParam` / `setWorkOpenParam` / `isWorkOpen`
    state
  - Removed the duplicate `<SuggestedFormsCatalogPanel>` in
    CONFIGURE; kept the wrapped one in DISCOVER
  - Switched the `All on track` subtitle node from inline span to
    `<Badge variant="success">`
- A this dev-log

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app i18n:compile --strict` → clean (no
  new strings; existing translations untouched)
- Manual:
  - Open any client detail page → Work content renders flat below
    the alerts section, no outer "Work ▾" header
  - `?work=open` / `?work=closed` URL params are noops now (the
    state hook is gone)
  - CONFIGURE has 4 collapsibles (no duplicate Suggested forms)
  - DISCOVER has 2 collapsibles, Suggested forms lives here
  - Activity section still collapsible, default closed
  - Client with zero overdue: subtitle shows `[✓ All on track]`
    badge (proper success-tinted chip, not raw text)

## What's left in the sequencing doc

P0 items:

- L-9 STATE ALERT banner → toggle (only applicable on /clients
  list; depends on whether the banner even renders today — verify
  in next commit before scoping)

P1 batch:

- L-2 Fix-now batch flow
- L-5 Next-due composite cell split
- L-6 Drop ENTITY + TIER columns
- D-2 sidebar counts
- D-6a filing-row hover quick actions
- D-6b status chip → picker popover

P2 backlog stays as-is.

## What's next

Commit 5 (recommended): verify L-9 banner state, then move into the
P1 batch. The L-2 "Fix now" flow is the biggest unknown — it touches
both client and obligation surfaces and might warrant its own
discovery pass before implementation.
