---
title: 'Default theme: light instead of system'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: theme
---

# Default theme: empty-storage fallback flips from `system` → `light`

## Change

Four touch-points where the theme system used to fall back to `'system'`
(follow the OS) when localStorage held no explicit preference. All four
now fall back to `'light'`:

1. `packages/ui/src/theme/theme.ts:40-41` —
   `readStoredThemePreference` empty / invalid fallback.
2. `packages/ui/src/theme/no-flash-script.ts:16` — the inline `<head>`
   no-flash script's initial `let preference = 'system'`. **This is the
   most important one**: it runs before React mounts and sets the
   document attributes that drive first paint.
3. `apps/app/src/lib/theme-preference-store.ts:19` — catch-block
   fallback when `readStoredThemePreference` throws.
4. `apps/app/src/lib/theme-preference-store.ts:24` —
   `getServerThemePreference()`'s SSR initial.

## Why

New visitors should land in light mode regardless of their OS theme
preference. The product's visual identity is calibrated against the
light palette; dark mode is an opt-in, not the default surface a new
firm sees on their first onboarding screen. Auto-following OS made the
first impression unpredictable — half the team's design polish was
landing in dark first.

## Impact

- **New users (empty localStorage)**: land in light. Was: followed OS.
- **Users who explicitly picked `'system'`**: unchanged. The theme
  switcher still offers System / Light / Dark; if they pick System,
  the stored value is `'system'` and OS-following resumes.
- **Users who explicitly picked `'light'` or `'dark'`**: unchanged.
- **Marketing site (Astro)**: also affected via the shared
  `@duedatehq/ui/theme` package. Visitors landing on marketing now
  default to light too — consistent with the SaaS shell.

## Test plan

- Open the app in a fresh incognito window (empty localStorage). Verify
  light mode on first paint, not dark, even if your OS is set to dark.
- Open the theme switcher → pick System → confirm OS-following works.
- Refresh: confirm `'system'` choice persists.
- Pick Light explicitly, refresh: confirm light persists.
- Existing tests in `theme-preference-store.test.ts` and
  `theme-switch.test.ts` continue to pass — none of them exercise the
  empty-storage fallback path that this change touches.
