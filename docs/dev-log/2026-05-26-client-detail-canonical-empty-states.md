---
title: 'Client detail: canonical empty-state shape across tab bodies'
date: 2026-05-26
author: 'Yuqi pairing with Claude'
area: ux
---

# Client detail — empty states normalized

Critique sources:

- `docs/Design/clients-detail-critique-2026-05-26-post-revamp.md` Fix
  #10 (empty-state canonical shape)
- `docs/Design/clients-family-macro-micro-audit-2026-05-26.md` §3.5
  (tab body section-frame inconsistency)
- `docs/Design/page-family-canonical.md` §11 (empty states)

## Audit

Walked all four tab bodies in `ClientDetailWorkspace` and checked
each "no data" branch against the canonical `EmptyState` primitive
(`@/components/patterns/empty-state.tsx`).

- **Work tab** — Filing plan no-obligations branch already used
  `<EmptyState>` ✓ no change.
- **Client info tab** — Compliance posture / Jurisdictions / Risk
  profile / Onboarding state / Import source all render forms,
  not lists, so there is no "list is empty" branch to canonicalize.
  Skipped intentionally.
- **Opportunities tab** —
  - Suggested forms: inner "all applicable rules scheduled" branch
    already used `<EmptyState>` ✓. But the OUTER `applicable.length
=== 0` branch did `return null`, leaving the surrounding
    TabSection with a floating heading and no body. Now renders a
    canonical EmptyState ("No applicable forms for this client").
  - Future business cues: lives in
    `apps/app/src/features/opportunities/client-opportunities-card.tsx`
    — out of scope for this commit (that file is a separate
    feature module). Its `<p>No lightweight opportunity cues…</p>`
    empty state is a known follow-up.
- **Activity tab** —
  - Client summary (AI): `ClientRiskSummaryPanel` used to return
    `null` when `insight === null`, leaving just the refresh
    button hovering over white. Now renders a canonical
    EmptyState that tells the CPA what the panel does and whether
    Practice AI is needed.
  - Notes: was a plain italic `<span>` inside a solid frame. Now
    renders a canonical EmptyState ("No notes yet" + a description
    that explains the value of writing one).
  - Activity log: already used `<EmptyState>` for both the
    "audit access role-gated" and "no events yet" branches ✓.

## Why canonical shape matters

Three reasons:

1. **Visual consistency.** Dashed border + icon + title +
   description reads as "nothing here" everywhere. A solid frame
   with italic text inside reads as "data" — confusing when the
   data is "nothing."
2. **Affordance.** EmptyState carries an optional CTA slot. Future
   passes that want to surface "Add a note" or "Run summary" CTAs
   land in one place.
3. **Density.** Dashed-border surfaces are lower-density than
   solid frames, which matches their information content.

## Carry-overs

`ClientOpportunitiesCard.tsx` (lives in `features/opportunities/`)
still uses a plain `<p>` for its empty state. Out of scope for
this commit (constraint: don't touch files outside
`ClientFactsWorkspace.tsx`). Tracked as a follow-up.
