# DueDateHQ cold-email — Wave 2 sourcing notes

**Date:** 2026-07-06
**Output file:** `duedatehq-MASTER-verified-wave2.csv` (360 rows, same 9-column schema as the master)
**Status:** research/sourcing only — **nothing sent, live send machinery untouched** (`send-outreach.mjs`,
`.outreach-state.json`, `duedatehq-OUTREACH-sequence.csv` not modified). Merge into the live master/sequence
is left to a separate reviewed step.

---

## 1. What this is
Wave-2 expansion of the emailable CPA pool. Wave 1 contacted 205 CPAs (touch 1 sent 2026-07-02); the verified
master holds 289 rows. This wave adds **360 net-new contacts** — deepening the original 7 states and expanding
into 12 new FEMA-disaster-heavy states.

## 2. Headline counts
| Metric | Count |
|---|---|
| Total wave-2 rows | **360** |
| Verified real email | **290** |
| Contact-form only (`contact form`) | **47** |
| No email found (`find manually`) | **23** |
| Dropped as dupes vs existing master/internal | see §5 |

**Tier split:** OK-tier 229 · Solo (individual) 112 · Shortlist (multi-state) 19
**Type split:** Firm 234 · Individual 126

## 3. Geography & why these states
The product story — "an IRS/state filing deadline just moved (often a FEMA disaster declaration) → instantly see
which clients it hits → apply the new date in one click" — is strongest where the IRS grants disaster relief. So
expansion targeted the **highest-frequency FEMA-declaration states** (Gulf hurricanes, Southeast tornado alley,
wildfire zones, river flooding).

**Deepened (existing 7 states)** — new firms only, in less-saturated secondary cities:
FL, TX, CA, GA, WA, NY, AZ.

**New expansion states (disaster-frequent):**
LA (Gulf hurricanes — Katrina/Ida/Laura), MS (Gulf + tornadoes), AL (SE tornado alley + Gulf coast),
SC (Atlantic hurricanes + Helene inland flooding), NC (**Hurricane Helene 2024** catastrophic western-NC
flooding + coastal hurricanes — highest-fit new state), TN (tornadoes + Helene East TN), KY (2021 W-KY
tornadoes, 2022 E-KY floods), MO (tornadoes + Mississippi River floods), OK (tornado alley),
AR (tornadoes/floods), CO (Marshall Fire + wildfires), OR (2020 Labor Day wildfires).

## 4. Per-state breakdown
Format: **total (verified / contact-form / find-manually)**

| State | Total | Verified | Form | Manual | Notes |
|---|---|---|---|---|---|
| MS | 28 | 28 | 0 | 0 | Sourced from MS Board of Public Accountancy firm-registration roster (authoritative) |
| NC | 29 | 23 | 3 | 3 | Triangle + western-NC Helene zone + Charlotte metro + coast |
| GA | 25 | 17 | 4 | 4 | Coastal (Brunswick), NW (Dalton/Rome), Athens/Augusta — metro Atlanta already saturated in master |
| NY | 21 | 14 | 7 | 0 | Upstate: Capital Region, Rochester/Utica/North Country, Hudson Valley |
| LA | 19 | 14 | 4 | 1 | New Orleans metro, Acadiana, Lake Charles (Laura), Houma (Ida) |
| AL | 19 | 14 | 1 | 4 | Gulf coast + SE/Wiregrass tornado belt |
| OR | 19 | 13 | 6 | 0 | Rogue Valley (2020 Almeda Fire) cluster strongest |
| CA | 19 | 17 | 1 | 1 | Wildfire counties (Redding/Chico/Napa/Ventura) + Inland Empire/Central Valley |
| FL | 18 | 12 | 4 | 2 | Panhandle (Pensacola/Panama City) + central Gulf coast (Bradenton/St Pete) |
| MO | 18 | 14 | 4 | 0 | Joplin tornado zone + SE Missouri (Cape Girardeau) river-flood region |
| OK | 18 | 15 | 3 | 0 | OKC/Moore + Tulsa tornado corridor |
| SC | 18 | 16 | 0 | 2 | Lowcountry/Grand Strand coast + Pee Dee (Helene) |
| AR | 17 | 15 | 1 | 1 | Wynne (2023 EF3 tornado), central AR corridor, NW Arkansas |
| TX | 17 | 17 | 0 | 0 | Secondary cities: Galveston/Beaumont/Brownsville (Gulf), Wichita Falls (tornado) |
| WA | 16 | 13 | 2 | 1 | Eastern WA wildfire region (Yakima/Wenatchee/Tri-Cities) + Kitsap |
| AZ | 15 | 13 | 1 | 1 | Non-Phoenix: Prescott/Show Low/Lake Havasu/Sierra Vista (wildfire+monsoon) |
| KY | 15 | 7 | 6 | 2 | W-KY tornado zone (Paducah/Mayfield/Bowling Green) |
| TN | 15 | 14 | 0 | 1 | Nashville tornado/flood + East TN Helene (Elizabethton) |
| CO | 14 | 14 | 0 | 0 | Boulder County Marshall Fire + Colorado Springs/NoCo wildfire zones |

