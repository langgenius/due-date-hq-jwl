# Motion & micro-interaction catalog

> Full-app survey for on-grammar micro-interaction / animation opportunities,
> grounded in the existing motion vocabulary (`lib/motion.ts` + `primitives.css`).
> _2026-06-20._ Method: 12 parallel agents, one per surface, each told to honour
> the grammar (EASE_APPLE, ENTER 180 / EXIT 120 / SURFACE 300, CSS 150ms default,
> global reduced-motion), flag what's **already** animated (so we don't churn it),
> and propose only meaningful, on-brand motion ("coffee not confetti" — delight in
> empty-states / wins / feedback, calm on dense work surfaces).
>
> **85 findings · 35 high-value · 74 low-risk.** The headline is reassuring: every
> surface is _already_ extensively animated (sidebar choreography, detail-panel
> rise, tab underlines, row dismiss fades, press-scale on buttons, contentEnter on
> detail tabs…). The opportunities are the **gaps** — un-animated entrances, a few
> snap-cuts, two missing reduced-motion guards, and a handful of delight beats.

> **Update — 2026-06-22: deferred tail finished.** The medium-risk remainder
> below (AnimatePresence exit/height, the StatusRing arc fill, the audit KPI bump,
> the CollapsibleSearch width, and the in-drawer apply-success celebration) is now
> **shipped** in four follow-up batches — see
> [\_motion-deferred-tail-2026-06-22](../dev-log/_motion-deferred-tail-2026-06-22.md).
> What stays open in this catalog is only the **rejected** items and a couple of
> debatable delight beats; nothing is pending.
>
> **Update — 2026-06-22 (round 2): full re-sweep + delight pass.** A fresh 4-agent
> survey (gaps this catalog missed + components added since) plus a delight layer
> shipped **28 more net-new items** across all clusters — setup-step pops, choice/
> needs-attention staggers, deadlines bulk-bar exit, a 7-site spinner a11y guard
> sweep, audit crossfades, wizard step panels, stepper connector fill, the sidebar
> chevron rotate, and the dropdown/select indicator zoom. See
> [2026-06-22-motion-resweep-delight](../dev-log/2026-06-22-motion-resweep-delight.md).

## Shipped this pass (10)

Curated for highest value × lowest risk × on-grammar, each verified (tsgo + build
green; checkbox confirmed live):

