# Today-page Vibma sweep (35 items)

Date: 2026-05-25
Branch: `design/preview-integration`
Files: 14 modified, no contract changes

Yuqi exported a 35-item annotation list against the `/` route from
the in-browser annotation tool. The list spans 5 surfaces, all
reachable via the dashboard: the sidebar shell, the Today body
itself, the Pulse detail drawer, the Migration Copilot wizard
(opened from the empty state), and the Create-obligation dialog
(opened from the header). Most items are pure CSS/layout fixes; a
few are vocabulary calls; one (#3, desktop sidebar collapse) is
out-of-scope architectural work and is deferred with a TODO
pointing at DESIGN.md §5.4.

## Cluster A — sidebar shell

- **#1 Bigger workspace avatar** — `size-6` → `size-8`, label
  bumped to `text-sm`. The avatar at h-14 was reading as a generic
  UI dot, not a workspace mark.
- **#2 More top breathing room** — SidebarContent shifts from `py-2`
  to `pt-4 pb-2` so the firm switcher and the first nav item don't
  read as a single block.
- **#3 Sidebar collapse state** — deferred. DESIGN.md §5.4 fixes
  the sidebar at 220px with no collapse. Yuqi is asking to revisit
  that; it needs a real design decision (collapsed width? badge
  rendering? trigger location? persistence layer?), so it's
  documented as a TODO on the sidebar primitive rather than a
  one-off CSS hack.
- **#18 Frame the Deadlines badge** — the urgent / inventory split
  on `SidebarMenuBadge` used to render with different shapes (pill
  vs bare mono number). Both now share the same h-18 pill shape
  with neutral vs warning fills. The right edge of the rail reads
  as one column.

## Cluster B — Today body

- **#4 Bigger rounded corners on the Alerts strip** — `rounded-md`
  → `rounded-2xl`, padding to `p-4`. Reads as a content surface,
  not a button.
- **#5 Alert card hover bg** — added
  `hover:bg-background-default-hover`. Border-only hover was nearly
  invisible against the tinted section bg.
- **#6 Overflow tile stripped of card chrome** — the "+ N more"
  tile drops its border and bg entirely. Renders as a plain
  text-link tile that visually signals "show more here," not
  "another alert card next to two real ones."
- **#31 Visual hierarchy** — meta. Falls out from #4 (Alerts now
  louder) and the centered section headers (#34, #35).
- **#32 Tighten expanded-row top padding** — panel goes from `py-4`
  to `pt-3 pb-4`. The 16px top padding was creating a visible gap
  between the row's baseline and the dl content.
- **#33 Internal + Official deadlines on one line** — new dl row
  in the expansion panel. Internal date computed view-side from
  `firm.internalDeadlineOffsetDays` (no contract migration needed);
  both rendered prose with `formatDatePretty`.
- **#34 / #35 Center section headers** — both "Alerts" and
  "Actions this week" h2s now sit in a 3-col grid
  (`1fr / auto / 1fr`), centered between an invisible left spacer
  and the right-side "View all" link.

## Cluster C — Pulse detail drawer

- **#7 New badge tone + icon** — switched from `warning` (read as
  red in context) to `info` (teal/blue accent) and added a
  Sparkles leading icon.
- **#8 Source badge bigger** — `text-xs` → `text-sm` + `h-6`. The
  source name is the most-scanned fact in the header, not footer
  meta.
- **#9 Alert icon aligns with first text line** — Alert primitive
  now puts the icon on `row-start-1 self-start` with a 1px nudge
  so it tracks the title baseline. Was previously `row-span-2`
  (centered across both rows).
- **#11 Low-AI-confidence alert: warning, not destructive** — red
  text was pushing CPAs toward "data broke" instead of "double-
  check this."
- **#12 / #21 Highlight what changed** — the deadline-shift fact
  now renders as `[old] → [new]` with a warning-amber arrow icon
  and the new date in `text-warning font-semibold`. The single
  most consequential fact in the drawer is now visually
  unmistakable.
