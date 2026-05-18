---
version: alpha
name: DueDateHQ
description: Dense CPA compliance workbench for dollar-aware deadline triage with glass-box provenance.
colors:
  primary: '#0A2540'
  secondary: '#475569'
  tertiary: '#5B5BD6'
  neutral: '#FFFFFF'
  surface-canvas: '#FFFFFF'
  surface-panel: '#FAFAFA'
  surface-elevated: '#FFFFFF'
  surface-subtle: '#F4F4F5'
  border-default: '#E5E7EB'
  border-strong: '#D4D4D8'
  border-subtle: '#F1F5F9'
  text-primary: '#0A2540'
  text-secondary: '#475569'
  text-muted: '#94A3B8'
  text-disabled: '#CBD5E1'
  accent-default: '#5B5BD6'
  accent-hover: '#4F46E5'
  accent-active: '#4338CA'
  accent-text: '#4338CA'
  accent-tint: '#F1F1FD'
  severity-critical: '#DC2626'
  severity-critical-tint: '#FEF2F2'
  severity-critical-border: '#FCA5A5'
  severity-high: '#EA580C'
  severity-high-tint: '#FFF7ED'
  severity-high-border: '#FDBA74'
  severity-medium: '#CA8A04'
  severity-medium-tint: '#FEFCE8'
  severity-medium-border: '#FDE68A'
  severity-neutral: '#475569'
  severity-neutral-tint: '#F8FAFC'
  status-done: '#059669'
  status-draft: '#64748B'
  status-waiting: '#0284C7'
  status-review: '#7C3AED'
colorsDark:
  primary: 'rgba(255, 255, 255, 0.95)'
  secondary: 'rgba(255, 255, 255, 0.65)'
  tertiary: '#7C7BF5'
  neutral: '#0D0E11'
  surface-canvas: '#0D0E11'
  surface-panel: '#101217'
  surface-elevated: '#15171C'
  surface-subtle: '#1A1D23'
  border-default: 'rgba(255, 255, 255, 0.08)'
  border-strong: 'rgba(255, 255, 255, 0.14)'
  border-subtle: 'rgba(255, 255, 255, 0.04)'
  text-primary: 'rgba(255, 255, 255, 0.95)'
  text-secondary: 'rgba(255, 255, 255, 0.65)'
  text-muted: 'rgba(255, 255, 255, 0.45)'
  text-disabled: 'rgba(255, 255, 255, 0.25)'
  accent-default: '#7C7BF5'
  accent-hover: '#9391F8'
  accent-active: '#A5A4FA'
  accent-text: '#A5A4FA'
  accent-tint: 'rgba(124, 123, 245, 0.14)'
  severity-critical: '#EF4444'
  severity-critical-tint: 'rgba(239, 68, 68, 0.12)'
  severity-critical-border: 'rgba(239, 68, 68, 0.4)'
  severity-high: '#F97316'
  severity-high-tint: 'rgba(249, 115, 22, 0.12)'
  severity-high-border: 'rgba(249, 115, 22, 0.4)'
  severity-medium: '#EAB308'
  severity-medium-tint: 'rgba(234, 179, 8, 0.12)'
  severity-medium-border: 'rgba(234, 179, 8, 0.4)'
  severity-neutral: '#64748B'
  severity-neutral-tint: 'rgba(100, 116, 139, 0.08)'
  status-done: '#10B981'
  status-draft: '#94A3B8'
  status-waiting: '#38BDF8'
  status-review: '#A78BFA'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 54px
    fontWeight: 600
    lineHeight: 1.074
    letterSpacing: -0.02em
  display-large:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.167
    letterSpacing: -0.02em
  section-title:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.1875
    letterSpacing: -0.01em
  title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "'cv11', 'ss01'"
  button:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: 0px
  badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: 0px
  body-medium:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.08em
  hero-metric:
    fontFamily: Geist Mono
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.02em
    fontFeature: "'tnum'"
  numeric:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
    fontFeature: "'tnum'"
  numeric-small:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
    fontFeature: "'tnum'"
rounded:
  sm: 4px
  md: 6px
  lg: 12px
shadows:
  subtle: '0 2px 8px rgba(0, 0, 0, 0.04)'
  overlay: '0 8px 24px rgba(0, 0, 0, 0.08)'