| #   | Surface          | Change                                                                                                                                                  | File                                |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | primitives       | **Checkbox check-draw** — glyph zooms-in (75%→100%, 150ms) instead of snapping; dropped the `transition-none` that blocked it. App-wide micro-feedback. | `ui/checkbox.tsx`                   |
| 2   | login/onboarding | **SuccessModal hero check pops** (scale 0.6→1, 180ms) — the one celebratory beat of the import win.                                                     | `migration/SuccessModal.tsx`        |
| 3   | login/onboarding | **SuccessModal stats stagger** — the four imported counts rise+fade 40ms apart after the check.                                                         | `migration/SuccessModal.tsx`        |
| 4   | login/onboarding | **Wizard Stepper check pops** when a step completes (pairs with #2).                                                                                    | `migration/Stepper.tsx`             |
| 5   | today            | **All-clear coffee disc** gives a gentle zoom-in over the text fade.                                                                                    | `dashboard/merged-brief-card.tsx`   |
| 6   | today            | **Refresh spinner** — added the missing `motion-reduce:animate-none` guard (raw keyframe).                                                              | `routes/dashboard.tsx`              |
| 7   | today            | **Brief "Generating" spinner** — same missing reduced-motion guard.                                                                                     | `dashboard/daily-brief-card.tsx`    |
| 8   | global/nav       | **Command-palette ↵ enter-hint** fades in on row-select instead of snapping (`transition-opacity`).                                                     | `keyboard-shell/CommandPalette.tsx` |
| 9   | rules            | **"Pending regulatory change" block** enters with a fade + 1px top-slide (draws the eye to the urgency signal).                                         | `rules/matched-pulse-block.tsx`     |
| 10  | audit-log        | **Row press feedback** — `active:scale-[0.99]` (reduced-motion safe) so a clickable row answers the tap.                                                | `audit/audit-log-table.tsx`         |

## Verified-and-rejected (do NOT apply)

- **`sheet.tsx` — add `data-starting-style:opacity-0` for symmetric fade-in.** The
  code comment documents this was _deliberately removed_: Base UI sometimes fails
  to clear `data-starting-style` after first paint, which would leave the drawer
  **invisible**. Re-adding it reintroduces a known bug. Skipped.
- **`sources-tab.tsx` — hover-reveal the source external-link.** "Open official
  source" is a _primary_ row action; hiding it until hover trades real
  discoverability for tidiness (unlike a secondary kebab). Left always-visible.

## Backlog — the rest, prioritized

The full survey is below (every finding, grouped by surface, with value/risk). The
strongest un-shipped candidates, in rough order:

1. **Entrance fades on conditional mounts** (low risk, broad): alerts "Why?" reasons
   panel + Morning-sweep panel, rules DisclosureCard expand + AI-draft reveal,
   deadlines inline-accordion body, client tab-content panels (`contentEnterMotion`,
   matches the deadline-detail tabs that already do it).
2. **Active-indicator slides** via `layoutId` (medium): alert-detail scroll-spy
   underline, deadline-detail section nav underline — slide between sections instead
   of blink.
3. **Delight beats**: materials "All items received" fade, client health-badge
   re-mount fade on status change, "Ready to apply" green section enter.
4. **State-change polish**: table-row selected `transition-colors`, sources
   shape-faithful loading skeleton, mark-as-filed stepper node colour transition.

Each is an isolated, on-grammar change; they were left out of this pass only to keep
the shipped batch verifiable, not because they're wrong.

---

## Full survey (all 85)

### global-shell-nav · 6

- **CommandPalette — CornerDownLeftIcon enter hint on selected row** — _feedback · value:high · risk:low_  
  `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx:505`  
  now: The ↵ enter hint icon renders with `opacity-0 group-data-[selected=true]/command-item:opacity-100` — it snaps from hidden to visible with no transition when keyboard selection lands on a row.  
  → Add `transition-opacity` to the icon's className: `className="size-3.5 text-text-tertiary opacity-0 transition-opacity group-data-[selected=true]/command-item:opacity-100"`. The default 150ms ease-out from Tailwind's default transition-opacity is exactly right for this micro-feedback — it gives the
- **SidebarCollapseToggle chevron icon (ChevronLeftIcon / ChevronRightIcon)** — _state-change · value:medium · risk:low_  
  `packages/ui/src/components/ui/sidebar.tsx:1060`  
  now: The icon swaps between ChevronLeftIcon and ChevronRightIcon via a ternary on `collapsed` — an instant DOM swap with no transition. The button itself has transition-[left,opacity,background-color,color  
  → Wrap the icon in a span with `transition-transform duration-[360ms] ease-apple` and a `rotate` class driven by `targetCollapsed`: `<span className={cn('inline-flex transition-transform duration-[360ms] ease-apple', targetCollapsed ? 'rotate-0' : 'rotate-180')}><ChevronRightIcon className="size-3.5"
- **SidebarQuickFind button — collapsed-to-expanded fill reveal** — _transition · value:medium · risk:low_  
  `apps/app/src/components/patterns/app-shell-nav.tsx:219`  
  now: In collapsed mode the button has `bg-transparent`; when expanded (hover-peek or toggle) the fill appears. The `transition-[color,background-color,transform]` is already on the button, so the fill cros  
  → Apply the same label-fade recipe the SidebarMenuButton already uses: replace `group-data-[collapsed=true]/sidebar:hidden` on the label `<span>` and shortcut `<span>` with `transition-[opacity,max-width] duration-[360ms] ease-apple` + `group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed
- **CommandPalette nav-item icon tile — selected state background** — _state-change · value:medium · risk:low_  
  `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx:485`  
  now: The `<span className="grid size-7 place-items-center rounded-lg bg-background-subtle text-text-secondary group-data-[selected=true]/command-item:text-text-primary">` changes the icon color on selectio  
  → Add `transition-colors` to the span: `className="grid size-7 place-items-center rounded-lg bg-background-subtle text-text-secondary transition-colors group-data-[selected=true]/command-item:text-text-primary"`. This gives the icon a gentle color ease as keyboard focus moves through results, cohering
- **SidebarSystemStatus — status dot** — _delight · value:medium · risk:low_ 🎉  
  `apps/app/src/components/patterns/app-shell-nav.tsx:321`  
  now: The `<span className={cn('size-1.5 rounded-full', dotToneClass)} aria-hidden />` is a static dot with `bg-text-success`. It renders on mount with no animation and never pulses. The component only rend  
  → Add a single subtle pulse to this dot — but only the calm, slow kind that reads as 'live connection' rather than 'alert': `animate-pulse motion-reduce:animate-none` with an explicit slower duration via a custom utility or `[animation-duration:3s]` to slow the default 2s pulse to 3s. This keeps the r
- **UserMenuTrigger ChevronsUpDownIcon — dropdown open state** — _state-change · value:medium · risk:medium_  
  `apps/app/src/components/patterns/app-shell-user-menu.tsx:277`  
  now: The `<ChevronsUpDownIcon className="size-4 shrink-0 text-text-tertiary group-data-[collapsed=true]/sidebar:hidden" aria-hidden />` has no rotation or state change when the DropdownMenu is open. The ic  
  → The DropdownMenuTrigger doesn't expose a data-open attribute on the trigger button directly through this render pattern (it uses a custom button via the render prop). However, Base UI's DropdownMenu Trigger does add `data-popup-open` or `aria-expanded` on the underlying element when open. Verify the

### today-dashboard · 7

- **All-clear empty state — CoffeeIcon entrance** — _delight · value:high · risk:low_ 🎉  
  `apps/app/src/features/dashboard/merged-brief-card.tsx:341-355`  
  now: The entire all-clear block fades in via `animate-in fade-in duration-150 motion-reduce:animate-none` on the wrapping div. The `CoffeeIcon` inside its accent disc enters simultaneously with the text —  
  → Wrap the icon disc `<span>` in a `<motion.span>` with `initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18, ease: EASE_APPLE, delay: 0.08 }}`. This lets the text fade first (via the parent's existing `animate-in`) and the coffee cup "pops" 80ms later
- **RotateCwIcon header refresh spinner — missing motion-reduce guard** — _feedback · value:high · risk:low_  
   `apps/app/src/routes/dashboard.tsx:351`  
   now: `<RotateCwIcon className={cn('size-3.5', dashboardQuery.isFetching && 'animate-spin')} />` — `animate-spin` is a raw CSS keyframe animation. The global preset.css kills CSS animations for `prefers-red  
→ Change to `cn('size-3.5', dashboardQuery.isFetching && 'animate-spin motion-reduce:animate-none')`. This is the same guard pattern the grammar calls out explicitly for raw CSS keyframes.
- **BriefFreshness RotateCwIcon pending spinner — missing motion-reduce guard** — _feedback · value:high · risk:low_  
  `apps/app/src/features/dashboard/daily-brief-card.tsx:517`  
  now: `<RotateCwIcon className="size-3 animate-spin text-text-secondary" />` in the pending freshness state has no `motion-reduce:animate-none` guard, same defect as the header refresh button.  
  → Change className to `"size-3 animate-spin motion-reduce:animate-none text-text-secondary"`. Consistent with the grammar rule for raw CSS keyframe guards.
- **NeedsAttentionCard grid — entrance on first data load** — _entrance · value:medium · risk:low_  
  `apps/app/src/features/dashboard/needs-attention-section.tsx:306-333`  
  now: The three alert cards mount simultaneously with no entrance animation; the grid appears as an instant block after the skeleton disappears.  
  → Wrap each `<div key={alert.id}>` in an `<AnimatePresence>` + `<motion.div>` pair (from `motion/react`) using `fadeMotion` props (`initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: EASE_APPLE }}`), staggered with `delay: index * 0.04` on the transition so the three
- **BriefTableRow action-verb sub-line — text change on bucket switch** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/dashboard/merged-brief-card.tsx:571`  
  now: The instruction sub-line (`verb`) inside the client cell transitions its color on row-hover (`transition-colors group-hover:text-text-secondary`) but there is no entrance transition when the row first  
  → No change needed at the row level — the parent wrapper's `animate-in fade-in duration-150` already covers the entrance. However, the `transition-colors` on the sub-line (line 571) is missing `motion-reduce:transition-none`. Add `motion-reduce:transition-none` to the sub-line's className so the color
- **Priorities bucket selector (Segmented) — count number updates** — _feedback · value:medium · risk:low_  
  `apps/app/src/features/dashboard/merged-brief-card.tsx:307-332`  
  now: When the dashboard polls and count numbers update (e.g. overdue goes from 3 to 4 after a refetch), the count inside each Segmented option changes instantly. No transition signals the update.  
  → This is a Segmented primitive concern, not a dashboard concern — the fix belongs inside the Segmented component (packages/ui). Flag for the Segmented primitive: wrap the count span in `<AnimatePresence mode="wait">` + `<motion.span key={count}>` with `fadeMotion` props so updating counts cross-fade
- **DailyBriefCard collapse button (✕) — no press acknowledgment** — _feedback · value:low · risk:low_  
  `apps/app/src/features/dashboard/daily-brief-card.tsx:233-243`  
  now: The collapse `<Button variant="ghost" size="icon-xs">` has the shared hover/focus ring from the Button primitive but no press-scale acknowledgment. Every other interactive element on the surface (aler  
  → If the Button primitive does not already apply `active:scale-95` (verify in packages/ui), add `className="... active:scale-95 motion-reduce:active:scale-100"` to this specific button. This is the icon-button equivalent of the alert card's `active:scale-[0.98]` — a 1-frame tactile confirm that fold w

### deadlines-list · 7

- **DeadlineRowExpansion section (inline accordion body)** — _transition · value:high · risk:low_  
  `apps/app/src/features/obligations/queue/components/DeadlineRow.tsx:491`  
  now: Mounts instantly with no entrance animation — the section div at line 491 is bare `<section className="flex flex-col gap-3.5 border-t ...">` with no motion wrapper. The chevron rotates (good) but the  
  → Wrap the section in `<motion.section>` with `initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}` and add `overflow-hidden` to the wrapper. Import `motion` from `motion/react`
- **Active-filter chips row (ObligationActiveFilterChips)** — _entrance · value:high · risk:low_  
  `apps/app/src/routes/obligations.tsx:7005`  
  now: The chip strip appears and disappears instantly when filters are applied or removed. Each chip `<span>` at line 7012 has no entrance/exit motion. The chip row itself also appears/disappears as a block  
  → Wrap each individual chip `<span>` in an `<AnimatePresence>` keyed list so chips fade+scale in individually on add and out on remove. Per-chip motion: `initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}` with `transition={{ duration: MOTION_DURA
- **TableRow selected state — bg transition on select** — _state-change · value:high · risk:low_  
   `apps/app/src/routes/obligations.tsx:4574`  
   now: The TableRow at line 4574 has `data-state={tableRow.getIsSelected() ? 'selected' : undefined}` but no transition on the bg change. The hover class is `hover:!bg-background-subtle` with `transition-col  
→ Add `transition-colors`to the explicit className string on the TableRow:`'h-14 group cursor-pointer border-l-2 border-l-transparent transition-colors hover:!bg-background-subtle ...'`. This makes the selection accent appear/fade with the Tailwind default micro-interaction timing (150ms ease-out) r
- **Empty state — ObligationQueueEmptyState (zero-results or no-data)** — _entrance · value:medium · risk:low_  
  `apps/app/src/features/obligations/queue/components/toolbar.tsx:290`  
  now: The EmptyState in ObligationQueueEmptyState mounts inside a TableCell statically — no entrance. When filters produce zero results the empty-state block pops in with no fade.  
  → Wrap the EmptyState render in a `<motion.div>` using `fadeMotion` from `@/lib/motion`: `<motion.div {...fadeMotion}><EmptyState .../></motion.div>`. This gives the zero-state a 120ms fade-in that reads as "the table settled" rather than "content broke". Import `fadeMotion` from `@/lib/motion`.
- **Mark-as-filed confirmation — CheckIcon affirmation on terminal inline-expand rows** — _delight · value:medium · risk:low_ 🎉  
  `apps/app/src/features/obligations/queue/components/DeadlineRow.tsx:563`  
  now: When a row is filed and `isTerminal` is true, the section renders `<span className="flex items-center gap-1.5 text-sm font-medium text-text-success"><CheckIcon .../><Trans>Filed</Trans></span>` static  
  → Wrap the Filed affirmation span in a `<motion.span>` with `initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}`. The scale pop (from 0.9 to 1.0) is a micro-delight on a genuine win moment (filing complete) — calm
- **Group-section collapse — group body rows hide/show** — _transition · value:medium · risk:medium_  
  `apps/app/src/routes/obligations.tsx:4455`  
  now: When a group header is collapsed (`collapsedQueueGroups.has(rowGroupKey)`), continuation/child rows return `null` immediately — the rows disappear/appear with a hard cut. The chevron rotates (already  
  → This is a table layout (TableRow inside a TableBody), which makes AnimatePresence height animation complex without a wrapper div. The pragmatic fix is to add `transition-opacity` with an explicit `opacity-0` when the row count drops from the group, but since rows literally unmount (`return null`), t
- **Client-peek EyeIcon button — hover reveal** — _feedback · value:low · risk:low_  
  `apps/app/src/routes/obligations.tsx:2245`  
  now: The eye icon button at line 2245 has `className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"`. The transition-opacity is already there but no duration is s  
  → No change needed — already on-grammar with `transition-opacity` default. Confirm no `duration-*` override is erroneously on the element (it is not).

### deadline-detail · 8

- **Section nav active-indicator underline span** — _state-change · value:high · risk:low_  
  `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx:1860-1865`  
  now: The active-section underline (`<span className="absolute right-0 -bottom-[9px] left-0 h-0.5 rounded-full bg-state-accent-solid">`) is conditionally mounted/unmounted with no motion — it pops in/out as  
  → Wrap in `<AnimatePresence>` and render via `<motion.span>` with `initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.6 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}` and `style={{ transformOrigin: 'left' }}`. The nav button
- **Crumb-bar title reveal (`Deadlines / {title}`)** — _transition · value:high · risk:low_  
  `apps/app/src/features/obligations/detail/DeadlineCrumbBar.tsx:55-62`  
  now: The title segment (`/ {title}`) mounts conditionally on `heroScrolled` with no motion — it pops in abruptly once the hero scrolls past the threshold.  
  → Wrap the title fragment in `<AnimatePresence mode='wait'>` and apply `<motion.span {...fadeMotion} key={title ? 'title' : 'empty'}>` so it fades in at 120ms EASE_APPLE (EXIT duration is right here — it's a small auxiliary element). Mirrors how AlertDetailDrawer reveals its collapsed title.
- **Mark-as-filed success — `CheckIcon` in the workflow stepper node** — _state-change · value:high · risk:low_  
  `apps/app/src/features/obligations/queue/components/panels.tsx:960-966 (stage node `<span>`)`  
  now: When a status mutation lands and the row advances to `done`, the stepper node for 'Filed' transitions from an empty ring to a filled accent circle with a `FileCheckIcon` inside. There is no transition  
  → Add `transition-colors duration-300 ease-apple` to the stage-node `<span>` at line 960. This costs one Tailwind class and makes the ring-fill colour transition visible when the active node advances to 'Filed' after `changeStatus` resolves. Durations for `done`/`completed` state changes are SURFACE-c
- **Materials section — batch-received empty-state entrance (`All items received.`)** — _feedback · value:high · risk:low_ 🎉  
  `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx:3643-3645`  
  now: When all outstanding items are marked received the `<p>All items received.</p>` empty state mounts with no animation — it appears by replacing the list.  
  → Wrap the empty-state `<p>` in `<motion.p {...fadeMotion}>` so it fades in at 120ms EASE_APPLE when the Outstanding section is empty. This is the 'all-clear' moment — a small delight touch that acknowledges the CPA's batch action landed. Keep it subtle (fade only, no slide).
- **Materials progress bar — initial paint** — _loading · value:medium · risk:low_  
  `apps/app/src/features/obligations/queue/components/panels.tsx:2301-2307`  
  now: The bar (`<div className="h-full rounded-full bg-state-success-solid transition-[width]">`) has `transition-[width]` for live updates but starts at its final width instantly on mount — the transition  
  → Add `duration-500 ease-apple` to the existing `transition-[width]` so the bar grows from 0% on mount (use a CSS `@starting-style` trick is unavailable here; instead, set the initial width via state or a short mount delay). Simplest grammar-safe option: also add `motion-reduce:transition-none` since
- **ChecklistItemRow — received/status state change** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/obligations/ChecklistItemRow.tsx:100 (the wrapper `<div>`)`  
  now: The row wrapper has `transition-colors` for the border/background, but individual status transitions (outstanding → received) recolor via className swap with no easing duration stated — falls to Tailw  
  → Add `transition-all` (replaces the bare `transition-colors`) to the wrapper at line 100, so both color and decoration changes use the 150ms default. This catches the received-state text-decoration + check-icon fade-in. The CheckIcon inside the checkbox span at ~line 110 can optionally wrap in `<moti
- **Navigator rail active row highlight** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/obligations/detail/DeadlineNavigatorRail.tsx (row `<Link>`or`<li>` element, rendered from ~line 150+ per row)`  
  now: Each rail row gets an active left-accent border + tint background when `row.id === activeObligationId`. This likely swaps className directly with no transition since the component uses `cn()` on the L  
  → Add `transition-colors` to the row's className so the left border accent and background tint transition at the 150ms default. This also benefits the hover state. Because this is a dense list, keep it to color only — no slide, no scale.
- **Previous-stages expand/collapse body (audit events list)** — _transition · value:medium · risk:medium_  
  `apps/app/src/features/obligations/queue/components/panels.tsx:2624-2638`  
  now: The expanded events `<ul>` mounts/unmounts conditionally via `{open ? <ul>...</ul> : null}` — the chevron icon has `transition-transform rotate-90` but the body itself pops in with no animation.  
  → Wrap the `<ul>` in `<AnimatePresence>` and apply `<motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }} style={{ overflow: 'hidden' }}>`. This is the accordion patter

### alerts-list · 7

- **Why? priority-reasons expand panel** — _feedback · value:high · risk:low_  
  `apps/app/src/features/alerts/components/PulseAlertRow.tsx:737`  
  now: The showPriority && whyOpen && priority block is a bare conditional render — the reasons inset pops in and out with no transition. The ChevronDown/Up icon swap is also instant.  
  → Wrap the inset div in <AnimatePresence> with a motion.div using initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }} overflow-hidden. This gives the reveal a 180ms expand-and-f
- **Morning-sweep panel conditional mount/unmount** — _entrance · value:high · risk:low_  
  `apps/app/src/features/alerts/AlertsListPage.tsx:1084`  
  now: <MorningSweepPanel /> is rendered inline — it pops in and out (null vs rendered) with no enter/exit animation. The panel appears between the filter bar and the list when digestOpen is true.  
  → Wrap the call site with <AnimatePresence> and a motion.div on the rendered panel using initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}. The 8px upward slide matches contentEnterMotion but i
- **Morning-sweep chip in the toolbar (active preset indicator)** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/alerts/AlertsListPage.tsx:899`  
  now: The 'Morning sweep · last 24h' chip appears and disappears as a hard conditional render (morningSweep?.active ? <span>…</span> : null) — no enter/exit. It is a meaningful filter-active indicator in th  
  → Wrap in <AnimatePresence> with a motion.span using the existing fadeMotion helpers: initial={fadeMotion.initial} animate={fadeMotion.animate} exit={fadeMotion.exit} transition={fadeMotion.transition}. The chip fades in at 120ms and out at 120ms — quiet enough for the toolbar, communicates the preset
- **Clear filters button conditional render** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/alerts/AlertsListPage.tsx:989`  
  now: filtersActive ? <Button …Clear filters…> : null — the button appears and disappears with a hard splice into the flex toolbar row, causing a layout jump.  
  → Wrap in <AnimatePresence> with a motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }} overflow-hidden. This makes the button grow into the flex row and shrink away, rat
- **Day-band date header on initial list render** — _entrance · value:medium · risk:low_  
  `apps/app/src/features/alerts/components/PulseAlertRow.tsx:1019`  
  now: Each day-group div (including its sticky band header) is rendered statically — the full list appears at once when the query resolves, which makes the transition from skeleton to content feel like a ha  
  → Add stagger to the per-day groups: wrap each group div in a motion.div with initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE, delay: index * 0.04 }} where index is the Array.from(groups.entries()).map() index (cap at 0–4 gr
- **FloatingActionBar exit (bulk bar disappears when selection cleared)** — _transition · value:medium · risk:low_  
  `apps/app/src/features/alerts/AlertsListPage.tsx:1269`  
  now: The BulkActionBar conditional (selectionEnabled && selectedCount > 0 && openAlertId === null) causes the bar to pop out instantly when the selection is cleared or the drawer opens — no exit animation.  
  → Wrap the conditional render block (lines 1269–1275) in <AnimatePresence>. Inside, give the BulkActionBar a motion wrapper or make FloatingActionBar accept a motion.div outer: motion.div key='bulk-bar' exit={{ opacity: 0, y: 8 }} transition={{ duration: MOTION_DURATION.exit, ease: EASE_APPLE }}. This
- **AlertsEmptyState on load-to-empty transition** — _entrance · value:medium · risk:low_ 🎉  
  `apps/app/src/features/alerts/AlertsListPage.tsx:1136`  
  now: isEmpty || isFilteredEmpty branches to <AlertsEmptyState> — the ghost-card visual and heading snap in immediately when the query resolves to zero alerts.  
  → Wrap <AlertsEmptyState> in a motion.div with initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: MOTION_DURATION.surface, ease: EASE_APPLE }}. At 300ms this reads as the 'scene settling' — the monitoring is still running and the calm empty state is the resolved con

### alert-detail · 7

- **Scroll-spy active section underline pill — the `<span>` at line 1745 rendered conditionally when `sectionActive`** — _state-change · value:high · risk:low_  
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx:1744`  
  now: The blue underline indicator appears and disappears with a hard cut as the active section changes — it blinks from one tab label to another with no positional motion.  
  → Use `layoutId='alert-section-indicator'` on the indicator `<span>` (motion/react `<motion.span>`) so it slides between active positions with a layout animation. Set `transition={{ duration: 0.18, ease: EASE_APPLE }}`. Keep `aria-hidden` on the span. This is the same pattern that makes pill-tabs feel
- **'Ready to apply' green affirmation section — the `deadlineApplyReady` conditional block at line 2099** — _feedback · value:high · risk:low_ 🎉  
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx:2099`  
  now: The green 'Ready to apply · deadline selection confirmed' section appears with a hard mount — no entrance animation — when the last `needs_review` row is confirmed. This is a genuine milestone moment  
  → Wrap the section in `<motion.section>` with `contentEnterMotion` props (slide 12px up + fade, 180ms EASE_APPLE) so it enters smoothly when the confirmation threshold is crossed: `initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18, ease: EASE_APPLE }}`. The Sh
- **Apply-success toast + drawer close — no in-drawer celebration at the apply moment (apply fires `onClose()` immediately in applyMutation.onSuccess at line 1067)** — _delight · value:high · risk:medium_ 🎉  
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx:1067`  
  now: On successful apply, the drawer closes instantly and only the Sonner toast confirms success. There is no in-situ moment of recognition before dismissal.  
  → This is the biggest genuine win moment in the product. Before calling `onClose()`, briefly replace the footer CTA with a `<motion.div>` that shows a `CircleCheckIcon` + 'Applied' in green, fading in with `fadeMotion` at 120ms, then calls `onClose()` after a 600ms hold. Total felt duration: ~720ms. T
