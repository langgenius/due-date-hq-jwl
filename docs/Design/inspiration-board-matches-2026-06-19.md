# Inspiration board → product matches

> Every image in the `DueDateHQ-Design Direction` board (201 files) read and mapped
> to a concrete place in the product. _2026-06-19._ Method: all 201 normalized to
> readable stills (200 images + 1 video poster — ffmpeg is broken on this machine,
> so the clip got a QuickLook poster frame), then read by 17 parallel agents, one
> per ~12-image batch. Each image got: the **craftable detail** it shows + a
> **concrete DueDateHQ application** + a relevance rating.
>
> **Spread:** 58 high · 77 medium · 26 low · 40 none. The 40 "none" are editorial
> illustrations / photography / branding with no UI mechanic — honestly flagged, not
> forced into a match. Image ids (`img-NNN`) are stable references into the full
> ledger at the bottom; originals are the Pinterest hashes on the Desktop board.

The striking thing: most of the high-relevance hits **converge on patterns the
design system already declares** — they're proof the direction is right and, more
usefully, they show a _cleaner execution_ of a detail we already own. A smaller set
are genuinely new affordances the product doesn't have yet. Both are below.

---

## Part 1 — Details worth building

### A. Status, workflow & progress (the product's spine)

- **Status chip as a soft-tint pill, icon + text co-colored to the border** —
  `img-054` `img-196` `img-171` `img-114` `img-047` `img-122`. Validates
  `StatusRing` + `SeverityChip`. Two refinements: (1) co-color the icon _and_ label
  to the pill hue rather than a neutral icon on tint (`img-196`); (2) in the dense
  workbench table the **chip alone is enough — no icon doubling** (`img-171`). The
  two-size idea (icon-only in rows, full pill in the detail hero) is exactly how
  `StatusRing` is already used (`img-054`).
- **Workflow step-marker vocabulary** — `img-086` `img-128` `img-035`. Filled check
  = done, **animated ring = active**, dim number = pending. The stepped typographic
  title (active at full contrast, future stages muted gray, _same_ font size,
  `img-035`) is a no-extra-UI way to express the **asymmetric-stage-attention**
  canon on the `/deadlines/[id]` workflow strip.
- **Segmented / tick-mark progress with the severity ramp + a % pill** — `img-074`
  `img-128`. For the Status-tab checklist ("N of M materials done") this reads more
  viscerally than a smooth ring and reuses the critical/high/medium tokens.
- **Numbered horizontal step connector** — `img-067`. A compact fallback for the
  workflow strip at the breakpoint where the full asymmetric strip collapses.

### B. Tables, chips & filters (`/deadlines` workbench)

- **FilterTrigger `Label│Value⌄` — confirmed and extended** — `img-119` `img-125`
  `img-126` `img-192`. The two-zone pill with a hairline divider is already our
  Stripe-grammar canon; these add the **dismiss-X active state** (`img-119`), a
  **Select-all indeterminate row** in the dropdown (`img-125`), and a **two-panel
  dimension→option flyout with per-option counts** for the 7-dimension quick-filter
  spec (`img-126`).
- **Quick-filters panel grammar** — `img-102` `img-165`. Grouped pill-toggle chips,
  **full-width hairline separators** between groups (not just spacing), a **sticky
  Apply** (commit, not live-apply), and **color-dot swatches** on severity filter
  chips (critical = red dot…).
- **Dark floating bulk-action bar** — `img-123`. _Net-new._ "3 of 200 selected" +
  Change-status popover with a distinct icon per state. We have no bulk bar today;
  this is the model for the admin status-override / bulk-extension case.
- **Severity signal without a column** — `img-058` (left-edge 2–3px accent bar on
  URGENT/HIGH rows only), `img-091` (diagonal-hatch texture as a severity background
  — honors "no per-side border on rounded corners" and "never red+bold"), `img-186`
  (right-aligned relative "due in Nd" on rail rows).

### C. Lists, rails & detail metadata

- **Active-row dark inversion + color-coded square icon per row** — `img-042`. For
  the selected source in the `/sources` rail (stronger than a border-left), with a
  tinted category icon per authority (IRS / state / CRA).
- **Icon+label-left / value-right fact rows inside a bordered card** — `img-129`
  `img-134` `img-080` `img-200`. A cleaner obligation/client metadata render than a
  two-column table; `img-200` adds the **`label │ value │ edit-pencil`** row for the
  page-mode inline edit; `img-134` the **date-gutter** (big day number) left column
  for `/audit-log`.
- **Member row with a trailing role-selector pill** — `img-046`. avatar + name +
  sub-role + inline role dropdown → the `/clients` 7-role assignment, on the
  `AssigneeAvatar` primitive.
- **Two-signal obligation rows** — `img-192` `img-113` `img-179`. Due-in pill +
  status pill on one title line; a **recency-tinted** time pill (maps straight to
  the lateness ramp); a colored leading **type dot** + vertical connector to cut
  text-only scanning.

### D. Alerts & the decision feed

- **Live-feed header** — `img-151`. A **pulsing red dot** on the live tab (the 24/7
  monitor made visible), a big count + a segmented active/paused bar, and an
  **inline error chip** (retry count + error) for `/sources` health rows.
- **Before→after diff tooltip** — `img-153`. _Net-new, high value._ old-chip ›
  new-chip plus a delta pill, inline on a change chip — "Mar 15 › Apr 15", "1040 ›
  1040-X". The most regulatory-change-shaped detail on the board; perfect for
  `/alerts` detail and `/audit-log` hover.
- **Per-row action that recedes when done** — `img-164`. Greyed "Applied" vs colored
  "Apply" in the affected-clients table — kills the separate status column and makes
  one-click apply feel direct.
- **Animated gradient-border pill for "AI is reading / applying"** — `img-043`.
  _Net-new motion._ Activity on the border, white interior, no inner spinner. Swap
  the rainbow for navy→cyan.

### E. Materials, Record & Audit

- **File rows + in-card progress** — `img-112` `img-141` `img-200`. Mono type-badge
  (PDF/JPG) + name + size; **Download appears only on the active row** (quiet list);
  a **bottom-edge fill bar** for uploading/processing that swaps to a "View" button
  when ready (no overlay spinner).
- **Activity timeline, lighter than the ASCII transition row** — `img-061` `img-142`
  `img-178` `img-128` `img-147` `img-111`. Dot + **(dashed) connector line** + bold
  verb + muted `actor·timestamp`, **ghosted** future steps; a **timestamp chip as a
  section anchor** instead of a rule; a sticky-sidebar audit log. A refinement track
  for the `bqUOC` transition row on the Audit tab.
- **Extension / penalty widgets** — `img-094` (paired date+time triggers + calendar
  with a **navy** selected-date pill), `img-109` (two-zone card: value + CTA │ dates
  in labeled columns under a hairline).

### F. Empty states & onboarding

- **Imply content without faking data** — `img-055` (a fanned **ghost-card deck** —
  explicitly placeholder, so it passes "no fiction on canvas"), `img-071`
  (three-tile icon cluster), `img-098` (tinted icon container + dual CTA), `img-093`
  / `img-189` / `img-144` (text-left / schematic-preview-right intro cards — **drop
  the drop-shadow for a flat border**; a 2×2 "what to do first" grid; an illustrated
  tile with a **"Generate example"** CTA → the honest sample-data path).
- **Onboarding checklist card** — `img-070` (% pill + segmented progress + one CTA),
  `img-075` (collapsible checklist with **done / in-progress / locked** item states,
  inline progress + counter). Directly feeds onboarding proposal A/B.
- **Dismissible coachmark pill** — `img-158`. accent circle + prose + "GOT IT" chip,
  for the "one-click apply" first-run hint (navy/cyan, localStorage-dismissed).

### G. Navigation & global

- **Command palette / spotlight** — `img-137`. _Net-new, high payoff._ search + tab
  filters + grouped results + **keyboard-shortcut keycaps**; jump to a client,
  obligation ref, or form code. Also gives `CollapsibleSearch` its "press / to
  search" hint.
- **Sidebar account popover** — `img-097`. two-line name+email trigger; Settings /
  **Log out in red** (no separator needed). Resolves the account-action home.
- **Trust strip + StatBand anatomy** — `img-140` `img-034`. icon+label trust pairs
  for the `/login` footer / onboarding; the **StatBand strip** = icon + caps label +
  description, hairline-divided; **inline word-highlight** on hero copy to surface
  the one decision-relevant noun (authority, effective date) without a label row.
- **Tab bar with inline count badges** — `img-035` `img-144`. "Materials 3 · Audit
  12" on the tab labels — pending count without a click.
- **Inline "Pro Feature" gating badge** — `img-155`. after a label, keeping a gated
  feature discoverable; the `icon + label + description + Switch` row is also the
  right shape for rule config / per-obligation notification prefs.

### Net-new (the product has none of these today)

Command palette (`img-137`) · bulk-action bar (`img-123`) · before→after diff
tooltip (`img-153`) · animated "AI-reading" gradient pill (`img-043`) ·
diagonal-hatch severity texture (`img-091`) · in-card Materials progress bar
(`img-141`) · sidebar account popover (`img-097`) · live-feed pulsing dot +
segmented ratio (`img-151`).

### The 40 "none"

Mostly editorial spot illustrations and the "overwhelmed CPA buried in paper"
metaphor (`img-002/003/005/008/010` …) and stock photography. Usable as
marketing/landing spot art _only if_ a spot-illustration style is ever locked — they
carry no UI mechanic. The one transferable idea is the **two-color restraint**
(`img-004` `img-008`): a single brand accent over black-and-white line work; navy or
cyan could play that accent role in a future illustration system.

---

## Part 2 — Full ledger (all 201)

Every image, grouped by relevance. `id — [category] shows → match · (surface)`.

### High — build/adopt these · 58

- **img-034** `…29115907` · _navigation_  
  A marketing landing page with a horizontal nav bar using small colored dot indicators before each link (active = filled dot, inactive = hairline ring), a high-contrast pill CTA button in the top-right, and a bottom feature strip divided by thin vertical rules into icon + ALL-CAPS label + short description columns. The hero headline uses inline color-highlight spans (word-level background tints in two different hues) to emphasize key terms within running copy.  
  → The bottom strip anatomy — icon + all-caps sentence-case label + description, divided by hairline vertical rules — directly maps to DDHQ's StatBand component across clients-list, sources, and alert-history. The inline word-highlight technique on hero text could be applied to the /alerts detail hero summary line to visually surface the most decision-relevant noun (e.g. the authority name or effective date) without adding a separate label row.  
  · _StatBand horizontal feature strip; /alerts detail hero copy_
- **img-035** `…29115912` · _layout_  
  A dashboard with a large-text stepped page title ('Fit Build Launch') where the active phase is in bold/dark and future phases render in progressively lighter gray — a typographic stage-selector that doubles as a progress indicator. Below it, tabs (Vision / Product Goals / FBL Canvas) act as sub-navigation. The card grid uses equal-height bordered white cards with a bold section title, a muted subtitle line, body text area, and a floating dark circular edit icon at the bottom-right corner of each card.  
  → The stepped phase title pattern (active = dark/weight-600, future phases = muted gray, all at the same font size) is directly applicable to the /deadlines workflow strip header, where the 6 stages (not*started → completed) could render the active stage at full contrast and future stages at reduced opacity — reinforcing the 'asymmetric stage attention' canon without adding extra UI elements. The bottom-right floating action icon on each card also maps to the kebab/edit affordance on obligation detail sections.  
  · */deadlines workflow strip stage labels; detail card floating action\_
- **img-042** `…29116096` · _component_  
  A list of wallet rows where each row has: a color-coded square icon (tinted background, unique color per wallet), a bold name, a secondary dollar amount, and a trailing kebab menu + 'Edit' text link. The active/selected row inverts to a dark card (near-black background, white text, same icon). Rows are borderless list items inside a containing card with a subtle border.  
  → The color-coded square icon per list row with active-row dark inversion maps to the /sources authority list — each monitored authority source could carry a tinted square icon (distinct per source category: IRS, state, CRA) to speed scanning. The active-row dark inversion pattern is a strong candidate for the currently selected source in the /sources rail, replacing a plain border-left highlight.  
  · _/sources monitored authority list + active row selection state_
- **img-043** `…29116120` · _component_  
  A pill-shaped status badge with an animated rainbow/gradient border (cycling through blue/purple/pink/orange) used to signal an in-progress AI generation state ('Brief is generating ✓'). The gradient border is the sole motion indicator — the badge interior stays white with dark text.  
  → The animated gradient border on a pill badge directly applies to DDHQ's AI-apply in-progress state on the /alerts alert detail 'apply' button or the 'AI is reading' source health indicator on /sources. When a source is being actively crawled or an AI update is being applied, this gradient-border pill badge would signal activity without a spinner inside the action button.  
  · _/alerts apply action state + /sources source health chip (AI-reading)_
- **img-046** `…29116198` · _component_  
  A team-member list card where each row combines a circular avatar, a bold name, a muted sub-role label, and a trailing role-selector dropdown rendered as a compact pill with a chevron. A bottom aggregate row ('Members +8 People') uses a stacked-avatar cluster in place of a single avatar. All rows sit in a borderless list inside a white rounded card.  
  → The role-selector dropdown pill trailing each member row is directly applicable to the /clients client detail workspace — the assignee/team section currently assigns a single contact; this row pattern (avatar + name + role-label + trailing role pill) would support the 7 defined roles per obligation with inline role reassignment, matching the existing AssigneeAvatar primitive vocabulary.  
  · _/clients client detail — team/assignee section_
- **img-047** `…29116202` · _component_  
  A task list card where each row shows a plain task name at left and a soft pill-shaped status chip at right ("Completed" in green-tinted, "Ongoing" in amber-tinted, "To-do" in gray-tinted). The card header shows the list title, a count, and a stacked multi-avatar cluster for assignees. Rows have no icons — the status chip alone carries state.  
  → The soft pill status chip (tinted, no icon, name only) at row-right is directly applicable to the /deadlines obligation table — the current status column uses StatusRing + label; a soft pill variant without a ring would work as a more compact status indicator for the dense workbench table at 12px. The stacked multi-avatar header cluster also maps to the /clients list view where multiple assignees should be shown in aggregate.  
  · _/deadlines obligation table status column (dense/compact mode) + /clients list assignee cluster_
- **img-054** `…29116325` · _component_  
  Status badge system shown at two sizes side-by-side: a standalone circular icon (icon-only) and an expanded pill (icon + label text) in matching soft-tinted backgrounds. Each state has a unique icon: dashed circle for Draft, half-filled circle for In-progress, three-quarter-filled circle for In-review, filled checkmark for Completed. The pill's background tint and text color are the same hue as the icon, creating full chromatic coherence.  
  → Directly applicable to StatusRing and the obligation status badge used across /deadlines list, /today priorities, and the detail Status tab. The two-size approach (icon-only in dense table rows, pill in detail hero) matches exactly how DueDateHQ already uses StatusRing — this validates the pattern and shows a clean chromatic-coherence treatment where icon fill-level encodes progress state.  
  · _StatusRing / obligation status badge — /deadlines list + /deadlines/[id] hero + /today priorities_
- **img-055** `…29139743` · _empty-onboarding_  
  Empty state built from two slightly rotated/stacked ghost-skeleton cards (gray placeholder rectangles with rounded corners, no text) arranged as a fanned deck behind the foreground skeleton card — creating depth without a real illustration. Below: a single short sentence prompt and one solid CTA button.  
  → First-run /today or /deadlines empty state: the fanned ghost-card deck is a low-effort way to imply 'obligations will appear here' without a complex illustration or fabricated data. Fits the 'no fiction on canvas' constraint because the skeleton cards are explicitly placeholder, not fake data rows.  
  · _/today empty state / /deadlines empty state — first-run onboarding_
- **img-058** `…29139820` · _navigation_  
  Left-rail navigation list where one item ('Spam') has a left-edge accent bar in red and a numeric count badge inline — the bar is a 3px solid left border on the active/alert item only, all other items have no left border. The detail pane shows a contextual banner headline ('Spam: High volume detected') that matches the alert state of the selected rail item.  
  → The left-edge accent bar on an alert-state rail item is directly applicable to the /deadlines list rail or the /alerts list rail: obligations or alerts at URGENT/HIGH severity could display a 2–3px left-border in the severity tint color (red for critical, orange for high) while neutral items have none — giving an at-a-glance severity scan without adding a column.  
  · _/deadlines list rail — severity indicator / /alerts list rail_
- **img-061** `…29139882` · _navigation_  
  Kebab/overflow menu rendered as a flat vertical list of icon-label pairs with a full-width hairline separator dividing destructive actions (Archive) from informational ones (View, Copy URL, Download PDF, Duplicate). Each item is left-aligned with a small stroke icon at fixed width, no background hover state shown. Below the rule, an ACTIVITY section uses a vertical connector line threading through small circle dots, with each event showing a bold verb line and a subdued timestamp on the line below.  
  → The activity feed pattern maps directly to the /deadlines/[id] Audit tab transition rows and the /audit-log surface. The dot-plus-connector-line structure is a lighter alternative to the current transition row anatomy (ASCII arrow + mono enum) and could inform how the Audit tab renders state-change events with timestamps. The kebab menu structure also matches the obligation row overflow menu (View, Download, Archive actions).  
  · _/deadlines/[id] Audit tab, obligation row kebab menu_
- **img-067** `…29139929` · _navigation_  
  A multi-step wizard with numbered circle steps connected by a horizontal rule at the top of the form (1 Amount — 2 Recipient — 3 Review). Active step uses a filled dark circle with white number; future steps use a light outline circle with muted label. Below, a two-section input card is divided by a centered icon button (down-arrow swap) between an upper input zone (asset type + amount) and a lower receive zone. A tinted inline alert banner (gray background, bold label + description + CTA button) sits between the input card and a flat key-value summary section.  
  → The numbered step indicator at the top is applicable to the /deadlines/[id] workflow stage strip — a horizontal numbered connector could replace or complement the current asymmetric stage attention pattern for mobile/compact viewports where the full strip collapses. The inline tinted alert banner (gray bg + text + action button) directly matches the auto-unblock banner pattern specified for the cascade pending state.  
  · _/deadlines/[id] workflow stage strip (compact), auto-unblock banner_
- **img-070** `…29139936` · _component_  
  An onboarding completion prompt card: bold headline with a contrasting percentage badge (orange-red filled pill, white text '23%') top-right, a two-line description, a discrete-segment progress bar in red-to-orange gradient for the filled portion fading to gray for the remainder, and a single full-width outlined CTA button ('Go to checklist'). Bottom bar shows an avatar, a lifebuoy icon, and a gift icon as persistent utility affordances.  
  → The percentage badge + segmented progress bar + single CTA layout maps directly to the first-run /today onboarding checklist card (proposal A). The filled-segment-gradient mechanic (red at start, fading toward gray for incomplete) could convey urgency escalation on the setup checklist — e.g. more segments filled = less red, signaling progress. The percentage badge in a filled pill is a cleaner alternative to a text-only counter.  
  · _/today first-run onboarding checklist card (proposal A)_
