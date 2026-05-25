---
title: 'Obligation panel becomes a true full-page right rail (item 9)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Page header pushes left when the obligation panel opens

Before: opening a filing-plan row on `/clients/[id]` split only the
_body_ of the page. The `PageHeader` (back-link + title + entity
chips + action cluster) stayed full-width above, getting visually
truncated where the right-rail obligation panel began. The title
row read as awkwardly "longer than the page" — the action cluster
ended up at a position the panel was about to occupy on the row
below.

Critique was direct: "i think this should be a whole page right
panel, [so] the top header section is pushed to the left as well."

## Restructure

Top-level layout goes from:

```
<flex flex-col gap-6>
  <PageHeader />            ← full-width
  <flex xl:flex-row>        ← only body splits
    <section flex-1>body</section>
    <aside xl:w-[480px]>panel</aside>
  </flex>
</flex>
```

…to:

```
<flex flex-col gap-6 xl:flex-row xl:items-start>   ← split AT TOP level
  <div flex-1 min-w-0 flex flex-col gap-6>
    <PageHeader />          ← now constrained to the left column
    <section>body</section>
  </div>
  <aside xl:w-[480px]>panel</aside>                ← sibling of left column
</flex>
```

Effect: when an obligation panel opens, the PageHeader + summary
strip + alerts + filing-plan body all shift left in lockstep,
and the panel becomes a true side-rail spanning the whole page
height.

PageHeader doesn't need any changes — its internal layout already
flexes between title and actions and adapts to whatever container
width it sits in. Inside a narrower left column it still renders
title-left / actions-right with the usual `lg:flex-row` behavior.

Narrow-viewport behavior is preserved: below `xl` (1280px) the
outer flex stays `flex-col`, the left column stacks above the
aside, and the page reads as one column with the panel below it.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — moved
  the `xl:flex-row` split up one level, added a left-column wrapper
  div, and made the aside a sibling of that wrapper. Removed the
  now-redundant inner `xl:flex-row` on the body section.
