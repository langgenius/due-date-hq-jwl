# Send ALL 205 today — from Gigi <gigi@duedatehq.com>

Decision: full send in one day (risk of spam-foldering on a brand-new domain accepted).
3 campaigns, one per track. Space them out across the day — it meaningfully lowers the spam-filter hit vs one blast.

## Step 0 — mail-tester check (2 min, do NOT skip)
1. https://www.mail-tester.com → copy the one-time address.
2. Gmail → compose From **Gigi <gigi@duedatehq.com>** → paste the Track B body → send to it.
3. Need **SPF pass + DKIM pass, score ≥ 8**. If lower, STOP and paste the report to Claude.
4. Send one to gigi@duedatehq.com itself → confirm the reply lands in your own inbox.

## Step 1 — Mailmeteor setup
- Install Mailmeteor, open Gmail (wuyuqi827@gmail.com).
- **Upgrade to a paid plan** — free tier caps at 50 emails/day; 205-in-one-day needs paid (~$10–25/mo, cancel after).
- Campaign editor: **From = Gigi <gigi@duedatehq.com>**.
- Settings → footer: **Dify's physical mailing address** + auto unsubscribe link (CAN-SPAM, required).

## Step 2 — 3 campaigns, spaced across the day
| When | Campaign | File | Count | Template |
|---|---|---|---|---|
| Morning | 1 | `ALL-trackA.csv` | 2 | Track A |
| Morning | 2 | `ALL-trackB.csv` | 63 | Track B |
| Afternoon | 3 | `ALL-trackC.csv` | 140 | Track C |

Import CSV → paste subject + body → test to yourself → Send.
If Mailmeteor offers a throttle / "send over X hours" option, turn it ON for campaign 3.

---

## TRACK A
**Subject:** `DueDateHQ — the IRS moved GA's wildfire deadline, Georgia didn't`
```
Hi {{FirstName}},
We just launched DueDateHQ — it watches the IRS and state deadline changes around the clock and tells you which of your clients each one hits. Quick example: the IRS pushed the SE Georgia wildfire deadline to Aug 20, but Georgia didn't conform (Oct 13 / Oct 28 / Feb 12).
It's free right now. If you file across a few states, worth five minutes?
Gigi
DueDateHQ — a new product from the Dify team
duedatehq.com
```

## TRACK B
**Subject:** `DueDateHQ — IRS + state deadline monitoring for your clients`
```
Hi {{FirstName}},
We just launched DueDateHQ — it watches the IRS and state deadline changes around the clock and tells you which of your clients each one hits. Simple as that.
It's free right now. If you file across a few states, worth five minutes?
Gigi
DueDateHQ — a new product from the Dify team
duedatehq.com
```

## TRACK C
**Subject:** `DueDateHQ — deadline monitoring for your S-corps and partnerships`
```
Hi {{FirstName}},
We just launched DueDateHQ — it watches the IRS and state deadline changes around the clock and tells you which of your clients each one hits. Simple as that.
It's free right now. If you've got a book of S-corps and partnerships, worth five minutes?
Gigi
DueDateHQ — a new product from the Dify team
duedatehq.com
```

---

## After sending
- Watch replies in your inbox (they route back via gigi@duedatehq.com).
- Follow-ups: touch 2 ≈ 4 days, touch 3 ≈ 10 days after touch 1 — bodies in `duedatehq-OUTREACH-sequence.csv`.
- If Gmail shows bounce-backs, forward them to Claude to build the suppression list.
