# Upgrade CTA — dark-mode contrast fix

_2026-06-18_

`UpgradeCtaButton` sits on `state-warning-solid` (coral `#f25f4c`), which is the
same value in light and dark. Its label/glyph used `text-text-primary`, which
flips to near-white (`#fbfbfc`) in dark mode → ≈3.2:1 on coral, an AA failure.

Fix: pin the ink dark in both themes with `dark:text-text-primary-on-surface`
(`#0d0e11` in dark, ≈6.6:1) on the base, hover, and `[&_svg]` text — semantic
tokens only, no palette reach. Light mode is unchanged (`text-text-primary` is
already the dark ink there).

The /splash + auth ground already carries its own dark variant
(`auth-chrome.tsx` `dark:bg-bg-canvas`), so that backlog half needed no change.

Verification: build green; `dark:…text-primary-on-surface` confirmed in output CSS.