- **Hero title breadcrumb reveal in top bar — the `{detail && heroScrolled}` conditional at line 1442** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx:1442`  
  now: The alert title appears or disappears in the breadcrumb with zero transition — a hard cut that reads as a layout jump when it triggers at 140px scroll.  
  → Wrap the breadcrumb fragment in a `<motion.span>` using `fadeMotion` so it fades in on appearance: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12, ease: EASE_APPLE }}`. Because `heroScrolled` is a boolean toggle (not an exit), use a `key={heroScrolled ? 'title' : 'em
- **Primary CTA label swap in DrawerActions — the inline label switches between 'Select deadlines to apply' / 'Apply to N clients' based on `selectionCount` at line 2698** — _feedback · value:medium · risk:low_  
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx:2698`  
  now: The button text hard-cuts between states as the user checks/unchecks rows in the affected-clients table — a jumpy label change with no feedback that the count was recognized.  
  → Add `key={selectionCount === 0 ? 'empty' : 'filled'}` on the label content so React remounts it when the meaningful threshold is crossed (0 → 1+, not on every increment). Wrap the content in `<motion.span>` with `fadeMotion` (`initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration:
- **AlertLifecycleStrip 'Your decision' node dot — the `bg-state-accent-solid` dot at line 729 that marks the current step** — _emphasis · value:medium · risk:low_  
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx:729`  
  now: The accent dot marking the current lifecycle step is static — no pulse or living quality to distinguish it from a static indicator.  
  → Add `animate-ping` on a sibling `<span>` behind the dot (same pattern as live-status indicators elsewhere): `<span className='absolute size-1.5 rounded-full bg-state-accent-solid animate-ping opacity-60 motion-reduce:animate-none' aria-hidden />` overlaid on the existing dot with `relative` on the p
- **AffectedClientsTable expand/collapse expander — the Show-all / Show-fewer footer button at AffectedClientsTable.tsx line 357** — _state-change · value:medium · risk:medium_  
  `apps/app/src/features/alerts/components/AffectedClientsTable.tsx:357`  
  now: Clicking 'View all N affected clients' instantly renders all rows with a hard layout jump. The ChevronDown/Up icon swap is also instantaneous.  
  → Add `transition-transform duration-150 ease-out` on both ChevronDown/ChevronUp icons, and apply `rotate-180` when `showAll` is true so the chevron animates on toggle. For the row expansion itself, use an `AnimatePresence` + `motion.div` wrapping the hidden rows with `initial={{ opacity: 0, height: 0

### clients · 8

- **ClientsEmptyState — integration-logo strip (IntegrationStrip)** — _entrance · value:high · risk:low_ 🎉  
  `apps/app/src/features/clients/ClientsEmptyState.tsx:40-58`  
  now: Six source-logo tiles and the DueDateHQ destination tile are statically rendered with no entrance animation. The hero is the only first-run screen on this surface.  
  → Wrap the entire hero card content `<div className="relative flex flex-col ...">` (line 84) with a `<motion.div>` using `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: EASE_APPLE }}`. Then stagger the logo tiles: replace the `INTEGRATION_LOGOS.map` i
- **ClientDetailWorkspace — tab content panels (TabsContent for 'work', 'info', 'activity')** — _transition · value:high · risk:low_  
  `apps/app/src/features/clients/ClientDetailWorkspace.tsx:966-1187`  
  now: All three TabsContent panels (`value='work'`, `value='info'`, `value='activity'`) mount with no entrance motion — content appears instantly when the tab switches. The tab underline itself slides (moti  
  → Wrap each `TabsContent` body's immediate child with `<motion.div {...contentEnterMotion}>` (already imported from `'@/lib/motion'` in this file — `motion` is already imported on line 3). For the Work tab: wrap `<ClientWorkPlanPanel .../>` (line 970). For info: wrap the outer `<>` fragment that conta
- **ClientDetailWorkspace — 'Healthy' / 'At risk' badge in H1 title cluster** — _state-change · value:high · risk:low_ 🎉  
  `apps/app/src/features/clients/ClientDetailWorkspace.tsx:651-664`  
  now: The health badge (Healthy/At-risk/needs_facts) is static on mount. When it changes state (e.g. after a risk-profile save invalidates the query and the badge flips from 'At risk' to 'Healthy'), the swa  
  → Wrap the badge in a `<motion.span key={readiness?.status ?? 'healthy'} {...fadeMotion}>` (import `fadeMotion` from `'@/lib/motion'`; `motion` is already imported in this file). The `key` change forces a re-mount on status transitions so the incoming badge fades in at 120ms. This is the 'genuine win'
- **ClientsEmptyState — 'Explore with sample data' chip** — _feedback · value:medium · risk:low_ 🎉  
  `apps/app/src/features/clients/ClientsEmptyState.tsx:119-128`  
  now: The accent chip is a plain `<button>` with only `transition-colors hover:brightness-95`. ArrowRightIcon is static.  
  → Add `transition-transform hover:[&_svg:last-child]:translate-x-0.5` to the button className so the ArrowRightIcon nudges right on hover (a 2px shift, no duration restatement needed — Tailwind default 150ms). This is a standard 'go' micro that costs nothing and confirms directionality at the most CTA
- **Clients directory table rows (TableRow with role='button')** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1134-1175`  
  now: Rows have `hover:!bg-state-accent-hover` and `hover:shadow-[inset_2px_0_0_var(--color-state-accent-solid)]` applied together with NO transition. The inset left-bar and background fill snap on instantl  
  → Add `transition-shadow` to the row className so only the inset box-shadow transitions (background color already fades via the TableBody-level `hover:!bg` which Tailwind will apply with its default 150ms). Exact addition: append `transition-shadow` to the `className` string on line 1152. This targets