## 5. Dedupe report
- Dedupe base: 211 real emails extracted from `duedatehq-MASTER-verified.csv` + `outreach-suppress.txt`
  (suppress list currently holds no emails, only header comments).
- **Dropped as dupes during research** (agents cross-checked before recording): WA 6, CA 3, AZ 3, OK 1,
  GA 1 (Springer & Company / espringer@springercpa.com — already in master). ≈ 14 candidates dropped.
- **Programmatic final pass:** cross-checked all 290 wave-2 emails against the 211 existing emails and against
  each other → **0 collisions with the master, 0 internal duplicates.** (Verified by set intersection; the 12
  new states have no prior entries, and the 7 existing states were deduped by the researchers.)

## 6. Method & sources
- **Best source = state Board-of-Accountancy firm-registration rosters** where published (MS was mined this way
  → all 28 verified). Most boards (LA, AR, AL, OK) expose only per-record lookups without bulk emails, so those
  fell back to firm-website verification.
- **Primary method for the rest:** targeted web search by city + service (`"CPA firm" [city] "S-corporation"
  tax`, `[state] CPA multi-state nexus`), then **direct fetch of the firm's own contact/about/footer page to
  confirm the exact email string on-page** and the decision-maker name.
- Secondary corroboration: state CPA-society "Find a CPA" directories, chamber listings, Google Business
  snippets — always re-confirmed against the firm's own site before recording.

## 7. Integrity guarantees (per the hard rules)
- **No guessed/pattern-invented emails.** Every `Contact` email was seen on a real published source. Where no
  email was published: `contact form` (firm has a web form) or `find manually` (no email + no form).
- **No fabricated personalization.** `Fit`/`Notes` contain only verifiable facts seen during research
  (services, entity focus, multi-state licensure, disaster-zone location). Unknown → left blank.
- **Small-firm quality bar held.** Large regional/national firms (BDO, CLA, Carr Riggs & Ingram, Warren Averett,
  Forvis Mazars, HoganTaylor, James Moore, etc.) were deliberately excluded across all states.

## 8. Flags to verify before sending (low-confidence emails)
These are recorded (real published listings, per the rules) but were **not re-confirmed on the firm's own live
page** — quick manual check recommended before they enter a send:
- **MO** — David A. Turk, CPA (Joplin): published email is `John@turkcpas.com` but firm is named for David Turk;
  string is real/published but mailbox owner doesn't match the named partner.
- **TX** — Janie A. Barry CPA (Wichita Falls): `info@janiebarry.com` from a listing, not re-fetched on-page.
- **LA** — Bobbie L. Howard (Houma) `bobbielhoward@blhcpas.com` and LeMay Tax (Lafayette) `tabby@lemaytax.com`:
  both from search listings; sites were intermittently down so not re-confirmed live.

## 9. Optional next depth (not done here)
Contact-form / find-manually firms are real, quality leads with no published email — a manual pass (or a
form-fill outreach track) could convert ~70 of them. Additional untapped disaster states if further expansion is
wanted: minimal overlap remains in GA metro Atlanta and FL central/south (both already heavy in the master).
