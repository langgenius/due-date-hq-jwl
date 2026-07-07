---
title: 'Vite+ 0.2 quality gate follow-ups'
date: 2026-07-06
author: 'Codex'
---

# Vite+ 0.2 quality gate follow-ups

## Context

The workspace moved to Vite+ 0.2.2. The dependency-only commit pins the local toolchain to the
new Vite+ release and keeps Vitest aligned with the upstream version bundled by Vite+.

## Change

- Kept `vitest` pinned to the upstream `4.1.9` runner bundled by Vite+ 0.2.x instead of the removed
  `@voidzero-dev/vite-plus-test` wrapper.
- Replaced the shortcut help dialog's local meta cast with TanStack Hotkeys declaration merging, so
  app-specific metadata is part of the registered hotkey type.
- Narrowed the server auth context dependency to the `waitUntil` capability it actually uses, which
  avoids constructing a full Cloudflare `ExecutionContext` in tests after the worker types upgrade.
- Enabled the React nested-component rule as an error while allowing render-prop callbacks, matching
  the table/slot renderer patterns already used in the app.
- Tightened upgraded lint/type findings without disabling the rules globally. The remaining
  directory override is limited to sequential outreach sends, where awaiting each send preserves rate
  limiting and per-recipient state updates.

## Validation

- `vp i`
- `vp check`
- `vp run -r test`
- `vp run build`

`vp run -r test` completed successfully. One test path still logs a localhost `ECONNREFUSED`
aggregate during teardown, but the Vitest command exits 0 and all suites pass.
