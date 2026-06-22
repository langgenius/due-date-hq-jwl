# /deadlines space-efficiency pass (+ alerts consistency)

_2026-06-22_

Critique feedback: "wasteful of space" — the table didn't start until ~1080px down
(≈40% of the viewport) because four full-width blocks stacked before any data.
Three fixes, all recovering vertical space; net the table now sits ~4 rows up the
fold:

1. **Editorial banner: card → slim one-line strip.** It was a bordered, filled
   card (`px-5 py-4` + border + bg) for a single date + sentence (~95px). Now an
   accent-dot + date eyebrow + the one-line read + inline dismiss — no card chrome.
2. **Header eyebrow: dropped the redundant count.** "Synced just now · N deadlines
   tracked" repeated the title pill AND the StatBand TOTAL TRACKED ("28" appeared
   3×). Trimmed to just "Synced just now ⟳".
3. **Container `gap-8` → `gap-6`.** 32px between every top block was the biggest
   single waste; 24px is plenty — and it **matches /alerts**, so the two pages now
   share one density rhythm.

## Alerts consistency
`/alerts` was already the efficient target — same shared `PageHeader`, no banner
card, and it was already on `gap-6`. Bringing /deadlines down to `gap-6` converges
the two onto one chrome rhythm. Content stays distinctive (deadlines = time-forward
table; alerts = change/decision cards) — no shared row grammar imposed.

## Verification
tsgo 0 · build green · app tests 550/2. No new i18n strings (the eyebrow trim only
made "deadlines tracked" unused — left for a future extract to prune). Verified
live: editorial is one line, four data rows above the fold.
