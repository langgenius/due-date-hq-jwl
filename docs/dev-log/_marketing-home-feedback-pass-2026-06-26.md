# Marketing home — page-feedback pass (2026-06-26)

Eight in-page annotations from Yuqi on `/`, all EN + zh:

1. **Notice panel** (`Notice.astro`) — the document clip was centered against the
   taller 3-field extract column, so it floated low with dead space above it. Now
   `.clip` is `align-self: stretch` + a flex column with `justify-content: center`:
   the document card fills the column height and its content sits vertically centered
   on the connector's mid-line.
2. **Hero proof list** (`Hero.astro`) — "too wordy here." Kept all four points but made
   them a compact 2-up grid (`repeat(auto-fit, minmax(220px, 1fr))`, 1-up when narrow),
   tightened each label (dropped the gray trailing clauses), and dropped the lead weight
   600 → 500. Reads as a quiet footnote, not a second pitch.
3. **"Paste your client list…"** reassure line — smaller (`--m-text-base` → `--m-text-sm`)
   and quieter (`--m-ink-2` → `--m-muted`).
4. **Spy-rail** (`ScrollRail.astro`) — inactive labels now regular (500 → 400); the active
   one stays 500. Row gap 6px → 4px.
5. **Surfaces activity feed** (`Surfaces.astro`) — `GA DOR` / `OH Dept of Tax` were an
   inconsistent agency-abbreviation style. Switched to the official-source **domains**
   (`dor.georgia.gov`, `azdor.gov`, `tax.ohio.gov`, `mass.gov/dor`) set in mono, matching
   how sources are cited everywhere else (`irs.gov`, `ftb.ca.gov`).
6. **Remove a panel** — ambiguous (all four bench panels share `.panel`); Yuqi confirmed
   **keep all four**. No change.
7. **Alerts panel label** (`Surfaces.astro`) — `Alert feed` → `Alerts` so it matches the
   "01 Alerts" legend below (the other three labels already matched their legend titles).
8. **Close finale** (`Close.astro`) — the flat `--m-accent` navy ground became a deeper
   brand-navy gradient (mixed toward `--m-ink` at the foot), so the cyan top-edge + corner
   glow read as a deliberate brand highlight against a richer surface.

Build clean (73 pages). Verified live via DOM measurement + per-section screenshots (the
headless preview can't scroll, so sections were force-revealed and the ones above each
target hidden to bring it to the top).