- **ClientSummaryStrip — clickable stat cells (Blocked, Open)** — _feedback · value:medium · risk:low_  
  `apps/app/src/features/clients/ClientSummaryStrip.tsx:198-212`  
  now: Clickable cells (`Blocked`, `Open`) have `transition-colors hover:bg-state-base-hover` but no press/active feedback beyond the Button primitive's app-wide `active:scale-[0.98]` — which does NOT apply  
  → Add `active:scale-[0.99]` to the `cellClass` on the button branch (line 206, inside the `cn(cellClass, ...)` string). The scale is gentler than the Button primitive's 0.98 because the stat cell is wider and a large block snapping is distracting; 0.99 gives a subtle 'pressed' response. No duration re
- **ClientsEmptyState — 'Explore with sample data' chip ArrowRightIcon** — _delight · value:low · risk:low_ 🎉  
  `apps/app/src/features/clients/ClientsEmptyState.tsx:127`  
  now: ArrowRightIcon is static at `size-3` with no hover or press treatment.  
  → Consolidate with the finding above (the hover:[&_svg:last-child]:translate-x-0.5 on the parent button) rather than a separate change. Mark as duplicate — resolved by the parent chip finding.
- **ClientsKpiStrip (StatBand) — 'At risk' subtext on the clients list** — _state-change · value:low · risk:low_  
  `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1396-1419`  
  now: The StatBand's 'At risk' tile sub-label switches between 'need attention' (warning) and 'on track' (tertiary) but the StatBand renders statically — the sub color change is invisible.  
  → This is a StatBand primitive concern, not a call-site concern. The clients-surface finding is that when `atRiskCount` drops to 0 (e.g. after mass status updates), the 'on track' sub-label appears instantly. No motion proposal for the StatBand at the call site — the StatBand itself would need keyed f

