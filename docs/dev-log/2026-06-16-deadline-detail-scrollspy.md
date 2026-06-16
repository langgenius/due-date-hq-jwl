# Deadline detail: tabs → scroll-spy + NrQaI section grammar (Yuqi)

_2026-06-16_

Yuqi: make /deadlines and /alerts "the same visual language", and organize the
deadline detail like Pencil node NrQaI ("clear titles, section headers"). Two
things landed together in `ObligationQueueDetailDrawer.tsx`:

## 1. Tabs → scroll-spy (alert parity)

The deadline detail's 4 real Tabs (Status · Materials · Record · Audit) became a
**scroll-spy section nav** — one scrolling document with a sticky table-of-
contents nav, exactly like the alert detail. Lossless per the pre-built plan:

- Every tab-era capability preserved: deep-link (`/deadlines/:ref/:tab` →
  scroll-to-section on load, instant), rail activeTab, visible-tab gating
  (drives which sections mount), count badges, cross-tab jumps (a single
  `jumpToSection` wrapper keeps the URL write + scrolls; the two panel
  `onChangeTab` props re-point to it, so panels.tsx cascades for free), the
  `?tab=` shareability (the spy writes `activeTab` back via onTabChange).
- All 5 panels always-mount with ZERO extra fetches (verified: no per-tab
  useQuery; the drawer's queries key on obligationId).
- The spy merged into the existing body onScroll (footerDocked + hero-collapse +
  active-section in one listener, reusing the computed `atBottom`).
- One intentional upgrade: the `extension` section now mounts only when it's a
  valid step (was mounted-but-hidden). The locked **4** areas
  (Status·Materials·Record·Audit) are unchanged — they're scroll-spy anchors now,
  not tabs (the count stays 4; see the tab-count memory).

## 2. NrQaI section grammar (clarity)

Each section announces itself with a mono DATA-CHIP (count/state) in BOTH the nav
item AND the section header (via DetailSectionCard `headerRight`): Materials
`14 LEFT`, Record `1`, Audit `1`, Extension `Filed ✓`. Plus the provenance lines
NrQaI uses (`AUTHORITY CITATION fed.1040.return.2025`, `AUDIT TRAIL`). Chip style:
`font-mono text-caption-xs font-semibold uppercase tracking-wide` in a
`rounded bg-background-subtle px-1.5` pill (accent variant for Extension).

## Execution + review

The structural conversion was done by a focused sub-agent against the plan; I
reviewed the diff and caught + fixed THREE defects it introduced before commit:

1. **tsgo error** (`mode === 'panel'` dead inside a `mode === 'sheet'` branch).
2. **Panel regression** — the body strip + body nav were gated `mode === 'sheet'`,
   so PANEL mode rendered neither. Fixed both to `!isPageMode` (page renders them
   in the header; panel + sheet render them in the body).
3. **Sticky collision** — the nav was sticky only in sheet (`panelLayout ?`), and
   the key-date strip was `sticky top-0 z-20` in panel, which would have buried
   the nav. Fixed: nav `sticky top-0` for panel + sheet (`isPageMode ?`); strip
   is now NON-sticky (scrolls away with the hero, like the alert), so the nav
   owns top-0.

## Verify

tsgo + vp clean. Live (localhost:5173, page mode): nav renders
`Status · Materials 14 LEFT · Record 1 · Audit 1`; all 4 sections present;
scrolling to the bottom flips the active nav to Audit (spy tracks); deep-link to
`/deadlines/:ref/audit` scrolls to + activates Audit; click-jump smooth-scrolls.
Panel-mode sticky behavior fixed by reasoning + parity with the alert; re-confirm
live in the client slide-in when the shared preview frees (the parallel session
keeps driving it). THRESHOLD=72 / scroll-mt-16 are starter values (TODO comments
left) — fine in page mode; eyeball panel mode.

Single-file change. The `subtle` prop added to detail-status-banner.tsx is the
other session's work — not staged here.
