# State CPA society distribution kit (2026-07-16)

**The play:** societies want to tell members about IRS disaster relief; we verify it against irs.gov
the day it posts. Hand them ready-to-publish member-notice content, free — one society email reaches
thousands of CPAs with authority backing. Never pitch the product; the credit line does that.

**What we offer each society (the ask is one yes):**

1. A **member-ready summary** of each new IRS relief for their state, the day it posts — publish
   as-is or edited, credit optional ("verified by DueDateHQ").
2. The **embeddable widget** for their site — `duedatehq.com/widget` (live list, auto-updates,
   Shadow-DOM safe) — and/or the raw JSON feed (`/data/disaster-notices.json`).
3. The **weekly digest** they can forward or excerpt.

Sources: contacts researched 2026-07-16 from society sites (only literally-published names/emails);
full research notes in the session scratchpad. **Two date corrections applied vs the raw research:**
WA relief deadline is **Aug. 5, 2026** (release updated from May 1) and HI is **Aug. 20, 2026,
still live** (updated from Jul 8) — per our verified dataset.

## Contact table (priority order)

| Pri | Society                           | Contact                                                                            | Why now                                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | **MSCPA** (Mississippi)           | Rachel Shirley, Dir. Marketing & Comms — rshirley@ms-cpa.org                       | IRS posted MS relief **Jul 13**; society has published **nothing** — real speed gap, newsletter only 10×/yr        |
| 2   | **LCPA** (Louisiana)              | Ann Lupo, Dir. Communications & PR — alupo@louisiana.cpa · 504.904.1125            | Fastest society (posted Jul 14). Pitch = **augment**: same-day parish-level detail so she doesn't write it herself |
| 3   | **WSCPA** (Washington)            | Jeanette Kebede, CAE, VP Comms & Tech — jkebede@wscpa.org                          | Never covered the WA relief (now **Aug. 5** deadline, 3 weeks out) — gentle concrete miss                          |
| 4   | **MICPA** (Michigan)              | Jennifer Rogers, Marketing Services Dir. — jrogers@micpa.org                       | Active news feed, zero disaster-relief coverage; MI relief new Jul 13                                              |
| 5   | **GSCPA** (Georgia)               | Brandi Kornegay, Mgr. Communications — bkornegay@gscpa.org                         | Only a stale Helene-era page; GA deadline Aug. 20 approaching                                                      |
| 6   | **ASCPA** (Arizona)               | Rosa Hernandez — rhernandez@ascpa.com (magazine/eNews submissions route)           | Whitespace; AZ relief live to Sept. 28                                                                             |
| 7   | **MTCPA** (Montana — montana.cpa) | erinn@montana.cpa (address to "marketing & comms team"; fallback info@montana.cpa) | Econnect weekly; no Fort Peck/Crow coverage (Sept. 28)                                                             |
| 8   | **WICPA** (Wisconsin)             | communications@wicpa.org (no named editor)                                         | ⚠️ Published Jul 16 (3 days after IRS Jul 13) — speed-gap DEAD; use WICPA augment variant (verified 07-21)         |
| 9   | **HSCPA** (Hawaii)                | info@hscpa.org                                                                     | News stale since 2023; HI relief **still live to Aug. 20** — "next time, same-day" pitch                           |

## Pitch email — MSCPA version (speed-gap; send first)

> **Subject:** Ready-to-publish summary of the new Mississippi IRS relief (MS-2026-02)
>
> Hi Rachel,
>
> On July 13 the IRS postponed federal filing deadlines to **Nov. 2, 2026** for taxpayers in
> Franklin, Lamar, Lawrence, Lincoln, and Wilkinson counties, after the recent storms and
> tornadoes (MS-2026-02).
>
> We verify every IRS disaster-relief notice against the irs.gov release the day it posts — it's
> what our product does. Below is a member-ready summary: dates, counties, covered returns, source
> link. **Free to run in the MSCPA newsletter or on the site, as-is or edited** — a credit line is
> appreciated but optional.
>
> If it's useful, I'll send you the same summary whenever new relief hits Mississippi — usually the
> day the IRS posts it. There's also a small widget that keeps a live list on your site:
> duedatehq.com/widget.
>
> [member notice block below]
>
> Gigi · Co-Founder, DueDateHQ · a new product from Dify

**LCPA variant (augmentation, not speed):** open by crediting their Jul 14 post, then: "next time
I can save Ann the write-up — a verified, parish-level summary the same day the IRS posts, plus a
live widget for your Disaster Response page."

**WICPA variant (augmentation — they published Jul 16, verified 07-21):**

> **Subject:** Same-day, county-level Wisconsin relief summaries — free for WICPA news
>
> Hi,
>
> Saw your July 16 item on the IRS relief for the April 13 storms — glad WICPA got it in front of
> members. Next time I can save your team the write-up: we verify every IRS disaster-relief notice
> against the irs.gov release the day it posts, and can send you a member-ready summary — dates,
> counties, covered returns, source link — the same day. Free to run as-is or edited; a credit
> line is appreciated but optional.
>
> There's also a small widget that keeps a live list of active Wisconsin relief on your site:
> duedatehq.com/widget.
>
> Gigi · Co-Founder, DueDateHQ · a new product from Dify

## Ready-to-publish member notice — Mississippi (every fact from IRS MS-2026-02)

> **IRS postpones deadlines to Nov. 2 for five Mississippi counties (MS-2026-02)**
>
> Following severe storms, straight-line winds, tornadoes and flooding, the IRS has postponed
> federal filing and payment deadlines to **Nov. 2, 2026** for taxpayers who live or have a
> business in Franklin, Lamar, Lawrence, Lincoln, and Wilkinson counties.
>
> The relief covers individual (1040), corporate (1120 / 1120-S), partnership (1065), estate &
> trust (1041), estate & gift (706/709), tax-exempt (990) and payroll & excise (941/940) returns,
> plus estimated payments, with due dates in the postponement window. Relief applies automatically
> based on the IRS address of record.
>
> Official release: [irs.gov — MS-2026-02]
> _Deadline data verified against the IRS release by [DueDateHQ](https://duedatehq.com), which
> monitors IRS and state deadline changes for CPA firms._

(LA version: swap to **LA-2026-02 · Tropical Storm Arthur · Nov. 2, 2026 · Avoyelles, St. Landry,
St. Tammany and Terrebonne parishes · FEMA 4927-DR**. WA version: **WA-2025-03 · Aug. 5, 2026 ·
9 counties** — pull exact fields from `outreach-kit/disaster-notices.json`.)

## Operating loop

Daily IRS monitor catches a new declaration → verify + update the dataset → send that state's
society the pitch/summary **same day** (this kit's template) → alert-email the state's firms →
the society post/widget links back to the hub. One event, four surfaces.
