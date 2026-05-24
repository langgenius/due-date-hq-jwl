# 2026-05-25 — Phase 8 (batch 3) + Others cluster

## Why

Continuation of remaining 89-item review work.

## Shipped (3 items)

### Today #29 — User name in sidebar trigger

The user-menu trigger was a bare circular `UserAvatar` — initials
only, no name. Hard to confirm "is this my account" without
opening the menu. Promoted to "avatar + name chip":

- Trigger now `inline-flex gap-2` with the avatar on the left and
  the user's display name (truncated) on the right.
- Hover bg + focus ring stay on the whole chip (was just the
  circular avatar).
- Inside the menu, the existing email + role labels stay so the
  full identity is still discoverable on click.

### Deadlines #12, #13 — Scrollbar style

Global scrollbar thumb was a fully-rounded pill (`border-radius:
999px`). On a workbench that commits to flat hairline borders and
6/12px radii, the rounded scrollbar read as a leftover from
web-app defaults. Switched to `border-radius: 2px` — squared
without being razor-sharp — so the thumb fits the rest of the
aesthetic.

## Documented decisions (no code change)

### Today #28 — Bell location

Yuqi asked: "信息放在左下角不是很合适". The bell is currently in the
sidebar bottom alongside the user menu + Settings. This placement
was an explicit design choice when the route-header strip was
removed (see `app-shell.tsx` line 73-76 comment from the prior
work) — account-level controls live with Settings.

Alternative placements considered:

- Top-right of the route header — but we removed that strip.
- Top of the sidebar — competes with the firm switcher chip.
- Floating — clashes with the obligation drawer.

Decision: keep the sidebar-bottom placement; the alternatives all
introduce new problems. Documented inline so future audits don't
re-litigate this without context.

### Today #30 — Practice switcher should show user name

The firm switcher in the sidebar header shows the FIRM name, not
the user name. Showing the user name there duplicates the
user-menu chip directly below it (now that #29 surfaces the user
name). Decision: keep firm switcher = firm name only.

### CreateObligationDialog #42-#45 — Form density + close position

Items #42, #43, #44 all touch the `Field` primitive's
typography / spacing (label scale, content scale, label→input
gap). Changes propagate to every form in the app — risky to
ship as a one-off CreateObligationDialog tweak; needs a design
system pass with audit of every form callsite.

Item #45 (close button position) is owned by the Dialog
primitive's auto-rendered `<DialogClose>` — not adjustable from
the dialog body without overriding the primitive.

Deferred as a design system task: "form density / Field primitive
typography audit".

### Deadlines #16 — Drawer "align to top"

The drawer renders as a sticky right-rail panel that already aligns
to the route's top edge. Yuqi's screenshot may have been mid-scroll
or showed a transient layout. Needs viewport replay to confirm
which case is actually misaligned.

### Wizard #37 — Modal style consistency

The wizard uses a custom `WizardShell` instead of `<Dialog>`
because it's a multi-step persistent workspace. "Same style as
others" needs a side-by-side audit with all `<Dialog>` callsites
to decide if convergence is desirable. Tracked as a separate
audit task.

### Wizard #40 — Step 1 copy audit

Full-step copy review touching every string in `Step1Intake.tsx`.
Real i18n work, not a polish pass. Defer to a focused copy commit.

### Wizard #41 — xx-or-xx layout

`Step1Intake.tsx` already lays paste + upload side-by-side at
comfortable density; only `compact` density stacks them. Yuqi's
feedback may apply to the compact viewport — needs viewport
replay.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint` 0/0 (664 files)

## Closes Yuqi review items

- Today: **#29** (user name in trigger)
- Deadlines: **#12, #13** (scrollbar style)

Combined with prior commits the review is at **58 / 89**.

## Remaining open items (with explicit rationale above)

- Today: **#28** (bell location — design decision documented)
- Today: **#30** (firm switcher — design decision documented)
- Today (dialog): **#42, #43, #44, #45** (Field primitive audit)
- Alerts: **#9** (US map filter — needs design exploration)
- Deadlines: **#2** (search button), **#6, #7, #8, #10, #11**
  (row status visual cluster), **#9** (sticky filter),
  **#16** (drawer alignment — viewport replay), **#23, #24, #25**
  (PathToFilingSummary skipped/upcoming dates — designed-as-is,
  Yuqi's question is a doc gap), **#30** (Summary tab — separate
  commit)
- Wizard: **#37, #40, #41** (modal audit / copy audit / viewport)

31 items remain open. ~half are explicit design decisions
documented above; ~half need a design system pass, viewport
replay, or new feature build.