spacing:
  0: 0px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 24px
  6: 32px
  8: 48px
  12: 80px
components:
  button-primary:
    backgroundColor: '{colors.accent-default}'
    textColor: '#FFFFFF'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  button-secondary:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '#FFFFFF'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  button-primary-active:
    backgroundColor: '{colors.accent-active}'
    textColor: '#FFFFFF'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  risk-row-critical:
    backgroundColor: '{colors.severity-critical-tint}'
    textColor: '{colors.text-primary}'
    height: 36px
  risk-row-critical-bar:
    backgroundColor: '{colors.severity-critical}'
    width: 2px
    height: 36px
  risk-row-critical-strong-bar:
    backgroundColor: '{colors.severity-critical-border}'
    width: 2px
    height: 36px
  risk-row-high:
    backgroundColor: '{colors.severity-high-tint}'
    textColor: '{colors.text-primary}'
    height: 36px
  risk-row-high-bar:
    backgroundColor: '{colors.severity-high}'
    width: 2px
    height: 36px
  risk-row-high-strong-bar:
    backgroundColor: '{colors.severity-high-border}'
    width: 2px
    height: 36px
  risk-row-upcoming:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    height: 36px
  risk-row-upcoming-bar:
    backgroundColor: '{colors.severity-medium}'
    width: 2px
    height: 36px
  risk-row-upcoming-strong-bar:
    backgroundColor: '{colors.severity-medium-border}'
    width: 2px
    height: 36px
  risk-row-neutral:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.severity-neutral}'
    height: 36px
  hero-metric:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.hero-metric}'
  pulse-banner:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
  filing-jurisdictions-panel:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    borderColor: '{colors.border-default}'
  evidence-chip:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
  command-palette:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.lg}'
    width: 560px
  sidebar:
    backgroundColor: '{colors.surface-panel}'
    textColor: '{colors.text-secondary}'
    width: 220px
  email-shell:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    width: 640px
  email-shell-footer:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.label}'
  badge:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.badge}'
    rounded: '{rounded.sm}'
    height: 20px
    padding: '0 8px'
  stepper:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  stepper-current:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.accent-default}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  stepper-error:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.severity-critical}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  confidence-badge:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  confidence-badge-high:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.accent-text}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  confidence-badge-med:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  confidence-badge-low:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  toast:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
  toast-info:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
  toast-warning:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
  status-pill-draft:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.status-draft}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  status-pill-review:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.status-review}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  hairline-default:
    backgroundColor: '{colors.border-default}'
    height: 1px
  hairline-strong:
    backgroundColor: '{colors.border-strong}'
    height: 1px
  hairline-subtle:
    backgroundColor: '{colors.border-subtle}'
    height: 1px
  status-done-dot:
    backgroundColor: '{colors.status-done}'
    rounded: '{rounded.sm}'
    width: 8px
    height: 8px
  status-waiting-dot:
    backgroundColor: '{colors.status-waiting}'
    rounded: '{rounded.sm}'
    width: 8px
    height: 8px
  muted-divider:
    backgroundColor: '{colors.text-muted}'
    height: 1px
  loading-skeleton:
    backgroundColor: '{colors.text-disabled}'
    rounded: '{rounded.sm}'
    height: 12px
    width: 100px
  field-disabled:
    backgroundColor: '{colors.surface-subtle}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
  brand-mark-primary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.primary}'
    typography: '{typography.title}'
  brand-mark-secondary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.secondary}'
    typography: '{typography.body}'
  brand-mark-tertiary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.tertiary}'
    typography: '{typography.body-medium}'
componentExtensions:
  toast:
    shadow: '{shadows.subtle}'
    variant:
      default: { timeoutMs: 3000, undoTimeoutMs: 500 }
      persistent: { timeoutMs: null, expiresUsing: 'serverReturnedRevertibleUntil' }
  toast-success:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.status-done}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
    note: 'Intentionally low contrast (3.77:1) — green text on white reads as success affirmation, not body content. Exempt from WCAG AA enforcement; therefore not in components: section.'
  stepper-completed:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.status-done}'
    typography: '{typography.label}'
    note: 'Same exemption as toast-success.'
  stepper-upcoming:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-muted}'
    typography: '{typography.label}'
    note: 'Muted-by-design label for un-reached step; intentional low contrast.'
  stepper-disabled:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-disabled}'
    typography: '{typography.label}'
    note: 'Disabled-by-design label; intentional low contrast.'
  email-shell:
    numericFontFamily: 'Geist Mono'
  status-pill-waiting:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.status-waiting}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
    note: 'Borderline contrast 3.91:1 — sky-600 on near-white. Tag pill, not body text; sufficient for short status word + dot indicator. Held in extensions instead of components: to avoid WCAG AA enforcement.'
