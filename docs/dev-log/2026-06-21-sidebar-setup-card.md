# Sidebar footer setup-progress card (2026-06-21)

Yuqi: keep the just-decluttered sidebar footer aesthetic, ADD a compact
setup card driven by REAL backend signals (no fiction), self-dismissing when
setup is complete.

## What shipped

**New `SidebarSetupCard`** (`apps/app/src/features/dashboard/sidebar-setup-card.tsx`)
— a ~220px-wide nudge for the sidebar footer. Anatomy: brand `DuotoneIcon`
(RocketIcon) + "Finish setup" title + a percent figure + a session-dismiss ✕,
then the brand `TickProgress` bar (20 ticks), a 2-row checklist, and one quiet
`variant="link"` CTA to the first incomplete step.

Two steps, both REAL signals:
- **Add your clients** — done when the firm has ≥1 client.
- **Activate filing rules** — done when active rule count > 0.

**Real backend wiring** — reuses the EXACT same oRPC queries the dashboard
route (`routes/dashboard.tsx`) uses for its own first-run gating, so this
shares the warmed react-query cache (no extra fetch when /today is open):
- `orpc.clients.listByFirm` with `input: { limit: 1 }` — the cheap client-count
  probe (`.length > 0` ⇒ hasClients).
- `orpc.rules.coverage` with `input: undefined` — summing `activeRuleCount`
  across coverage rows (`> 0` ⇒ hasRules). No hardcoded/mock counts anywhere.

**Self-hide behavior** (renders nothing when):
- both steps done (a set-up firm sees no chrome),
- either probe is still pending (no flash of a wrong tick count),
- the icon rail is collapsed (`group-data-[collapsed=true]/sidebar:hidden` —
  the 220px card has no compact form, so it steps aside like
  `SidebarSystemStatus`'s caption),
- dismissed-for-session (`ddhq:sidebar:setup-dismissed` in localStorage; NOT a
  permanent dismissal — it returns next session if setup is still unfinished,
  and self-deletes for good once both signals go true).

**Footer wiring** (`components/patterns/app-shell-nav.tsx`): placed in the
muted footer `NavGroupSection`'s `footerSlot`, stacked ABOVE
`SidebarSystemStatus` (card = the only line that ever asks for an action; the
status caption stays passive below it).

## Canon adherence

- Radius: `rounded-xl` (12) wrapper; DuotoneIcon `sm` keeps its own scale.
- Shadows: none — border + `bg-background-section` does the lift.
- Motion: `animate-in` entrance + spinning next-step loader, both
  `motion-reduce:animate-none`.
- Tokens: semantic only (`text-text-secondary`/`-tertiary`/`-success`/`-accent`,
  `border-divider-regular`, `bg-background-section`, `bg-background-sidebar-hover`).
  No colored text on tinted surfaces (the tinted plane is the DuotoneIcon chip;
  the card body text is neutral).
- Primitives reused, not hand-rolled: `TickProgress`, `DuotoneIcon`, `Button`
  (link variant via `render={<Link/>}`), lucide `CircleCheckIcon`/`LoaderIcon`.

## i18n

3 new strings ("Setup progress", "Finish setup", "Dismiss setup nudge")
extracted + zh-CN added (设置进度 / 完成设置 / 关闭设置提示). The step labels
("Add your clients", "Activate filing rules") and the CTA ("Continue") already
existed from `SetupProgressCard`. `i18n:compile --strict` clean.

## Verify

- `tsgo --noEmit` → rc 0.
- `vp run @duedatehq/app#build` → success.