- **img-071** `…29139942` · _empty-onboarding_  
  A full-bleed empty state card on a light gray background: three small white rounded icon tiles arranged in a loose cluster (calendar, link, code bracket icons) with the center tile slightly larger and foregrounded, giving a subtle z-depth suggestion without actual shadow. Below: a bold title, a two-line muted description, and a single outlined button. No illustration, no color, no decoration beyond the icon tiles.  
  → The three-tile icon cluster empty state is directly applicable to DueDateHQ's /rules library empty state (no rules yet), /sources empty state (no authorities added), or the Record tab empty state (no workpapers uploaded). The mechanic — 2-3 relevant concept icons in white rounded tiles, slightly offset — conveys what the surface is for without a bespoke illustration.  
  · _/rules empty state, /sources empty state, /deadlines/[id] Record tab empty state_
- **img-074** `…29140010` · _data-viz_  
  A segmented bar progress indicator made of many thin vertical tick-marks rather than a solid fill bar. Completed ticks are colored in a warm-to-cool ramp (red through orange, transitioning to gray for incomplete), and a contrasting pill badge in the top-right corner shows the raw percentage. The tick-mark segmentation makes partial progress feel granular and concrete rather than abstract.  
  → StatusRing or a linear progress bar on the /deadlines/[id] Status tab — specifically for the checklist completion of materials or workflow stages. The tick-mark treatment would show 'N of M items done' more viscerally than a smooth ring, and the severity-ramp coloring maps directly to the existing critical/high/medium severity color tokens.  
  · _/deadlines/[id] Status tab — checklist/stage progress indicator_
- **img-075** `…29140028` · _navigation_  
  Collapsible onboarding checklist card with a section header row containing a chevron toggle, an inline mini progress bar (blue fill, ~40px wide), and a fractional counter (1/4) all on one line. Below, list items show three states: green check (done), animated spinner (in-progress), and muted text with a lock icon (blocked/not yet reachable). A tooltip on hover explains the locked item. An info-line at the bottom acts as a one-line contextual hint.  
  → Onboarding proposal A's first-run /today empty state — the setup checklist/banner (task #29). The three-state item rendering (done / in-progress / locked) and the compact header with inline progress + counter are directly applicable to the persistent setup banner that fires on real onboarding signals.  
  · _/today first-run empty state — setup checklist banner_
- **img-080** `…29140094` · _layout_  
  Detail card with two distinct vertical sections separated by a full-width rule: top section has a card visual + metadata key-value pairs in a two-column grid with muted labels and regular-weight values (some with a bullet separator for compound values like '10 • 2028'); bottom section has two list-row groups ('Issued access' with count badge, 'Recent transactions') each with avatar + name + secondary label + right-aligned value + chevron rows.  
  → Client detail workspace (/clients detail) — the top metadata grid pattern (label + value in two columns, muted labels, bullet-separated compound values) mirrors the obligation key-fact grid. The 'Issued access N' section header with inline CountPill maps directly to 'Affected clients 3' or 'Obligations N' section headers in the StatBand or client detail.  
  · _/clients detail — key-facts metadata grid + section header with CountPill_
- **img-086** `…29140122` · _component_  
  A vertical timeline card where each step has a distinct status marker: a filled checkmark circle for DONE steps, a half-filled spinner ring for the ACTIVE step, and a plain numeric badge for PENDING future steps. Below the list sits a three-cell summary band (Completed / In Progress / Remaining) with per-cell tinted backgrounds, and a horizontal progress bar beneath with a percentage label on the right edge.  
  → The step-marker vocabulary (filled check / active spinner / pending number) maps directly to the obligation workflow detail page's 6-stage strip. The three-cell summary band mirrors the StatBand pattern used across 5 surfaces. The active-spinner ring is the StatusRing in its in-progress state, confirming the asymmetric-attention principle: the active stage gets the animated ring while past stages get the solid check and future stages get only a dim number.  
  · _/deadlines/[id] workflow strip + StatBand_
- **img-091** `…29140159` · _component_  
  A warning banner that uses a diagonal stripe texture on the right half of its background (soft orange hatching at ~30% opacity) fading toward the left where the text lives, combined with a diamond warning icon on the far left and an inline 'Action' button on the far right — the texture acts as a severity signal without requiring a colored side border.  
  → The diagonal-hatch texture as a severity background is a strong candidate for the 'blocked' or 'critical' state on obligation rows in the /deadlines workbench table, or as the background of the auto-unblock banner. It signals urgency through texture rather than color intensity, consistent with DDHQ's rule against per-side borders on rounded corners and against double-highlighting (red+bold). The hatch would occupy the tinted-section side only.  
  · _/deadlines table rows (blocked state) + auto-unblock banner_
- **img-093** `…29140183` · _empty-onboarding_  
  Two stacked feature-introduction cards, each with a left text column (title in bold, subtitle in muted weight, CTA button) and a right illustration column — the top card uses a schematic UI screenshot as the illustration (light blue tinted bar mockups), the bottom uses a skeuomorphic sticky-note stack illustration. Cards are white with rounded corners and a subtle drop shadow on a light gray page.  
  → The text-left + illustration-right split card format is directly usable for the first-run /today empty state (onboarding proposal A), introducing the 'Priorities' and 'Alert feed' sections with a schematic preview on the right. Using a schematic UI screenshot (not photography) keeps it consistent with DDHQ's professional tone. The shadow treatment should be dropped in favor of a flat border per DDHQ's restrained-shadows rule.  
  · _/today first-run empty state (onboarding proposal A)_