motion:
  genesis-odometer:
    typography: '{typography.hero-metric}'
    color: '{colors.text-primary}'
    digitEase: 'cubic-bezier(0.4, 0, 0.2, 1)'
    reduceMotionFadeInMs: 200
  genesis-particle:
    size: 6px
    color: '{colors.accent-default}'
    trailAlpha: 0.1
    bezier: ['start', 'startPlus(0, -200)', 'endPlus(0, -100)', 'end']
  pulse-banner-breathing:
    durationMs: 3800
    ease: 'ease-in-out'
    backgroundTint: '{colors.severity-medium}'
    opacity: { idle: 0.12, peak: 0.46 }
    reduceMotion: 'Static background tint at 0.2 opacity.'
    note: 'Applies to active dashboard alerts, all-clear, and the top actionable Alerts history row; loading and non-actionable rows keep the dot heartbeat only.'
maxConcurrent: 30
---

# DueDateHQ Design System

## Overview

DueDateHQ uses a Ramp x Linear light workbench direction: precise, calm, dollar-aware, glass-box, and keyboard-first. The product is a CPA operational console, not a marketing site, financial app, or editorial surface.

The UI must prioritize dense scanning, clear risk hierarchy, and traceable evidence. Use semantic color only when it carries business meaning. Favor 1px hairlines, compact tables, and tabular numbers over decorative panels.

## Colors

The palette is semantic, not decorative. Navy is the authoritative text color, indigo is reserved for focus, selected navigation, and primary actions, and risk colors are the only intentionally saturated colors.

- Primary `#0A2540`: core headings, hero risk numbers, and client names.
- Secondary `#475569`: standard operational copy and table content.
- Tertiary `#5B5BD6`: CTA, focus, selected state, and active navigation.
- Neutral `#FFFFFF`: light workbench canvas.

Do not place raw color utilities in business components. Use semantic utilities such as `text-accent-default`, `bg-bg-panel`, `border-border-default`, and `text-severity-critical`.

## Typography

Inter is the UI font. Geist Mono is reserved for aligned operational data: amounts, days, dates, EINs, rule IDs, URLs, and source labels.

Default UI text is 13px. Metadata, table headers, and badges use 11px. Badges use Inter Medium. Page and drawer titles use 16px. The dashboard risk hero uses 56px Geist Mono with tabular numbers and tight letter spacing.

All numbers that need vertical comparison must use mono tabular numerals.

## Layout

The spacing scale is based on 4px. Dashboard and Obligations views are full-width work surfaces. Settings form pages stay around 880px max width, while Settings data surfaces such as Members and Billing use the 1172-1180px workbench width from Figma. The sidebar is 220px on desktop. Default right drawers are 400px; workflow drawers that contain tables, batch review, or evidence-heavy content may scale from 720px to 880px while remaining full-width on mobile. Modals are capped at 640px.

First screens must show useful work, not marketing chrome. Dashboard should reveal Pulse, the dollar risk hero, and at least eight customer rows. Obligations should reveal at least twelve rows.

## Elevation & Depth

Use borders before shadows. Cards are flat: elevated surface plus a 1px border, no shadow. Drawers, popovers, and tooltips may use the subtle shadow. Modals and command palette may use the overlay shadow.

Avoid nested cards and decorative depth. Depth exists to preserve focus and layering, not to create visual ornament.

## Shapes

Radii are intentionally restrained:

- 4px (`rounded.sm`) for chips, evidence chips, confidence badges, and other small inline tokens.
- 6px (`rounded.md`) for **buttons (shadcn `base-vega` primitive)**, inputs, cards, banners, dropdowns, toasts, and the pulse banner.
- 12px (`rounded.lg`) for drawers, modals, and the command palette only.