- **#13 Scope title more prominent** — FactCard heading bumps from
  `text-sm` to `text-base font-semibold`.
- **#14 Show full state name** — jurisdiction badge keeps the code
  ("FL") and adds the full name beside it ("Florida"), via the
  existing `RULE_JURISDICTION_LABELS` map.
- **#15 Form name human-readable** — `fl_corp_income` →
  `FL Corporate Income` via the existing `formatTaxCode` helper.
  Raw code stays as `title` for accessibility.
- **#16 Section header heights consistent** — FactCard header
  locks to `min-h-11 items-center`. Different action-button sizes
  no longer produce different header heights.
- **#17 Better Open-source button** — was a generic outline button
  labeled "Open official source." Now a `link` variant displaying
  the actual source name with an external-link arrow.
- **#19 Density higher** — body gap drops from `gap-5` to `gap-4`,
  py-5 → py-4.
- **#20 Source excerpt as plain paragraph** — dropped its FactCard
  wrapper. Renders as a bordered blockquote with the copy button
  pinned to the top-right corner on hover.
- **#22 Action more prominent** — already accomplished via the
  drawer footer's prominent Apply button + the in-body
  SuggestedActionsPanel. Not over-corrected.
- **#23 Floating right panel** — Sheet now sits with 20px gap on
  top, bottom, and right edges via
  `data-[side=right]:top-5 data-[side=right]:right-5
data-[side=right]:bottom-5 data-[side=right]:h-auto
data-[side=right]:rounded-lg`. Reads as a card sliding in, not a
  wall replacing the right half of the screen.

## Cluster D — Migration Copilot wizard (Step 1)

- **#24 Logo tile bg** — `bg-white ring-black/10` → `bg-background-
subtle ring-divider-subtle`. Logos with non-white brand colors
  no longer fight a hard white square.
- **#25 Bold/italic column-name examples** — column names in the
  body copy ("Estimated tax due", "Owner count", "Owners") render
  in `font-medium not-italic text-text-primary` inside `<em>`
  tags. Reads as "look for these specific column names" rather
  than as narrative prose.
- **#26 Remove the OR divider lines** — the vertical hairlines
  above and below "or" are gone. Just the lowercase eyebrow,
  centered.
- **#27 Preset chip on the design system** — heights snap to
  Button tokens (h-8 default / h-7 compact), `text-sm font-
medium`. Was previously h-9 + text-md, an off-scale unique-to-
  this-chip size.
- **#28 Back button drops the arrow icon** — the label "Back" is
  already directional. The arrow added weight that competed with
  the Continue button's forward arrow.

## Cluster E — Create-obligation dialog

- **#29 Left-align "Don't see your client?"** — added `self-start`
  to the inline link button. Was previously centered/stretched by
  the Field flex layout depending on browser.
- **#30 Combobox dropdown more compact** — list rows collapsed
  from two lines (name above, state · entity below) to a single
  line (name left, state · entity tertiary-right). Max-height
  drops from 320px to 280px so the dropdown stays inside the
  dialog's visual frame.
- **#10 Info-icon overuse** — deferred. Yuqi flagged "too much use
  of information icon" across the whole app; addressing it
  properly means an audit of every ConceptLabel / CircleHelp /
  Info mount, deciding which concepts genuinely need hover help
  vs. which can be replaced by clearer copy or tooltips inline.
  Tracked as a follow-up.

## Verification

- `pnpm vp lint` → 0 errors, 0 warnings (664 files, 184 rules).
- `pnpm tsc -b` → no new errors. The 14 errors in `apps/server`
  (D1Database, KVNamespace, etc.) predate this branch — Cloudflare
  Workers type config is missing on the server package and is
  unrelated to UI changes.
- Visual inspection deferred to Yuqi's local dev server.

## Out of scope, tracked for later

- **#3 Sidebar desktop collapse** — needs design decision before
  implementation. TODO on the sidebar primitive.
- **#10 Info-icon audit** — app-wide audit task.
- **#22 Apply button more dominant** — current treatment seems
  enough; revisit if Yuqi still flags after seeing #21 land.
