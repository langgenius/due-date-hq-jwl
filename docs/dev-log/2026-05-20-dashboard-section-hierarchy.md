---
title: 'Dashboard section hierarchy: promote Actions + Exposure to match Needs Attention'
date: 2026-05-20
author: 'Claude'
area: dashboard
---

# Dashboard section hierarchy

## Context

User pointed out the visual hierarchy was inverted on the dashboard:

- **Needs Attention** (rare, situational): red bold uppercase H2 with alert icon and big cards. Max visual weight.
- **This Week's Exposure** (firm summary): tiny gray uppercase eyebrow, no icon, faint pills. Min visual weight.
- **Actions This Week** (daily action queue, the actual job): tiny gray uppercase eyebrow, no icon, plain rows. Low visual weight.

The actual user journey is "what should I do today?" — that's the actions list. But the
page was screaming alerts and whispering the queue. CPAs would walk away thinking
"nothing urgent" without ever scanning the rows that need their attention this week.

## What changed

Three sections now share the same H2 treatment so they read as peers, each with
its own tone:

| Section              | Before                                   | After                                                   |
| -------------------- | ---------------------------------------- | ------------------------------------------------------- |
| Needs Attention      | `text-sm font-semibold text-destructive` | (unchanged — already the loud one)                      |
| This Week's Exposure | `text-xs font-medium text-tertiary`      | `text-sm font-semibold text-primary` + `GaugeIcon`      |
| Actions This Week    | `text-xs font-medium text-tertiary`      | `text-sm font-semibold text-primary` + `ListChecksIcon` |

### Action row polish

- `py-2.5` → `py-3` — gives each row more breathing room so the list reads like a queue, not packed text.
- Task prompt: `text-sm text-text-primary` → `text-sm font-medium text-text-primary` — pulls the actionable verb forward.
- Client badge: added `border border-divider-subtle` — makes the pill read as a chip, not a label.
- Arrow icon: `size-3` → `size-3.5` — small but reinforces the "go-do" affordance.

### Exposure chip polish

- Background was transparent. Now `bg-background-default` with a regular (not subtle) border. Pills read as clickable targets.
- Padding `px-2 py-0.5` → `px-2.5 py-1`, weight `font-mono` → `font-mono font-medium`. Reads as a chip, not a label.
- Hover state strengthens border instead of swapping background.

## Why not also reduce Needs Attention

The user didn't ask to quiet alerts. Needs Attention is correctly loud when there's
something to act on, and the section already collapses to nothing when the firm
has zero pending alerts (the section returns `null` when there are no alerts and no
unhealthy sources). So the visual asymmetry only shows up when there's a real
alert — at which point loud-vs-quiet is the correct relationship.

The fix here is not to dim the alerts, but to give Actions + Exposure enough
weight that a CPA scanning the page sees three sections, not one section plus
two footnotes.

## Verification

- `tsc --noEmit` from `apps/app` passes.
- Smoke-tested on the running dev server at localhost:5175:
  - All three section headers render with matching weight + icons.
  - Action rows are visibly taller, easier to scan; the verb pulls forward.
  - Exposure pills clearly read as clickable chips.
