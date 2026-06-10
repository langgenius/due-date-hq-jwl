# Deadline detail (page mode) ↔ Alert detail panel alignment

Date: 2026-06-10
Surface: `/deadlines/:ref` (page mode) — `ObligationQueueDetailDrawer` + `DeadlineCrumbBar` + `deadline-detail.tsx`
Reference (read-only): `AlertDetailDrawer.tsx`

Goal: make the DEADLINE detail panel (page mode) match the ALERT detail panel
in surface, layout, component positions, and interactions — after restoring
deadline rework that an `origin/main` merge (`2326cfab` + `36cad3a7`) reverted,
and folding in design-critique fixes. Panel mode (/clients) + sheet mode are
gated unchanged behind `isPageMode`.

## Phase 1 — restored the reverted rework

The merge reset the page-mode body to its pre-rework two-column / 1100px state.
Re-applied the INTENT of each ancestor commit manually (not cherry-picked):

- `2f0d4b27` hero — dropped the "Last activity just now" line from the hero
  (it belongs in the Status-tab Recent-activity card + the footer/Audit tab).
- `69879cb8` single-column — replaced the `lg:flex-row` two-column layout (+
  right Ownership/Linked rail) with ONE column; folded Ownership + Linked-from
  into a full-width 2-up footer row (`grid sm:grid-cols-2`).
- `61edf90a` — folded "What's left to do" INSIDE the WorkflowMilestoneCard as a
  divider-separated section (top hairline + small eyebrow), not a separate card.
- `2adfcf5e` — folded the Extension (`decideExtension` / Form 7004-4868) flow
  into the Status tab as a `DetailSectionCard`, reusing the existing
  `extensionDraft` / `saveExtensionDecision` (no fiction; real rule fields only).
- `66dff6c4` white-top — NOT re-applied as-written. Superseded by the
  authoritative user decision "(2) FULLY UNIFY including background": instead of
  a white hero + white date/tab band, the surface now mirrors the alert's bg
  model exactly (see Phase 2 #7).

## Phase 2 — unified to the alert panel

- **#1 In-surface top bar** — rebuilt `DeadlineCrumbBar` to the alert BackStrip
  contract: a `h-[52px]` `border-b` band, content capped to the 760px measure,
  carrying a "‹ Deadlines" crumb + "N of M" position read-out + a close ✕
  (`size-7 rounded-lg`). Moved INTO the drawer body (page mode) so it shares the
  scroll column + measure. `onPrev`/`onNext`/`position` threaded from
  `deadline-detail.tsx` (computed from `currentIndex` / `prevRow` / `nextRow`).
  The route no longer renders a separate crumb bar above the panel.
- **#2 Keyboard interactions** — added two window-level handlers (page mode,
  with INPUT/TEXTAREA + `isModalLayerOpen()` guards, mirroring the alert):
  ▲/▼ pages prev/next through the rail list; `F` marks filed / advances (the
  deadline analogue of the alert's `A`), firing the same
  `changeStatus(row.id, 'done')` the footer primary fires.
- **#3 Status banner position** — re-enabled the full-bleed `DetailStatusBanner`
  band in page mode (above the header) so status sits in the SAME place as the
  alert; dropped the header status chip in page mode (de-dupe).
- **#4 Shared `DetailSectionCard`** — Ownership + Linked-from now use the shared
  gray-header card (was hand-rolled `<section>` + uppercase `<h3>`).
- **#5 Footer** — aligned to the alert SheetFooter: `min-h-16 border-t px-12
  py-3` on white, content centered in `mx-auto max-w-[760px]` with
  `flex-row items-center gap-8` (was `flex-wrap justify-between`).
- **#6 Document measure** — every page-mode region (header, body, top bar,
  footer) moved from `max-w-[1100px]` → `max-w-[760px]`.
- **#7 Background** — page-mode root aside is now WHITE (`bg-background-default
  shadow-subtle`, no left border) exactly like the alert; the gray wash
  (`bg-background-subtle`) is painted by the header + body regions, hosting
  white cards. Identical surface model to the alert: white root → gray-wash
  document → white cards.

## Phase 3 — critique fixes

- **One primary CTA, context-aware** — the footer "Mark as filed" now demotes to
  an OUTLINE button while the row is In Review (the stage card's "Approve return"
  is the single blue primary there); it stays primary in every other stage.
  Never two blue primaries on screen.
- **De-dupe status** — status is stated once in the top banner (header chip
  dropped in page mode).
- **Contrast** — the Ownership "Change" target went from a tiny `h-7` accent
  ghost (~3:1) to a bordered `h-8` outline button (clears AA).

## Could NOT match (reason)

- **Differentiate the 3 date cards** + the "29 days past" vs "30 days overdue"
  off-by-one wording — both live in `PrimaryDeadlineStrip` (`queue/components/
  panels.tsx`), which is OUT of the editable set for this task.
- **Tame the active stepper-node red** + the duplicate STEPS sub-list — both
  live in `ActiveStageDetailCard` / the workflow stepper in `panels.tsx`
  (off-limits). The surface-level red is already reserved for OVERDUE via the
  status banner.

## Verify

- `tsgo --noEmit`: clean (only the pre-existing `dashboard.tsx` error remains).
- `vitest run obligations`: 89/89 pass.
- `check:tokens`: no NEW violations in the 3 edited files.