Do not use pill buttons, circular decorative controls, or radius above 12px. **Button radius / height / padding mirror shadcn `base-vega` defaults verbatim** (`rounded-md` 6px · `h-9` 36px · `px-2.5` 10px · `text-sm` 12px / 500) — the tokens in `components.button-{primary,secondary,primary-hover,primary-active}` document the runtime values produced by `pnpm dlx shadcn add`, so importing a fresh shadcn component requires zero manual patching. Non-shadcn business components (risk-row, evidence-chip, hero-metric, command-palette, sidebar, stepper, toast, confidence-badge, pulse-banner, genesis-, email-shell) keep DESIGN.md as the authoritative source.

## Components

Use shadcn Base UI `base-vega` primitives as the foundation. Project-specific components belong above them in this order: `routes -> features -> patterns -> primitives -> ui -> lib`.

Primary buttons use indigo and are reserved for the most important action on a surface. Risk rows encode severity with both label and color. Evidence chips are mandatory for AI output, rules, Pulse entries, and cited numeric claims. Command palette, drawer, and toast behavior must remain keyboard-friendly.

Clients `Fact profile` uses a `Filing jurisdictions` panel for multi-state client facts. The panel is
a compact bordered work surface, not a nested card: state chips show primary vs secondary filing
states, and the embedded table lists counties, tax types, and source/review status with 11-13px
workbench typography. The Clients table jurisdiction column should render the primary filing state
and first county, plus a `+N` suffix for additional active filing states.

The login surface treats SSO as the primary path: Google OAuth is the first visible action, Google One Tap may appear as browser-owned chrome, and Microsoft Entra ID appears when configured. Email OTP remains a compact fallback below a true split divider (`line / or / line`). The One Tap prompt must not displace the Google button, add an explanatory in-app panel, or introduce a second branded CTA; if Google does not display the prompt, the page remains visually identical and fully usable.

The command palette is the shadcn `Command` pattern backed by `cmdk`, not a hand-rolled button list. `@duedatehq/ui/components/ui/command` owns the accessible combobox/listbox behavior (ArrowUp/ArrowDown active item, Enter select, disabled item handling) while `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx` owns product entries and navigation. Use `disablePointerSelection` for the global palette so mouse hover does not steal the active item from keyboard users. Hover still needs a shallow visual affordance: mouse hover uses neutral `bg-background-subtle`, while the keyboard active item uses deeper `bg-state-base-hover`. Visual styling must use DueDateHQ semantic tokens only: `bg-components-panel-bg`, `border-components-panel-border`, `shadow-overlay`, `rounded-xl` (12px), `text-text-*`, `bg-background-subtle`, and `bg-state-base-hover`. Visible shortcut labels must come from the keyboard shell display helpers backed by TanStack `formatForDisplay` (`⌘K` on Apple platforms, `Ctrl+K` elsewhere); internal hotkey registration may continue to use `Mod+K`.

The app shell — sidebar + content inset — is **hand-rolled in `@duedatehq/ui`**, not the shadcn `Sidebar` registry component. The reasoning is that shadcn's primitive bundles three collapse modes (`offcanvas` / `icon` / `none`), a `SidebarRail`, cookie-based open state, `Cmd+B` global hotkey, and `floating` / `inset` chrome variants — none of which we use, because DESIGN §5.4 fixes the desktop sidebar at 220 px (no collapse) and our keyboard hotkeys are owned by the command palette (`⌘K`) and practice switcher (`⌘⇧O`). Importing 700+ lines of unused API surface plus the `bg-sidebar-foreground` token sprawl that shadcn assumes would only make later refactors louder. Instead, `apps/app/src/components/patterns/app-shell.tsx` composes thin semantic primitives from `@duedatehq/ui/components/ui/sidebar` (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuBadge`, `SidebarTrigger`) plus a `useIsMobile()` hook and the existing `@duedatehq/ui/components/ui/sheet` for the mobile drawer.

