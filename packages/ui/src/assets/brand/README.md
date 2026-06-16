# Brand assets

Single source of truth for the DueDateHQ product mark.
Figma: file `ssejugriUJkW9vbcBzmRgd`, frame "DueDateHQ — Brand Icon (Design Spec)"
(node `98:2`). Geometry rationale lives in `docs/Design/DueDateHQ-DESIGN.md`.

## Files

| File                     | viewBox | Tile fill | Bars      | Use it for                                                |
| ------------------------ | ------- | --------- | --------- | --------------------------------------------------------- |
| `brand-mark.svg`         | 256×256 | `#0A2540` | `#F3EEE6` | OG images, email hero, ≥ 64 px hero tiles                 |
| `brand-favicon.svg`      | 32×32   | `#0A2540` | `#F3EEE6` | Browser favicon, ≤ 32 px inline brand chips (light theme) |
| `brand-favicon-dark.svg` | 32×32   | `#071A2E` | `#F4F8FC` | ≤ 32 px inline brand chips (dark theme)                   |

The mark is the **stacked-bars** direction (2026-06-16, supplied by Yuqi —
replaced the Radar D): four rounded horizontal bars, the third indented — an
abstract timeline / schedule motif. App-icon form: ivory bars on a navy rounded
square. The shapes that survive 16-32 px:

- rounded-square navy tile (`--color-brand-ink` `#0A2540`)
- four ivory bars (`--color-brand-ivory` `#F3EEE6`), the third indented

The in-app source of truth is `apps/app/src/components/primitives/brand-mark.tsx`
(`BrandMark`) and `docs/brand/` (full lockup + brand book). Keep these standalone
SVGs in sync with it.

All files use hardcoded hex (no CSS variables, no `currentColor`) so they
work as standalone files in `<link rel="icon">` tags and in email templates
where CSS-variable resolution is unavailable.

## Theme strategy

| Surface                         | Theme-aware? | How                                                                                                                                                    |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<link rel="icon">` favicon     | No           | Ship the light variant only. Browser tab chrome is browser-managed and does not follow app theme; the navy tile reads on every browser-tab background. |
| Inline `<img>` in app/marketing | Yes          | Render two `<img>` tags, hide one via Tailwind `dark:hidden` / `hidden dark:block`. Zero JS, no theme-switch flash, no hydration cost.                 |

## How to consume

### From any app's `public/` (favicons)

Copy `brand-favicon.svg` to `apps/<app>/public/favicon.svg`. Each app keeps
its own copy because public assets are emitted per-app at build time.

### Inlined in app/marketing UI (theme-aware)

Both Vite (apps/app) and Astro (apps/marketing) resolve `*.svg` imports as
URL strings by default — no plugin, no `?raw`, no React component wrapper.

```tsx
// React (apps/app)
import brandLight from '@duedatehq/ui/assets/brand/brand-favicon.svg'
import brandDark from '@duedatehq/ui/assets/brand/brand-favicon-dark.svg'

<img src={brandLight} alt="" aria-hidden width={16} height={16} className="size-4 dark:hidden" />
<img src={brandDark} alt="" aria-hidden width={16} height={16} className="hidden size-4 dark:block" />
```

```astro
---
// Astro (apps/marketing)
import brandLight from '@duedatehq/ui/assets/brand/brand-favicon.svg'
import brandDark from '@duedatehq/ui/assets/brand/brand-favicon-dark.svg'
---
<img src={brandLight} alt="" aria-hidden width="16" height="16" class="size-4 dark:hidden" />
<img src={brandDark} alt="" aria-hidden width="16" height="16" class="hidden size-4 dark:block" />
```

The browser preloads both small SVG files and CSS hides one based on the
`.dark` class on `<html>`. Same pattern GitHub uses for theme-aware markdown
images.

## Sync rule

Any change to the icon should start in Figma (frame `98:2`) when the file is
writable, be re-exported via `node.exportAsync({ format: 'SVG_STRING' })`, and
replace these files in the same PR. Keep the per-app public favicon copies in
sync with `brand-favicon.svg`.