### sources · 6

- **ExternalLink icon button in SourceRow trailing cell** — _state-change · value:high · risk:low_  
  `apps/app/src/features/rules/sources-tab.tsx:700-712`  
  now: The trailing ExternalLinkIcon anchor sits at full opacity at all times; it is visually present on every row even when the user is not hovering. It competes with the row's primary link (the title ancho  
  → Add `group` to the `<TableRow>` className and replace the trailing anchor's className with `opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100`. This matches the reveal-on-hover pattern already used in ClientFactsWorkspace (line 529), PulseAlertRow (line 432), and Affecte
- **HealthBadge (Watched / Paused) in the Watch column of SourceRow** — _state-change · value:high · risk:low_  
  `apps/app/src/features/rules/rules-console-primitives.tsx:236-254`  
  now: The `BadgeStatusDot` inside `HealthBadge` is a flat static circle (PulsingDot.tsx comment: 'flat colored circle — no shadow halo, no animate-ping ring'). The 'Watched' green dot reads as a calm status  
  → For the `healthy` / `tone='success'` case only, add a subtle breathing presence to the dot by wrapping it the same way MonitoringChip already does for its LIVE indicator: a `<span className='relative inline-flex size-1.5 shrink-0'>` with an inner `<span className='absolute inset-0 animate-ping round
- **QueryPanelState loading skeleton (sources query in flight)** — _loading · value:high · risk:low_  
  `apps/app/src/features/rules/rules-console-primitives.tsx:193-212`  
  now: The loading state renders three generic `Skeleton` bars at h-6 widths (100%, 80%, 60%) inside a SectionFrame. This is a plain stack with no structural correspondence to the actual table chrome (header  
  → Replace the three-bar generic skeleton with one that scaffolds the actual page shape: a stat-band-height row with three evenly-spaced columns (mirroring SourcesKpiStrip), then a table-header-height bar, then 5 row-height (h-14) staggered skeletons matching SourceRow pitch. Use the existing `Skeleton
