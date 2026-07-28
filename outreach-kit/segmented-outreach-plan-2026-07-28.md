# Segmented outreach plan (AutoGTM-style ICP split) — 2026-07-28

Yuqi's directive: segment our prospects the way AutoGTM segments audiences — each segment gets
its own angle, and reply data decides which segments get scaled. Classifier: `classify-segments.mjs`
(reads a firm CSV, tags by the service mix in `Notes`, writes per-segment CSVs).

WA list (191 deduped) proves the split works: payroll 15 · nonprofit 6 · audit 8 · ea-solo 14 ·
bookkeeping 23 · industry-niche 1 · generic 141.

## Ground rules (unchanged)

- Alerts-only wedge stays — t2 (generic pitch) is RETIRED; every send is still an alert with a
  practical tip, now segment-sharpened.
- One follow-up max, suppress on reply/signup, no fabricated personalization: the segment tag
  comes from the firm's own website services (verifiable), nothing invented.
- **Every ⚠ FACT-CHECK line must be verified against the current IRS notice before any send**
  (standing rule; daily-broadcast self-check pattern).
- WA-189 already received their first alert (07-28). Segments apply to (a) the NEXT state wave
  from day one, and (b) the single WA follow-up if/when the Aug-5 reminder goes out — not to
  extra sends now.

## Segments & angles

### 1. `payroll` — firms running client payroll (941/940 deposits)

Angle: disaster postponements move filing/payment deadlines, but **payroll deposit relief is
much narrower** — the trap firms hit.
✅ VERIFIED for WA-2025-03 (IRS.gov, 2026-07-28): deposit abatement ran only **Dec. 9–29,
2025** (deposits made by Dec. 29); the Aug. 5 date covers the Jan. 31 / Apr. 30 **quarterly
payroll returns**, not deposits. Verbatim quotes + source in
`wave6-followup-WA-aug5-segmented.md`. ⚠ Re-verify per notice for every future state — the
window differs each time.

### 2. `nonprofit` — firms serving nonprofits (990 series)

Angle: 990/990-EZ/990-PF deadlines and whether the disaster postponement covers them.
⚠ FACT-CHECK per notice: 990-series inclusion + the postponed date.
Links: /rules 990 entry.

### 3. `ea-solo` — Enrolled Agents & sole practitioners

Angle: cost + simplicity; monitoring layer that's free during beta; File In Time comparison
(/compare/file-in-time-alternative). No feature overclaim — complement, not replace.

### 4. `bookkeeping` — bookkeeping+tax full-service small firms

Angle: many small clients × many deadline types = the spreadsheet goes stale silently;
/guides/migrate-cpa-deadlines-from-excel.

### 5. `audit` — audit/attest-heavy firms

Deprioritized: attest calendars aren't our core coverage. Send generic variant; do not build a
custom angle until product covers their calendar truthfully.

### 6. `industry-niche` — construction/medical/etc.

Too thin (n=1). Fold into generic until a list shows real volume.

### 7. `generic` — default

Current proven wave3 alert format, unchanged.

## Measurement (the actual AutoGTM part)

Log sends per segment (extend `.outreach-state.json` records with a `seg` field at send time).
Per segment track: sent / replies / signups. Small n — treat as directional learning, not
stats; a single thoughtful reply from a segment is a validation signal at this stage
(pre-validation goal is learning, not scale).

## Next actions

1. Next event wave: run `classify-segments.mjs` on the sourced list; draft the 2–3 highest-n
   segment variants (payroll first — biggest verifiable pain) + generic for the rest.
2. Verify the payroll-deposit relief rule for that notice (⚠ above) before send.
3. Backfill: older 7-state lists can be re-classified when their Notes CSVs are located
   (send log has emails only).
4. Going forward, fill `Fit`/`Tier` at sourcing time — they're empty in the WA list.