- **img-094** `…29140187` · _component_  
  A date-picker popover floated below paired trigger inputs (date dropdown + time dropdown), with the calendar grid using a high-contrast filled pill (black background, white text) for the selected date, plain numerals for all other dates, and a previous/next chevron nav on either side of the month-year heading. The trigger inputs use a bordered pill with an icon prefix.  
  → The paired date+time trigger inputs (icon-prefixed bordered pill) and the calendar popover with high-contrast selected-date pill apply to the extension widget on the /deadlines/[id] Status tab, where a CPA requests a filing extension with a new due date. The black selected-date pill should be swapped to brand navy (#2E368C) to match DDHQ tokens.  
  · _/deadlines/[id] Status tab — extension date picker widget_
- **img-096** `…29140200` · _navigation_  
  A master-detail list layout where the left rail shows conversation rows each containing a title line and a relative timestamp in muted gray below it ('4:01 PM', 'Yesterday', 'Tuesday'), separated by hairline dividers. The selected row has a filled light-gray background. The right detail pane opens directly adjacent at full height with a large bold heading and date subtitle, followed by structured sections (Goal, Background) with bullet points.  
  → The title+relative-timestamp two-line row with hairline dividers and a filled selection state maps directly to the /alerts feed list (left rail), where each alert row shows the obligation name and how long ago the source change was detected. The detail pane's heading+date subtitle+sectioned body mirrors the /alerts detail page structure (hero + Change / Source / Activity anchored sections).  
  · _/alerts list rail + alert detail pane heading structure_
- **img-097** `…29140259` · _navigation_  
  User account popover anchored to a bottom-rail avatar row: the menu floats above the trigger with three grouped items (Settings, Support, Log out), where the destructive action (Log out) uses a red icon+label to signal danger without a separator or extra visual weight. The trigger row shows avatar + full name + email in two lines, making the identity legible at a glance.  
  → The global nav's bottom user-identity section in DueDateHQ's sidebar rail. The current rail likely has a minimal avatar or initials; adopting the two-line name+email trigger with a floating popover (Settings / Log out in red) would match this pattern directly and resolve the account-action home.  
  · _Global sidebar nav — user account section_
- **img-098** `…29140271` · _empty-onboarding_  
  Empty state rendered in the content area of a split-pane app shell: a soft-tinted rounded icon container sits above a two-line headline + body, with two recovery CTAs side by side (secondary ghost + primary filled). The nav and filter bar remain fully rendered around it so the user understands where they are and how to get back.  
  → First-run empty states across DueDateHQ surfaces (/deadlines, /alerts, /rules). The pattern of showing a tinted icon container + short explainer + dual CTAs (e.g. 'View docs' + 'Go to dashboard' mapped to 'Browse sources' + 'Add clients') is directly applicable to the onboarding proposal A empty /today state already audited.  
  · _/today first-run empty state + /deadlines zero-obligation state_
- **img-102** `…29140306` · _component_  
  Filter bottom-sheet with three distinct group sections separated by full-width hairline dividers, each section having a plain sentence-case label header. Multi-select options are pill-shaped toggle chips (999px radius) with no fill when inactive, a dark fill when selected. A range slider anchors the bottom. A single high-contrast CTA button spans the full width at the bottom with letter-spaced uppercase label.  
  → The /deadlines quick-filters dropdown spec, which currently calls for a typeahead + 4 groups. The sectioned pill-chip pattern (one group per filter dimension: status, obligation type, assignee, due-date range) maps directly and would give the filter panel a cleaner visual grammar than a flat checkbox list.  
  · _/deadlines quick-filters dropdown panel_
- **img-109** `…29164828` · _component_  
  A card split horizontally by a hairline rule into two zones: a primary data zone (large numeric value + entity pill inline) and a metadata footer with three labeled date fields in spaced columns using all-caps micro-labels above the date values. The CTA button is right-aligned in the primary zone, visually separated by a full-height vertical divider.  
  → Extension widget on /deadlines/[id] Status tab — the two-zone card structure (primary value + CTA separated by a vertical rule, dates in labeled columns below a hairline) maps directly onto a penalty/extension card showing days-remaining or penalty amount with Start/Cliff/Due date columns.  
  · _/deadlines/[id] Status tab — extension/penalty widget_
- **img-111** `…29164846` · _layout_  
  A time-stamped vertical timeline feed where timestamp chips (dashed-border pill, muted text) punctuate a continuous scroll of heterogeneous items — prose blocks, checkbox task rows with deadline pills, and sub-counts — all left-aligned with consistent left margin. The timestamp chip acts as a section anchor without a ruled divider.  
  → /audit-log and the Activity anchor on /alerts detail — the timestamp-chip-as-anchor pattern would give each transition-row cluster a dashed-pill date header instead of a flat rule, making long audit feeds scannable without adding visual weight. Also relevant for /today's daily-brief feed.  
  · _/audit-log transition rows + /alerts Activity section_
- **img-112** `…29164854` · _component_  
  A file-attachment list where each row pairs a square monospace type-label badge (JPG/PDF/MOV) in a muted box with a two-line name+size secondary label; a Download affordance appears inline only on the focused/active row. Below the list a primary full-width CTA button sits with secondary icon-only action buttons beside it, plus a 'Next up' breadcrumb line beneath.  
  → Materials tab on /deadlines/[id] — the type-badge + name + size row pattern is a direct replacement for a generic file list. The inline 'Download' appearing only on hover/active row keeps the list quiet. The 'Next up' line below the primary action maps to a milestone-notes pattern for what comes after filing.  
  · _/deadlines/[id] Materials tab + Status tab next-step_
- **img-113** `…29164866` · _component_  
  List cards with a bold title, two inline soft-tint pills (time-relative label like 'Tomorrow'/'Today'/'Yesterday' in a chromatic tint, and a status label like 'Incoming'/'Ongoing'/'Past' in a neutral or muted tint), a one-line descriptor, and an overlapping avatar stack with a prose collaborators line. The chromatic tint on the time-relative pill changes by recency.  
  → /deadlines obligation list rows — the dual-pill pattern (due-in pill + status pill) side by side in the row header is a richer alternative to the current single DueCountdownText chip. The recency-tinted time pill directly maps to DueDateHQ's lateness ramp (critical/high/medium/neutral severity colors).  
  · _/deadlines obligation list rows_
- **img-114** `…29164882` · _data-viz_  
  A dense financial table where the Status column uses soft-tint rounded pills with an inline checkmark icon and chromatic fill (green for 'Processed'/'Settled', amber for 'Pending') — the pill width auto-fits the label so all three status variants have consistent height but variable width. The filter toolbar uses icon-only square buttons separated by a vertical rule from the primary CTA.  
  → /deadlines obligation list Status column and /clients client list — the soft-tint icon+label status pill is a direct spec for the obligation status chips (not*started / waiting_on_client / in_review / filed / completed). The icon-only toolbar separator pattern also applies to the workbench table toolbar.  
  · */deadlines list Status column + table toolbar\_
- **img-119** `…29164907` · _component_  
  Active filter pills styled as bordered containers split into two zones by a vertical hairline: a left icon+label zone (field name) and a right value zone (selected value) with an X dismiss button. Multiple active filters appear as a horizontal row of these two-zone pills. A separate funnel-icon-only pill sits at the end to open the filter panel.  
  → /deadlines list active filter bar — the two-zone Label|Value pill with a hairline divider is the FilterTrigger primitive's exact spec from the Stripe component grammar canon (FilterTrigger Label│Value⌄). This image confirms the pattern and shows its dismiss-X variant for active state.  
  · _/deadlines list filter toolbar — FilterTrigger active-state pills_
- **img-121** `…29164918` · _component_  
  Dense table rows with pill-shaped status badges that use distinct semantic tones: green filled for 'PAID', red filled with colored text for 'OVERDUE', and a neutral gray for 'DRAFT'. Each badge is the same pill shape but the fill opacity and text color shift per semantic value. Checkboxes are accent-filled (purple) when selected, matching the brand color.  
  → The /deadlines obligation list table (workbench archetype). The badge differentiation mechanic — same pill shape, tonal fill per state — maps directly to the 6-state obligation status taxonomy (not*started/waiting_on_client/blocked/in_review/filed/completed). Each state already needs a distinct soft-tint badge; this confirms using filled backgrounds (not just colored text) at consistent pill radius 999, with a neutral gray for draft-like states.  
  · */deadlines table — status badge column\_
- **img-123** `…29164931` · _component_  
  A dark floating bulk-action bar that appears at the bottom of the screen when rows are selected ('3 of 200 selected'). It shows count on the left in a darker segment, then action buttons ('Change status' with chevron, 'Duplicate') separated by subtle dividers. A separate dark popover with radio-circle icons shows the status transition options (Active / Draft / Complete), each with a distinct icon treatment (filled circle, dashed circle, checkmark).  
  → The /deadlines list supports multi-select for bulk operations like status override (admin use case). The dark floating bar is a proven pattern for surfacing 'N selected + action' without polluting the toolbar. The status radio popover with distinct icon-per-state maps well to the obligation status taxonomy. Currently DueDateHQ has no bulk-action bar; this is a direct model for one.  
  · _/deadlines list — bulk-selection action bar + status-change popover_
- **img-125** `…29164936` · _component_  
  A two-tier filter pill row: each filter is split into a muted label segment ('Type', 'Date', 'Token') and an active value segment with chevron ('All ^', 'All time v', 'All v') rendered as a single connected pill. The open state shows a dropdown with checkbox rows (Select all + individual options) where checked items show a green filled checkbox. A 'Select all' option with an indeterminate icon sits at the top separated by a hairline.  
  → The /deadlines and /alerts FilterTrigger pills. The label|value split-pill shape is already canonical in DueDateHQ (Stripe component grammar: FilterTrigger Label│Value⌄). This image confirms the exact mechanic and shows how the dropdown should render: checkboxes with a 'Select all' indeterminate row at top, hairline separator, then individual options. Reinforces existing design direction.  
  · _/deadlines and /alerts filter row — FilterTrigger dropdown_
- **img-126** `…29164937` · _component_  
  A two-panel filter UI: left panel is a categorized list of filter dimensions (icon + label + active-count badge + chevron-right), right panel is a flyout sub-menu listing the options for the selected dimension with their own status icons and per-option counts in gray pill badges. A Reset + Apply button pair anchors the bottom of the left panel. Active-count badges on filter dimensions show how many options are selected without opening the sub-panel.  
  → The /deadlines quick-filters dropdown spec (saved views: 4 groups). The two-panel pattern (dimension list → option flyout) is more structured than a flat list and handles the 7 filter dimensions DueDateHQ needs (status, type, due date, assignee, client, jurisdiction, obligation type) without a long scrollable dropdown. The per-option count badges (e.g. 'To-do 9', 'Completed 8') help users understand data distribution before applying.  
  · _/deadlines — FilterTrigger expanded panel (multi-dimension filter with counts)_
- **img-128** `…29164948` · _data-viz_  
  A task detail card with a horizontal multi-segment progress bar at the top: each segment is a separate colored bar representing a stage (Assigned filled purple, In progress filled purple, Under review gray, Completed gray). Stage labels sit below each segment. Below the progress bar, a vertical timeline of activity events: each event has a filled/outlined circle node (filled = complete, half-filled = current, empty = future) connected by a vertical line, with event title in bold, subtitle in muted text, and date+time right-aligned.  
  → The /deadlines/[id] Status tab workflow strip + Activity section. The segmented progress bar maps to the 6-stage obligation workflow (not*started → completed) where filled segments show completed stages and the active segment is highlighted. The vertical timeline with filled/outlined/empty nodes maps to the Audit tab transition rows or the Status tab 'recent activity' section. Both patterns directly apply to DueDateHQ's workflow state cascade.  
  · */deadlines/[id] Status tab — workflow progress bar + activity timeline\_
- **img-129** `…29164959` · _component_  
  A detail card with a breadcrumb back-link at the top ('< Most traded stock'), a large entity title with ticker in parens, and a small rank badge ('1 in Watchlist') as a bordered pill top-right. Below, a nested card with 'About' section title, truncated description with an inline 'Show more' text link, then a key-value fact grid: each row has a small lucide-style icon + label left-aligned and the value right-aligned, separated by hairlines. The icon + label pairing gives each row an anchor without column headers.  
  → The /clients/[id] client detail workspace or the /deadlines/[id] detail pane metadata section. The icon+label left / value right row pattern within a bordered card is a clean way to render the obligation metadata fields (jurisdiction, entity type, filing frequency, assigned staff) without a two-column table. The 'Show more' inline truncation maps to the collapsible-density pattern for long description fields.  
  · _/clients/[id] detail — metadata fact rows inside a DetailSectionCard_
- **img-134** `…29164992` · _component_  
  Two distinct list-row patterns: (1) a settings-style list where each row has an icon left, a label, a right-aligned current value in muted text, and a chevron — all separated by hairline dividers, no card borders; (2) a calendar-event list where a large bold day-number and small all-caps month label form a fixed-width left column, and title+subtitle+date-range fill the right — the date gutter creates a strong visual rhythm.  
  → The settings-style pattern applies directly to a /deadlines detail Status tab or client detail workspace where metadata fields (jurisdiction, form type, assigned to, last updated) are presented as a scannable list rather than a form grid. The date-gutter pattern is directly usable for the /audit-log transition rows, giving each entry a bold day number as a left-column anchor.  
  · _/deadlines/[id] Status tab metadata list, /audit-log rows_
- **img-137** `…29165074` · _navigation_  
  A command-palette / spotlight modal: a full-width search input at the top with a '?' shortcut hint right-aligned, followed by tab-filter chips (All / Task / Document / Media / People) that narrow results, then grouped result sections separated by small all-caps muted section labels (Favorites, Quick actions), each row showing icon + label + right-aligned keyboard shortcut badge(s) rendered as small rounded monospace key caps. A bottom bar shows arrow/Esc/Enter legend.  
  → DueDateHQ has no command palette. This pattern is directly applicable as a global search / jump-to surface: CPAs could type a client name, obligation ref, or form code and jump to the relevant detail page. The keyboard shortcut badge pattern is also directly usable for the /deadlines CollapsibleSearch toolbar to show 'press / to search' affordance. Medium effort, high payoff for power users.  
  · _Global command palette (new), CollapsibleSearch keyboard hint_
- **img-140** `…29165195` · _layout_  
  A two-pane onboarding/wizard layout: left pane is a full-bleed branded image/illustration panel with a ticker-style horizontal trust-signal strip at the bottom (icon + label pairs: 'KPMG-audited', 'Custodied with BofA', 'SEC registration in progress'); right pane is a clean white step form with a small eyebrow label ('AIRCRAFT INVESTMENT CALCULATOR'), a step title, a question, and a 2x2 grid of large radio-select option cards where each card has a radio dot top-left, a range label in small caps, a bold option title, and a muted descriptor.  
  → The trust-signal strip pattern (icon + label pairs in a horizontal bar) is directly applicable to the DueDateHQ /login page footer or the onboarding first-run screen to surface trust signals like 'SOC 2 Type II', 'End-to-end encrypted', 'No credit card required'. The 2x2 radio-card grid applies to any multi-option selection in onboarding (e.g., 'What describes your firm?' step) as a more scannable alternative to a dropdown.  
  · _/login footer trust strip, onboarding firm-type selection step_
- **img-141** `…29165299` · _component_  
  A document-grid UI where each document is a small card with a file icon top-left, a multi-line title, and a file-size label at the bottom-left with a download icon bottom-right. Two states are shown: a 'loading' state where a progress bar (brand blue, animated fill) spans the card bottom edge, and a 'ready/hover' state where a green action button ('ПОСМОТРЕТЬ') replaces the progress bar. Cards in default state show only the size + download icon with no progress bar.  
  → The in-card progress bar at the bottom edge and the state-swap (loading bar → action button) directly applies to the Materials tab in /deadlines/[id] where uploaded documents can be in 'uploading', 'processing', or 'ready' states. Instead of a spinner overlay, a thin bottom-edge fill bar conveys progress without obscuring the file name. The ready→action-button swap matches the 'view' affordance on processed docs.  
  · _/deadlines/[id] Materials tab document cards_
- **img-142** `…29165460` · _component_  
  An invoice/document detail sidebar split into three zones: (1) a date-fact block using an all-caps muted label ('DUE', 'PAYOUT') above a large bold value and a secondary muted sub-value ('Due in 3 days') — the sub-value is the computed human-readable version of the raw date; (2) a flat kebab-menu-style action list with icon + label rows separated by hairlines (View, Copy URL, Download PDF, Duplicate, Archive); (3) a vertical activity timeline using small gray circle bullets connected by a thin vertical line, with event label + date+time on each entry and a muted ghost style for future/pending steps.  
  → The date-fact block with a muted computed sub-label ('Due in 3 days') maps directly to the DueDateHQ DueCountdownText / DueDaysPill display in obligation cards and the Status tab hero — showing both the raw date and the human countdown in the same block is the established pattern. The vertical activity timeline with bullet + line + ghost future steps maps directly to the /audit-log transition rows and the Status tab's 'recent activity' section. The flat action list applies to the kebab menu on obligation detail.  
  · _DueCountdownText blocks, /audit-log, Status tab activity, obligation kebab menu_
- **img-144** `…29165473` · _empty-onboarding_  
  A workspace overview/onboarding screen with: a greeting headline + sub-caption, a horizontal tab bar with count badges inline (Tasks 1, Threads 1, Resources 2), an 'Actions' section containing large illustrated action cards in a horizontal row — each card has a light grid-paper background texture, a UI illustration thumbnail in the upper half, a bold title, a short description, and two CTAs ('Create' filled dark / 'Generate example' outlined with sparkle icon); below, a 'Pinned Items' collapsible section with a chevron and a '+' CTA in the header.  
  → The illustrated action card with 'Generate example' CTA is directly applicable to the DueDateHQ first-run /today empty state (Proposal A): each 'getting started' action tile could show a miniature screenshot of the destination surface above a label and a 'See example' button that loads sample data. The tab-with-count-badge pattern maps to the /deadlines/[id] tab bar (Materials 3, Audit 12) where a count badge on the tab label conveys pending items without the user having to click in.  
  · _/today first-run empty state action tiles, /deadlines/[id] tab badges_
- **img-147** `…29165552` · _layout_  
  Document/invoice detail with a two-column layout: the main content area (left ~70%) shows line items in a borderless list with name (weight-600, two lines) + metadata row ('Billed Once | QTY: 1 | Rate: $X' in muted smaller text using pipe separators) + a right-aligned amount. A sticky right sidebar (~30%) holds Notes (freetext blocks in a tinted input area) and an Audit Log section with a vertical timeline — icon + action label (weight-500) + actor•date on a second line.  
  → The /deadlines/[id] detail page, specifically the Record tab and the Audit tab. The line-item list pattern (name + pipe-separated metadata + right-aligned value) maps well to a materials checklist row. The sticky sidebar audit log with icon+label+actor•date is a close analog to the transition-row pattern (bqUOC) used on the Audit tab — could be adopted as the visual grammar for that tab's activity feed.  
  · _/deadlines/[id] Record tab + Audit tab_
- **img-151** `…29165682` · _data-viz_  
  Live activity feed split into two tab states ('Live feed' / 'Upcoming') with a red pulsing dot indicator on the active 'Live feed' tab to signal real-time data. A summary number (large, weight-700) sits above a two-segment horizontal bar (green for active / gray for paused) showing a ratio at a glance. An inline error chip ('Orders Import failed · 2 retries · TimeoutError at Step 2') floats as a card overlay from the menu — showing both a retry count badge and a short error descriptor on a second line.  
  → The /alerts feed header: the pulsing red dot on 'Live feed' tab maps directly to the 24/7 monitor → AI-read change feed on /alerts. A large count + segmented bar (e.g. '47 total | 12 urgent / 35 reviewed') above the alert list would give the StatBand more visual weight. The inline error chip pattern is also useful for /sources to surface a health error inline in the source list row without opening a drawer.  
  · _/alerts feed header + /sources health error inline chip_
- **img-153** `…29165997` · _component_  
  Tooltip/popover design system sheet showing light and dark variants of a compound tooltip: a text label ('Change of airport') followed by two inline monospace-style code chips ('IST' and 'SAW' with a '>' arrow between them) and a separate duration pill ('1d 2h') with a darker fill — all within a single speech-bubble tooltip shape. This is a multi-token inline tooltip that surfaces a structured diff (before > after) plus a magnitude value.  
  → The /alerts alert detail page and the transition-row pattern on /audit-log. When a date or jurisdiction changes (e.g. deadline moved from Mar 15 > Apr 15 or form 1040 > 1040-X), showing the before>after diff inline in a tooltip on the change chip — using the IST>SAW pattern with old-value chip / arrow / new-value chip / delta duration — is a direct application. More specific than a plain tooltip, it communicates the structured nature of a regulatory change.  
  · _/alerts detail — change-value diff tooltip + /audit-log transition row hover state_
- **img-155** `…29166002` · _component_  
  Settings/permissions card showing a list of toggle rows where each row has: a left-side icon (lock, dashed-circle, wand, sliders) in muted gray, a label in weight-500 + a one-line description below in weight-400 muted, and a right-side Switch control. Two rows include an inline badge ('Pro Feature') with a soft orange-tint pill directly after the label text — the badge gates the toggle without hiding it, keeping the feature discoverable.  
  → The /deadlines/[id] obligation settings or any future team-plan gating in DueDateHQ. The 'Pro Feature' inline badge pattern after a label is directly applicable to future plan-gated features (e.g. AI auto-apply, bulk extension requests). The icon+label+description+switch row structure is also the right pattern for the rule-library rule configuration panel or the per-obligation notification preferences.  
  · _/rules rule config panel / plan-gated feature toggles_
- **img-158** `…29166100` · _micro-interaction_  
  Compact pill-shaped coachmark: a filled accent circle on the left (info icon), plain prose instruction in the middle, and a pill-shaped 'GOT IT' dismiss button tinted with the accent color at low opacity on the right. The whole unit sits as a floating bar with no hard border, only a subtle drop shadow.  
  → First-run onboarding on /today (proposal A): after the empty-state resolves with sample data, a floating coachmark bar can appear at the bottom of the priority list explaining the 'one-click apply' mechanic. The purple accent maps to DDHQ's navy/cyan — swap the circle fill to --color-brand-navy and the GOT IT chip to cyan-tinted. Dismisses permanently, stored in localStorage.  
  · _/today — first-run coachmark / onboarding empty state_
- **img-164** `…29166237` · _component_  
  Two flat white rounded cards side by side: a list card (name / context rows with distinct action-state buttons — greyed 'Invited' vs active neon 'Invite' pill) and a detail card (text summary block at top, then a two-column key-value footer with name and timestamp data). The action button state change (greyed vs colored) cleanly communicates per-row status without a separate status column.  
  → The affected-clients table on the /alerts detail page uses a similar pattern: each client row needs an action (Apply / Already applied / Needs review). Adopting the greyed-pill-for-done / colored-pill-for-actionable distinction — rather than a text status column — would make the one-click apply mechanic feel more direct and the already-applied rows visually recede.  
  · _/alerts detail — affected-clients table action column per row_
- **img-165** `…29166383` · _component_  
  Filter sheet presented as a modal with labeled sections (Size / Colour / Properties / Price), each section containing a wrapping grid of pill-toggle chips. Colour chips add a filled dot swatch inline before the label. Sections are separated by full-width hairline rules, not boxed. A full-width sticky CTA button at the bottom ('VIEW ITEMS') commits the filter.  
  → The /deadlines quick-filters dropdown (saved view presets spec) has a similar structure of grouped toggle options. The specific detail to borrow: full-width hairline section separators between filter groups rather than spacing alone, and a sticky 'Apply' button at the bottom of the panel rather than live-apply. The color-dot swatch mechanic maps to severity-level filter chips (critical=red dot, high=orange dot, etc.).  
  · _/deadlines — quick-filters dropdown panel, filter group separators + severity dot-swatches_
- **img-171** `…29166493` · _component_  
  A table with a single-column colored pill per row as the sole status indicator — three distinct pill states (Weak/red, Strong/green, Good/blue) using short, opinionated labels in small rounded chips with no additional icon, set against a plain white row background with full-width hairline dividers.  
  → This is a direct reference for the /deadlines obligation status column. The three-state ramp (color-only, short word, pill shape) maps cleanly to the severity-chip primitive already in DueDateHQ's design system — specifically reinforcing that the chip alone is sufficient and no icon doubling is needed in the dense workbench table archetype.  
  · _/deadlines table — status column chip_
- **img-178** `…29166926` · _data-viz_  
  A vertical timeline list where each row has a left-column timestamp, a center circle node (filled/checkmark for completed, outlined for pending) connected by a dashed vertical line, and the task label on the right. The 'current time' row is highlighted with a blue dot on the timestamp and a blue filled node. A category filter chip bar ('All / Life / Home & Family / Work') sits above the timeline.  
  → The dashed vertical connector between timeline nodes is a craftable detail for the /audit-log transition-row list and the Audit tab on /deadlines/[id]. Currently the transition rows use an arrow glyph between states; a dashed vertical connector between rows would make the chronological chain more legible. The current-time highlighted row (blue node + accent timestamp) maps to the 'most recent transition' highlight in the Activity section.  
  · _/audit-log transition rows; /deadlines/[id] Audit tab; /deadlines/[id] Status tab Activity section_
- **img-179** `…29166929` · _component_  
  A compact schedule widget card with a header row (calendar icon + 'Schedule' label + a numeric ratio '85/58' at trailing edge), then list rows each showing a colored circle icon indicating item type, a bold primary name, two muted secondary lines (reference code + category), and a clock-duration label trailing right — connected by a thin vertical line between the circle icons.  
  → The '85/58' ratio at the card header trailing edge is a reference for the StatBand pattern — specifically showing a done/total ratio in one compact slot. The colored circle icon differentiating item type (green for completed, blue for meeting) and the vertical connector line between rows directly applies to the /today priorities panel's obligation list, where differentiating obligation type via a colored leading dot + vertical connector would reduce reliance on text-only scanning.  
  · _/today priorities panel; StatBand done/total ratio slot_
- **img-186** `…29167627` · _navigation_  
  A left rail navigation list where each row shows a circular status indicator (empty ring), an item title, and a right-aligned relative timestamp (e.g. '6h', '2d'). Items are grouped under a collapsible 'Favorites' section header with a chevron toggle. The section header sits at a smaller muted type size above the list items.  
  → The /deadlines list rail or the /today Priorities rail: adding a right-aligned relative 'last updated' or 'due in Nd' timestamp to each rail row would surface urgency at a glance without widening the row. The collapsible 'Favorites' section header pattern with a disclosure chevron maps directly to the collapsible section model already in the design system canon.  
  · _/deadlines list rail, /today Priorities rail_
- **img-189** `…29168435` · _layout_  
  A dashboard home screen with a 'Welcome, [Name]' greeting header followed by a 2×2 grid of contextual shortcut cards: 'Previously viewed files' (a plain list), 'Summarize last meeting' (avatar + event title), and two 'Suggested Task' cards (icon + single task title). Below sits an inline task list with per-row colored status dots, priority chip, and due-date chip. A usage-limit upsell banner is pinned to the bottom of the left nav.  
  → The /today dashboard first-run empty state (Onboarding proposal A per the memory canon): the 2×2 contextual shortcut grid maps directly to the 'what to do first' moment — cards could be 'View your obligations', 'Check today's alerts', 'Review pending rules', 'Set up a client'. The colored status dots + due-date chip on the task list rows is the same pattern as the /today Priorities list.  
  · _/today dashboard first-run empty state, Priorities list row_
- **img-190** `…29168502` · _component_  
  A settings/integrations page with a featured hero banner card (gradient background, title + subtitle + two action buttons + a horizontally scrollable row of sub-items with icons and labels), followed by a section titled 'Available integrations' (4-column icon-grid cards each with logo + name + one-liner), and a 'Current integrations' list with rows of logo + name + category tag + relative timestamp + Edit button. The category tag uses a centered dot separator between name and category.  
  → The /sources page (monitored authorities): the 'Current integrations' list row pattern — logo/icon + authority name + dot-separated category + 'Updated Nd ago' relative timestamp + action button — maps directly to the authority registry table. The dot separator between name and category is a clean inline metadata pattern that could replace the current pipe or badge separator. The featured hero banner could be applied to a 'newly monitored source' highlight card.  
  · _/sources authority registry table rows_
- **img-192** `…29168716` · _component_  
  A 'Notes' list card with a header row (icon + title + add-button aligned right), a filter row of three Label:Value pill-shaped FilterTriggers ('Task: All', 'Time: All', 'Status: All'), and list rows each showing: bold item title + inline colored due-date chip + inline status chip, a muted description line, and an overlapping avatar group with a 'Collaborate with [names]' label in two weights (muted regular + bold names). A disclosure chevron sits right-aligned on each row.  
  → The /deadlines list rows and the /today Priorities list: the inline pairing of a due-date chip and a status chip on the same title line is a compact two-signal pattern that works in dense obligation rows. The 'Collaborate with [names]' avatar-group + mixed-weight label maps to an assignee display on obligation rows (AssigneeAvatar primitive). The Label:Value FilterTrigger pills in the filter row match the /deadlines quick-filters spec exactly (the 'Task: All' pill is precisely the FilterTrigger Label|Value⌄ grammar already in the Stripe component canon).  
  · _/deadlines list rows (due-date + status chip pairing), /deadlines quick-filters FilterTrigger row_
- **img-196** `…29168749` · _component_  
  Status-badge pills in a table column: each pill is a rounded-full chip with a matching icon (spinning loader for in-progress, circled checkmark for completed, diamond-exclamation for failed) and soft-tint background matching the semantic color — purple/green/red — with the icon and label in the same chromatic hue as the border.  
  → The /deadlines workbench table and the /clients obligation list both render inline status chips. The mechanic of co-coloring the icon and text inside the pill to match the border (versus a neutral icon on a tinted background) would add more visual specificity. Directly applicable to the obligation status Badge/StatusMark component for in*review (violet), completed (green), and blocked (red/amber) states.  
  · */deadlines table — status column Badge / StatusMark chip\_
- **img-200** `…29168800` · _component_  
  Settings page with a vertical stepper-style left nav (icon + label, active item highlighted with a full-width tinted row) and a detail area that uses label-value pairs in bordered row cards — each row has a left-aligned bold label column, a right-aligned value column, and a pencil edit icon flush right. Grouped info cards (security notices) use a neutral tinted background with a small icon + short copy, arranged in a 3-column grid.  
  → The /deadlines/[id] detail pane's Materials and Record tabs display label-value field pairs. The bordered row-card pattern (label | value | edit-pencil icon) is cleaner than the current approach and maps directly to editable obligation metadata fields — entity, jurisdiction, due date — especially in a 'page' mode where inline edit is available. The 3-column info-notice grid matches the penalty/extension widget area layout.  
  · _/deadlines/[id] detail — Materials tab field rows and penalty/extension notice cards_

### Medium — useful refinements & secondary applications · 77

- **img-009** `…26900837` · _illustration-texture_  
  Figure surrounded by flying documents in an arc — documents rendered as clean open rectangles with two or three horizontal rule lines inside each to represent text content, and a small filled black block (header area) at the top of select documents. The document thumbnail shorthand (header block + rule lines) is a reusable visual symbol.  
  → The document thumbnail shorthand (solid header band + ruled lines) maps directly to how DueDateHQ could render source-document previews in the Materials tab of /deadlines detail, or as a placeholder in the Record tab's empty state. Specifically: a compact document chip with a 4px dark header strip + two rule lines at 60% and 80% width reads as 'scanned form' without any text.  
  · _/deadlines detail — Materials tab / Record tab empty state_
- **img-022** `…26901604` · _layout_  
  A 5-column calendar grid (M T W T F) used as a literal panel layout — each day-column contains a distinct scene of the same character progressing through the week. Column headers are rendered in a muted salmon/pink, matching the spot-color used on the character's clothing, creating a color-thread across all columns.  
  → The day-column header color-threading technique — using a single accent hue in both the column label and a recurring element inside the column — is directly applicable to the /deadlines table. Currently the due-date column and DueCountdownText use red for overdue; this illustration shows how a single accent color threaded from the header label into the data cells (e.g., the column header 'Due' rendered in the same soft-red as overdue countdown pills) can create visual cohesion without extra weight.  
  · _/deadlines table: column header + DueCountdownText overdue pill color-threading_
- **img-027** `…28945925` · _illustration-texture_  
  Two-color illustration technique: monochrome ink line art for the figure and structural elements (ladder legs) rendered in a flat brand blue, with the single accent object (binoculars) filled solid in the same blue. The color serves as a semantic marker — the tool of vigilance — not decoration.  
  → The two-color spot-illustration pattern (line art + one brand-color fill for the key object) directly fits DDHQ's /sources empty state or the /alerts empty feed. The 'monitoring' metaphor (binoculars) also maps neatly to the 24/7 watch concept. Adapt with brand navy #2E368C as the fill color on the object of attention.  
  · _/sources empty state or /alerts empty feed illustration_
- **img-030** `…28945993` · _illustration-texture_  
  Doodle-style bullseye icon rendered with thick outlines, solid concentric ring fills (white center, black ring, white ring, black outer), a slight 3D tilt achieved through a white offset drop shadow, and radiating tick-mark lines suggesting impact energy. A light gray ellipse ground shadow anchors it.  
  → The 'filed / completed' milestone moment on /deadlines workflow could use a small celebratory spot icon in this style — a bullseye or checkmark with radiating tick lines as a micro-animation keyframe or static success badge. More relevant than pure mood: the concentric-ring pattern mirrors the StatusRing visual language already adopted in DDHQ.  
  · _/deadlines workflow card — completed/filed milestone celebration state_
- **img-036** `…29115932` · _component_  
  A node-graph canvas showing floating white cards connected by colored directional lines (green = data flowing in, orange = data flowing out, blue = unresolved). Each node card has a colored dot in its top-left corner matching its connection color, a title, and structured form fields or rich text inside. The canvas itself is a neutral gray void. Edge colors encode data-flow direction semantically rather than just aesthetically.  
  → The color-coded edge / connector-dot pattern — where the dot color on a card matches the line color entering it, encoding direction and state — is a useful reference for the /audit-log transition row anatomy. Specifically, the 'source chip' in the transition-row pattern could adopt a directional dot whose color matches the obligation status being transitioned into (using DDHQ's severity ramp tokens), giving each row an at-a-glance state signal before the reader parses the text.  
  · _/audit-log transition row source chip; status connector dot_
- **img-037** `…29115938` · _layout_  
  Bento-grid of four heterogeneous feature cards arranged in a 2×2 with one wide card spanning full width: each cell uses a flat light-gray tinted background with no outer shadow, a short headline, and a small embedded UI artifact (scrollable tag chips, a radial gauge with a floating data label, a dotted vertical connector between two endpoint nodes). The dotted connector uses two filled circles at endpoints to signal A→B traversal.  
  → The dotted vertical connector with filled endpoint circles is a craftable detail for the /deadlines workflow strip — it could represent the traversal between two stages (e.g. in*review → filed) in the inactive-stage gutters, conveying movement without adding weight. The bento grid layout also maps directly to the /today dashboard's alert-card + stat-band composition.  
  · */today dashboard + /deadlines workflow strip\_
- **img-038** `…29115939` · _navigation_  
  Horizontal numbered-step cards (STEP ONE / STEP TWO…) rendered as equal-width tiles with a small squircle arrow button between each, and a muted lowercase tag badge ("Easy Peasy!", "Superfast!") anchored to the bottom-left corner of each tile. The step number is in spaced small-caps above the bold step title.  
  → The small-caps spaced step-label + bottom-anchored outcome tag could be adapted for the /deadlines workflow strip's inactive stage labels — currently the strip lacks a clear 'what this stage means' callout at a glance. The bottom-anchored muted tag is a low-weight way to surface the stage's key outcome without cluttering the header. Not directly usable as-is since DDHQ has 6 unequal-width stages, but the small-caps stage label pattern is directly applicable.  
  · _/deadlines workflow strip stage labels_
- **img-040** `…29115979` · _data-viz_  
  Three persona-segmented research cards using a letter-labeled avatar chip ("A", "B", "C" in colored squares) as a tab-like identifier alongside the persona name, a large percentage stat in ~48px weight-400 numerals, a one-line label beneath it, and a custom data-glyph (barcode bar chart, semi-circular gauge with tick marks, waffle grid) as a compact inline visualization below the stat. Card B inverts to dark background for contrast.  
  → The letter-chip persona identifier ("A" in a colored square) is directly usable as a role indicator on the /clients client detail page — CPAs work across 7 defined roles and a compact lettered chip next to a role name would distinguish role rows in the team/assignee section without adding avatar imagery. The large weight-400 percentage stat pattern also maps to StatBand's key metric display.  
  · _/clients client detail — role/assignee section + StatBand metric display_
- **img-041** `…29115989` · _component_  
  Three onboarding step cards rendered as portrait-orientation tiles with a light-purple tinted background, each embedding a mini UI mockup in the upper portion (avatar + name rows, a form with a CTA button, a checklist). The embedded UI mockup sits flush against the card's top edge, giving a 'window into the product' effect. Below the card sits a bold title and a two-sentence description at a smaller weight.  
  → The 'window into product' card pattern — a mini UI mockup embedded flush at the top of a card — is directly applicable to the /login or onboarding splash screen, specifically to the product feature callout cards that explain key workflows (monitor → AI-read → apply) to new users. Currently those explanations are text-only; this pattern adds a grounded product preview without requiring real screenshots.  
  · _/login onboarding splash / product story section_
- **img-044** `…29116156` · _layout_  
  Three equal-width feature cards with rounded-12 borders and a tinted gray fill, each embedding a node-graph or connection diagram as the illustration — vertical arrow chains with labeled nodes (colored pill chips for step names + action text), horizontal branching with labeled connector lines, and a bubble cluster of integration logo icons. Diagram nodes use small colored pill chips with icon + label.  
  → The vertical arrow-chain diagram with colored pill step nodes is directly applicable to the /audit-log transition row visualization — the current transition row shows a single ASCII arrow; this diagram treatment would make the state traversal chain (e.g. not*started → waiting_on_client → in_review → filed) visible as a small inline node chain within the audit detail panel, grounding the history at a glance.  
  · */audit-log transition row + /deadlines Audit tab activity timeline\_
- **img-045** `…29116190` · _typography_  
  Hero headline where some words are rendered in full black (active weight) and others in a light gray (roughly 20% opacity of the same color), creating a fade-in typographic hierarchy within a single continuous sentence. Inline objects (app icon stacks, a toggle switch) are embedded directly in the text flow at cap-height, making them feel typographic rather than graphic.  
  → The faded-word typographic hierarchy — active words in full black, secondary/qualitative words in 20% gray within one headline — is a pattern for the /today daily brief headline or the /alerts hero claim. Rather than bolding key terms (banned by type-weight restraint), fading the surrounding words is an additive way to draw the eye to the key data point (client name, obligation type) without double-highlighting. Inline icon-in-text at cap-height also works for the StatusRing inside a sentence summary.  
  · _/today daily brief headline + /alerts alert hero text_
- **img-049** `…29116214` · _empty-onboarding_  
  Four-step horizontal how-it-works layout: each step is an independent card with a tinted gray background, a centered illustration/icon, and a numbered caption below — no connecting lines, just equal-width cards in a row creating a scannable pipeline overview.  
  → Onboarding first-run /today empty state: a compact 3–4 step 'how it works' strip (Monitor → AI reads → Who's affected → One-click apply) could use this borderless-card-row pattern to explain the core loop before any real obligations exist, replacing a wall of text.  
  · _/today empty state / onboarding_
- **img-052** `…29116256` · _component_  
  Media card with a flush image/render at the top (full bleed to card edges), a hairline divider separating the image area from the text body, and a footer action row — 'Learn more' text-link on the left, a solid accent-colored square icon-button on the right — where the button color changes only on the hover/selected card (the second card goes purple while the first stays neutral).  
  → Moderate. The footer action row pattern (text-link left, icon-button right) could apply to alert cards on /today or /alerts, where a 'Review' text-link and a quick-apply icon-button sit at the card bottom. The color-only-on-active-card mechanic is a subtler alternative to full-width action buttons for the alert feed.  
  · _/today alert cards / /alerts feed cards_
- **img-053** `…29116286` · _component_  
  Vertical automation flow builder: each step has a small soft-tinted pill label (e.g. 'Launch action', 'Capture action', 'Check if / else') floating between bordered white step cards — the pill color is unique per action type (purple trigger, green action, cyan conditional). Variable tokens are rendered as inline monospace chips with a hash icon inside the prose of the step card.  
  → The inline variable-chip pattern (# token*name inside prose) is directly applicable to the /deadlines detail 'Status' tab's milestone-notes area or the auto-unblock banner, where substituted values like client name, date, or rule ID could be rendered as legible inline mono chips rather than raw interpolated strings.  
  · */deadlines/[id] Status tab — milestone notes / auto-unblock banner\_
- **img-056** `…29139744` · _empty-onboarding_  
  Error / limit-reached state with a single centered monochrome illustration (flat envelope with a numeric badge badged with '!!!' and a speech-bubble style alert chip), a short bold title, one sentence of explanation, and two side-by-side pill CTA buttons with different fill levels (primary vs ghost) and inline icons.  
  → Blocked-state or attention-required empty state in /today or the auto-unblock banner: when all client obligations are blocked or waiting-on-client with no actionable items, this pattern (icon + title + one-liner + two actions) is a clean model. The dual-button layout maps to 'Send reminder' (primary) + 'View blocked' (ghost) on a blocked-obligations empty panel.  
  · _/today — blocked/waiting-on-client empty panel state_
- **img-057** `…29139748` · _component_  
  Marketplace-style card: image-hero area with a 3-dot kebab menu in the top-right corner, a square app-icon positioned at the lower edge of the image overlapping the body, a title + inline muted category badge on the same line, a short description paragraph, and a footer divided by a hairline rule with a bordered action button left and a secondary stat (icon + count) right.  
  → The layout of title + inline-badge on the same row maps to the /sources list where each authority has a name and a 'health' or 'type' badge inline. The hairline-divided footer with a stat right (e.g. '14 rules monitored' with a count icon) could give /sources card entries a denser information footer without adding rows.  
  · _/sources — authority cards or registry list rows_
- **img-060** `…29139859` · _data-viz_  
  Mixed-density dashboard layout: a narrow left card uses a 'N/total' fraction label ('12/32') with a small partial-arc progress ring beside it (ring fills to ~24%), a center card shows a horizontally segmented bar acting as a score meter (filled segments in orange, unfilled in gray), and a right column stacks two list items each with their own fraction + ring pair.  
  → The fraction-label + small partial-arc ring pair ('12/32 — 24%') is a compact alternative to the full StatusRing for the StatBand summary band: it could encode 'filed / total' or 'materials complete / required' in a single tight unit inside the client detail or /deadlines detail StatBand without needing a full ring.  
  · _StatBand — client detail or /deadlines/[id] summary band_
- **img-063** `…29139896` · _component_  
  A single floating notification card with heavy corner radius (~28px), a full-width hairline rule separating a named-entity section (avatar + bold name + muted connector phrase + bold event title with a rounded thumbnail icon inline) from a secondary metadata block (date, time range, location in muted centered text). The two-zone card uses typographic contrast to establish hierarchy: one dark name + one dark event title, everything else ghost-gray.  
  → The two-zone card anatomy (entity + connector phrase + subject, then secondary metadata below a rule) is applicable to the /alerts detail hero region, which needs to communicate who is affected, what changed, and when. The pattern of embedding a small rounded icon inline with the subject title could work for the source-authority chip next to the alert title.  
  · _/alerts detail hero_
- **img-065** `…29139912` · _micro-interaction_  
  A stacked notification toast pattern: the frontmost (unread) toast is a dark rounded card with an avatar, bold entity name, subtitle action, and body text. Behind it, two additional toasts are progressively scaled down and blurred, creating a depth stack that communicates queue length without showing all items. A small solid blue dot (unread indicator) floats to the left of the stack on the card's own background.  
  → The stacked-toast depth pattern is applicable to the /today dashboard alert card section when multiple high-priority alerts arrive simultaneously. Rather than a flat list, the top alert could sit full-width while 1-2 lower-priority alerts peek as a scaled-back stack behind it, communicating queue depth. The unread dot mechanic also applies to the alert feed badge on the nav rail.  
  · _/today alert cards, nav rail unread indicator_
- **img-066** `…29139917` · _data-viz_  
  Two stacked widget cards, each with an icon + title header separated from the body by a full-width hairline. The top card shows a horizontal bar chart with category labels on the left (Housing, Utilities, Food) and dashed vertical grid lines at rounded numeric intervals. Bars are small filled squares, not continuous bars — a discrete segment style. The bottom card shows a segmented progress track made of many thin vertical tick marks, with the filled portion rendered in progressively fading gray — a 'fuel gauge' style meter rather than a continuous bar.  
  → The discrete-segment progress track (tick-mark fuel gauge) in the bottom card is directly applicable to the StatusRing complement on /deadlines — specifically the Materials tab checklist completion indicator or the onboarding setup progress card (proposal A, the first-run /today empty state). It conveys partial completion with more visual texture than a plain bar.  
  · _/today first-run onboarding checklist card, /deadlines Materials tab completion indicator_
- **img-069** `…29139931` · _layout_  
  A bento-style dashboard of white rounded cards at varied sizes: a large conversation card with an avatar, name, timestamp, body text, and an emoji reaction row at the bottom; a compact grouped-avatar card showing face-pile + count + secondary count; a minimal 'Today's To Do' card with a Segmented control (Scheduled / Notes) and time-blocked task rows; a large date card showing day-of-week + date number in display size; a person-list card with avatar + name + email + plus button per row.  
  → The Today's To Do card pattern (Segmented control switching between Scheduled and Notes views, with time-blocked rows below) is directly applicable to the /today dashboard Priorities section. The segmented toggle for filtering the priority list (e.g. My Work / All) matches the Segmented primitive already in the design system. The compact face-pile card could inform the AssigneeAvatar cluster on obligation rows.  
  · _/today Priorities section Segmented toggle, obligation row AssigneeAvatar cluster_
- **img-072** `…29139954` · _component_  
  A gated upsell modal rendered over a blurred CRM table: a large rounded card with a full-bleed gradient-mesh hero image (blue-green grain texture) at the top third, a frosted white rounded icon badge centered on the image, then below: a bold feature name, an inline 'Private Beta' colored text pill (pink/red, no border), a two-line description, and two buttons (filled dark primary + text-only secondary). The background table is fully blurred, locking the user in the modal.  
  → The gated feature upsell modal pattern with a gradient-mesh hero, inline beta pill, and two-button footer is applicable to the gated URGENT/HIGH alert tier preview in /alerts (which requires Team plan + demo login per the alerts-priority-preview reference). The gradient mesh hero could differentiate this from standard modals, and the inline beta chip pattern matches how 'Private Beta' or 'Team plan' could be surfaced without a separate badge row.  
  · _/alerts gated URGENT/HIGH tier upsell modal_
- **img-073** `…29139985` · _component_  
  Invite modal with a mixed avatar row: filled photo avatars (overlapping, stacked left-to-right) followed by dashed-circle placeholder slots indicating remaining open seats, with a + button between the two groups. The two visual states (filled vs. empty) communicate capacity at a glance without any number label.  
  → AssigneeAvatar group on the /deadlines detail page or /clients list — wherever a team member or assignee group is shown. The dashed placeholder slots could represent unassigned roles (e.g., preparer / reviewer / signer) in the obligation workflow header, surfacing gaps without a tooltip.  
  · _/deadlines/[id] workflow header — assignee avatar group_
- **img-077** `…29140052` · _component_  
  Inline sentence-construction UI: free-text connective words ('on', 'from', 'until', 'at', 'every') are rendered as plain gray text, while the editable value fields are shown as tinted rounded-rectangle chips with the value inside. Tapping a chip opens its picker. The result reads like a natural-language sentence with embedded interactive tokens.  
  → Rule editor or extension-request form in /deadlines/[id] Status tab. For example, 'File by [date chip] with [N days chip] extension every [period chip]' would make the structured deadline rule readable and editable without a traditional form grid. Maps to the extension widget and the penalty widget where dates and durations are the key inputs.  
  · _/deadlines/[id] Status tab — extension widget / penalty widget date/duration inputs_
- **img-079** `…29140081` · _component_  
  Inline toast/banner with three zones in a single row: left icon + bold title + description text / center action buttons (primary filled, secondary ghost) / right dismiss X. Below the card, a muted auto-dismiss countdown line ('This message will automatically close in 12 sec') with the seconds rendered in the brand accent color.  
  → Auto-unblock banner (per the auto-unblock destination memory note) — when a cascade lands children in 'pending' and the system auto-unblocks, a dismissible inline banner with an action button ('Review affected obligations') and a timed auto-dismiss countdown would communicate both the event and its transience without requiring user action to clear it.  
  · _/today or /deadlines — auto-unblock system banner_
- **img-081** `…29140095` · _component_  
  Floating comment-input bar: a wide pill-shaped container with instructional placeholder text ('to leave a comment') and keyboard shortcut hints (Cmd and Return glyphs) as ghost chips on the left. A filled circular send button sits at the right end of the bar, visually heavier than the ghost chips. Below, a separate rounded toolbar with icon-only action buttons and a + add button.  
  → Activity / note-entry field on the /deadlines/[id] Audit tab or Status tab. The keyboard-shortcut hint chips (Cmd+Enter to submit) in the input placeholder would reduce friction for power users logging milestone notes. The pattern also applies to the milestone-notes input in the workflow card per the workflow state cascade contract.  
  · _/deadlines/[id] Audit tab / Status tab — note/comment input field_
- **img-082** `…29140103` · _layout_  
  Segmented tab switcher rendered as a pill-shaped container with the active tab in a solid dark fill and inactive tabs as plain text — no border on inactive items. Below, stacked form rows with a muted label flush-left, a brand-logo + masked value + chevron on the right. The rows have no divider lines; spacing alone separates them. The overall card is borderless with a slight shadow.  
  → The segmented tab switcher (Bank / Card / Pay Later pill) translates directly to the obligation type scope selector on /deadlines — the Segmented primitive with a solid-fill active state matches the DueDateHQ design system's Segmented component spec. The label-flush-left + right-aligned interactive value row pattern applies to the extension/penalty widget field rows in /deadlines/[id].  
  · _/deadlines toolbar — Segmented scope selector; /deadlines/[id] extension widget form rows_
- **img-083** `…29140107` · _data-viz_  
  Bar chart where the currently-selected time period bar is rendered taller and in a contrasting dark fill while all other bars are shorter and in a light muted fill — creating a strong focal-point without color-coding. Below the chart, a highlighted metric card shows an icon badge with a brand-tinted background, a large numeric value, and a secondary descriptor line, with a pill action button right-aligned. Underneath, two On/Off toggle rows with label + description in the same card container.  
  → The 'active bar stands out' bar chart treatment could work in a source health sparkline or an alert-volume chart on /sources or /alerts. The highlighted metric card pattern (icon badge + large value + descriptor + pill action) maps to an alert card on /today — specifically the 'N clients affected' call-to-action card. The On/Off toggle rows match the alert-preference toggles in a user settings panel.  
  · _/today alert cards — metric + action card pattern; /sources — bar chart with active-period highlight_
- **img-085** `…29140120` · _component_  
  A permission-gate dialog layered over a blurred app background, with stacked OS-style notification toasts shown inside the dialog body as concrete examples of what the user will see — the toasts use a small branded icon, title, description, and relative timestamp, with a grouped overflow line ('+3 from Linear, X, and Figma') rendered in a muted tint.  
  → The stacked-toast pattern with overflow count is directly applicable to the /today alert feed: when multiple alerts fire from the same authority source, group them under a source chip with a '+N more' overflow pill rather than listing all rows. The relative timestamp format (e.g. '16m ago') maps cleanly to the DueCountdownText / recency display on alert cards.  
  · _/today alert feed — source-grouped overflow + relative timestamp_
- **img-087** `…29140128` · _component_  
  A segmented tab bar (Trim / Filters / Text / Audio) separated by hairline vertical dividers between inactive items, with the active tab rendered in a filled pill with no divider on its sides. Below, a collapsible section ('Flip options') uses a chevron-up icon on the right to indicate open state, containing label+toggle rows inside a lightly tinted container. A floating value badge ('48%') sits above the thumb of a range slider.  
  → The hairline-divided segmented control is a refinement for the /deadlines/[id] tab bar (Status / Materials / Record / Audit). The collapsible section pattern with right-side chevron directly matches the collapsible density requirement for detail cards. The floating value badge above a slider thumb could apply to a future penalty-amount or extension-day adjuster widget on the Status tab.  
  · _/deadlines/[id] tab bar + collapsible section cards_
- **img-088** `…29140131` · _navigation_  
  A left-rail navigation panel where items are visually tiered: top-level items with icons in medium-weight text, a horizontal rule separating logical groups, secondary utility items (Search with a keyboard shortcut badge '⌘K', Favourites), and a user-created list section with distinct folder-variant icons per item. A 'New Category' ghost item in muted weight sits at the bottom as a creation affordance.  
  → The keyboard shortcut badge on the Search nav item (⌘K) is a small detail applicable to DueDateHQ's CollapsibleSearch toolbar — surfacing the shortcut inline on the search icon or label, rather than relying on discoverability. The tiered icon vocabulary (different icon per category type) maps to the /sources rail where each monitored authority could carry a domain-specific icon variant.  
  · _Global nav rail + CollapsibleSearch trigger_
- **img-089** `…29140149` · _component_  
  A workflow-trigger picker panel with a search input at the top, a muted section label ('Event sources'), and icon+label list rows in bold weight for each option. The panel sits adjacent to a toolbar with three action buttons (Save / Schedule / Start) where each button carries a small inline icon to the left of the label — the primary CTA ('Start') uses a dark filled background, secondary uses a light bordered style.  
  → The icon+label grouped picker pattern is applicable to the /rules library's rule-trigger or condition picker, and the 'accept/reject' review modal. The three-button toolbar hierarchy (secondary outlined / secondary outlined / primary filled) directly matches the action bar pattern on the /alerts detail decision-tool page (Dismiss / Defer / Apply Now).  
  · _/alerts detail action bar + /rules review modal picker_
- **img-090** `…29140156` · _data-viz_  
  A dark-surface progress card showing a large percentage figure (66%) alongside a delta badge ('+30%' in a pill with an arrow icon), a plain sentence describing trajectory ('on track to finish three days early'), and a segmented bar below where filled segments are white and unfilled segments step down in gray lightness — creating a graduated visual encoding of remaining vs. completed work without a continuous fill bar.  
  → The segmented-bar encoding (discrete blocks rather than a continuous fill) could replace or complement the StatusRing on the /today Priorities section or the StatBand, to show portfolio-level filing progress (e.g. 34 of 50 obligations filed this quarter). The delta-change pill ('vs. last period') is a pattern that could sit inside the StatBand cells on /clients or /sources to show period-over-period change. However, the dark surface and gradient treatment don't fit DDHQ's flat light-mode DS.  
  · _StatBand cells (delta badge) + /today portfolio progress (segmented bar)_
- **img-099** `…29140280` · _navigation_  
  Sidebar nav list where each item has an icon + label + right-aligned count badge. The active item uses a full-width filled accent pill (blue) with the count in white on the same background. Inactive counts appear in a muted gray. Below a section divider, color-dot labels (Design, Work, Personal) use a colored 12px circle as the sole differentiator — no icon — with counts right-aligned.  
  → DueDateHQ's left sidebar rail for /deadlines and /alerts. The right-aligned count pattern is directly usable for obligation counts per status or alert severity. The color-dot section items map well to client groups or obligation type categories in the rail.  
  · _Left sidebar rail — nav item count badges_
- **img-100** `…29140298` · _navigation_  
  Vertical step rail for a multi-step wizard: completed steps show a green checkmark badge on the step number, the active step uses an accent color label + left border accent line, and future steps render in muted gray. Steps display 'Step N/N' in a small label above the step title. The live preview panel sits in the center column while the form action panel is on the right.  
  → The /deadlines/:id workflow stage strip or the six-stage obligation workflow card. The step-number + checkmark + left accent line mechanic maps directly onto the not*started → completed progression, and the active-step left border could reinforce the asymmetric stage attention pattern already spec'd.  
  · */deadlines/[id] workflow card — stage strip\_
- **img-101** `…29140300` · _data-viz_  
  Table rows where each row has a text label + fraction score (N/10) left-aligned, and a segmented bar chart right-aligned. The bar is composed of 10 equal rounded segments; filled segments use color (green graduating to dark green, then red for the overflow zone), empty segments use a light gray. The threshold between good and bad is shown by the color break mid-bar, not a separate indicator.  
  → The /sources page source-health column or StatBand. Source reliability/health could be visualized as a 10-segment bar where the color break signals the threshold between healthy and degraded, replacing or supplementing the current health percentage text.  
  · _/sources table — source health column_
- **img-103** `…29140314` · _data-viz_  
  AI-generated report inline in a chat surface, where a key metric is rendered as a dark-navy filled card containing a large numeric value, a sub-label, and a mini bar chart — not as text but as an embedded visual tile. A second card in a soft cyan/blue tint shows a contrasting metric. Below the cards, a 'Sources used' row lists the data provenance as logo chips.  
  → The /alerts alert detail decision-tool hero region. The dark-navy card with a large numeric + sparkline mirrors how DueDateHQ could surface the most critical fact (e.g. '47 clients affected' + trend bars) as an embedded visual tile rather than plain text. The source provenance row maps to the authority source chip already spec'd in the alert detail.  
  · _/alerts alert detail — hero metric + source attribution row_
- **img-108** `…29140377` · _data-viz_  
  Two-column feature section where one column is a metric card: a split horizontal progress bar (green fill + gray remainder) with a large dollar figure below labeled 'Gross Revenue'. The bar uses two colors side by side with no gap, full-width. A secondary 'Join Meeting' CTA button is inset in the same card at the bottom. The card has no border, only a soft gray background fill and corner radius.  
  → The StatBand or a client-detail summary card in DueDateHQ. The two-color split progress bar (obligations filed / obligations remaining) would be a compact alternative to the StatusRing for showing portfolio completion at the client-list level — e.g. a per-client 'X of Y filed' bar replacing a numeric fraction.  
  · _/clients client-detail StatBand or client list row_
- **img-110** `…29164836` · _navigation_  
  A pill-segmented tab bar with four equal-width tabs; the active tab uses a filled dark background pill that slides within the outer pill container, giving a contained toggle-group feel. Below it, a 2×2 grid of template-card tiles with an icon, bold title, and one-line descriptor — a browsable option picker rather than a flat list.  
  → The /deadlines/[id] four-tab bar (Status / Materials / Record / Audit) — the pill-within-pill segmented container is a tighter, more contained treatment than plain underline tabs, worth evaluating for the workbench tab strip. The 2×2 template grid also maps to the /rules library card grid for rule templates.  
  · _/deadlines/[id] tab strip + /rules library grid_
- **img-115** `…29164886` · _layout_  
  A split login layout: left panel is a clean white form with a centered logo mark, email/password fields, primary CTA, SSO row, and utility links — no decorative imagery. Right panel shows a live app preview (nav + table) against a warm gray background, acting as a product teaser embedded in the login shell itself.  
  → DueDateHQ /login page — the right-panel product preview is a worthwhile onboarding pattern: showing a sample obligations table or /today view in the right half during login gives new users immediate product context without a separate onboarding tour. Relevant to the first-run empty state proposal.  
  · _/login page_
- **img-116** `…29164889` · _data-viz_  
  A database-style table with colored dot + label pills in a category column (Finance=green, HR=orange, Marketing=red, Sales=blue, Engineering=gray), a contextual tooltip chip ('Linked records') appearing on column header hover, and a breadcrumb path in the page header that mirrors the data hierarchy. Row identifiers use a fixed-width mono prefix (EMP001) as the primary key column.  
  → /clients list and /deadlines list — the colored dot + department label pill maps to obligation type or jurisdiction chips. The breadcrumb path mirrors the /deadlines/[id] rail+detail hierarchy. The mono prefix pattern (EMP001) maps to obligation reference codes (e.g. hudson-1040) as a fixed-width primary key column.  
  · _/clients list + /deadlines list + /deadlines/[id] breadcrumb_
- **img-118** `…29164893` · _component_  
  A 'Customize columns' panel (modal or side sheet) with a hierarchical tree of collapsible field groups, each showing a child-count badge (e.g. '11/18', '1/85') as a muted rounded pill beside the group name, individual checkboxes on leaf nodes, and 'Clear all' + 'Expand all' controls at the top alongside a search input.  
  → /deadlines list column picker — the hierarchical group + child-count badge pattern is directly applicable to DueDateHQ's column customization panel, grouping columns by category (Dates / Status / Client / Filing type) with a count of selected/total columns per group.  
  · _/deadlines list — column customization panel_
- **img-120** `…29164915` · _component_  
  An AI agent progress log rendered as a vertical stepper: parent steps shown as radio-button-style filled/empty circles connected by a thin vertical line; each active parent expands an indented sub-step card with check/spinner icons and monospace inline code chips for entity names (service names, time ranges). Completed sub-steps show a filled circle-check, in-progress ones show a spinner.  
  → This is photography/illustration — no. Actually this is a UI: it maps to /audit-log transition rows and the alert detail Activity section. The parent-step radio circle + indented sub-step card pattern is a richer version of the transition-row anatomy, useful for showing multi-step AI-read source monitoring events (source scanned → change detected → clients identified → applied) in the /alerts detail Activity anchor.  
  · _/alerts detail — Activity scroll-spy anchor + /audit-log_
- **img-122** `…29164921` · _component_  
  A compact account/plan panel embedded inside a popover: plan label + upgrade CTA button on a single line, then a thin progress bar with a 'N of M created' label below, then icon+text utility links (Learning center, Contact support, Invite new member) as a flat list. The plan quota progress is surfaced inline inside the menu rather than on a separate settings page.  
  → Could adapt to a user-menu / account popover in DueDateHQ's nav: showing 'N clients monitored / M sources active' as a quota-style mini progress bar, with utility links below (Help, Invite teammate). DueDateHQ's nav currently lacks a user-menu pattern. Medium fit — the quota-in-menu mechanic is directly usable but the product doesn't have hard quota limits today.  
  · _Navigation — user/account menu popover_
- **img-124** `…29164932` · _navigation_  
  A left sidebar with a workspace/team switcher at the top (showing current team name with a chevron), a flyout dropdown listing workspaces with distinct colorful avatars + keyboard shortcut badges on the right. Below the switcher, grouped nav sections ('Records', 'Collections') with icon+label rows. The active item has no border — it's distinguished purely by font-weight increase and the avatar changes to a dark filled square.  
  → DueDateHQ's left rail nav currently has a client/firm switcher need. The team-switcher flyout pattern (avatar + name + check for active + shortcut badge) directly maps to switching between tax practice entities or client scopes. The grouped Records/Collections section pattern maps to the nav grouping (Deadlines / Alerts / Clients / Sources / Rules). Keyboard shortcuts in the switcher are a nice density affordance for power users.  
  · _Left nav rail — workspace/firm switcher + grouped nav sections_
- **img-127** `…29164944` · _navigation_  
  A settings page with a left nav listing categories (General, Payouts, Privacy, Affiliates, Integrations, Advanced, Danger Zone) and a main content area showing an integrations grid. Each integration card has: a large square app icon, an 'INSTALLED' badge in the top-right corner using a small all-caps green label (no background, just colored text), a title, a one-line description, and a contextual CTA button ('Uninstall' as outline, 'Install App' as filled dark). Category tabs (All / Logistics / Payments / Fulfillment) filter the grid.  
  → DueDateHQ's /sources page (monitored tax authorities). Each source could use a similar card layout: authority logo/icon, health status badge (HEALTHY / DEGRADED / DOWN) in the corner, authority name, jurisdiction line, and a contextual action. The 'INSTALLED' badge mechanic maps directly to a 'MONITORED' or 'ACTIVE' label on connected sources vs an 'Add source' CTA for unconnected ones.  
  · _/sources — authority/source card grid with install-state badge_
- **img-130** `…29164965` · _component_  
  A vertically-stacked grouped list where each group header row shows a progress-fill icon (circle with varying fill: empty, quarter, half, three-quarter, full) + group name + count badge. Expanded groups show kanban-style cards with: a reference number in muted small text, entity name as the primary label, metadata chips (location code, item count, comment count) on a second line, then tag pills with a left-side colored stripe accent (green 'Express', red 'Priority', yellow 'Heavy', blue 'Refrigerated').  
  → The /today priorities section or /deadlines grouped view. The group-header with progress-icon + count maps to grouping obligations by status where the icon shows stage completeness. The reference number + entity name + metadata chips pattern maps to obligation rows (ref code + client name + due date + assignee). The left-stripe colored tag pills are a compact alternative to full-background severity chips.  
  · _/today — priority cards or /deadlines grouped-by-status view_
- **img-131** `…29164971` · _component_  
  A kanban card that expands inline to reveal an 'Assignees' sub-section with a dashed border separator, showing avatar + name rows each with a dot-prefixed colored department tag right-aligned (pink 'Design', yellow 'PM', green 'Engineering'). The card also shows a priority badge (P1 in red pill, P3 in yellow pill) top-left, a circular progress ring with a number (92, 74) top-right, and a due date line with a calendar icon that turns amber when the deadline is near ('Due Tomorrow').  
  → Limited direct application. DueDateHQ uses AssigneeAvatar primitive and status rings (StatusRing) already. The inline-expanded assignee sub-section with dashed separator could apply to an obligation card's expanded state on /today showing which staff are assigned per obligation. The colored department tag right of each assignee name could map to the assignee's role (Preparer / Reviewer / Partner). Moderate fit but partially covered by existing primitives.  
  · _/today — priority card expanded assignee sub-section_
- **img-133** `…29164983` · _component_  
  CRM pipeline cards with a consistent icon-label-value row layout: each field uses a small gray icon flush-left, a muted label, and a right-aligned value; multi-tag category chips (SaaS / B2B / AI) sit inline on a dedicated row; a footer bar shows three icon+count pairs (attachments, comments, time-ago) separated by consistent spacing, not dividers.  
  → The /deadlines workbench table rows and the obligation list items in /today Priorities could adopt the icon-label-value row pattern for surfacing obligation type, entity, and jurisdiction inline without prose. The footer icon+count treatment directly applies to the activity/comment count shown on obligation cards.  
  · _/deadlines list rows, /today priority cards_
- **img-135** `…29165010` · _data-viz_  
  A segmented pill toggle (Today / This week / This Month / This Year) with a filled dark pill on the active option — no border, just fill contrast — controls a bar chart where the current-period bar is highlighted in the brand dark color and all other bars are a lighter neutral. A summary card below uses a circular icon badge on a tinted background next to a large bold number and a muted sub-label, with a pill CTA right-aligned inside the card.  
  → The segmented period toggle pattern directly fits the /today dashboard or StatBand to switch between 'this week / this month / this quarter' scope for the obligation count summary. The highlighted-bar-in-chart mechanic is usable on a potential filing-volume chart on /today or /clients detail. Already has Segmented primitive — the filled-pill active state is a refinement worth applying.  
  · _/today dashboard scope toggle, StatBand period selector_
- **img-136** `…29165071` · _layout_  
  A multi-step wizard split into a left form pane and a right live-preview pane, connected by a horizontal numbered breadcrumb stepper at the top (1 Details → 2 Documents → 3 Tokenization → 4 Review) where the active step is a filled blue circle with number and the rest are outline numbers with muted labels. The form uses floating label inputs with a visible placeholder, and a character-count footer on textareas.  
  → The numbered breadcrumb stepper applies to DueDateHQ onboarding (the first-run flow proposed in Proposal A) if it ever needs more than one step, or to the alert 'Apply' confirmation flow when the apply action requires a multi-step review (e.g., confirm affected clients → review change → confirm). Character-count on textareas is directly usable on the extension-reason or block-reason text inputs in the obligation workflow.  
  · _Onboarding multi-step flow, /alerts apply confirmation, extension/block reason textareas_
- **img-143** `…29165470` · _navigation_  
  A settings page with a top horizontal toolbar containing pill-style nav items (Search, Create Job, Job Postings, Organization Settings, overflow '...') where the active item has a filled dark background pill and inactive items are transparent — functioning as a top-level tabbed context switcher, not a sidebar. Below, a two-column layout: left = a plain list rail with icon + label rows (no borders, just background fill on hover/selected); right = a form with clearly labeled fields, a multi-tag chip input (Design × Product × + Add), and standard text inputs.  
  → The multi-tag chip input with inline '+ Add' affordance directly applies to the obligation form fields where assigning multiple categories, jurisdictions, or responsible parties is needed. The plain list rail (icon + label, no border, fill on selected) is the exact pattern for the left navigation rail in /deadlines master-detail and /clients. The pill-tab top toolbar maps to the tab bar in /deadlines/[id] (Status / Materials / Record / Audit).  
  · _/deadlines/[id] tab bar, obligation form multi-tag fields, master-detail rail_
- **img-145** `…29165482` · _navigation_  
  Left rail with two distinct visual zones: a top section of primary nav items (each with an icon + label on a full-width pill highlight for active state) and a lower section of user-created items using a small colored square swatch instead of an icon — creating a compact, scannable workspace switcher without a heading for each item.  
  → The left navigation rail in DueDateHQ (/today, /deadlines, /alerts, /clients, /sources, /rules). The colored square swatch pattern (img shows 'Design Consultation' with a purple square, 'Future of AI' with an orange square) maps directly to client color-coding in the rail — each client workspace or saved filter view could use a 2×2 color swatch instead of an avatar, making the rail feel purposeful without blowing out the height.  
  · _global nav rail_
- **img-146** `…29165548` · _navigation_  
  Minimalist sidebar with a thin vertical accent bar (amber/orange, ~4px wide) on the left edge of the currently-active nav item — no background fill, no pill, just the stroke. The user identity block at top uses a two-line entity/person hierarchy (org name in weight-600, person name in muted weight-400 below it), separated from nav items by a full-width hairline rule.  
  → The left rail active-state indicator in DueDateHQ. Currently the active item likely uses a background fill (pill). The single-stroke left accent bar is a lower-noise alternative that preserves the indicator signal without adding fill-weight — useful in a dense workbench where multiple panels compete for attention. The two-line org/person header pattern also maps to the client detail page header (firm name + contact name stacked).  
  · _global nav rail / client detail header_
- **img-149** `…29165575` · _component_  
  Card-based list view (not a table) where each record renders as a white rounded card containing: a bold name header at top, then three to four icon+value attribute rows (a downward-arrow icon for priority, a calendar icon for date, a person avatar pill for assignee, a currency icon for amount) stacked vertically with consistent left-icon alignment. A colored dot + label tab ('Open 2') acts as a group header above the cards.  
  → The /today dashboard priority list or the /alerts feed could use the attribute-row card pattern for a mobile-breakpoint or compact fallback view. At large breakpoints the workbench table is preferred, but at small breakpoints (where the table collapses per the deadlines responsive contract) this card anatomy — icon+value rows, grouped by status dot+label — is a clean fallback for the obligation list. The colored status-dot group header also maps to the grouped status sections in /deadlines.  
  · _/today priorities list (mobile breakpoint) / /deadlines table group header_
- **img-150** `…29165604` · _layout_  
  Top section shows a template/workflow picker using equal-width cards with a wireframe-style preview thumbnail (rendered as a light blue abstract illustration of the template layout) above a title + subtitle. Bottom section is a traditional dense data table with minimal cell padding, no row dividers (rows separated only by alternating or hover bg), and a toolbar row with Sort / Columns / Filter / Download buttons grouped right-aligned.  
  → The /rules rule library surface could use the template-card picker pattern for the 'create new rule' or 'accept rule from library' flow — showing rule templates as preview cards before the user commits. The toolbar pattern (Sort/Columns/Filter/Download right-aligned, with tab strip left) is already close to what /deadlines uses and validates the current approach.  
  · _/rules library — rule template picker / /deadlines toolbar_
- **img-152** `…29165723` · _component_  
  Data table where the first column uses a small colored avatar dot (teal for one user, pink/red for another) flush left of the row name — the dot is the only status/identity signal, with no additional badge. Column headers use a sort-caret control inline with the label text. Row hover state is implied by the card-per-row border treatment. A top search bar spans nearly the full content width with a secondary 'Advanced search' button right-aligned.  
  → The /clients client list table. The small avatar dot per row maps to AssigneeAvatar primitive already in use. The 'Advanced search' button pattern next to the main search input is worth considering for /deadlines where CollapsibleSearch already exists — an 'Advanced' trigger could surface the saved-filter quick-filters dropdown (the Quick filters spec) without polluting the toolbar.  
  · _/clients list table + /deadlines CollapsibleSearch advanced trigger_
- **img-157** `…29166012` · _component_  
  Rich-text tooltip presented in two color modes (light/dark): a large speech-bubble callout with a bold title line, a body paragraph in a lighter weight, and a pointed tail anchored to a square icon-button trigger. The tooltip body has enough room for 2-3 sentences, making it a genuine explainer rather than a label.  
  → Use the rich-tooltip pattern on the /alerts detail page to annotate the AI-confidence score badge and the 'Apply' gate readiness indicator — surfaces where a label alone undersells the complexity. The dark variant maps cleanly to DueDateHQ's navy brand surface for context-sensitive overlays on dark headers.  
  · _/alerts detail — confidence badge tooltip / apply-gate tooltip_
- **img-159** `…29166114` · _component_  
  Command-palette / shortcut-list rows where inline tokens (colored pill-chips with a faint tint and no border) are embedded inside a prose sentence to highlight variable values. Each row has a leading app-icon square, plain text, and one or more inline value chips that break the line at a readable scale.  
  → The /rules rule library 'accept' review modal could embed this pattern inline: 'Apply this rule to [clients chip] when filing type is [1040 chip] and jurisdiction is [IRS chip].' The faint-tint inline chip is already how FilterTrigger pills work — the innovation is embedding them inside a sentence rather than in a toolbar row.  
  · _/rules — single-accept review modal (oei7Q) rule-sentence display_
- **img-160** `…29166197` · _component_  
  Metadata attribute group rendered as individually bordered pill-chips, each with a leading muted icon and a value label — no enclosing card frame, just a loose grid of pills. Icons are monochrome and sized to 16px, giving structure without color hierarchy. The pills wrap across two rows when the set is large.  
  → The obligation detail sidebar (Status tab) currently shows due date, recurrence, jurisdiction, and form type as key-value pairs. Replacing the secondary metadata row (below the workflow strip) with these icon+value attribute chips would improve scannability and let the fields wrap gracefully at smaller breakpoints without a table structure.  
  · _/deadlines/[id] — Status tab metadata row (due date / recurrence / jurisdiction chips)_
- **img-161** `…29166204` · _navigation_  
  Two-column sidebar with a grouped nav list (category label in muted small-caps, then icon+label rows with a tinted highlight on the active item) paired with a large empty-state workspace area containing a centered hero input. The sidebar groups use horizontal dividers between sections and a workspace-selector dropdown at the top.  
  → The /today layout and the general ListRail navigation pattern already match this closely. The specific craftable detail is the muted all-caps section-group label (e.g. 'Create' / 'Operations') inside the rail — DDHQ's rail currently uses plain label rows without section-group headers. Adding these grouped labels to the nav rail (Clients / Sources / Rules / Audit) would aid orientation on first use.  
  · _Global nav rail — section-group labels above clustered nav items_
- **img-162** `…29166215` · _empty-onboarding_  
  Full-screen quick-action overlay: background content is blurred/desaturated beneath a floating grid of large tappable action tiles (icon on top, two-line label below), each in a uniform gray rounded-rect. A high-contrast accent close button (neon yellow circle with X) is pinned to the top-right corner, creating a clear escape affordance distinct from the tiles.  
  → The /clients page 'add client' flow or the onboarding checklist could use a variant of this: when the user clicks a primary '+' action, an overlay reveals 3-4 large action tiles (Import CSV / Connect firm software / Add manually / Use sample data). This is especially useful for the first-run state where the correct next step is not obvious from a blank list.  
  · _/clients — first-run or add-client action overlay_
- **img-168** `…29166403` · _component_  
  Deep-pill action button (999px radius, ~56px tall) where a square-rounded brand icon sits flush against the left interior edge of the pill at full button-height, then the label text follows with generous padding. The icon container uses a darker fill than the overall pill background, creating a two-tone interior — icon zone vs label zone — within one button unit.  
  → The primary 'Apply update' CTA on the /alerts detail 'Your decision' region could use this two-tone pill treatment: a SparklesIcon (AI) zone on the left in navy tint, then 'Apply to N clients' label in the main zone. This visually signals that the action is AI-assisted without adding a separate badge and keeps the button as a single pressable target.  
  · _/alerts detail — 'Apply update' primary CTA button_
- **img-169** `…29166481` · _component_  
  Task list rows with inline colored pill tags (category chips), a due-date countdown rendered as colored text ("in 1 day" / "in 2 days") aligned to the row's trailing edge, and a footer strip that pairs a slash-command shortcut affordance with a live progress percentage + mini ring on the same baseline.  
  → The trailing due-countdown pattern maps directly to DueDateHQ's DueCountdownText / DueDaysPill on /deadlines table rows. The category chips (FINANCE, PAYROLL) are a close analog to the obligation-type tags. The footer strip's shortcut + progress combo could inform the /today priorities panel footer (e.g., 'X of Y obligations actioned today' with a ring).  
  · _/deadlines table rows; /today priorities footer_
- **img-170** `…29166487` · _layout_  
  A two-pane master-detail layout where the left rail lists items with a count badge in a nav row, and the right pane presents a kanban-style column view with cards showing a green percentage-match label directly beneath the name — a single bold metric rendered in brand color as the primary data point on each card.  
  → The orange notification badge on 'Engagements 5' in the left rail is the exact same mechanic as DueDateHQ's CountPill on the /deadlines rail nav. The 'X% Match' green label pattern is a reference for how to surface a single AI-derived confidence score on alert-detail cards (alert confidence readiness shown as a coloured percent beneath the change title).  
  · _/deadlines left rail nav; /alerts alert-detail card confidence score_
- **img-172** `…29166498` · _navigation_  
  A command-palette-style 'Add Nodes' panel with a search field at the top, a 'Recommended' section of 2×2 small labeled icon tiles, then collapsible category sections (Input, Output, Core Nodes) each with a chevron, revealing flat icon+label rows. A '+' button appears on hover at the trailing edge of each row.  
  → The grouped, collapsible categorized picker with a search field is a reference for the /rules rule-library filter drawer or the quick-filters dropdown spec — specifically the pattern of 'Recommended / grouped sections / add-on-hover'. Not a direct 1:1 since DueDateHQ's filter is a dropdown not a panel, but the section grouping + hover reveal of an action button applies to the FilterTrigger group list.  
  · _/rules rule-library; /deadlines quick-filters dropdown_
- **img-173** `…29166502` · _navigation_  
  A full-app nav rail with icon+label rows and a view-switcher tab bar (Summary / Board / List / Gantt / Calendar / Table) rendered as an underline-tab set at the top of the content area. Kanban cards show a small category chip in the top-left corner, a bold task title, a muted description line, a date + duration metadata row, and an avatar cluster at the bottom-right.  
  → The category chip in the card top-left is the same pattern as obligation-type tagging on /today priority cards. The metadata row (date + duration icons) informs the /today alert card footer layout. The underline tab set is a reference for the Status/Materials/Record/Audit tab bar on /deadlines/[id] — reinforces keeping tabs as underline-style, not pill/button style.  
  · _/today priority cards; /deadlines/[id] tab bar_
- **img-174** `…29166504` · _layout_  
  A member-grid layout where each card has a corner status chip (Remote/Active/Part-time) positioned absolutely at the top-right of the avatar zone, with a two-column metadata grid inside the card body (Department / Joining date) using muted label + value pairs at small type size, and a timeline gantt strip below the grid.  
  → The absolute-positioned corner status chip on a person card is a reference for AssigneeAvatar + status ring composition on /clients client-list cards. The two-column label/value metadata grid (Department, Joining) is a direct analog for the client detail workspace banded section card metadata layout — specifically how to present CPA-firm metadata (entity type, jurisdiction, filing frequency) in a scannable grid.  
  · _/clients client list cards; client detail metadata section_
- **img-175** `…29166506` · _component_  
  Kanban board cards with a top-left category chip (no icon, just text, lozenge shape), a bold title at weight ~600, a muted body line at weight 400, then a metadata row with icon+value pairs (date, attachment count, link count, subtask fraction '1/4'), and an avatar stack at bottom-right — all within a flat white bordered card with rounded corners.  
  → The subtask-fraction pattern '1/4' rendered as a small icon+text pair is a direct reference for showing materials-complete or workflow-stage progress on /deadlines obligation rows or /today priority cards (e.g., '3/5 materials received' as an inline chip). The card structure itself is a close analog for /today alert cards.  
  · _/today alert cards; /deadlines obligation row metadata_
- **img-177** `…29166518` · _component_  
  A file-list view with two 'new item' cards using an inverted (dark fill) primary card and a lighter secondary card side-by-side, then a file-type filter tab strip ('View all / Documents / Spreadsheets / PDFs / Images'), followed by both a card-grid and a flat list view of the same files — each list row showing an icon, name, size, and file extension as muted inline metadata.  
  → The file-type filter tab strip is a reference for the Materials tab on /deadlines/[id] — specifically filtering uploaded materials by type (PDF/Excel/Image). The dual-row metadata pattern (name + size + extension) maps to how file attachments should be listed in the Materials tab list, with file extension as a muted pill rather than an icon alone.  
  · _/deadlines/[id] Materials tab file list_
- **img-181** `…29167043` · _component_  
  List rows with a two-line primary/secondary text pair (name + location context) paired with a per-row action button that shifts between a muted disabled state ('Invited', gray pill) and an active call-to-action state (lime green filled pill). The state difference is communicated by fill color and text change only — no icon or shape change.  
  → The /deadlines obligation list rows or the affected-clients table in the alert detail: each row could carry a per-row action button (e.g. 'Apply' vs 'Applied') that transitions from an active filled state to a muted done state, using the same shape/size throughout. Currently the table has no inline per-row action affordance — this pattern would let CPAs apply a rule change to one client without leaving the table.  
  · _/alerts affected-clients table, /deadlines list rows_
- **img-182** `…29167093` · _data-viz_  
  A lollipop/dot-stack chart where each monthly column is a vertical stack of rounded-cap bars and dots, each colored by category. The bars encode magnitude (height) while the dot size and vertical position encode additional breakdown. A thin trend line overlays the columns at a fixed horizontal level. The color palette uses earth tones with strong contrast between categories.  
  → The /today dashboard or a potential StatBand expansion for the client detail: a month-by-month obligation volume chart broken down by obligation type (1040, 1120, etc.) would let CPAs see filing load distribution across the year. The stacked dot mechanic maps directly to filing counts per type per month, with the trend line showing average load. Currently no such chart exists on any surface.  
  · _/today dashboard (potential filing-load chart widget)_
- **img-187** `…29168177` · _layout_  
  A long-scrolling marketing product page using a sticky left-column anchor nav (dot + label list) synchronized with a right-column content panel that shows one product feature card at a time. Each content card has an icon + section title + screenshot. The left nav dots change color to indicate the active section.  
  → The /alerts alert detail page uses scroll-spy anchors (Change / Source / Activity) per the alert-detail-decision-tool canon. This image validates the sticky left-column anchor nav pattern and the active-dot indicator mechanic. The implementation would place the dot-nav in the detail pane's left column, highlighting the active anchor as the user scrolls through the three sections.  
  · _/alerts alert detail scroll-spy anchor nav_
- **img-191** `…29168580` · _component_  
  A tag/status palette card showing 7 status badges arranged in a 4+3 grid. Each badge is a large rounded-rectangle pill (radius ~8-10) with a soft tint background, an icon on the left (each icon is unique per status: triangle warning, clock ring, paper airplane, face, checkmark shield, X circle, clock), and a bold colored label. The icon color matches the label color and both sit on a matching soft tint.  
  → DueDateHQ's obligation status Badge primitive: this image shows the maximum visual expression of a status chip — large pill, tinted background, matched icon+label color. DueDateHQ's design system already uses a severity ramp with soft tints, but keeps badges smaller (text-xs, compact). The icon-per-status pattern (distinct icon per state, not a generic dot) is directly applicable to the 6 obligation states (not*started / waiting_on_client / blocked / in_review / filed / completed) shown in the /deadlines Status column and the workflow Hero pill. However the large size shown here is too large for dense table rows — this treatment fits the detail-page Hero pill only.  
  · */deadlines/[id] workflow Hero pill, /deadlines list Status column badge\_
- **img-193** `…29168740` · _navigation_  
  User account popover anchored to an avatar in a nav rail: avatar + name + plan badge (green pill "PRO") in the header zone, then grouped menu rows with icons, a toggle row (dark mode) inline, and a version/terms footnote at the footer. The active item uses a full-width tinted highlight row.  
  → The global nav's user-account popover does not currently show a plan/role badge. This pattern could be applied to the DueDateHQ app shell's avatar menu to surface the user's role (e.g. Admin / Member) as a small colored pill next to the name, and add a dark-mode toggle row — both useful in a multi-role CPA firm context.  
  · _App shell — user account popover_
- **img-198** `…29168794` · _navigation_  
  Account avatar with a colorful gradient ring (pink-to-orange) as an active/notification indicator, and a dropdown menu where one item has an inline colored pill badge ("PRO" in pink) flush-right, with a hairline rule separating the destructive "Sign out" item from the main list.  
  → The app shell avatar in DueDateHQ could use a colored ring on the avatar to surface unread alert counts or a plan tier signal. The inline badge-on-menu-item mechanic (e.g. showing the firm's plan or the user's role) next to "Subscription" or "Settings" is directly reusable in the user-account popover. The separator before Sign Out is already good practice worth enforcing.  
  · _App shell — user avatar + account popover_
- **img-199** `…29168795` · _empty-onboarding_  
  Multi-step onboarding form with a progress indicator rendered as five short horizontal bars (filled/unfilled) under the heading — two darkened bars showing current step out of five — alongside a chip-selection grid for categorical input (tiles with a label, no icon, auto-wrapping) and standard dropdowns for scalar choices. A secondary panel ghost-visible behind the form shows the product workspace pre-loaded.  
  → DueDateHQ's onboarding flow (first-run, currently proposal A) could use the horizontal-bar step indicator instead of numbered steps or a progress ring — it is compact, progress is immediately scannable, and it fits the flat/restrained design system. The chip-selection grid pattern is relevant if a future onboarding step asks the firm to select their practice areas or entity types served.  
  · _/onboarding — multi-step setup flow step indicator_

### Low — tangential / style-only · 26

- **img-001** `…26900201` · _illustration-texture_  
  Three-column kanban board rendered as a bold black-and-white spot illustration, with filled black rectangles as action items and small card thumbnails with squiggle-line content — columns are separated by full-height vertical rules, a pinned item sits at top-left of column 1, and a status pill (filled black, round-rect) appears mid-column 2.  
  → Could inform the illustration style for the /today first-run empty state (onboarding proposal A). The three-column layout and the filled pill echoes the /today priority grid's column structure. Most actionable detail: the column-divider rule + pinned-item treatment could map to a 'Today / This Week / Overdue' scan zone header.  
  · _/today empty state / onboarding_
- **img-004** `…26900778` · _illustration-texture_  
  A pair of blue-filled legs protruding from a pile of documents — the blue is a single flat accent color (similar to a brand blue) used as the ONLY chromatic element against a black-and-white illustration; a stipple/halftone ground shadow adds depth without a second color.  
  → The two-color restraint mechanic (one accent color + black-and-white line) is directly applicable to DueDateHQ's brand illustration system if one is built. The brand navy #2E368C or cyan #14C5F6 could play the same accent role. Most useful for the /login or marketing landing page hero illustration if a consistent spot-art style is ever locked down.  
  · _/login illustration / marketing landing_
- **img-007** `…26900825` · _illustration-texture_  
  Two figures working across a shared conveyor-belt or table with six equally-spaced bordered boxes in a row along the bottom — each box has a small dot beneath it suggesting a step indicator; one figure holds a triangular pointer item, the other a rounded dark object, implying handoff between two people at distinct stages.  
  → The six-box row with dot indicators directly echoes DueDateHQ's 6-stage workflow (not*started → waiting_on_client → blocked → in_review → filed → completed). The mechanic of equal-width slots with a sub-dot pager maps to the workflow strip on /deadlines detail — however the design system canon explicitly uses ASYMMETRIC stage widths (active ~40-50%, inactive ~10%), so this equal-weight layout is a counterexample to study, not adopt.  
  · */deadlines detail workflow strip\_
- **img-011** `…26900954` · _illustration-texture_  
  Desktop monitor covered in dozens of pink sticky notes arranged in loose columns — the sticky notes are uniform size small squares, warm pink fill, black outline, layered in overlapping stacks; a knocked-over office chair below implies abandonment. The warm cream/blush background tint (distinct from white) sets the scene apart from a pure white canvas.  
  → The 'notification overload' metaphor is directly on-brand for DueDateHQ's value proposition (replace sticky-note chaos with structured tracking). Most craftable detail: the pink sticky-note grid, rendered in a disciplined uniform size with subtle overlap, could inspire an unread-alert badge cluster or a notification digest card layout. A CountPill stack or grouped alert badge using a warm tint (not the current cyan) would echo this without copying the illustration.  
  · _/today alert cards — unread badge cluster or notification digest header_
- **img-015** `…26901084` · _illustration-texture_  
  Color-coded folder tabs (pink, tan, blue) stacked in a white archive box with a teal side panel. The label underneath uses a mixed-weight serif/italic typographic treatment: 'Archived' in roman, 'files' in italic.  
  → The mixed roman + italic label style (one word roman, one word italic) is a typographic micro-detail applicable to empty-state labels on the /deadlines Record tab or the completed/filed state on the obligation detail page — e.g., 'No filed documents' with 'filed' in italic for semantic emphasis without weight change.  
  · _/deadlines Record tab empty state label_
- **img-031** `…28945995` · _illustration-texture_  
  Rough pencil-sketch paper-airplane icon with visible construction lines and a tiny human figure as the pilot, giving a hand-drawn, lo-fi quality. The sketch registers as 'work in motion / submitted' without any color.  
  → Could serve as an empty-state or 'filed' micro-illustration for the /deadlines detail Status tab when an obligation is in the 'filed' stage. The paper-airplane = submission metaphor is semantically apt. Sketchy style would need to be reconciled with DDHQ's cleaner line-art direction — treat as a mood input, not a direct asset.
- **img-039** `…29115958` · _illustration-texture_  
  Four equal-width feature cards on a white background, each with a tinted square illustration zone (light gray fill, no border) containing a centered icon or UI snapshot, followed by a bold title and a two-line muted description below the card boundary. The illustration tiles use different pastel-tinted icon treatments — flat line icon in a white inner card, a sparkle mark, a photo-composite with avatar, and a salmon-tinted progress ring.  
  → The tinted square illustration zone with a centered icon is a pattern for onboarding empty-state cards on /today — the first-run empty state (Proposal A) currently uses text-only prompts; these tinted icon tiles would give each empty-state bucket a clear visual anchor without adding real imagery. Low direct reuse since DDHQ avoids illustration, but the salmon progress ring tile directly echoes the StatusRing pattern.  
  · _/today first-run empty state (onboarding Proposal A)_
- **img-050** `…29116219` · _illustration-texture_  
  Globe wireframe with floating data-node dots as a hero illustration — thin-line grid sphere with sparse accent-colored points and a highlighted rectangular selection region overlaid. The supporting section uses isometric diamond tiles as a background texture for feature cards.  
  → No direct UI surface match. Mood/illustration reference for a marketing landing page hero, not applicable to the dense B2B app surfaces. The /sources health page or a future marketing page could borrow the globe motif for 'monitoring authorities worldwide', but it is primarily branding.
- **img-051** `…29116227` · _layout_  
  Split hero card: left half is white with copy and CTA; right half embeds a floating phone mockup on a soft gradient background that bleeds to the card edge — the phone is cropped slightly so it reads as 'inside' the card rather than floating above it.  
  → No direct surface match — DueDateHQ is a web-first desktop product and does not have a mobile app preview to show. This is a consumer SaaS marketing pattern. Could loosely inform the /login marketing panel layout if a split-panel hero is added, but the concept does not transfer as a craftable UI component.
- **img-059** `…29139824` · _component_  
  Integration-connection card: two app logo tiles arranged in a partially-overlapping grid on a hatched/crosshatch texture background, with a dismiss X in the top-right. Below: a title and one-line description, no action button — the card functions as a dismissible contextual upsell that lives inline in a list, not as a modal.  
  → Could inform an inline dismissible upsell or prompt card in the /today dashboard — for example, a 'Connect your first source' card that appears inline in the alert feed when no sources are configured. The dismiss X + hatched background texture makes the card visually distinct from real data rows without being intrusive.  
  · _/today — inline upsell/prompt card for empty-sources state_
- **img-064** `…29139907` · _layout_  
  A three-panel marketing feature walkthrough where each panel is a rounded card with a blurred/gradient tinted background containing a small UI screenshot inset at center. The panels are equal width, each with a bold label and two-line description below the card. The middle panel has an elevated white inset card showing a stat row (label + large number) — effectively a mini StatBand inside the marketing tile.  
  → No direct UI application. This is a marketing/landing-page layout pattern (feature highlight trio). DueDateHQ has a docs/marketing/ directory for the landing page, but the gradient-blurred card treatment is inconsistent with the product's flat-border design system. The mini stat row inside the card is too decorative for the product itself.
- **img-076** `…29140031` · _component_  
  A popover/dropdown triggered from a toolbar button that contains a labeled slider control ('Intensity') with Low/High endpoint labels and a tick-mark track. The control is isolated inside a bordered floating card that appears anchored below the triggering pill button, with the active numeric value shown in the trigger itself.  
  → Not a strong fit for DueDateHQ's surfaces. The closest candidate would be a confidence or priority threshold filter in /alerts or /deadlines toolbar (FilterTrigger pill showing the current value, opening a popover with a range slider). However, DueDateHQ's filter model uses discrete categorical options, not continuous ranges, so the slider mechanic has limited direct use.
- **img-092** `…29140171` · _component_  
  A sidebar upgrade-to-pro card with a dismissible X, a headline with an inline discount badge ('20% OFF' in a small outlined pill), a two-line feature description, and a full-width dark CTA button. Below it, a user-account row with avatar, name, and email. The account switcher popover shows avatars with a radio-button selection indicator on the selected user, and a grouped settings section below a hairline rule.  
  → The inline discount/tier badge next to a headline is a low-priority pattern with no direct DDHQ application (no pricing tiers exposed in the current early-access no-pricing launch). The account-switcher popover with radio selection and grouped sections could inform a future multi-firm account switcher. Not applicable to current surfaces.
- **img-095** `…29140192` · _data-viz_  
  A side-by-side pairing of a dark stat card (large percentage with an arrow delta and horizontal bar-chart rows) with a light calendar grid where dates carrying events are bolded, the 'today' date has a teal filled circle, and a selected date has a muted purple filled circle — two distinct selection states on the same calendar using different fill colors.  
  → The dual-state calendar encoding (today=filled teal circle, selected=muted purple circle, event=bold numeral) is applicable if DDHQ ever adds a calendar view to /deadlines — using navy for the selected date, cyan for today, and bold weight for dates with filing obligations. The dark stat card aesthetic doesn't fit DDHQ's light DS. The calendar grid pattern alone is the extractable detail.  
  · _/deadlines calendar view (future) — dual-state date encoding_
- **img-104** `…29140342` · _navigation_  
  Sidebar nav list where a section item (Projects) has an inline expand chevron on the left and a '+' add action on the right edge of the same row, both in the same row without extra padding. Child items indent with a color dot (12px circle) as the sole differentiator. The active child uses bold weight. A secondary count label (e.g. '23 Files', '4 NEW' in orange accent) sits right-aligned on parent items.  
  → DueDateHQ's left sidebar if client groups or obligation-type categories are ever collapsible. The inline chevron + right-edge add action pattern is clean for a 'Clients' section with expandable firm groups. The colored dot per child maps to per-client color coding if introduced.  
  · _Left sidebar rail — collapsible section with child items_
- **img-105** `…29140346` · _component_  
  Settings list card where each row has: a lucide-style icon left, a bold title + muted subtitle as a two-line stack, and a toggle switch right-aligned. Two rows inline a soft salmon/orange pill badge ('Pro Feature') immediately after the title text — the badge has a small icon inside it and rounded-999 shape — to gate locked features visually without hiding the row or disabling the toggle entirely.  
  → Future plan-gating in DueDateHQ (e.g. gating auto-apply or bulk-accept on a higher plan tier). The inline 'Pro Feature' pill next to a setting label — keeping the row visible but marking it as upgrade-required — is a clean upsell pattern that fits the /rules or /sources settings panels.  
  · _/rules or /sources settings panel — plan-gated feature rows_
- **img-106** `…29140355` · _illustration-texture_  
  Marketing landing page with a two-column feature grid: each feature cell contains a tinted card with a partial screenshot of the actual product UI (not an icon or illustration), placed at an angle or cropped at the card edge, alongside a short bold title + one-sentence body. Below the grid, three icon+title+body feature callouts use a neon-yellow circular icon container on a white background.  
  → docs/marketing landing page (docs/marketing/design-explorations/). The pattern of embedded product screenshots inside feature cards rather than abstract illustrations is more honest for a B2B tool and maps to the 'no fiction on canvas' principle. Not applicable to app UI surfaces.
- **img-117** `…29164892` · _layout_  
  A two-panel analytics UI with a persistent left nav (icon + label, active item highlighted with a filled rounded rect) and a right content area containing a page title, subtitle, a full-width search input with an 'Advanced search' secondary action inline at the right edge, and a data table with colored avatar dots as row-level status indicators.  
  → DueDateHQ's global left-rail nav + /clients list search bar — the inline 'Advanced search' action at the right edge of the search bar maps to the CollapsibleSearch + FilterTrigger pattern. The colored avatar dot as a row-level indicator maps to AssigneeAvatar or status dot in /clients rows.  
  · _Global left-rail nav + /clients list search/filter toolbar_
- **img-132** `…29164975` · _navigation_  
  A workspace/location switcher dropdown rendered as a floating panel: a trigger row at top shows current selection with a logo avatar + name + chevron. Below, a grouped list of locations each with a distinct colorful abstract avatar (yellow, green, purple), primary name, secondary address line, and either a keyboard shortcut badge or a checkmark for the active item. Below a hairline, utility actions (Add a site, External connections, Settings, Help & Feedback) each with an icon and some with keyboard shortcuts right-aligned.  
  → No direct UI surface need in DueDateHQ today. The multi-location switcher mechanic is firm/branch switching for a multi-office accounting firm, which is a future feature not yet in scope. The avatar + name + address secondary line pattern could inform client-switcher or entity-switcher UI if that feature is built. Not relevant to current surfaces.
- **img-154** `…29166001` · _component_  
  Dark-mode tooltip bubbles (dark navy rounded-rect with a speech-bubble tail) that contain an explanatory sentence plus an embedded CTA button (a lighter-dark pill with an external-link icon). A floating blue circle '?' icon serves as the trigger. The bubbles have no close button — they are contextual, triggered by the '?' affordance, and can contain a secondary action.  
  → Onboarding first-run /today empty state and the /rules accept/reject review modal. The '?' trigger + dark bubble + embedded CTA pattern could be used for contextual help in the rule-library (explaining what a rule trigger does) or in the workflow status card (explaining what 'waiting*on_client' means). However, DueDateHQ's design system uses flat cards and avoids dark overlays except for modals — this would need significant tonal adaptation.  
  · */rules review modal contextual help / first-run onboarding overlays\_
- **img-156** `…29166006` · _component_  
  Rich tooltip / popover with a tinted preview panel (purple-tinted card showing an abstract mini-UI illustration of the feature) above a text description and a CTA button that includes a video duration inline ('Watch tutorial 6:30'). The popover is triggered by an icon button in a section header and anchors below it via a CSS arrow. The duration badge is inside the button itself (not a separate chip), making the time-investment legible at a glance.  
  → No strong surface match in DueDateHQ — the app is a professional B2B workbench for CPAs, not a product with tutorial videos. The popover-with-preview pattern could loosely apply to onboarding empty states (first-run /today), but the video-duration CTA and illustrated preview panel are too consumer/marketing-oriented for the current design language. The icon-button-triggering-a-rich-popover mechanic has minor relevance for contextual help but would need to be stripped down significantly.
- **img-167** `…29166391` · _component_  
  Content card on a dark surface: a stacked avatar pair (square app-icon overlapping a circular person photo, both ~40px) in the top-left, a circular arrow-icon button in the top-right as the primary CTA, a large body-text quote in the card's main area, and a muted attribution line below the quote at a smaller weight.  
  → Not a direct match for DDHQ. The pattern is a content/media card for quote or article teasers. The closest analog would be the daily brief section on /today, but DDHQ's brief is a list of items not a single content card. The stacked avatar overlap pattern is the only borrowable detail — could apply to the AssigneeAvatar group in the obligation header (primary assignee + reviewer overlapping).  
  · _/deadlines/[id] — Status tab assignee avatar overlap display_
- **img-180** `…29167020` · _component_  
  A dark-fill tooltip card anchored below a label via a top-pointing triangle arrow, with a white inner content area and a dark footer band containing descriptive helper text in white — creating a two-zone tooltip: content zone (white) + explanation zone (dark).  
  → Not directly applicable. DueDateHQ's design system uses standard tooltips for icon affordances, and the two-zone tooltip structure shown here is more suited to a rich contextual popover (e.g., explaining what 'Reviewable' means on a rules-library card). Could inform a future help-tooltip on the /rules review modal for terms like 'confidence score' or 'source health' — but this is a niche pattern with low urgency.  
  · _/rules review modal — confidence score tooltip_
- **img-183** `…29167128` · _navigation_  
  A compact segmented control (Local / Regional / Global) rendered as small pill-shaped tabs with a single selected state (filled background, no border change), positioned inline at page center above hero copy. The control is minimal — no icons, very small text, tight padding — functioning as a scope filter.  
  → The /deadlines scope selector (client scope: Mine / Team / All) or the /sources authority-tier filter already uses a Segmented primitive per the CollapsibleSearch + scope-by-count canon. This image confirms the correct minimal pill-tab treatment for that component — small text, one filled active pill, no border ring on inactive items. No net-new surface needed, but validates the existing primitive spec.  
  · _/deadlines scope Segmented control, /sources tier filter_
- **img-194** `…29168742` · _data-viz_  
  Stacked-card widget (three cards fanned behind the front card) showing a weekly activity summary where inline directional arrows (up/down) are embedded directly into large prose-style numbers — the metric value and its trend signal share the same typographic line without a separate row or badge.  
  → The /today dashboard's StatBand or the daily-brief section could adopt the inline trend-arrow-within-text mechanic for key weekly summary numbers (e.g. "12 obligations filed this week, 3 overdue") — more readable than a separate delta chip below each stat. The stacked-card visual is too consumer-app-playful for DueDateHQ's professional tone.  
  · _/today — StatBand or daily brief summary_
- **img-197** `…29168789` · _illustration-texture_  
  Full-bleed white loading/transition screen with a single centered composition: a cartoon mascot icon orbited by six small colorful feature icons arranged in a loose radial cluster, with a two-line heading below and a pulsing dot + muted caption as the progress indicator.  
  → The DueDateHQ first-run / sample-data loading state (onboarding proposal A) could use a radial-orbit icon cluster around the brand mark to communicate that the system is pulling in sources and rules — more informative than a bare spinner. However, the playful cartoon mascot aesthetic is too consumer-app for a CPA-firm B2B product. Only the radial-cluster structural mechanic is relevant, not the illustration style.  
  · _/onboarding — sample-data loading / first-run empty state_

### None — no UI mechanic (mood, illustration, photography) · 40

- **img-002** `…26900734` · _illustration-texture_  
  Single-character spot illustration of a multitasking figure with four arms holding laptop, phone, box, and envelope simultaneously — thick 2px outline, solid black fills for hair/device, pure white background, no color.  
  → Pure editorial illustration — no UI pattern or layout mechanic to extract. Could be used as a marketing/onboarding empty-state spot (the 'before DueDateHQ' pain state), but the style is not consistent with the brand's existing illustration vocabulary and contains no craftable component detail.
- **img-003** `…26900769` · _illustration-texture_  
  Overhead-view spot illustration of a figure surrounded by an orbit of flying documents — concentric dashed ellipses create a swirl/tornado metaphor; documents vary in size with light gray shadow fills to suggest depth in 2D.  
  → Editorial illustration only — no UI mechanic. Thematically resonates with DueDateHQ's 'overwhelmed CPA' pain point and could work as a landing-page or onboarding illustration, but carries no craftable component or layout pattern.
- **img-005** `…26900796` · _illustration-texture_  
  Continuous single-line-weight drawing of a person working on a laptop surrounded by flying paper planes and documents — the entire illustration is one consistent hairline stroke with zero fills, giving it an airy, unfinished quality distinct from the bolder filled-shape style of the other images.  
  → Editorial illustration only — no UI mechanic. The single-line style is a distinct illustration mode that contrasts with the bolder filled-shape approach of imgs 001/002/004. No craftable component detail.
- **img-006** `…26900817` · _illustration-texture_  
  Portrait-format character portrait: a face with round glasses, high-contrast solid black hair mass, and a subtle halftone dot texture on the forehead bandage — the halftone is used as a single mid-tone technique without adding a gray swatch, keeping the palette to black/white/pattern.  
  → No UI pattern. This appears to be a designer self-portrait or avatar illustration. The halftone-as-midtone technique could inform an avatar/placeholder treatment in AssigneeAvatar when no photo is present, but it is too stylized to directly apply.
- **img-008** `…26900829` · _illustration-texture_  
  Figure slumped face-down over a laptop with head buried — a single flat yellow accent used on chair back, laptop border, and coffee cup, identical two-color restraint to img-004; the yellow reads as a warning/fatigue signal color.  
  → Editorial illustration only. Thematically the 'before' pain state. The two-color accent mechanic is the same pattern noted in img-004 (one brand hue + black-and-white). No new craftable UI detail beyond what img-004 already contributed.
- **img-010** `…26900916` · _illustration-texture_  
  A tiny figure pinned beneath a massive stack of layered sheets — each sheet is drawn as a thin horizontal rectangle with parallel lines inside; the stack is built from ~14 identical layers with slight offsets, communicating volume through repetition of a single unit rather than perspective or shadow.  
  → Editorial illustration only. No UI pattern. The 'buried under paperwork' metaphor resonates with the product's pain-state messaging but offers no craftable component mechanic.
- **img-012** `…26900958` · _illustration-texture_  
  Monitor covered wall-to-wall with cream/off-white sticky notes of varying sizes — all the same warm cream fill, black outline, no color differentiation between notes; caption 'TO-DAY LIST' set in a rounded mono/casual typeface above. The notes vary subtly in rotation (±3–5 degrees) and overlap, creating density without color coding.  
  → Thematically exact: the problem DueDateHQ's /today surface solves. The caption 'TO-DAY LIST' is directly analogous to the /today route. No craftable UI component mechanic — it is a visual joke, not a layout pattern. Could be used verbatim as a marketing/landing-page pain-state illustration.
- **img-013** `…26901059` · _illustration-texture_  
  Flat black-and-white ink illustration using a single expressive line weight with no fill — character half-submerged under a laptop lid with a stack of coffee cups. The visual grammar is sparse negative space + one focal object cluster.  
  → No direct UI component mapping. Illustration style could inform empty-state or onboarding spot illustrations (e.g., the /today first-run empty state), but the specific gag (person hiding under laptop) does not map to any DueDateHQ surface or real need.
- **img-014** `…26901069` · _illustration-texture_  
  Cartoon figure holding an extremely long to-do list that unrolls to the floor, drawn in loose brush-pen style with bullet dots rendered as filled circles at consistent intervals down the scroll.  
  → The bullet-dot rhythm loosely echoes the /deadlines dense table rows, but this is a mood illustration with no craftable UI mechanic. The 'overwhelming list' gag is thematically resonant with the product problem but offers nothing to build.
- **img-016** `…26901521` · _illustration-texture_  
  Person lying flat across a towering stack of horizontally-ruled paper sheets, pen dropped, paper labeled 'FIN'. The stack uses dense parallel horizontal lines to convey volume and texture — a visual shorthand for bureaucratic paperwork quantity.  
  → No craftable UI detail. Thematic illustration about paperwork exhaustion — fits the product narrative but offers nothing buildable for DueDateHQ's surfaces.
- **img-017** `…26901535` · _illustration-texture_  
  Businessperson running horizontally with folders and loose papers flying around them in motion, drawn with speed lines radiating from objects. The composition conveys urgency through asymmetric scatter rather than symmetry.  
  → No craftable UI detail. Mood/narrative illustration for the 'chaos before DueDateHQ' marketing story. Could be a before/after hero image in docs/marketing/ but contributes no UI pattern.
- **img-018** `…26901553` · _illustration-texture_  
  Isometric pocket watch viewed from a three-quarter top angle, with a tiny silhouetted businessman running beneath it being chased. Caption 'AROUND THE CLOCK' in spaced uppercase sans-serif below. The isometric projection of a round object (watch face) is the visual trick.  
  → The 'around the clock' theme is directly on-brand for DueDateHQ's 24/7 monitoring pitch in docs/marketing/. The caption typographic treatment — all-caps, letter-spaced, small — is already close to DueDateHQ's sentence-case StatBand labels. No new UI mechanic to extract.
- **img-019** `…26901556` · _illustration-texture_  
  Three wristwatches worn stacked on one wrist, each showing a slightly different time, drawn in loose ink with thick bezels. The visual conceit is multiple simultaneous time-references on a single surface.  
  → Thematically resonant with tracking multiple client deadlines simultaneously — but this is a gag illustration with no UI mechanic. Could inspire a 'multi-deadline clock' spot illustration for an empty state, but offers nothing directly craftable for a component or layout pattern.
- **img-020** `…26901563` · _illustration-texture_  
  Person draped over the top rim of an oversized alarm clock in striped pajamas, clock face showing numbers 8–12 on the visible arc. The thick salmon/orange ring of the clock creates a strong circular framing device with the figure as a decorative overlay.  
  → The circular ring as a framing device with content overlaid on its edge is conceptually related to the StatusRing progress ring component — but this is an illustration, not a UI pattern, and DueDateHQ's StatusRing is already implemented. No new detail to extract.
- **img-021** `…26901593` · _illustration-texture_  
  Three figures emerging from separate device frames (laptop, tablet, video-call window) passing a document between them, with a single blue triangle shape used as a spot-color accent against an otherwise black-and-white drawing. The one-color accent (blue triangle as an 'upload/send' metaphor) is the only chromatic element.  
  → The one-spot-color-on-monochrome technique has a weak analog in DueDateHQ's two-color rule (navy + cyan accent on neutral surfaces), but this is an illustration style choice, not a UI component. No craftable pattern for a specific surface.
- **img-023** `…26901737` · _illustration-texture_  
  Figure buried under overlapping sticky notes of uniform size on a cream background, with 'KEEP' and 'CALM' split above and below the figure in spaced uppercase black sans-serif. Two words separated by the central illustration act as a compositional sandwich.  
  → No craftable UI detail. The 'buried in sticky notes' gag is thematically aligned with the product problem but offers nothing buildable. The split-text-around-illustration layout is a poster convention irrelevant to DueDateHQ's surfaces.
- **img-024** `…26901740` · _illustration-texture_  
  Desk calendar (spiral-bound flip calendar) shown in three-quarter perspective with a full month grid of handwritten numerals, a tiny figure in red-check pajamas walking into the calendar as if it were a doorway. The calendar grid uses a thin-border cell structure with no fill on most days.  
  → No craftable UI mechanic. The calendar grid is a familiar form, but DueDateHQ does not currently use a calendar view — it uses a deadline table. The 'walking into the calendar' gag is a mood/narrative piece for marketing use at most.
- **img-025** `…26901764` · _illustration-texture_  
  Minimal line-art illustration with a single high-contrast focal element (the dark pencil tip) on a warm off-white field. The image uses pure geometric outlines with no fill, reserving the only solid fill for the climactic point — a compositional technique that draws the eye without color.  
  → Too abstract/conceptual for direct UI application. Could inform the empty-state illustration style for /today first-run (onboarding proposal A) — line-art figures on a warm bg with one solid-black accent shape — but this is a mood reference, not a craftable UI pattern.
- **img-026** `…27422578` · _illustration-texture_  
  Black-and-white editorial illustration using flat dot-stipple shading (halftone texture) alongside pure line art. Multiple overlapping arms form a radial composition, communicating 'many hands on many documents simultaneously' without color.  
  → Mood/editorial illustration with no direct UI mechanics. Could be adapted as an empty-state or marketing spot illustration for /clients (many clients, many obligations) but offers no craftable component pattern for the app surfaces.
- **img-028** `…28945938` · _illustration-texture_  
  Abstract tangle of thick overlapping loop strokes rendered as a single continuous line with varying density toward the center. No color, no fill — pure gesture drawing communicating chaos or complexity.  
  → Abstract illustration with no craftable UI pattern. Mood reference only — not applicable to any DDHQ surface.
- **img-029** `…28945966` · _illustration-texture_  
  Abstract tangle of thin hairline overlapping ellipse strokes forming a loose oval form. The hairline weight (much thinner than img-028) creates a delicate, airy 'noise' texture rather than solid chaos. No fill, no color.  
  → Abstract illustration with no craftable UI pattern. Mood reference only — not applicable to any DDHQ surface.
- **img-032** `…28946009` · _illustration-texture_  
  Loose brush-drawn cartoon figure with motion lines (speed dashes) radiating around it, conveying urgency or surprise. The marks are extremely gestural — thick irregular strokes, filled shapes with no outline consistency.  
  → Abstract/expressive illustration style with no craftable UI pattern. Mood reference only — not applicable to any DDHQ surface.
- **img-033** `…29114327` · _illustration-texture_  
  Two mugs shown in slight isometric perspective with speech-bubble shapes used as the liquid surface inside each cup — a visual pun merging 'conversation' with 'coffee'. Simple gray fill for the liquid, thick outline, no additional color.  
  → Conceptual illustration with no direct UI mechanic applicable to DDHQ's professional B2B surfaces.
- **img-048** `…29116206` · _illustration-texture_  
  A minimal hero layout with a large serif/display typeface headline, a centered 3D-rendered envelope illustration as the primary visual, and an inline CTA row that pairs a borderless email text input with a pill-shaped dark button — both sit on the same horizontal baseline, sharing a single container height. A small social-proof line ('Join 2,500 Designers') with a group-avatar cluster sits directly below the CTA.  
  → This is a personal newsletter landing page with no direct UI pattern applicable to DDHQ's app surfaces. The inline input+button baseline pairing is already standard practice in the /login OTP flow. No net-new craftable detail relevant to the product.
- **img-062** `…29139889` · _layout_  
  A personal portfolio page with a two-column grid of service capability tiles, each tile using a small outlined icon at top-left followed by a bold category label and a two-line description in muted text below. The icon and label sit on the same baseline, tightly coupled. The overall layout uses a left rail for nav links (Home, About, Projects, Resume) as plain text with the active item in bold, no background pill or indicator.  
  → No direct UI application for DueDateHQ. This is a personal portfolio / marketing page with no pattern applicable to the dense B2B SaaS surfaces (obligation tables, client detail, alert feed). The capability tile grid has no analog in the product.
- **img-068** `…29139930` · _data-viz_  
  An interactive slider calculator card: a labeled range slider with min/max endpoint labels, a live numeric readout right-aligned in the header (bolded current value + unit label), and a 2x2 grid of metric tiles below each showing an icon, large bold numeric value, and sentence-case label. Two CTA buttons (filled dark + outlined) sit below with a footnote row of three checkmark-plus-text trust signals.  
  → No direct UI application for DueDateHQ. The slider-as-calculator is a marketing/pricing page pattern. The metric tile grid resembles a StatBand but with icons, which conflicts with the DueDateHQ design system (StatBand uses sentence-case text labels, not icon+number tiles). No obligation/alert surface maps to this.
- **img-078** `…29140079` · _component_  
  Property inspector panel with stacked full-width rows: each row has a muted label on the left, a tinted input field that spans most of the row width, and a value or control on the right. A toggle switch row uses the same full-width container. The label text is uppercase, 11px, spaced — functioning as a section eyebrow without being a heading.  
  → Not a direct fit for DueDateHQ. This is a design tool's inspector panel. The row-label + right-aligned control pattern already exists in DueDateHQ's DetailSectionCard flat cards. No net-new mechanic over what's already in the DS.
- **img-084** `…29140113` · _other_  
  AI agent chat card with a two-section layout: top has a colored avatar blob + bold monospaced title + smaller body text; bottom is a dark pill-shaped audio-waveform player with a timestamp on the left, animated waveform in the center, and a + action button on the right end. The monospace title font signals 'system/AI voice' as distinct from normal UI copy.  
  → Not applicable to DueDateHQ. The audio waveform player and AI voice chat card pattern have no surface in a CPA deadline-tracking product. The monospace-for-AI-output convention could theoretically apply to the AI-read summary in an alert detail, but DueDateHQ already uses standard prose for that content and adding a monospace treatment would break the type restraint rules.
- **img-107** `…29140375` · _illustration-texture_  
  Marketing landing page using alternating left/right content+screenshot sections divided by a subtle dotted-line separator. Each section has a small dark pill label ('Content Radar') as an eyebrow above a large bold headline, followed by two icon+text feature callouts in a two-column sub-grid. The screenshot mockup is inset in a gray rounded container with no drop shadow.  
  → docs/marketing landing page. The pill eyebrow label + large headline + sub-feature grid structure is a common marketing pattern. No direct applicability to the DueDateHQ app UI surfaces.
- **img-138** `…29165132` · _other_  
  A marketing landing page hero with a two-tone headline (bold black line / muted gray second line) and four equal-width nav-card tiles with rounded borders, each containing a small stacked-images thumbnail in the upper portion and a text label below — functioning as visual navigation rather than feature callouts. Two CTA buttons (filled dark / outlined) sit below.  
  → No direct UI surface match — this is a marketing/portfolio landing page layout. The two-tone headline (active line / muted ghost line) is a typographic detail that could inform the DueDateHQ marketing page at docs/marketing/, but it has no application inside the app itself.
- **img-139** `…29165139` · _layout_  
  A marketing feature-section with three equal cards in a row: each card has a large rounded-corner UI screenshot or illustration in the upper half (serving as a visual proof point) and a bold two-line title + small body paragraph in the lower half, with no visible card borders — the card boundary is implied by the background tint difference between the illustration area and the text area.  
  → No direct in-app surface match. The illustration-over-text card structure could inform the DueDateHQ onboarding empty-state cards (Proposal A) where each action tile shows a miniature preview of the destination surface above a label, but this is a stretch. Primarily a marketing/landing component.
- **img-148** `…29165559` · _navigation_  
  Mega-menu dropdown panel with a screaming-caps section label ('FEATURES') in small muted tracking-wide text, followed by icon+title+subtitle rows. Each row uses a custom line-art isometric illustration (not a generic lucide icon) as the lead visual — roughly 40×40, grid-outlined, sitting flush to the label. The subtitle is one sentence of muted gray, weight-400.  
  → No direct surface match in DueDateHQ — this is a marketing/navigation mega-menu pattern for a product site. The closest use would be the /onboarding or empty-state first-run screens, but the isometric illustration style and mega-menu layout do not map to the professional dense B2B SaaS design system in use. Marking as none for UI surfaces.
- **img-163** `…29166231` · _micro-interaction_  
  Inline editable field displayed as a dashed-border rounded rect placeholder sitting directly inside a heading-scale sentence. The placeholder text is tinted in the brand accent color with a preceding dot-bullet, signaling 'click to fill' without a traditional input box. The surrounding static text remains at full heading weight.  
  → Not a strong match for DDHQ's surfaces. The pattern targets document/template authoring where users compose templated text. DDHQ surfaces are data-display and action-oriented, not text-composition. No direct application.
- **img-166** `…29166388` · _component_  
  Toggle switch where the thumb displays an icon (person with checkmark) rather than a plain circle, and the track uses a gradient fill (pink-to-purple) in the ON state. Paired with a pill-shaped secondary action button ('Assign') with a leading add-person icon. The icon-in-thumb gives the toggle semantic meaning beyond on/off.  
  → Not a strong match. DDHQ's design system uses a standard Switch primitive and the gradient/icon-thumb is decorative. The 'auto-apply' toggle on the /rules rule card is the closest functional analog but should remain a plain Switch per the restrained DS — gradient fills and icon thumbs would violate the professional-calm principle.
- **img-176** `…29166516` · _navigation_  
  A macOS-native account-switcher dropdown showing the current user (avatar + name + email) at top, then a 'Switch account' row with a submenu arrow that opens a second floating panel listing multiple accounts — each with avatar, name, and email on two lines — plus an 'Add another account' footer row.  
  → Not applicable to DueDateHQ's current surfaces. DueDateHQ uses a passwordless single-account login flow with no multi-account switching. This is an OS-native UI pattern that has no real analog in the product's current or planned surfaces.
- **img-184** `…29167134` · _illustration-texture_  
  A centered marketing hero using a sequence of three photographic plant illustrations at increasing scale to visualize a growth progression, paired with a single large serif heading and two centered body paragraphs. The illustration acts as a stage-progression metaphor with no UI chrome.  
  → No direct UI surface match. This is a marketing/branding page layout with illustrative growth metaphor — not applicable to any of DueDateHQ's dense data surfaces. The warm cream background and serif type are also at odds with the navy/cyan brand canon.
- **img-185** `…29167135` · _layout_  
  A split-panel marketing page: left panel is a cream/off-white editorial column with stacked avatar group (social proof) + large display type with inline underlined key terms + a pill CTA button. Right panel bleeds a full-height stylized 3D product screenshot. The split is approximately 35/65 with no gutter.  
  → No direct UI surface match. This is a marketing landing page layout. The underlined-keyword emphasis pattern could loosely inform copywriting on /login or the early-access landing page, but the split-bleed layout and 3D product render are consumer-facing marketing conventions that conflict with the B2B app's flat, restrained design system.
- **img-188** `…29168222` · _illustration-texture_  
  A marketing hero page using a symmetrical spoke diagram: a central dark pill label ('{automations}') with radiating connector lines to icon-badge nodes (third-party logos) arranged left and right. Soft blue radial blur patches sit in the background corners as ambient texture. No data or interactive UI is shown.  
  → No direct UI surface match. This is a marketing illustration pattern for showing integrations/connectivity. The spoke diagram is a consumer-marketing convention. DueDateHQ's /sources page lists monitored authorities as a registry table, not a visual network — grafting this pattern would add decoration without decision value.
- **img-195** `…29168744` · _component_  
  Share/invite modal with two distinct zones separated by a dashed rule: (1) a link-sharing row with an access-scope dropdown and a Copy button, and (2) an email-invite field with a tagged email chip (dismissible ×) + a role dropdown + a Send Invite CTA all inline. Project members list below with avatar + name + email secondary line + a role dropdown per row.  
  → Not directly applicable to DueDateHQ — the product does not have a per-record share-link or member-invite flow. If a future "share obligation with client" feature ships, the tagged-chip email input + role dropdown inline pattern (rather than separate rows) would be the mechanic to borrow. Not a current surface gap.
- **mp4-poster** `…29166410` · _component_  
  Compact share popover with a toggle row (globe icon + label + subtitle + toggle switch) for public link access, a read-only URL field with a copy icon, and below that an invite input with a user-add icon prefix and an inline dark CTA button — all within a single small card with no modal chrome, no header image, no divider.  
  → Not applicable to DueDateHQ's current surface set — there is no per-record public share link or email-invite flow. The compactness of the pattern (toggle + URL + invite in one card) would be relevant only if a "share obligation status with client" feature is built. Not a current gap.
