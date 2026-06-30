# /clients empty state: accurate copy + flatter, fuller hero

**Date:** 2026-06-29
**Files:** `apps/app/src/features/clients/ClientsEmptyState.tsx`, `apps/app/src/routes/clients.tsx`

## Why

Yuqi reviewed the first-run `/clients` hero and flagged: the gradient, a one-off "Get started"
eyebrow, **inaccurate copy** ("plug in your tools" implies a live integration that doesn't exist),
missing logos, an orphaned word in the headline, no card background, and a redundant top banner.

## What changed

**Accuracy (integrity).** The import is an EXPORT-FILE upload — you export a client list from the
supported tools and drop the file; the app auto-detects the source from the headers (proven by
`intake-files.ts`: "Export Client Information from Tools > Export…", etc.). So the old copy was
fiction:

- Headline "**Plug in your tools**…" → "**Drop in your client list.** Walk away with a triage list."
  (no fake connection).
- Body dropped "**no setup wizard**" (there IS a migration wizard) and the wrong "**6 more**" count;
  now: "Export a client list from TaxDome, Karbon, Drake, QuickBooks, UltraTax, Lacerte and more,
  then drop the file here — we auto-detect the format, no column mapping."

**Hero polish.**

- Removed the gradient brand-wash and the one-off "Get started" eyebrow (it appeared nowhere else).
- Gave the card a flat `bg-background-section` fill so the frame reads as a distinct surface; flipped
  the logo tiles to white so they pop on it.
- Logo strip 6 → **11** (the full auto-detected set: + ProSeries, ProConnect Tax, CCH Axcess, CCH
  ProSystem fx, File In Time) and **removed the trailing "DD" destination tile**.
- `text-balance` on the headline so no single word ("list.") strands on its own line.

**De-duplicated the import banner.** `routes/clients.tsx` now shows the "import from CSV" tip only for
a partly-filled directory (`clients.length > 0 && < 5`); at 0 clients the hero already owns the prompt,
so it no longer double-stacks.

## i18n note

The `<Trans>` strings changed, so the catalog is out of sync for these messages — they render via
lingui's default-message fallback at runtime. A full `i18n:extract` was deliberately NOT run here: the
shared working tree has a parallel session's uncommitted string-bearing files, and `--clean` would
sweep those (plus pre-existing catalog drift on `main`) into this commit. The catalog needs a holistic
sync once the tree is clean.

## Verification

`tsgo` clean. Live screenshot was blocked (folder hit the 5 dev-server limit held by other chats);
changes verified by code + Tailwind 4.3 (text-balance is a real utility).
