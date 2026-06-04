# 2026-06-03 - Today triage: severity bands, why-now at rest, alerts thin-line

Yuqi: the Today (`/`) triage didn't tell the user what's most important vs. secondary. The
"Actions this week" list was a single flat priority-sorted list — severity was carried only by a
3.5px leading-chevron tint and the right-edge time text, so the shape of the week ("2 on fire, 3
warm, the rest fine") didn't read at a glance. The "why now" reasoning was hover-only, and the
empty Alerts state claimed a large tinted hero box it hadn't earned.

Change:

- **Severity bands** (`actions-list.tsx`). The action list now groups rows into
  `Critical / High priority / Upcoming` bands (from the server's `DashboardTopRow.severity`;
  `medium`+`neutral` fold into Upcoming). Each band header is a colored dot + tinted label + a
  plain-language caption that names the tier's meaning: Critical = "Needs action now", High = "On
  deck this week", Upcoming = "Plan ahead". Empty bands are dropped.
- **Why-now at rest** on Critical rows. The Smart Priority factors (penalty / passed cutoff /
  client readiness) — the most differentiating "why is this the one to do" signal — now render on
  a second line at rest for Critical rows, gated on `!expanded` so the expanded panel's Why-now
  row isn't duplicated.
- **Neutral chevron.** The leading row arrow reverted from status-color (`STATUS_ICON_COLOR`) to
  neutral `text-text-tertiary`; once the band header carries severity, a per-row colored arrow read
  as arbitrary noise.
- Dropped the earlier box/wash and per-row left rail experiments — they fought the page's clean,
  borderless aesthetic (Yuqi: "ugly side border highlight" / "left border is redundant").
- **Alerts section weight is now state-dependent** (`needs-attention-section.tsx`). When alerts are
  live it stays the page's loudest block (destructive-tinted hero card row). When the feed is calm
  it collapses to a single quiet status line (`✓ Alerts · Monitoring Federal + 50 states + DC ·
nothing needs your review`) with no tinted box. Removed the now-unused `AlertsEmptyState`
  helper + `StatusBanner` / `CircleSlashIcon` / `PulseSourceHealth` imports.

Validation:

- `pnpm -F @duedatehq/app exec tsc --noEmit` — clean.
- `pnpm -F @duedatehq/app test -- run src/features/dashboard/actions-list.test.tsx` — 3 passed.
- Browser check on `/` against an e2e-seeded session (`/api/e2e/session`):
  - `obligations` seed: Critical band renders with "Needs action now" caption + per-row Why-now
    lines; arrows neutral; Alerts collapsed to the thin line.
  - Temporary index-split (reverted) confirmed the full Critical → High → Upcoming hierarchy
    renders with the correct per-tier dot/label/caption.
  - `pulse` seed: Alerts section renders the hero card row (`4 Alerts` + alert cards + `+2 more`).
- `DESIGN.md` remains aligned; this is a hierarchy/weighting change inside the existing Today
  surfaces. See `docs/Design/dashboard-actions-design-brief.md` §11.