The shell is selectively chromed: the sidebar carries the practice switcher (Slack-style at the top — see deviation note below) plus a navy `brand-mark-primary` tile, three nav groups, a single `+ Import clients` ghost CTA above the user row, and a status dot folded into the user avatar. The practice switcher lists the authenticated user's active practices, supports plan-gated `Add practice`, switches `session.activeOrganizationId`, and registers `Mod+Shift+O` as a global shortcut through the app keyboard shell with registry metadata. `Add practice` opens creation while the current account/contract is within active practice entitlement; once Solo or Pro already has its included active practice, the same affordance opens a Billing / Contact sales gate instead of creating another included Solo practice workspace. Practice Profile and Members both use DueDateHQ gateway contracts over Better Auth identity primitives. Members is now an enabled Settings sub-route backed by `members.*`; it keeps Owner-only administration, seat usage, pending invitations, and audit-producing mutations in the product gateway. The Members invite trigger remains discoverable even when seats are full; the dialog explains the seat limit and disables only the final send action while the server keeps the seat limit enforcement. Its visible shortcut label is backed by a real route-scoped `Mod+I` hotkey registration and appears in the keyboard help surface via TanStack Hotkeys metadata. Admin now exposes enabled `Clients` and `Audit log` read/management surfaces. `Team workload` is a paid Operations surface: Solo sees a locked `Pro` hint, while Pro/Firm users open the shared deadline workload route. The route header carries a route-owned eyebrow + title on the left and AppShell-owned utility on the right (a `⌘K` keyboard hint and the global notifications bell — _not_ a per-route action cluster). The body is intentionally austere: a single Numeric/Small ownership tag in the top-left and the rest of the surface reserved for the route's `<Outlet />`.

Selected-nav visual is **bg-only, calm-lavender accent**: `bg-accent-tint` (the dedicated DESIGN.md `accent-tint` token — `#F1F1FD` light, 14 % indigo dark) + `text-primary` + Inter Semi Bold weight bump. **No** 2 px accent border (visual noise) and **no** `accent-text` label color (saturation creep). Hover stays neutral with `bg-background-default-hover` so hover ≠ selected; the lavender-tinted bg is reserved exclusively for the active route. This compromise honors DESIGN §1.2 ("color only serves risk") in spirit — the only way to read it stricter is to claim that wayfinding signals must be colorless, which would force pure-neutral `#F8FAFC` selected on `#FAFAFA` panel = a 1–2 % lightness diff that's visually invisible at every plausible viewport. The `accent-tint` token exists precisely to give selected state a calm-but-visible identity without summoning the saturated `accent-default` indigo (which stays reserved for CTAs, focus rings, and risk callouts). The `brand-mark-primary` token (navy, `colors.primary`) is the canonical fill for the practice avatar tile.

Practice switcher placement deviates from PRD §3.2.6 (which originally specified a top-right dropdown with `⌘⇧O`). The visible trigger lives at the top of the sidebar (Linear / Notion / Vercel pattern) so the practice identity is always-visible on a workbench surface rather than crammed alongside utility chrome. The `⌘⇧O` global hotkey is preserved and continues to open the practice picker popover; the visible top-right cluster is now reserved for the AppShell-owned notifications bell and the `⌘K` command-palette hint. See `docs/Design/DueDateHQ-DESIGN.md` §4.9 for the full sidebar spec, the `app-shell.tsx` pattern card, and the deviation rationale.

No provenance means no render. If an AI output lacks `source_url`, `verified_at`, and `verbatim_quote`, show a verification-needed state instead of a recommendation.

### Token segment index

front-matter 9 个顶层段：`colors / colorsDark / typography / rounded / shadows / spacing / components / componentExtensions / motion`。

- `colors` · Light 模式 35 个语义色，是 Figma Token Spec Sheet §01 Color 的权威源。
- `colorsDark` · 暗色镜像，键集合与 `colors` 同名；详细规则见 `docs/Design/DueDateHQ-DESIGN.md` §2.3。
- `typography` · 12 个 text style：3 档 display（`display-hero` 54 / `display-large` 36 / `section-title` 32，仅 marketing landing 使用，权威值与 Figma 同步）+ `title` 16 + `body` / `body-medium` 13 + `button` 12 + `badge` / `label` 11 + `hero-metric` 56 mono + `numeric` 13 mono + `numeric-small` 11 mono。
- `rounded` · 3 档圆角（`sm` 4 / `md` 6 / `lg` 12）；按钮走 `md`（6px）以匹配 shadcn `base-vega` 默认。
- `shadows` · 2 档（`subtle` Drawer/Popover/Tooltip · `overlay` Modal/Command Palette）；其余阴影一律禁止。
- `spacing` · 4px scale 9 档（0 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80）。
- `components` · **必须 `@google/design.md` spec compliant**：每个 entry 仅允许 `backgroundColor / textColor / typography / rounded / padding / size / height / width` 8 个标量属性；变体（hover / active / tone / state）拍平为独立 entry（如 `button-primary-hover`、`badge`、`risk-row-critical-bar`、`confidence-badge-high`、`toast-info`、`stepper-current`、`status-pill-draft`、`hairline-default`、`brand-mark-primary`）。
- `componentExtensions` · DueDateHQ 私有非 spec 字段：`toast.shadow`、`toast.variant.timeoutMs`、`email-shell.numericFontFamily`，以及 4 个故意低对比的 `toast-success / stepper-completed / stepper-upcoming / stepper-disabled` 状态实例（每条带 `note:` 解释豁免理由）。linter 不读这段。
- `motion` · 动效规格（`genesis-odometer` / `genesis-particle` 的 ease / bezier / 粒子参数）。非视觉 token，linter 不读。

