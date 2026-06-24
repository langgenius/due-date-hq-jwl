# Loom script + shot list — design walkthrough

**Goal:** ~2.5 minutes. My voice over a screen recording, so the design decisions
get narrated even though I'm not presenting live. Record it yourself, or hand the
shot list to whoever's driving and read the VO over their clicks.

**Setup before recording:** logged in, demo firm loaded, window at ≥1280px wide
(the xl layout — that's the design baseline). Start on `/today`.

---

### 0:00 — Open on /today _(stay ~25s)_

**Shot:** the dashboard as it loads. Don't click yet.

> "Hi — I'm Yuqi, I owned the design on DueDateHQ. Quick thing before [teammate]
> takes you through it: I didn't design screens, I designed a system, and you can
> see it from the first frame. Notice the calm here is _gray_, not green —
> everything that's fine recedes, so your eye goes straight to what's at risk. And
> urgency is carried by size and color, never by bold-on-red. That restraint is a
> written rule, not a mood."

### 0:25 — Into a deadline detail _(click one risk row · ~35s)_

**Shot:** click a Critical/at-risk row → the deadline detail page opens.

> "This is the core workbench. Two decisions to watch. First — the status here
> isn't a dropdown you pick from. Status is _observed_: it advances from real
> events, and what we surface instead is the trigger and whatever's blocking it.
> Second — the workflow doesn't show as equal steps. The active stage gets the
> room; future stages are ghosted. Attention follows relevance. And these sections
> scroll — they're anchors, not tabs — because a deadline is one continuous story,
> not a filing cabinet."

### 1:00 — Open an alert _(navigate to /alerts → open one · ~35s)_

**Shot:** open a high-priority alert detail.

> "Alerts are our signature. A regulatory change comes in, and instead of a
> notification, you get a _decision_: here's the change, here's your call, here's
> who it hits. The whole page funnels to one action. And see these little source
> chips? Every AI-derived fact carries its provenance — the statute, the URL, who
> verified it. The rule is: no provenance, no render. If we can't cite it, we show
> 'not verified yet' instead of a confident guess. A CPA won't act on a number
> they can't trace."

### 1:35 — The system underneath _(go to /preview · ~25s)_

**Shot:** the specimen gallery.

> "All of this is built from one vocabulary — every pattern has exactly one
> canonical primitive, no hand-rolled one-offs. That's what lets more than one
> person build on it without it drifting. The screens you're about to see are the
> _output_ of this system, not a pile of separate mockups."

### 2:00 — Close _(over /today again, or static · ~20s)_

**Shot:** back to /today, or a still.

> "One last thing on how it got made: I work AI-first — a first version in Claude
> Code against real data, refine the craft in Pencil, ship it back in code. So
> nothing you're seeing is an aspirational mock — it's the real build. Enjoy the
> walkthrough, and grab me after if you want the why behind any of it."

---

**Timing cheat:** 0:00 today · 0:25 deadline · 1:00 alert · 1:35 /preview ·
2:00 close. If you're running long, cut the /preview stop first — the two
must-keeps are the **status-isn't-a-dropdown** beat and the **no-provenance-no-render**
beat. They're the most "designed a system" moments.
