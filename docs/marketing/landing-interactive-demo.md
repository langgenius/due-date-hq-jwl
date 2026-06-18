# Landing Page — Interactive "Try It" Demo (content + spec)

**Status:** Content + interaction spec for the live demo module on the landing page · 2026-06-17. Lets a visitor *use* the watch-and-apply loop on sample data: toggle monitoring, pick states, open an alert, see who's affected, read the suggested next step, and apply. Pairs with `landing-page-copy.md`. All data here is **sample** — surfaced under a "live preview · not your data" label.

---

## 1 · Where it goes

Drop it into **How it works** (the loop section) as the interactive payoff, or as its own section right after it. It turns the three static steps (Watch → Match → Apply) into something the visitor performs once, themselves.

## 2 · What the visitor does (interaction model)

```
[ Monitoring ●On ]   States you file in:  (Fed) (CA) (NY) (TX) (FL) (WA) (MA) (+ more)
─────────────────────────────────────────────────────────────────────────────
 ▸ alert cards for the selected jurisdictions, newest first
     each card →  Urgent/FYI · title · source·date
                  "12 clients affected"  ▸ expand → client list (form · status)
                  Suggested next step: ……
                  [ Review ]  [ Apply to 12 ]
     apply →      ✓ Applied to 12 · Undo (23:59)
```

1. **Toggle monitoring on/off** — off = the screen goes quiet (the "before"); on = alerts stream in.
2. **Select the states you file in** — chips filter which alerts show. (Default: a couple pre-selected so the demo isn't empty.)
3. **Open an alert** — expand "who's affected" to see the matched client list with status.
4. **Read the suggested next step** — one plain line per alert.
5. **Apply** — the card flips to the resolved state with a live 24-hour undo countdown.

## 3 · Module copy (labels + states)

- **Eyebrow:** TRY IT — LIVE PREVIEW
- **Title:** Pick your states. See what we'd catch.
- **Subtitle:** This is the watch-and-apply loop on sample data. Toggle monitoring, choose where you file, and walk an alert from change → who's hit → one-click fix.
- **Caption (persistent):** live preview · not your data
- **Toggle:** `Monitoring` · on-caption `On — watching all 50 states` · off-caption `Off`
- **State selector label:** States you file in
- **Card labels:** severity pill `Urgent` / `FYI` · `{n} clients affected` · expander `Who's affected ▸` · `Suggested next step` · buttons `Review` and `Apply to {n}` · informational button `Mark reviewed`
- **Client row format:** `{Client} · {Form} · {Eligible | Needs review}`
- **Applied state:** `✓ Applied to {n} clients · Undo {mm:ss}` (24-hour countdown; demo can fast-tick)
- **Empty states:**
  - Monitoring off → `Monitoring is off. Flip it on to see what we're catching.`
  - No states selected → `Choose the states you file in to see their alerts.`
  - State with no open alert → `Nothing open for {state} right now — we're watching.`

## 4 · Sample alert dataset

Real agencies, real change types (`deadline_shift`, `threshold_advisory`, `filing_requirement`, `form_instruction`), plausible client names. Severity is **urgent / informational** (never invented "critical/high").

| Juris | Sev | Title | Source · Date | Affected | Suggested next step |
|---|---|---|---|---|---|
| **Federal (IRS)** | Urgent | IRS postpones 2025 returns & payments to **Nov 3** for FEMA disaster areas | irs.gov · Apr 2 | 5 (3 eligible · 2 needs review) | Confirm which clients are in the declared counties, then apply the Nov 3 date. |
| **Federal (IRS)** | FYI | IRS posts the 2026 filing-season calendar (Pub 509) | irs.gov · Jan 6 | 0 | No client impact — mark reviewed when you've read it. |
| **California (FTB)** | Urgent | California postpones **Oct 15** deadlines for San Diego County storm relief | ftb.ca.gov · Mar 12 | 4 (3 eligible · 1 needs review) | Check the payment isn't due earlier before you apply the new date. |
| **New York (DTF)** | Urgent | New York moves the **PTET annual election** confirmation date | tax.ny.gov · Feb 20 | 3 (3 eligible) | Review the 3 PTET clients, then apply the new election date. |
| **Texas (Comptroller)** | Urgent | Texas raises the **franchise-tax no-tax-due threshold** | comptroller.texas.gov · Jan 30 | 12 (9 eligible · 3 needs review) | Confirm which clients fall under the new threshold before applying. |
| **Florida (DOR)** | Urgent | Florida postpones corporate income/franchise filings for **hurricane relief** | floridarevenue.com · Feb 8 | 5 (4 eligible · 1 needs review) | Check which clients are in the affected counties. |
| **Washington (DOR)** | FYI | Washington updates **B&O tax filing instructions** | dor.wa.gov · Jan 22 | 0 | No client impact — mark reviewed. |
| **Massachusetts (DOR)** | Urgent | Massachusetts extends a filing deadline for **winter-storm relief** | mass.gov/dor · Jan 18 | 2 (2 eligible) | Review the 2 affected clients, then apply. |

### Affected-client lists (expanders)

- **IRS Nov 3:** Acme LLC · 1120-S · Eligible — Birchwood Co · 1065 · Eligible — Delta Group · 1040 · Eligible — Crestmont Inc · 1120 · Needs review — Harbor Point LLC · 1065 · Needs review
- **CA Oct 15:** Pacific Coast LLC · 100S · Eligible — Sierra Mfg Inc · 100 · Eligible — Coastline Partners · 565 · Eligible — Bayview Co · 100S · Needs review
- **NY PTET:** Empire Group LLC · IT-204 · Eligible — Hudson Partners · IT-204 · Eligible — Liberty Holdings · CT-3 · Eligible
- **TX threshold:** Lone Star LLC · 05-158 · Eligible — Brazos Co · 05-158 · Eligible — Gulf Coast Mfg · 05-158 · Eligible — Hill Country Partners · 05-158 · Needs review — *+ 8 more*
- **FL hurricane:** Sunshine Holdings · F-1120 · Eligible — Gulfstream LLC · F-1120 · Eligible — Palm Co · F-1065 · Eligible — Miami Bay Partners · F-1120 · Eligible — Coral Springs Inc · F-1120 · Needs review
- **MA storm:** Bay State LLC · 355 · Eligible — Charles River Co · 3 · Eligible

## 5 · Design notes (for build)

- **Brand:** navy accent `#2E368C` for primary actions; cyan highlight `#14C5F6` *only* on the unseen/new marker (a small dot), used scarcely. Gray neutrals, hairline borders on white, no heavy shadows.
- **Severity color (color only for risk):** urgent = amber/warning dot + text; FYI = gray. Resolved (applied) = green check. Never red on a resolved row.
- **No "AI" in any label.** No "Radar." The product surface name is **Alerts**.
- **Honesty inside the demo:** it's sample data (label persists). The selectable states default to where we have the richest sample alerts; the loop *experience* is the point. Apply is always the visitor's click — never auto-fires.
- **Motion:** 150ms ease-out for toggles/expands; the alert list can do a gentle staggered fade-in when monitoring flips on. Respect reduced-motion.
- **Mobile:** chips wrap; cards stack full-width; the affected-client list collapses by default.

## 6 · Why this converts

It collapses the entire pitch into ten seconds of *doing*: the visitor flips monitoring on, watches alerts appear for their states, opens one, sees real client names and a plain next step, clicks apply, and sees the undo timer. They've now experienced the moat — "it watches, it knows who's hit, I fix it in one click" — instead of reading a claim about it.