### 校验

运行 `pnpm design:lint` 跑 `[@google/design.md](https://github.com/google-labs-code/design.md)` 官方 linter（broken-ref 错误、WCAG 4.5:1 对比度、orphaned-tokens、section-order 等 7 条规则）。`vite.config.ts` 的 `staged.DESIGN.md` 钩子在 commit 时自动跑（`npx --yes @google/design.md lint <path>`）。任何 PR 必须保持 **0 errors / 0 warnings**（当前基线即如此 + 1 info summary）。如果新增的 component 触发 contrast 警告，把它从 `components:` 段挪到 `componentExtensions:` 段并附 `note:` 解释豁免理由（见 `toast-success` / `stepper-completed` / `status-pill-waiting` 的写法）。

### Migration Copilot 向导扩展 token

Demo Sprint 期间新增的 Migration Copilot 相关 token 已追加到 front-matter `components:` 段；详细使用说明 + 可达性规格见 `docs/Design/DueDateHQ-DESIGN.md` §14 Migration Copilot 向导 与 `docs/product-design/migration-copilot/09-design-system-deltas.md`。

- `stepper` 系列 · 4 步向导步骤条；`stepper-current` / `stepper-error` 在 `components:`，`stepper-completed` / `stepper-upcoming` / `stepper-disabled` 因故意低对比放在 `componentExtensions:`；`Enter` 与数字键 1-4 **不**跳步。
- `confidence-badge` 系列 · 3 档置信度拍平为 `confidence-badge-high` / `-med` / `-low`（high ≥ 0.95 / med 0.80–0.94 / low < 0.80）；色系与 severity / status 解耦；**数据质量类 needs_review 走 `confidence-badge-low` 的黄色调，工作流 Review 走 `status-pill-review` 紫色调**（ADR 0011 Decision III 裁定）。
- `toast` 系列 · 3 tone 拍平为 `toast-info` / `toast-warning`（在 `components:`）+ `toast-success`（因绿字 + 白底低对比放在 `componentExtensions:`）；`toast.variant.{default,persistent}` 时长行为也在 `componentExtensions:`（default 3s + 500ms undo · persistent 至 server `revertible_until` 过期，前端不本地倒计时）。
- `risk-row` 系列 · 三档 row 补齐 severity-high / severity-medium 视觉；每档独立 `risk-row-{critical,high,upcoming}-bar`（实色 2px 左 bar）+ `risk-row-{critical,high,upcoming}-strong-bar`（border 色 2px 强调 bar）。
- `motion.genesis-odometer` / `motion.genesis-particle` · Live Genesis 顶栏数字滚动 + 粒子弧线；`prefers-reduced-motion` 降级为 200ms fade-in。
- `email-shell` + `email-shell-footer` · Migration Report 邮件外壳（640px table 布局），`numericFontFamily: 'Geist Mono'` 在 `componentExtensions:`。

## Do's and Don'ts

Do use gray for OK or not urgent states. Do express risk in dollars before days. Do keep amount, date, deadline, EIN, and source labels in mono tabular numerals. Do keep UI dense, flat, and scannable.

Don't use gradients, decorative glows, large shadows, or rounded SaaS template styling. Don't use green for safe states; green is only for filed, done, or applied. Don't render AI advice without evidence. Don't use raw Tailwind color utilities in business components.