- **Catch up still-open windows Button in SourceCoverageSection** — _feedback · value:high · risk:low_  
  `apps/app/src/features/rules/sources-tab.tsx:487-499`  
  now: When `catchUpMutation.isPending` is true, the button just swaps its text label from 'Catch up still-open windows' to 'Catching up…'. There is no spinner or visual in-progress indicator, so the text ch  
  → Add a `Loader2Icon data-icon='inline-start' className='animate-spin'` inside the pending branch, following the exact pattern already used in calendar-page.tsx (line 322). The Button primitive's own `active:scale-[0.98]` and `transition` handle the press — only the pending spinner is missing. Pattern
- **Coverage section table rows (hover:bg-transparent disables the row's hover signal)** — _feedback · value:medium · risk:low_  
  `apps/app/src/features/rules/sources-tab.tsx:512`  
  now: The coverage table rows pass `className='hover:bg-transparent'` which explicitly kills the canonical `hover:bg-state-base-hover` that `TableRow` applies when NOT cursor-pointer. The rows are display-o  
  → This is not a motion gap but a hover-feedback gap. The coverage rows already have `title={row.missingReason}` on the missing-roles cell. Replace `hover:bg-transparent` with the canonical neutral-hover that display rows get: remove the override entirely and let `TableRow`'s default `hover:bg-state-ba
- **Filter chip row (All / Watched / Paused Segmented control) when health filter changes** — _transition · value:medium · risk:medium_  
  `apps/app/src/features/rules/sources-tab.tsx:229-245 and sources-tab.tsx:118-132 (filteredRows memo)`  
  now: Switching between 'All', 'Watched', and 'Paused' instantly swaps `visibleRows`, causing the table body to hard-replace without any transition. Because the Sources table is a registry (one auth source  
  → Wrap the `<TableBody>` content in an `<AnimatePresence mode='wait'>` with a keyed `<motion.tbody>` using `fadeMotion` from lib/motion.ts: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}`. The EXIT (120ms) snap-fade communicates 'old list gone'

### rules · 7

- **DisclosureCard expanded detail body** — _state-change · value:high · risk:low_  
  `apps/app/src/features/rules/rule-detail-drawer.tsx:263-265`  
  now: The detail section mounts/unmounts instantly with a bare conditional render — no transition. The chevron already rotates, but the content appears/disappears as a hard snap.  
  → Wrap the detail body in a motion/react <AnimatePresence> + <motion.div> using contentEnterMotion (initial: { y: -6, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18, ease: EASE_APPLE }). This ties the reveal to the chevron that already animates, complet
- **MatchedPulseBlock entrance at top of RuleDetailInline** — _entrance · value:high · risk:low_  
  `apps/app/src/features/rules/matched-pulse-block.tsx:33`  
  now: The warning block (amber border, pending-regulatory-change alert) mounts statically — it just appears at the top of the detail panel with no entrance cue, despite being the highest-urgency item on the  
  → Add Tailwind animate-in: className="... animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none" to the outer <section>. A 150ms top-downward fade matches the urgency signal (draws the eye) without being jarring on a CPA workflow surface.
- **AI draft content reveal (skeleton → draft body transition in AiDraftReviewPanel)** — _feedback · value:high · risk:low_  
  `apps/app/src/features/rules/rule-detail-drawer.tsx:2066-2094`  
  now: When the draft arrives (generating flips false, draft becomes non-null), the content replaces the skeleton instantly — a hard snap from loading-skeleton to a text block with confidence % + quote + rea  
  → Wrap the draft content <div> (line 2067) in a motion/react <motion.div {...fadeMotion}> (fade 120ms). This is the 'draft is ready — Accept is now unlocked' moment: a quiet fade-in signals the state change without celebration, matching the calm brand. Import fadeMotion from @/lib/motion.
- **LockIcon on Accept button (locked-until-draft-ready state)** — _feedback · value:medium · risk:low_  
  `apps/app/src/features/rules/rule-detail-drawer.tsx:1455`  
  now: The LockIcon is conditionally rendered with no transition — it pops onto the button face when acceptDisabled && !reviewDisabled, giving no visual feedback that the gate state changed.  
  → Wrap the LockIcon in a motion/react <motion.span {...fadeMotion} key="lock"> so it fades in/out (120ms) when the gate opens or closes. This makes the 'Accept is now unlocked' moment legible without sound or color (the draft card fade above is the primary signal; this secondary icon should be quieter
- **RejectReasonDialog — radio-dot inner fill mount** — _state-change · value:medium · risk:low_  
  `apps/app/src/features/rules/rule-detail-drawer.tsx:1940-1942`  
  now: The selection inner dot (<span className="size-2 rounded-full bg-state-accent-solid">) mounts/unmounts instantly. The outer border already transitions via transition-colors, but the dot itself pops in  
  → Replace the bare <span> with <motion.span {...fadeMotion} key="dot"> so the dot fades in over 120ms on selection. This completes the radio affordance: border color transitions, dot fades in — consistent with how checkboxes feel in the rest of the app.
- **RuleYearDiff field list entrance (DiffFieldList)** — _entrance · value:medium · risk:low_  
  `apps/app/src/features/rules/rule-year-diff.tsx:128-156`  
  now: When the diffQuery resolves, the list of changed fields (before → after rows) appears instantly as a full block. The diff is a key acceptance signal — showing it change-by-change helps the CPA parse i  
  → Wrap the <ul> in an <AnimatePresence> and stagger each <li> with a motion.li: initial={{ opacity: 0, x: -4 }}, animate={{ opacity: 1, x: 0 }}, transition: { duration: 0.18, ease: EASE_APPLE, delay: index \* 0.04 }. Cap stagger at 4 items × 40ms = 160ms total sequence, well under the 700ms rule. Only
- **Post-accept success moment — rule row disappears from Review scope** — _state-change · value:medium · risk:medium_  
  `apps/app/src/features/rules/jurisdiction-rule-table.tsx:479-510`  
  now: After a successful Accept, the rule's status changes and the row disappears from the Review scope on the next query invalidation — it just vanishes with no exit animation. This is the key moment the C  
  → Wrap each JurisdictionRuleRow in a motion/react <AnimatePresence> and add an exit prop: exit={{ opacity: 0, x: 12, transition: { duration: 0.12, ease: EASE_APPLE } }}. The row slides off to the right (same direction as the detail panel) rather than vanishing. Only applicable in scope === 'review'; d

### audit-log · 7

- **AuditTimelineRow — the entire row `div[role=button]`** — _feedback · value:high · risk:low_  
  `apps/app/src/features/audit/audit-log-table.tsx:242`  
  now: Has `transition-colors` for hover/focus but no press feedback. Clicking it opens the AuditEventDrawer yet the row gives no tactile acknowledgement — the action is silent.  
  → Add `active:scale-[0.99] transition-transform` to the className string alongside the existing `transition-colors`. Because two `transition-*` utilities are now in play, merge them into `transition` (shorthand) so both color and transform share the same 150ms default tempo. Final className segment: `
- **AuditEventDrawer — SheetContent data-starting-style gap** — _entrance · value:high · risk:low_  
  `packages/ui/src/components/ui/sheet.tsx:60-69`  
  now: The drawer has an exit fade (`data-ending-style:opacity-0`, 300ms ease-apple) but NO `data-starting-style` equivalent. The panel appears instantly at full opacity on open; only the close animates. The  
  → Add `data-starting-style:opacity-0` in parallel with the existing `data-ending-style:opacity-0`. This symmetrically fades in the drawer on open at 300ms ease-apple (the SURFACE duration already wired on the element) without any translate that could re-trigger the stuck-state bug. No other change nee
- **AuditEventDrawer content — `AuditEventDrawerContent` sections** — _transition · value:high · risk:low_  
  `apps/app/src/features/audit/audit-event-drawer.tsx:102-161`  
  now: When the user clicks a row, the drawer opens and the entire content block renders statically. When the selected event changes (user clicks a different row while the drawer is open), the content swaps  
  → Wrap the `<AuditEventDrawerContent>` render in a `<motion.div key={detailEvent.id} {...contentEnterMotion}>` so each new event slides in (12px + fade, 180ms ease-apple) when the key changes. Import `{ motion }` from `motion/react` and `{ contentEnterMotion }` from `@/lib/motion`. The existing `rende
- **EntityAuditActivityPanel — `<li>` rows in the activity list** — _state-change · value:medium · risk:low_  
   `apps/app/src/features/audit/entity-audit-activity-panel.tsx:84`  
   now: Each `<li>` in the entity timeline (used in the Status-tab activity panel on the deadline detail page) is completely static — no hover state, no press feedback. Yet the primary list (`AuditTimelineRow  
→ Add `transition-colors hover:bg-state-base-hover`to the`<li>`className (line 84). This is a read-only list — no onClick — so it's purely a legibility aid (scanning rows, the hovered one lifts slightly in warmth). If the item is later made clickable (to open a detail sheet),`active:scale-[0.99]`
- **AuditSkeleton → AuditLogTable swap (loading → data)** — _loading · value:medium · risk:low_  
  `apps/app/src/features/audit/audit-log-page.tsx:309-317 (AuditSkeleton) and 1063-1069 (table render)`  
  now: When the `auditQuery` resolves, the `AuditSkeleton` unmounts and `AuditLogTable` mounts with no transition. The skeleton is 8 `h-12` bars; the table is a day-grouped bordered list. The swap is abrupt  
  → Wrap the `<AuditLogTable>` render at line 1065 in `<motion.div {...contentEnterMotion}>` (slide 12px + fade, 180ms ease-apple). The skeleton unmount can stay instant (no exit needed — the skeleton disappearing quickly is fine; it's the content arrival that should feel smooth). Import `{ motion }` fr
- **EmptyState (filtered / no-results) mount inside the Events card** — _feedback · value:medium · risk:low_  
  `apps/app/src/features/audit/audit-log-page.tsx:1028-1061`  
  now: When the search or filter produces zero results, `<EmptyState>` mounts with no transition — it appears instantly where the table was. The `EmptyState` component itself has no entrance animation.  
  → Wrap the `<EmptyState ...>` render (the condition block at line 1028) in `<motion.div {...contentEnterMotion}>`. Same 180ms slide+fade as the table entrance so both arrival states feel consistent within the same card region. This is a genuine comprehension aid: the investigator scanning for a match
- **AuditKpiStrip (StatBand) — counts update when filter changes** — _state-change · value:medium · risk:medium_  
  `apps/app/src/features/audit/audit-log-page.tsx:820-826`  
  now: The five KPI values (Events, Filings, Amendments, Access, System) recompute immediately when the filter changes — numbers flip with no signal. A CPA filtering by category wants to notice the count mov  
  → In `StatBand`, the value `<span>` already uses `font-semibold tabular-nums`. Add a CSS key-frame `@keyframes stat-bump { 0%,100% { opacity:1 } 50% { opacity:0.45 } }` in preset.css and wire it on the value node as a short pulse (150ms, once) triggered by a React `key` change. Alternatively (and simp

### login-onboarding · 8

- **SuccessModal hero CheckIcon badge** — _entrance · value:high · risk:low_ 🎉  
  `apps/app/src/features/migration/SuccessModal.tsx:103-105`  
  now: Static — the green check `<span>` appears instantly when the modal opens, no entrance whatsoever. This is the biggest win-celebration moment in the entire onboarding funnel.  
  → Wrap the check badge in a `<motion.span>` with `initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}` (ENTER + EASE_APPLE). No reduced-motion guard needed — MotionConfig at the root handles it.
- **SuccessModal stats row — four Stat cells** — _entrance · value:high · risk:low_ 🎉  
  `apps/app/src/features/migration/SuccessModal.tsx:128-161`  
  now: All four `<Stat>` cells appear simultaneously with the modal. The numbers are the key deliverable — the user just imported N clients — and they currently just pop in.  
  → Wrap each `<Stat>` in `<motion.div>` with `variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}` on a parent `<motion.div staggerChildren={0.04}>`, transition `{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }`. Four cells × 40ms stagger = 160ms total — well under 700ms ceiling. No red
- **Wizard Stepper — step pill transition from pending → active → done** — _state-change · value:high · risk:low_  
  `apps/app/src/features/migration/Stepper.tsx:71-86`  
  now: Uses `transition-colors` only. When a step advances from active (filled accent pill) to done (green-tint + check), the check icon pops in with no entrance and the circle shrinks instantly. Comprehensi  
  → Add `transition-all` to the outer pill `div` (already has `transition-colors`, widen to `transition-all`). Wrap the `<CheckIcon>` inside the circle `<span>` in `<motion.span initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }
- **EmptyState `ghost-cards` visual (three fanned placeholder cards)** — _entrance · value:medium · risk:low_ 🎉  
  `apps/app/src/components/patterns/empty-state.tsx:99-107`  
  now: Static on mount — the three fanned cards (two angled behind, one front) appear instantly with no entrance. This is a `variant='prominent'` empty state and the delight-permitted moment of a list surfac  
  → Wrap the `<div className="relative flex h-[76px]...">` in `<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}>`. This is additive — it does not conflict with the existing structure. No reduced-motion guard needed.
- **SplashRoute recap list items (`<li>` rows with CircleCheckIcon)** — _entrance · value:medium · risk:low_  
  `apps/app/src/routes/splash.tsx:162-176`  
  now: Static — all recap lines appear together on `recapQuery.isLoading` → resolved transition. No entrance. The recap is the only personalised "while you were away" content and the items all appearing at o  
  → Wrap the `<ul>` in a `<motion.ul initial='hidden' animate='show' variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>` and each `<li>` in `<motion.li variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1]
- **Login `FieldShell` error message (`<p role='alert'>`) entrance** — _feedback · value:medium · risk:low_  
  `apps/app/src/routes/login.tsx:684-691 and 766-771`  
  now: Error text appears instantly when set. There is already a `motion-reduce:animate-none` guard on the OTP form, but the error `<p>` in both the email and OTP shells has no entrance — it pops in abruptly  
  → Add `className='... animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none'` to both error `<p>` elements. This uses the Tailwind recipe (ENTER-class duration is 150ms which matches the micro-interaction default). The `motion-reduce:animate-none` guard is needed here because
- **SuccessModal `NextStep` rows — list entrance** — _entrance · value:medium · risk:low_  
  `apps/app/src/features/migration/SuccessModal.tsx:195-218`  
  now: The three 'What to do next' rows appear instantly when the modal opens. No stagger. These are the primary post-import navigation affordances — a gentle stagger reads as 'here are your options, in orde  
  → Wrap the three `<NextStep>` calls in a `<motion.div className='flex flex-col gap-2' initial='hidden' animate='show' variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}>` and wrap each `<NextStep>` root `<button>` in `<motion.div variants={{ hidden: { opaci
- **OnboardingRoute `StepDots` — active dot transition** — _state-change · value:low · risk:low_  
  `apps/app/src/routes/onboarding.tsx:61-83`  
  now: The step dots switch between `bg-state-accent-solid` (active) and `bg-divider-regular` (pending) with no transition class. On step advance (e.g. firm setup → rule review in the `review` branch) the do  
  → Add `className='... transition-colors'` to the dot `<span>` (currently has none). This is a Tailwind default micro-interaction — no duration/ease restatement needed, no reduced-motion guard.

### primitives · 7

- **Checkbox indicator (check/minus glyph)** — _feedback · value:high · risk:low_  
  `packages/ui/src/components/ui/checkbox.tsx:50`  
  now: CheckboxPrimitive.Indicator has `transition-none` — the check and minus icons snap in/out instantly with zero animation when checked state changes.  
  → Remove `transition-none` from the Indicator. Add `animate-in fade-in zoom-in-75 duration-150` to both the CheckIcon and MinusIcon. This gives the glyph a quick scale-up-from-75%-and-fade-in when it first appears, which confirms the state change without being distracting. Because these are CSS animat
- **StatusRing SVG arc fill on status transition** — _state-change · value:high · risk:medium_  
  `apps/app/src/components/primitives/status-ring.tsx:36`  
  now: Fully static SVG. When an obligation advances from not_started → in_review → filed → completed the ring's filled arc (strokeDasharray) changes instantly with no animated fill. This is the product's ce  
  → Wrap the partial-fill arc `<circle>` in a `<motion.circle>` (from motion/react) and animate `strokeDasharray` on mount/update. Use `initial={{ strokeDasharray: '0 37.7' }}` and `animate={{ strokeDasharray: '${filled} 37.7' }}` with `transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}`
- **StatusRing completed-state entrance (the solid disc + check)** — _delight · value:high · risk:medium_ 🎉  
  `apps/app/src/components/primitives/status-ring.tsx:45`  
  now: When status reaches `completed` the solid circle and check-path render statically — there is no moment of arrival for the most positive state in the product lifecycle.  
  → Wrap the completed `<circle>` in `<motion.circle>` with `initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}` using `transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}` and `style={{ transformOrigin: '8px 8px' }}` (SVG needs an explicit transform-origin). The chec
- **Segmented active-indicator jump** — _state-change · value:medium · risk:low_  
  `packages/ui/src/components/ui/segmented.tsx:93`  
  now: Active segment gets `bg-components-segmented-item-bg-active border border-divider-subtle` applied with only `transition-colors`. When the user picks a different option the white fill appears on the ne  
  → Add `transition-[background-color,border-color,transform] active:scale-[0.97]` to all segment buttons (replacing `transition-colors`). The color cross-fade already hints at the move; the scale gives press feedback matching the Button grammar. For a full shared-element slide the approach would requir
- **ToggleChip missing press feedback** — _feedback · value:medium · risk:low_  
  `packages/ui/src/components/primitives/toggle-chip.tsx:54`  
  now: `transition-colors` only. ToggleChip is a `<button>` and the primary filter-engagement control across the app, but unlike Button it has no `active:scale-*` — it feels less crisp than a regular button  
  → Add `active:scale-[0.97]` and change `transition-colors` to `transition` (same as Button base, so transform is included) on line 54. One word change: `'... transition-colors'` → `'... transition active:scale-[0.97]'`.
- **CollapsibleSearch width transition (icon ↔ input swap)** — _transition · value:medium · risk:medium_  
  `apps/app/src/components/primitives/collapsible-search.tsx:100`  
  now: The outer `<div>` switches between `inline-flex` (collapsed) and `expandedWidthClassName` (e.g. `w-full md:w-56`) on `isOpen`. Because this is a class swap, not a transition, the width jumps instantly  
  → Replace the binary className swap with a single always-mounted container using `transition-[width] duration-150` and a data attribute: `data-open={isOpen}`. Set `data-open:w-56` via a Tailwind arbitrary variant. Keep the button/input conditional mount but animate the wrapper. Alternatively — simpler
- **Switch thumb easing parity** — _state-change · value:low · risk:low_  
  `packages/ui/src/components/ui/switch.tsx:32`  
  now: `transition-transform` on the Thumb with no explicit duration or easing. It defaults to Tailwind's 150ms ease-out. The track background uses `transition-colors` (also 150ms ease-out) on the Root. Both  
  → Add `duration-150` explicitly to the Thumb's `transition-transform` → `transition-transform duration-150` to document the intent and prevent a future theme default from silently changing it. This is purely a clarity/robustness note — no visual change.
