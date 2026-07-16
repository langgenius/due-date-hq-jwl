# State CPA society distribution kit (2026-07-16)

**The play:** societies want to notify members when IRS relief hits their state; we verify those
notices same-day. Don't sell the product — hand them **ready-to-publish member-notice content**,
free, sourced to irs.gov. One society email reaches thousands of CPAs with authority attached.
Ask = tiny ("want these when they hit your state?"). Credit line optional, never required.

**Contacts:** researched 2026-07-16 from each society's own site (full notes:
`scratchpad society-comms-contacts.md`, summarized below). Deadlines below are from OUR verified DB
(`disaster-notices.ts`) — the research notes contained two stale values (WA is Aug 5 not May 1;
HI is Aug 20 and still live, not "closed Jul 8").

| Priority | Society | Contact | Angle |
|---|---|---|---|
| **1** | **MSCPA** (ms-cpa.org) | **Rachel Shirley**, Dir. Marketing & Comms — rshirley@ms-cpa.org | IRS posted MS relief **Jul 13**; ms-cpa.org has published **nothing** → fill the gap same-day |
| 2 | LCPA (louisiana.cpa) | Ann Lupo, Dir. Communications & PR — alupo@louisiana.cpa | They're FAST (posted Arthur Jul 14) — angle is "we make Ann's job zero-effort + parish-level detail", not "you're slow" |
| 3 | WSCPA (wscpa.org) | Jeanette Kebede, VP Communications — jkebede@wscpa.org | WA relief (now **Aug 5**) not covered on their blog; soonest deadline in the country |
| 4 | GSCPA (gscpa.org) | Brandi Kornegay, Mgr. Communications — bkornegay@gscpa.org | Only a stale Helene-era resource page; GA deadline **Aug 20** |
| 5 | MICPA (micpa.org) | Jennifer Rogers, Marketing Services Dir. — jrogers@micpa.org | Active news feed, zero disaster coverage; MI relief fresh (Jul 13) |
| 6 | WICPA (wicpa.org) | communications@wicpa.org (no named editor) | WI relief fresh (Jul 13), nothing posted |
| 7 | ASCPA (ascpa.com) | Rosa Hernandez — rhernandez@ascpa.com (mag/eNews submissions route) | AZ tribal relief to Sept 28, no coverage |
| 8 | MTCPA (montana.cpa) | erinn@montana.cpa (comms; surname unconfirmed — open with "marketing & communications team") | Two tribal reliefs to Sept 28, Econnect weekly |
| 9 | HSCPA (hscpa.org) | info@hscpa.org (no editor public) | News page stale since 2023; HI relief **still live to Aug 20** |

> **NOTE (v3, 2026-07-17):** final send-ready versions of all 9 emails (freshest-notice-first order,
> full product-highlight line) live in the "society-emails-v3" artifact — treat that as canonical.

## Email 1 — MSCPA (SEND FIRST, today)

**To:** rshirley@ms-cpa.org
**Subject:** Ready-to-publish member notice — IRS moved Mississippi deadlines to Nov. 2 (MS-2026-02)

> Hi Rachel,
>
> On July 13 the IRS postponed federal filing deadlines to Nov. 2, 2026 for taxpayers in five
> Mississippi counties after the severe storms and tornadoes (relief MS-2026-02). Since I didn't
> see it on ms-cpa.org yet, here's a member-ready summary — free to republish in the newsletter or
> on the site, as-is or edited, no strings. A "verified by DueDateHQ" credit is appreciated but
> optional.
>
> DueDateHQ watches the IRS, all 50 state tax agencies and FEMA around the clock, verifies every
> change against the official source, and shows firms exactly which of their clients it affects — free in beta. If useful, I'll send you the same summary whenever new relief hits Mississippi — usually
> same-day.
>
> ---
>
> **IRS postpones deadlines to Nov. 2 for five Mississippi counties (MS-2026-02)**
>
> Following the severe storms, straight-line winds, tornadoes and flooding, the IRS has postponed
> federal filing and payment deadlines to **Nov. 2, 2026** for taxpayers who live or have a
> business in **Franklin, Lamar, Lawrence, Lincoln and Wilkinson counties** (FEMA 4922-DR).
>
> The relief covers individual (1040), corporate (1120 / 1120-S), partnership (1065), estate &
> trust (1041), estate & gift (706/709), tax-exempt (990) and payroll & excise (941/940) returns,
> plus estimated payments, with due dates in the postponement window. Relief applies automatically
> based on the IRS address of record.
>
> Official release: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-tornadoes-and-flooding-in-the-state-of-mississippi-various-deadlines-postponed-to-nov-2-2026
>
> ---
>
> Gigi · Co-Founder, DueDateHQ · duedatehq.com
>
> P.S. If it's easier than publishing summaries, we also have a free embeddable widget — one
> script tag shows members the current IRS postponements for Mississippi (auto-updates, every date
> linked to irs.gov): https://duedatehq.com/widget

## Email 2 — LCPA variant (different angle: they're fast)

**To:** alupo@louisiana.cpa
**Subject:** Same-day verified summaries for Louisiana IRS relief (saw your TS Arthur post)

> Hi Ann,
>
> Saw LCPA's Tropical Storm Arthur notice go up on the 14th — fastest of any state society we
> track. DueDateHQ watches the IRS, all 50 state tax agencies and FEMA around the clock and verifies every
> change against the official source (11 active reliefs nationwide right now), with parish-level detail and the covered returns broken out.
>
> If it would save you time, I'll send you a member-ready, source-linked summary the day anything
> new hits Louisiana — free, publish however you like, credit optional. And if you'd rather it be
> fully hands-off: a free widget for lcpa.org that shows the current Louisiana postponements and
> updates itself — https://duedatehq.com/widget
>
> Gigi · Co-Founder, DueDateHQ · duedatehq.com

## Rollout
- Today: MSCPA (Email 1). This week: LCPA, WSCPA, GSCPA (adapt Email 1's structure; swap the
  state's verified notice block from `disaster-notices.ts`).
- Next week: MICPA / WICPA / ASCPA / MTCPA / HSCPA.
- **Standing loop:** when the daily IRS monitor reports a NEW declaration → send that state's
  society the pitch the same day (freshness is the whole pitch).
- Every email carries the widget P.S. (see `widget-promo-kit-2026-07.md`).

## Red lines
Facts only from `disaster-notices.ts` / the cited IRS release. Never imply the society is slow
(except factually, gently, where nothing is posted). Never make the credit line a condition.
