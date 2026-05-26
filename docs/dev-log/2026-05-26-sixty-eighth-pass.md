# Sixty-eighth pass — sidebar mechanism + queue polish

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Re-architect the sidebar collapse mechanism per Yuqi's
constraint ("the ONLY time I want the sidebar to automatically
collapse is when we start the right panel open"). Plus four
queue-table cleanup items (#6, #7, batch action bar, scroll
behavior).

## 1. Sidebar collapse mechanism — auto-collapse only on right-panel open

### Before

`useSidebar()` exposed one `collapsed: boolean` + `toggleCollapsed()`.
Single source of state, persisted to localStorage. The sidebar
ignored route context — it stayed in whatever state the user last
clicked.

### After: two-source effective state

```ts
const collapsed = userCollapsed || autoCollapsed
```

- **`userCollapsed`** — the persisted preference. Changes ONLY when
  the user clicks the rail toggle. Survives reloads.
- **`autoCollapsed`** — transient programmatic state. Set by a
  route effect when a wide right panel opens. NEVER persisted.
  Resets on route unmount.

`setAutoCollapsed(next)` is exposed on the context for routes to
drive. The obligations route now does:

```tsx
useEffect(() => {
  setAutoCollapsed(activeDetailId !== null)
  return () => setAutoCollapsed(false)
}, [activeDetailId, setAutoCollapsed])
```

### User override during auto-collapse

If the user clicks the expand button while auto-collapsed, BOTH
flags flip to `false` for the rest of the panel session — so auto
doesn't immediately re-collapse on the next render. The user's
override wins. When the panel closes, `userCollapsed` (now
`false`) is the only source of truth, and the rail stays
expanded.

If the user later opens a different obligation row in the same
session, the auto-collapse fires again with the panel mount. If
they expand again, their override wins again. The model never
"remembers" a stale override against the user.

### What still does NOT auto-collapse

- Page navigation (e.g. /dashboard → /clients)
- Window resize
- Modal/drawer/sheet that ISN'T the wide right detail panel
- Mobile viewport switch (mobile owns its own sheet model)

The trigger is one specific shape — "a route is rendering a wide
fixed-width column to the right of its content area." Only
/deadlines wires it today; other panels (Pulse, Materials sheet)
don't carry it.

## 2. DueDaysPill — drop the Info icon, bigger gap (#6, #7)

The late-row pill rendered a leading `Info` icon next to the red
text. The icon was the third signal on the same axis (dot color +
text color + icon glyph), all saying "this is late." Dropped the
icon. Cell gap bumped `gap-1.5 → gap-2` so the dot + value have
the small breathing-room bump Yuqi flagged.

```diff
- {isLate ? <Info /> : <BadgeStatusDot tone={tone.dot} />}
+ <BadgeStatusDot tone={tone.dot} className={`size-1.5 ${tone.dotClassName ?? ''}`} />
```

The dot still carries red/amber/neutral tone per `dueDaysTone()`,
and the text color (`text-text-destructive` / `text-text-warning`
/ `text-text-primary`) reinforces.

## 3. Floating batch action bar — "can be more obvious"

The bar was white-on-white with a soft shadow — disappeared into
the page surface. Selected rows had to carry the entire "you're
in batch mode" affordance on their own.

Promoted to a dark inverted surface:

```diff
- 'bg-background-default border-divider-regular px-4 py-2.5
-  shadow-[0_12px_32px_-8px_rgb(0_0_0_/_0.18)] backdrop-blur-sm'
+ 'bg-text-primary text-text-inverted px-5 py-3
+  border-text-primary/40
+  shadow-[0_16px_48px_-12px_rgb(0_0_0_/_0.32)]
+  [&_button]:text-text-inverted
+  [&_button:hover:not(:disabled)]:bg-white/10'
```

Linear / GitHub / Notion pattern: dark batch-action bar over a
light table — the contrast IS the affordance ("you have a
temporary mode active"). Button children inherit
`text-text-inverted` so the existing `<Button variant="ghost">`
markup in the queue + rule library doesn't need rewriting; their
text inverts via the descendant selector.

Shape bumped one notch up: `px-4 py-2.5 bottom-10` → `px-5 py-3
bottom-12`, and shadow softer-but-larger (16px y-offset, 48px
blur, 32% black) so the bar reads as a deliberate floating
control instead of a tooltip-on-steroids.

## 4. Table scrollability ("not ideal")

The queue column carries `xl:overflow-y-auto [scrollbar-gutter:
stable]` plus `!activeDetailId && 'overflow-x-auto'`. With the
auto-collapse from §1, the sidebar now contributes 56px (vs 220px)
when the panel opens — net effect is the queue gets ~164px more
horizontal room. Combined with the existing `PANEL_OPEN_AUTO_
HIDDEN_COLUMN_IDS` (which trims out State / County / Assignee /
Evidence / Smart Priority when the panel is open), the table no
longer needs horizontal scroll under the panel-open layout at xl+.

No additional code change here — §1 is the structural fix that
removes the cause.

## 5. Sidebar-nav click absorbs the destination's auto-collapse

Refinement of §1 per Yuqi's follow-up ("when you click and change
the destination from a sidebar, the sidebar should keep
expanded"):

The previous shape worked for "stay on /deadlines and toggle the
panel," but failed the case of "navigate TO /deadlines via the
sidebar, with a row deep-linked in the URL" — the destination's
mount-effect immediately fired `setAutoCollapsed(true)` and the
sidebar collapsed before the user even saw the page.

New piece: `notifySidebarNavigation()` on the sidebar context. The
sidebar's NavLink `onClick` fires it. It:

1. Clears any standing `autoCollapsed` (sidebar visibly expands
   if it was auto-collapsed from a previous route).
2. Arms a one-shot `blockNextAutoCollapseRef`. The NEXT call to
   `setAutoCollapsed(true)` is silently absorbed; the ref clears.

So:

- /clients → click "Deadlines" in sidebar → /deadlines mounts with
  a deep-link row → mount-effect calls `setAutoCollapsed(true)` →
  absorbed → sidebar stays expanded.
- After landing, the user clicks ANOTHER row in the queue →
  `activeDetailId` changes → effect calls `setAutoCollapsed(true)`
  again → no block (already consumed) → sidebar auto-collapses
  normally.
- User clicks sidebar again → cycle repeats.

`setAutoCollapsed(false)` (panel close / route unmount) also
clears any pending block — no stale flags between sessions.

Mobile path untouched: `isMobile` short-circuits the collapse
logic, the Sheet drawer keeps its own model.

## 6. Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).