## Voice & Terminology

DueDateHQ writes for working CPAs. Copy must be plain, precise, and quiet — a workbench tool, not a marketing site or chatbot. The rules below are enforced by code review; pair them with the i18n catalog (`apps/app/src/i18n/locales/en/messages.po`) as the source of truth.

### Voice

- **Calm and direct.** State what is, what happened, or what to do. No exclamations, no hype, no encouragement copy.
- **Active over passive.** "Reverted import" beats "Import was reverted." Toast titles and audit-feed entries always lead with a verb.
- **Contractions in errors and toasts.** "Couldn't save changes" not "Could not save changes." Reserve the formal "Could not / Cannot" for legal, security, and billing surfaces where formality signals weight.
- **CPA register, not engineer register.** Prefer the professional word a CPA would use to a partner ("filing", "obligation", "jurisdiction") over the internal data-model word ("record", "row", "entity"). Never expose vendor names (Resend, Stripe, Cloudflare) or internal state codes (`pending_review`, `quarantined`) in user-facing copy — translate them first.
- **One thought per string.** If you need two sentences, the second is doing different work (an instruction after a fact). Otherwise cut.

### Mechanical rules

| Surface                          | Rule                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Buttons, tabs, chips, nav labels | Sentence case, no trailing punctuation. `Save changes` not `Save Changes.`                                          |
| Toast titles                     | Sentence case, no trailing period. `Couldn't save changes`                                                          |
| Toast / panel descriptions       | Sentence case, period only if multi-sentence.                                                                       |
| Loading                          | `Loading {thing}…` with a unicode ellipsis (`…` not `...`), no period.                                              |
| Empty states                     | `No {plural-thing}` for the bare label; full sentence with period for the explanation.                              |
| Audit / evidence feed entries    | Active past tense verb first: `Reverted import.` not `An import was undone.` Period required.                       |
| Role names in body copy          | Lowercase: "Ask an owner or manager." Capitalized only as table column headers or chip labels (`Owner`, `Manager`). |
| Numbers, dates, dollar amounts   | Mono tabular (`font-mono tabular-nums`), no thousands-separator inside `{count}` placeholders.                      |

### Terminology

These are decisions, not suggestions. If you need a new term, add it here before shipping copy.

| Concept                                                          | Use                                                                                                      | Don't use                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| The CPA business unit (workspace)                                | **practice**                                                                                             | firm, organization, tenant, workspace                    |
| The end customer of the practice                                 | **client**                                                                                               | customer, account, user (in body)                        |
| The official channel monitored for regulatory changes            | **source**                                                                                               | channel, feed, signal                                    |
| A rule the practice has accepted and that may generate reminders | **rule** (state: `active`)                                                                               | active rule (redundant), live rule                       |
| A rule awaiting owner/manager review                             | **pending rule**                                                                                         | rule template, pending template, candidate rule          |
| The CSV / XLSX mapping used to onboard client records            | **import template**                                                                                      | source template, mapping template                        |
| The customizable email body sent to a client                     | **reminder template**                                                                                    | (always qualify with "reminder" — never bare "template") |
| The US state where a client files                                | **state** (when scope is 50 states) / **jurisdiction** (when federal, DC, or counties are also included) | filing state + jurisdiction in the same sentence         |
| A regulatory change detected from a source                       | **Pulse change** (internal-facing) / **incoming change** (user-facing labels)                            | alert, signal, notification                              |
| Status awaiting human review                                     | **Needs review** (long label) · `Pending` (short chip)                                                   | Pending review, Awaiting review                          |
| The end-product work item the practice must complete             | **obligation** (nav, titles, formal copy) / **deadline** (body, onboarding, friendly copy)               | task, item, deadline + obligation in the same context    |
| A practice member you're adding                                  | **member** (verb: **invite**)                                                                            | teammate, colleague, seat                                |
| Time-limited rule override applied from a Pulse change           | **active override** / **relief** (IRS register)                                                          | temporary rule, exception (in nav)                       |

### When in doubt

Read the message aloud as if you were the CPA owner saying it to a junior preparer over coffee. If it sounds bureaucratic, mechanical, or sales-y, rewrite it. If it sounds confusing, the underlying concept is probably leaking through — fix the term in this table first, then the copy.
