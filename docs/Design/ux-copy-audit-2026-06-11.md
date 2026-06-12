# UX Copy Audit — Full Application (2026-06-11)

**Scope:** every route and feature surface in `apps/app` (~45 routes, 21 feature areas), audited against the voice contract in `.impeccable.md` — _calm · capable · sharp; a 15-year-veteran tax partner; never cheeky, never apologetic, never enterprise-speak_ — plus the established copy rules (no fiction on canvas, status is observed not chosen, demote don't delete).

**Method:** ten parallel read-only audits (auth/entry, today, alerts, deadlines, clients, rules, migration/readiness, reminders/notifications, settings/admin, calendar/workload/audit/shell), plus a five-pass gap-closing sweep (shared primitives & command palette, the remaining 25 alerts components, exhaustive line-indexed extraction of the three largest files, server-sent copy — emails/digest/push/ICS, and the marketing site). Synthesized and editorially curated. Every quoted string was read from source; the highest-impact claims were re-verified by grep before publication.

**Verdict (harsh, as requested):** the happy-path copy is genuinely good — confident, jargon-correct for CPAs, no emoji, no sparkle. But the app currently speaks with **at least four different voices**: a calm tax partner (deadlines, clients), a chirpy fintech app (empty states, splash), a backend engineer (toasts, audit labels, migration errors), and an enterprise IT manual (settings, permissions gates). The single worst offender is systemic: **one lazy error fallback is pasted 108 times**. Consistency — the thing you asked about — is the weakest dimension: the same concept has 2–4 names on different screens (materials/documents/items; practice/workspace; Status/Summary; undo/revert/restore/reopen). None of this is hard to fix; almost all of it is find-and-replace plus discipline.

Overall grade by area:

| Area                      | Grade | One-line diagnosis                                                            |
| ------------------------- | ----- | ----------------------------------------------------------------------------- |
| Deadlines detail          | B     | Strong domain copy; tab-label split and materials vocabulary drift            |
| Clients                   | B+    | Cleanest area; minor casing and grammar variance                              |
| Alerts                    | B−    | Strong verbs (Apply/Dismiss/Revert), but engineering jargon leaks into toasts |
| Today                     | B−    | Good empty-state branching; "caught up" cheer + "% conf" abbreviation         |
| Rules                     | C+    | "Concrete draft" and bureaucratic passives undercut authority                 |
| Migration                 | C+    | The trust-building moment says "rows" and "data" instead of "clients"         |
| Auth & onboarding         | C     | "The engine", "source-defined calendar", error boilerplate                    |
| Reminders/notifications   | C−    | Worst fiction offender: promises features that don't exist                    |
| Settings/admin            | C−    | "Workspace configuration", poetic subtitles, 13+ pasted error fallbacks       |
| Calendar/workload/audit   | C+    | "Event stream", "actor", "window" — engineering-first labels                  |
| Shared primitives/palette | A−    | Cleanest layer in the app; one "workspace" leak in the document title         |
| Server-sent emails        | C     | Client-facing reminders sound like a subscription service, not a CPA          |
| Marketing site            | B     | On-brand voice; unqualified time/SLA claims and tier-name wobble              |

---

## Part 1 — Systemic failures (fix once, fix everywhere)

These six patterns account for the majority of all findings. Fixing them as _patterns_ (not as individual strings) is the only way the app converges on one voice.

### S1. The 108× error fallback — `[P0]`

```
"Check your network and try again. If this keeps happening, contact support."
```

Pasted **108 times** across auth, settings, practice, reminders, clients, calendar. It blames the user's network for every failure (validation, permissions, server errors alike), offers no diagnosis, and reads as a shrug. A 15-year-veteran partner doesn't say "probably your wifi" to every question.

**Canonical error pattern (adopt app-wide):**

- **Title:** `Couldn't [verb] [object]` — keep this existing pattern; it is active, honest, human. (Reject "X failed" — system-speak.)
- **Description:** the _specific_ cause when the RPC error carries one (`rpcErrorMessage()` already does this on /calendar — that page is the model), else ONE concrete recovery step tied to the action ("Check the email address and resend", "Refresh and try again"). "Contact support" is a last resort, not a chorus.
- Never "Please". Never "Something went wrong" without a noun.

### S2. The "caught up" cheer family — `[P0]`

Six live sites speak congratulatory fintech to a stressed CPA:

| Site                              | Current                                                       |
| --------------------------------- | ------------------------------------------------------------- |
| `splash.tsx:160`                  | "Nothing changed while you were away — you're all caught up." |
| `needs-attention-section.tsx:143` | "No alerts — you're caught up"                                |
| `AlertsListPage.tsx:1837`         | "No alerts — you're caught up"                                |
| `actions-list.tsx:508`            | "You're all caught up"                                        |
| `rules.library.tsx:947`           | "You're all caught up"                                        |
| `routes/preview.tsx:1751`         | (specimen copy of the same)                                   |

A quiet queue is a _fact_, not an achievement. Replace with factual calm, one phrasing per surface type:

- Alert queues: **"No alerts right now."** (+ existing "when {source} publishes a change…" body)
- Review queues: **"Review queue is clear."**
- Splash: **"No activity since your last visit."**

### S3. Engineering jargon leaking through the wall — `[P0/P1]`

The backend's vocabulary is visible on screen. Kill list (verbatim, with canonical replacement):

| Current (user-facing)                                     | Where                                      | Replace with                                                         |
| --------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| "Audit + evidence written. Undo within 24h."              | AlertDetailDrawer.tsx:863, 978             | "Recorded in the audit log. Undo within 24 hours."                   |
| "After that, the change is committed."                    | AlertDetailDrawer.tsx:558                  | "After that, it can't be undone."                                    |
| "Notifications queued for…"                               | AlertDetailDrawer.tsx:943                  | "Review request sent to…"                                            |
| "no data rows" / "up to 1,000 rows"                       | Step1Intake.tsx:251, 262, 599              | "clients" — the wizard imports clients, not rows                     |
| "the engine"                                              | onboarding.tsx:241                         | "DueDateHQ"                                                          |
| "source-defined calendar"                                 | rule-review-prompt.tsx:72                  | "this state publishes its own deadline calendar"                     |
| "Accepted AI concrete draft from rule detail review."     | rule-detail-drawer.tsx:1066                | "Verified the AI-drafted due-date logic"                             |
| "how often this fires"                                    | reminder-template-editor-page.tsx:241      | "how often we send this"                                             |
| "Trigger · anchor point"                                  | reminder-template-editor-page.tsx:257      | "When to send · days before or after the deadline"                   |
| "Recent digest runs" / "No morning digests have run yet." | notification-preferences-page.tsx:756, 764 | "Recent digests" / "No digests sent yet."                            |
| "Event stream" (card title)                               | audit-log-table.tsx:887                    | "Audit log" — one name; the sidebar, page title, and card must agree |
| "Search actor, entity, action, reason"                    | audit-log-page.tsx:782                     | "Search by person, item, action, or reason"                          |
| "Workload window"                                         | workload-page.tsx:102                      | "Next 7 / 14 / 30 days"                                              |
| "before deadlines fan out"                                | SuccessModal.tsx:187                       | "before deadlines generate"                                          |
| "AI summarisation unavailable."                           | MorningSweepDialog.tsx:247                 | British spelling + jargon: "Briefing unavailable."                   |

### S4. Fiction in copy — promises the product doesn't keep — `[P0]`

Violates the no-fiction rule directly. Copy must trace to real behavior:

| Claim                                                                                                          | Reality                                       | Fix                                 |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------- |
| "Body · supports markdown" (reminder-template-editor-page.tsx:201)                                             | The formatting toolbar is `disabled`          | Remove the hint or ship the toolbar |
| "Connect your Slack workspace to receive @mentions and digests there." (notification-preferences-page.tsx:240) | Code comment: "Slack integration not modeled" | Hide the row or label it honestly   |
| "DueDateHQ for iOS · 2 devices registered" (notification-preferences-page.tsx:224)                             | Hardcoded sample                              | Data-drive or remove                |
| "Edit per tax type or per client tier." (reminder-templates-page.tsx:59)                                       | No such fields on the contract                | "Customize the subject and body."   |
| "Quick tour (90 sec)" / "What's new in 6.7" (splash.tsx:197, 205)                                              | Buttons wired to nothing                      | Remove until real                   |
| "Insert variable" (editor, disabled, unexplained)                                                              | Not shipped                                   | Remove or explain                   |

### S5. Broken and hand-rolled plurals — `[P1]`, some crash-adjacent

Hardcoded English plurals read as bugs and break localization (and note the known lingui `plural()`+`i18n._` runtime-crash footgun — always `<Plural>`):

- `audit-log-table.tsx:116` — "{n} events" even when n = 1
- `members-page.tsx:319` — "{ownerCount} owner · {managedCount} managed" — wrong above 1
- `rule-review-prompt.tsx:98` — `jurisdiction{count === 1 ? '' : 's'}` — ternary plural, migrate to `<Plural>`
- `generation-preview-tab.tsx:1098` — "${n} deadline, will fire 30 / 7-day reminders" — singular/plural mismatch mid-sentence
- `alerts-notifications-bell.tsx:163` — "{unreadCount} unread" — unread _what_
- `migration.new.tsx:263` — "rule is queued / rules are queued… they can become" — tense drifts inside the plural branches

### S6. One concept, many names — the consistency table

This is the cohesion failure you asked about. Lock these now; every future string checks against this table:

| Concept                          | Variants found in UI today                                                                | **Canonical**                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The firm's account               | practice · workspace · firm · organization                                                | **practice**                                                                                                        | Four confirmed "workspace" sites: `settings.tsx:40`, the **document title** `route-summary.ts:46` ("Workspace settings \| DueDateHQ" — in every browser tab), `CommandPalette.tsx:268`, and the zh invitation email (`messages.ts:26` "工作区"). Marketing also wobbles: "practice workspace" (Solo) vs "production practice" (Pro/Team). |
| A tracked due item               | deadline (UI) · obligation (internal) · filing plan                                       | **deadline**                                                                                                        | Already mostly right. "Filing plans" (onboarding.tsx:351) leaks internals.                                                                                                                                                                                                                                                                |
| Detail tab 1                     | Status (page mode) · Summary (panel/sheet mode) — `ObligationQueueDetailDrawer.tsx:1662`  | **Status**                                                                                                          | The 4-tab contract is locked (Status · Materials · Record · Audit). The panel label is a leftover.                                                                                                                                                                                                                                        |
| Detail tab 3                     | Record (page mode) · Evidence (panel/sheet mode) — `ObligationQueueDetailDrawer.tsx:1720` | **Record**                                                                                                          | Same disease as tab 1, found in the gap pass. "Evidence" additionally collides with the workpapers vocabulary inside the tab itself.                                                                                                                                                                                                      |
| Client paperwork being collected | materials · documents · items · evidence · source documents                               | **materials** (flow/tab) · **items** (inside a checklist) · **source documents** only when distinguishing originals | "Evidence" never user-facing.                                                                                                                                                                                                                                                                                                             |
| Pulse feature objects            | Alerts (feature) vs "deadline alerts", "important deadline alerts" in notifications copy  | **alert = Pulse only**                                                                                              | Generic notification copy says "reminders" / "notifications" — `notifications-page.tsx:236` collides today.                                                                                                                                                                                                                               |
| Reversal verbs                   | Undo · Revert · Restore · Reopen · roll back                                              | **Undo** (time-boxed reversal of apply/import) · **Restore** (bring back a dismissed alert)                         | "Reopen" (AlertsListPage.tsx:1254) and "Revert batch" (SuccessModal.tsx:175) break it.                                                                                                                                                                                                                                                    |
| Invite mechanism                 | magic link · invitation link · invite                                                     | **invitation link**                                                                                                 | "Magic link" (members-page.tsx:402, 625, 1113) is consumer-fintech voice.                                                                                                                                                                                                                                                                 |
| One-time auth code               | 6-digit code · verification code · code · OTP                                             | **code** ("the code we sent to {email}")                                                                            |                                                                                                                                                                                                                                                                                                                                           |
| Monitored authority feed         | source · feed · source feed · rule sources                                                | **source**                                                                                                          | StatBand "Feeds monitored" vs page "sources" disagree today.                                                                                                                                                                                                                                                                              |
| Audit surface                    | Audit log · Event stream · audit events · Activity                                        | **Audit log**                                                                                                       |                                                                                                                                                                                                                                                                                                                                           |
| Member states                    | Suspend / Remove / Revoke                                                                 | (already clean — keep)                                                                                              | Suspend = reversible, Remove = permanent, Revoke = sessions. Good distinction; document it.                                                                                                                                                                                                                                               |

---

## Part 2 — Screen-by-screen findings

Severity: **P0** = misleading/confusing/blocking · **P1** = voice violation or inconsistency · **P2** = polish. Findings already covered by a Part-1 systemic pattern are not repeated unless screen-specific.

### 2.1 Auth & entry (login, invite, 2FA, splash, onboarding, error pages)

- **[P0]** `login.tsx:241` — "Redirecting to Google…" → **"Signing in with Google…"** Process narration; mirrors the button instead of the plumbing.
- **[P0]** `onboarding.tsx:151` — "Please enter at least 2 characters." → **"Practice name needs at least 2 characters."** No "Please" in validation.
- **[P1]** `onboarding.tsx:241` — "A few details the engine needs before it can schedule anything." → **"A few details so DueDateHQ can schedule deadlines. You can change these later in Settings."**
- **[P1]** `state-rule-activation-selector.tsx:122` — "Selected states activate with federal rules. Skip to use federal rules only…" — "activate" + ambiguous "skip". → **"Add state rules alongside federal. Start with federal only and add states later from the Rule Library."**
- **[P1]** `state-rule-activation-selector.tsx:201` — run-on, jargon ("marked for review", "deadlines activate"). Split: **"Some states publish their own deadline calendars. After setup, review those rules in the Rule Library — deadlines generate once you approve them."**
- **[P1]** `accept-invite.tsx:154` — "Ask the practice owner to send a new invitation." — assumes the reader knows who that is. → **"Ask whoever invited you to send a new link."**
- **[P1]** `two-factor.tsx:123` — "Verifying…" button text — the spinner already says it; drop the narration.
- **[P1]** `account.security.tsx:224` — "Owners need MFA before sensitive production actions." — "sensitive production actions" is ops-speak. → **"Owners need MFA to change rules and firm settings."**
- **[P1]** `account-security-two-factor-setup.tsx:137` — "Store them somewhere private" → **"Save them in a password manager — they won't be shown again."**
- **[P2]** `onboarding.tsx:265` — placeholder "e.g. Brightline CPA" — reads like a real firm; use an obviously generic example.
- **[P2]** `onboarding.tsx:345` — "Create practice & activate jurisdictions" → **"Create practice"** (the activation is implied; ampersand + jargon).
- **[P2]** `splash.tsx` — dead "Quick tour (90 sec)" / "What's new in 6.7" buttons (see S4).
- **[P2]** `login.tsx:510` — "v2.18.4 · build 9c3a1f" — drop the build hash from user chrome.

### 2.2 /today (dashboard)

- **[P0]** `merged-brief-card.tsx:284` — "You're clear — nothing due this month." — **factually wrong**: the condition is `totalActive === 0`, not month-scoped. → **"No open deadlines right now."**
- **[P1]** `dashboard.tsx:239` — italic lowercase "loading…" next to the page title → **"Loading…"** (or a skeleton; never lowercase prose-fragment).
- **[P1]** `needs-attention-section.tsx:165` — "Last check: {time}." dangles as a footnote span. Integrate: **"…it shows up here. Last checked {time}."**
- **[P1]** `actions-list.tsx:569` — "a stalled evidence request, a rejected filing, a 5-day client silence" — "evidence request" is internal vocabulary; "5-day" is unexplained precision. → **"a stalled document request, a rejected filing, a client gone quiet"**.
- **[P1]** `needs-attention-card.tsx:349` — "{n}% conf" — unexplained abbreviation on a surface with no column header to define it. Spell out **"{n}% confidence"** here; keep the short form only where a header/tooltip defines it.
- **[P2]** `extension-chip.tsx:22` — "Payment side is NOT extended." — all-caps shouting. → **"Filing extended — payment is not."**
- **[P2]** `daily-brief-card.tsx:452` + footnote — chip says "Failed", caption says "will retry automatically" — align the pair: chip **"Failed"**, caption **"We'll retry shortly."**

### 2.3 Alerts

- **[P0]** `AlertDetailDrawer.tsx:525` — "The change couldn't be written." → **"The change couldn't be applied."** (see S3 for the full jargon family).
- **[P1]** `AlertsListPage.tsx:1254` — "You can reopen them from the History tab." → **"Restore them from the History tab."** (verb lock, S6).
- **[P1]** `AlertDetailDrawer.tsx:1016` — "Confirm the new date and deadlines before applying" — "Confirm" collides with the Confirm button elsewhere. → **"Complete the new date and deadlines before applying."**
- **[P1]** `DecisionBanners` — "Pending your review" vs "Awaiting your decision" — two labels for adjacent states; pick **"Awaiting your decision"** for actionable, **"Awaiting review"** for review-only, and never mix.
- **[P1]** `MorningSweepDialog.tsx:247, 267` — "Brewing your briefing…" — cheeky on a professional surface. → **"Preparing your briefing…"**
- **[P2]** `AlertsListPage.tsx:266` — "Dismissed {n} · {m} couldn't be dismissed" — interpunct joins a sentence. → **"Dismissed {n} alerts — {m} couldn't be dismissed."**
- **[P2]** `AlertDetailDrawer.tsx:444` — "Apply, review, or dismiss to resolve." — instruction restating the three visible buttons; cut.

### 2.4 Deadlines (/deadlines list + detail)

- **[P0]** `ObligationQueueDetailDrawer.tsx:1662` — Status/Summary tab split (S6). Lock to **Status** in all three modes.
- **[P1]** `DeadlineRow` "Mark filed" vs drawer "Mark as filed" — unify to **"Mark as filed"** everywhere.
- **[P1]** `ObligationQueueDetailDrawer.tsx:214` — bare "Assign" → **"Assign teammate"** (verb+noun rule).
- **[P1]** `panels.tsx:156/160` — "All {n} items in" vs "All {n} items in workpapers" → **"All {n} items received"** in both stages.
- **[P1]** `panels.tsx:182` — "Requested from client" + "Sent {n} items — awaiting client response" — tense drift. → **"Awaiting client response · {n} items requested {date}"**.
- **[P1]** `ObligationQueueDetailDrawer.tsx:1234/1241` — "Loading deadline detail…" / "Couldn't load deadline detail." — keep the error title pattern but add recovery: description **"Refresh or try again."** + existing Retry. Loading: just **"Loading…"**.
- **[P1]** `dialogs.tsx:638` — "No owner or partner available" duplicated by the FieldDescription below it; collapse to the description ("Add an active owner or partner before sending an input request.").
- **[P2]** `dialogs.tsx:868` — badge "Email will be queued" → **"Email queued"**.
- **[P2]** `dialogs.tsx:780` — "Reason is required." + label — fold into the label: **"Reason (required)"**.

### 2.5 Clients

- **[P1]** `ClientDetailWorkspace.tsx:295` — "Needs filing state" → **"Missing filing state"** (aligns with the "Add filing state" action).
- **[P1]** `ClientDetailWorkspace.tsx:198` — badge grammar drift: "1 statutory late" / "1 filed — payment overdue" / "…payments overdue" — normalize all badges to noun phrases with `<Plural>` where counts vary.
- **[P1]** `clients.tsx:283` — "Nd late" / "Nd days" — cryptic. → **"{n}d late"** only if the queue uses the identical short form; otherwise spell out.
- **[P2]** `ClientDetailWorkspace.tsx:173` — lowercase "next due {date}" in a sentence position → **"Next due {date}"**.
- **[P2]** `CreateClientDialog.tsx:445` — "Client importance" vs facts panel "Importance" → **"Importance"** in both.
- **[P2]** `ClientsEmptyState.tsx:143` — bare "4 min" stat → **"Set up in 4 min"**.

### 2.6 Rules

- **[P0]** `rule-detail-drawer.tsx:1288` — "Couldn't apply rule" — keep title, add the cause from `error.code` in the description.
- **[P1]** `rules.library.tsx:268` — group header "Needs review" → **"Awaiting review"** (and align with the alerts banner vocabulary, §2.3).
- **[P1]** `rule-detail-drawer.tsx:399–413` — "Holiday rollover: source-adjusted" split across two lines reads unfinished. → **"Holidays: uses the source's published calendar"** (or state the actual contract).
- **[P1]** `jurisdiction-rule-table.tsx:610` — tooltip "Never re-reviewed" → **"Created — not yet reviewed"**.
- **[P1]** `sources-tab.tsx:358` — "All active" vs "{n} paused" asymmetry → always show both: **"{a} active · {p} paused"**.
- **[P2]** `rule-detail-drawer.tsx:1180` — "Decisions are recorded in the audit ledger." → **"Your decision is recorded in the audit log."** (also: it's "audit log" everywhere else, not "ledger").
- **[P2]** `generation-preview-tab.tsx:366` — drop "exactly": **"Target year must be one year after the source year."**
- **[P2]** `temporary-rules-tab.tsx:148` — "Due {date}" / "Due-date extension" / "Penalty waiver" ordering drift — standardize the chip family.

### 2.7 Migration & readiness (the trust-building moment)

- **[P0]** `Step1Intake.tsx:251/262/599` — "rows"/"data rows"/"header" (S3). The user is importing **clients**.
- **[P0]** `Step4Preview.tsx:290` — "state deadlines that need reviewed practice rules first" — broken passive. → **"{n} deadlines won't generate until you review the state rules."**
- **[P0]** `SuccessModal.tsx:111` — "Nothing will email a client until you turn the matching rule on." — double negative framing at the moment of success. → **"No emails send until you turn a rule on — you're in control of every send."**
- **[P0]** `Step4Preview.tsx:256` — "Audit log captures every AI decision" → **"The audit log records every mapping and value change."** (specific, not anthropomorphic).
- **[P1]** `Step1Intake.tsx:541` — "any shape, we'll figure it out" — undersells the AI as a shrug. → **"Paste your client list — any format. Include column names if you have them."**
- **[P1]** `Step1Intake.tsx:368` — "Please trim or split the export." → drop "Please": **"Trim or split the export, then re-upload."**
- **[P1]** `Step1Intake.tsx:702` — SSN notice is 4 sentences of hedging. → **"We blocked SSN-like columns to protect client data — they're never sent to the AI. If a flagged column is actually an EIN, map it yourself in the next step. Blocked: {list}."**
- **[P1]** `Step2Mapping.tsx:169` — "matched your columns to DueDateHQ fields by their names… fix any that look off" → **"AI wasn't available, so we matched columns by name. Review and fix any mismatches below."**
- **[P1]** `Step2Mapping.tsx:189/194` — twin fallback states, one calm, one with "Please" — unify; both end **"Map your columns below to continue."**
- **[P1]** `Step3Normalize.tsx:226` — "No values needed cleanup" — "cleanup" implies dirty data; → **"No values needed changes."** (apply to the whole "clean/cleanup" family in Step 3).
- **[P1]** `WizardShell.tsx:320` — "will be lost" → **"will be discarded"** (calm, specific).
- **[P1]** `readiness.tsx:45` — "Readiness link is not available." → **"This link is no longer active. Ask your CPA to send a new one."** (client-facing surface; needs the recovery path).
- **[P1]** `SuccessModal.tsx:175` — "Revert batch" → **"Undo import"** (verb lock, S6).
- **[P2]** `OnboardingSkipModal.tsx:81` — "~5 minutes" → **"About 5 minutes"**.

### 2.8 Reminders & notifications

(The worst fiction offenders are in S4. Additional:)

- **[P0]** `reminders-page.tsx:290` — "No reminder deliveries have been recorded yet." → **"No reminders sent yet."**
- **[P0]** `notification-preferences-page.tsx:195` — "Where DueDateHQ can reach you." → **"How you get notified — per-type rules below override these channels."**
- **[P1]** `reminders-page.tsx:89–98` — four template descriptions in three different grammatical shapes ("Sent to clients…", "Used from Send to client…", "Practice-managed reminder template.") — normalize all to **"Sent to clients {when} — {purpose}."**
- **[P1]** `reminder-template-editor-page.tsx:192` — "shown in inbox previews" → **"appears in the recipient's email preview"**.
- **[P1]** `notification-preferences-page.tsx:568` — "we hold non-urgent items until your next active period" — vague "hold", undefined "non-urgent". → **"Non-urgent notifications wait until morning. High-impact alerts and same-day deadlines always come through."** (also replaces the "bypass quiet hours" sentence at :627).
- **[P1]** `notifications-page.tsx:137` — "Everything that wants your attention — Alerts, deadline reminders, system updates." — anthropomorphic + Alert collision (S6). → **"Mentions, deadline reminders, and assignment changes — everything that needs you, in one place."**
- **[P1]** `notifications-page.tsx:161` — placeholder "Filter inbox" vs aria-label "Filter notifications" — same control, one name.
- **[P2]** `reminders-page.tsx:52–82` — status badge casing varies; pick title case ("Sent", "Failed", "Queued", "Skipped") and apply to every status pill app-wide.
- **[P2]** `reminders-page.tsx:428` — toggle label "Template active" → **"Active"**.

### 2.9 Settings, members, billing, practice

- **[P0]** `settings.tsx:40` — "Workspace configuration for this practice" — the flagship terminology collision (S6). → **"Practice settings — account, identity, team, billing."**
- **[P1]** `settings.profile.tsx:414` — subtitle "How the product feels for you" — poetic filler. → **"Language, date, time, and week-start formats."**
- **[P1]** `settings.profile.tsx:315` + `practice.tsx:315` — same overlong validation pasted twice: "Practice name needs at least 2 characters — this is your firm's display name across DueDateHQ." → keep the rule, move the explanation to helper text; extract to one constant.
- **[P1]** `members-page.tsx:402/625/1113` — "magic link" ×3 → **"invitation link"** (S6).
- **[P1]** `members-page.tsx:365` — "owner read-only · self read-only" → **"You can't change the owner's role or your own."**
- **[P1]** `members-page.tsx:479` — "Remove from practice (1)" — mystery "(1)". Drop it.
- **[P1]** `billing.tsx:296` — permissions gate paragraph in enterprise voice → **"Only the practice owner can view billing."** + who to ask.
- **[P2]** `settings.profile.tsx:473` — "Firm data stays for 30 days, then is permanently destroyed." — "destroyed" is dramatic; "firm data" vague. → **"Your practice's data is kept 30 days, then permanently deleted. This can't be undone."**
- **[P2]** `settings.profile.tsx:460` — "Request export" button for an unshipped RPC (S4 fiction) — hide or mark honestly.
- **[P2]** `billing.tsx:376` — "Provider hosted" → **"Handled by Stripe"**.
- **[P2]** `billing.success.tsx:149` — "This usually clears within a minute." → **"Stripe is still confirming — this typically takes under a minute."**
- **[P2]** `practice.tsx:569` — "Note: changes can't be reverted automatically…" → drop "Note:"; lead with the consequence.

### 2.10 Calendar, workload, audit log, app shell

- **[P1]** `workload-page.tsx:199` — "No open deadlines match the workload window." → **"No deadlines due in the next {n} days."** (state the fact, not the filter mechanics).
- **[P1]** `workload-page.tsx:87` — "Shared deadline operations for Pro, Team, and Enterprise plans." → **"Team workload across shared deadlines. Pro plan and above."**
- **[P1]** `calendar-page.tsx:268` — "will silently stop syncing" — "silently" reads as a bug. → **"Subscribed devices will disconnect — the old URL stops working."**
- **[P1]** `audit-log-page.tsx:736` — permissions copy: "Contact the practice owner if you need audit access." → align with the canonical gate pattern (one sentence: who can see it; one sentence: who to ask).
- **[P2]** `audit-log-page.tsx:245` — KPI captions "filed / e-file", "auth / export", "automated + decisions" — slash-shorthand; spell out once.
- **[P2]** `app-shell-nav.tsx:275` — system-status line flips between scope ("All sources healthy") and problem ("{n} sources need attention") — keep the stable frame: always lead with state.
- **[P2]** `calendar-page.tsx:597` — bare "Disable" → **"Disable feed"** (matches its own dialog title).

### 2.11 Shared primitives, command palette, route titles (gap pass)

The good news first: this layer is the cleanest in the app — `<Plural>` used correctly throughout, verb+object buttons, honest empty states. Findings:

- **[P0]** `route-summary.ts:46` — document title `Workspace settings | DueDateHQ` — the terminology violation lives in the browser tab itself. → **"Settings | DueDateHQ"** (route titles otherwise match their H1s and nav labels — verified table in audit notes).
- **[P1]** `CommandPalette.tsx:268` — "Workspace configuration hub — Practice, team, billing, automation." — says both names in one sentence. → **"Practice settings — team, billing, automation."**
- **[P2]** `low-confidence-badge.tsx:79` — 3-sentence tooltip with hedging tail ("…but you should double-check before applying"). → **"AI extraction confidence below 50%. Verify the details against the source before applying."**

### 2.12 Alerts components — remaining 25 files (gap pass)

- **[P1]** `AlertReadinessStatus.tsx:73` — "Confirm the new due date and choose the deadlines before Apply is enabled." — narrates button state machinery. → **"Confirm the due date and select deadlines to apply."**
- **[P1]** `error-mapping.ts:37` — "This alert is review-only and does not apply due-date overlays." — "due-date overlays" is the contract's name, not the CPA's. → **"Review only — no due date will change."**
- **[P1]** `error-mapping.ts:35` — "This Alert is closed and cannot be sent for review." — mid-sentence capital "Alert". → lowercase.
- **[P1]** `error-mapping.ts:30` — "The 24h undo window has expired for this alert." → **"The 24-hour undo period has passed."**
- **[P1]** "Needs Review" (AlertCard pill) vs "Needs review" (AffectedClientsTable badge) — casing split on the same state. Lock **"Needs review"**.
- **[P1]** `AffectedClientsTable.tsx:232` — "Unknown" for a missing AI-extracted due date — reads like an error. → **"Not yet set"**.
- **[P2]** `PulseAlertsMap.tsx:169` + `StateTilegram.tsx:139` — hand-rolled ternary plurals (`alert${count === 1 ? '' : 's'}`) → `<Plural>` (S5).
- **[P2]** `PulseAuthorityRoleChip.tsx:84` — "cross-verify before applying" → **"confirm against the source before applying"**.
- **[P2]** `alert-tone.ts:68–76` — aria-labels are directives ("investigate") rather than state descriptions; screen-reader text should describe, not command.

### 2.13 Server-sent copy — emails, digest, ICS (gap pass; never audited before)

This surface is **client-facing under the CPA's own name** — the reminder emails are sent to the firm's clients as if written by the firm. They currently sound like a subscription service, not a tax professional:

- **[P0]** `reminders.ts:67` (30-day client reminder) — "Our office is tracking your upcoming {{tax_type}} deadline… We are reviewing the file and will follow up…" — passive service-speak. A CPA owns the deadline. → **"Your {{tax_type}} is due {{due_date}}. If we need documents, signatures, or payment information, we'll send a secure request."**
- **[P0]** `email-template/index.ts:51` (signature reminder) — "This is a friendly reminder to sign Form 8879…" — "friendly reminder" is the apologetic lead the voice contract bans. → **"Your {{tax_year}} {{form}} return is ready to file — it needs your signature on Form 8879 (the e-file authorization) first."**
- **[P1]** `reminders.ts:86` (7-day reminder) — "If you have received a secure materials request… please complete it as soon as practical" — conditional courtesy at 7 days out. → **"Your {{tax_type}} is due in 7 days ({{due_date}}). Complete any outstanding requests now so we can file on time."**
- **[P1]** `reminders.ts:39` (team reminder body) — "clear any open client-materials or review blockers before the countdown reaches the due date" — internal jargon ("blockers") + nonsense clock ("countdown reaches the due date"). → **"Clear pending client materials and review items before the due date."**
- **[P1]** `morning-digest.ts:249` — subject "DueDateHQ morning digest for {{firm}} ({{date}})" — product-brand-first in a subject CPAs will scan daily. → **"{{firm}} — deadline digest, {{date}}"**.
- **[P1]** `messages.ts:26` — the zh invitation email says 工作区 ("workspace") — the terminology violation crossed the language boundary. Fix together with S6.
- **[P2]** `ics.ts:89` — calendar feed description "External calendar reminders are best-effort" — "best-effort" is SRE vocabulary. → **"Calendar reminders are informational. DueDateHQ email and in-app reminders are authoritative."**
- **[P2]** `outbox.ts:160` — fallback subject "DueDateHQ notification" → **"Deadline alert"**.

### 2.14 Marketing site (apps/marketing)

Voice is largely on-brand — no hype, specific CTAs, grounded AI framing. The risks are factual, not tonal:

- **[P1]** `en.ts:260` — "Migration Copilot maps, normalizes and generates the year's calendar in 30 minutes" and `en.ts:214` — "Every state filing notice and IRS update reaches Today + email within 24 hours" — unqualified time/SLA claims. Either source them or soften ("monitored sources", "typical import").
- **[P1]** Pricing tiers — "1 practice workspace" (Solo) vs "1 production practice" (Pro/Team) — same thing, two names, on the same page.
- **[P2]** `en.ts:294` — "Smart Priority is a pure-function sort — no LLM in the Today hot path." — engineering vocabulary on a marketing page. → **"Smart Priority ranks by days remaining, completeness, and alert status — no AI in the triage path."**
- **[P2]** `en.ts:198` — "server-pre-aggregated, so the queue appears before the page even paints" → say "loads instantly"; nobody buys pre-aggregation.
- **[P2]** `en.ts:385` — "Anything below 0.80 is non-blocking" — a bare decimal threshold with no frame of reference.

---

## Part 3 — Copy standards (proposed, to be added to DESIGN.md §copy)

1. **Error pattern** — Title `Couldn't [verb] [object]`. Description: specific cause if known, else one recovery step. Support is a last resort. Never "Please", never bare "Something went wrong", never network-blame by default.
2. **Empty states** — State the fact ("No alerts right now."), then the trigger ("When {source} publishes a change, it shows up here."), then at most one action. No congratulation, no apology.
3. **Buttons** — verb + object ("Mark as filed", "Send request", "Disable feed"). Bare verbs only inside a context that names the object (a dialog titled with the object).
4. **Loading** — skeletons over narration. If text is unavoidable: "Loading…". Never narrate AI work; state results.
5. **Counts** — every interpolated count goes through `<Plural>`. No ternary plurals, no bare "{n} unread".
6. **Casing** — sentence case for all prose/labels; Title case for status-pill words; never lowercase fragments in sentence positions ("loading…", "next due").
7. **Terminology** — the lock table in S6 is normative. New strings check against it; variants are bugs.
8. **No fiction** — copy describes only behavior that exists. Disabled/unshipped affordances are hidden or labeled honestly.
9. **Confirmations** — name the object and the consequence ("Delete 'Q2 estimate reminder'? This can't be undone."); the confirm button names the action, never "Yes"/"OK".
10. **Time** — "24 hours" in prose, "24h" only inside chips/pills; one relative-time formatter app-wide (`formatRelativeTime`), no hand-rolled "{n} days ago".

---

## Coverage

**Product app (apps/app)** — all 45 routes and all 21 feature areas: login, accept-invite, two-factor, account security (+2FA setup), splash, onboarding, error/not-found/fallback, dashboard (/today), alerts (list, history, detail drawer, morning sweep, plus all 25 remaining components and the 4 lib label files), obligations list (/deadlines), deadline-detail — with **exhaustive line-indexed extraction** of the three largest files (ObligationQueueDetailDrawer.tsx: 166 string sites; panels.tsx: 112; dialogs.tsx: 85 — every site judged), clients (+detail, facts, create dialog), rules (library, sources, preview, temporary, detail drawer), migration (intro, steps 1–4, success, skip, wizard shell), readiness portal, reminders (+templates, editor), notifications (+preferences, bell), settings (hub, profile, permissions), members, billing (+checkout/success/cancel), practice, calendar, workload, audit log, app shell (nav, user menu, system status), all `components/patterns` (17 files), all `components/primitives` (13 files), command palette + shortcut help, route/document titles (`route-title.tsx`, `route-summary.ts`), concept help, surface vocabulary, evidence components, `lib` formatting strings. `/preview` (specimen gallery) noted as designer-internal.

**Server-sent surfaces** — auth emails (invitation, OTP), client reminder emails (30-day, 7-day, materials request, signature reminder), team reminder email, morning digest email, pulse digest/outbox, calendar ICS feed titles and descriptions.

**Marketing site (apps/marketing)** — landing, pricing, rules, state-coverage, 404, trust pages, guides/states/compare/rules dynamic content, nav/footer/CTA components, `i18n/en.ts`.

**Remaining out of scope:** zh-CN catalog parity for both apps (a localization pass should follow the English lock — note the one zh finding already filed: 工作区 in the invitation email), and AI prompt text (not user-facing).

---

## Disposition (closed 2026-06-11, same day)

Applied across 15 commits (`copy(...)` series, batches 1–15; one dev-log entry per batch in docs/dev-log/2026-06-11-ux-copy-batch\*.md). All P0s and P1s are fixed, P2s fixed except the explicitly-deferred set below. zh-CN app catalog fully translated for every new msgid.

**Deliberately NOT changed (with reasons):**

- "Couldn't [verb] [object]" error-title pattern — kept as canonical (the audit's own standard); only descriptions changed.
- EN invitation subject "Join {organizationName} on DueDateHQ" — clear and standard; zh aligned to it instead.
- Outbox fallback subject "DueDateHQ notification" — a generic fail-open shouldn't claim to be a deadline alert.
- Inbox bell "{n} unread" — "unread" is invariant as an elliptical count; no plural error exists.
- Disabled "Insert variable" chip and "Request export" button — affordance-level decisions (hide vs. wire), for a design pass.
- App-shell system-status conditional frame — behavior design, not copy.
- 2FA card "Disable" — its confirm dialog names the full action.
- "Couldn't load deadline detail." — the inline Retry button is the recovery; adding a sentence would be noise.
- Alerts "Needs review" badge (per-client AI flag) — a different state from rules' "Awaiting review"; both now used consistently within their domains.

**Found already-resolved during application (no change needed):** "The change couldn't be written", DecisionBanners label split, clients "Nd late" (verbose `<Plural>` exists), bare "4 min" (labeled), "Couldn't apply rule" dialog (shows error.message + code), reminder status-badge casing.

**Follow-ups owed:** zh-CN parity pass for the marketing site (en.ts changed; zh mirror untouched), and the copy standards in Part 3 should be folded into DESIGN.md §copy.
