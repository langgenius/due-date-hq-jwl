# UX flow audit — 2026-07-02 (8 code auditors + 7 live click-through agents)

Yuqi: "确保所有动作都是有结尾和下一步上一步的…现在很难用". Two audit tracks:
code-trace of every onClick/navigate/toast (73 verified findings) + live Playwright
click-through of all 50 app routes, marketing↔app boundary, responsive (1024/768/390),
and cross-page propagation. Full per-agent reports in session transcripts; code
findings JSON archived alongside this doc's dev-log entry.

**Overall shape:** read paths are polished (filters/URL state, responsive, propagation
all pass); **act paths leak** — clicks either do nothing visible, do something other
than promised, or do something irreversible. Exemplary closures exist (Mark as filed,
migration wizard, calendar-sync confirms, downgrade dialog) — the conventions are
proven in-repo, just not applied uniformly.

## Systemic themes (fix once, benefit everywhere)

- **S1 Failure masquerades as empty.** Query failure (429 etc) renders as infinite
  skeleton, blank pane, or confident zeros ("EVENTS 0", "No deadlines match", "No
  results found") on ≥6 surfaces. No shared error+retry state exists.
- **S2 Undo/closure inconsistency.** Undo: filed ✓, workflow steps ✓; dismiss ✗,
  snooze ✗, assign ✗, bulk set-status ✗ (N rows, no confirm), role change silent,
  prefs autosave silent, rule-accept silent (list context), rename toast exists but
  practice save doesn't persist (P0).
- **S3 Back/crumb semantics.** `?alert=`/`?rule=` drawers open with replaceState →
  browser Back skips them; client-detail deadline drawer: Back exits two levels AND
  Esc doesn't close; deadline crumb drops filters while browser Back preserves them.
- **S4 Counts disagree.** Sidebar badge 12 vs header 28 vs rail 27 vs lanes 26;
  scoped /today pills → firm-wide destinations; filtered arrivals keep global
  StatBand/header numbers.
- **S5 Fictional affordances.** Palette entity pills search nothing; alert-history
  bulk bar has zero actions; "verify before Apply" with no Apply; client rename
  unreachable; status.duedatehq.com has no DNS record.

## P0

| # | Finding | Where |
|---|---|---|
| 1 | Snooze = black hole: detail → "not found", absent from table/rail/filters, no undo, no unsnooze | obligations snooze flow |
| 2 | Add-deadline internal notes silently discarded; toast tells user to save text that no longer exists | CreateObligationDialog onSuccess |
| 3 | Practice profile save: success toast + 200 echo, but value reverts on reload (mock-firm write?) | /practice ↔ firms.updateCurrent |
| 4 | Notification deep-link → "Deadline not found" (stale seeded obligation id) | notifications seed / entity refs |

## P1 (merged, deduped; ✓✓ = confirmed by both tracks)

- Dismiss/Mark-reviewed one-way doors: no Undo, no Restore in history ✓✓; keyboard `D` = one keystroke, permanent
- Apply auto-closes in 600ms, killing next-alert rhythm + "copy client email" follow-up
- Alert-history bulk selection: checkboxes + bulk bar, zero actions
- Affected clients unreachable on review-only alerts (shown 3×, never listed) ✓✓
- /today alert-card source chip hijacked (render-prop spread order overwrites onClick) — external-link icon lies
- /today inline dismiss regression (PR #87 rewrite dropped it)
- Browser Back skips alert/rule drawers (replaceState) ✓✓; client-detail deadline drawer Back exits 2 levels, Esc dead
- Deadline crumb "Deadlines" drops active filters (Back preserves them) ✓✓
- "Leave note for preparer" collects no note — flips state with zero content
- Bulk "Confirm projected" no-ops with "0 confirmed" success-ish toast + eats selection
- Rule accept: no toast/highlight/next-candidate in a 455-item queue ✓✓; "Start review" opens bulk modal with 454 preselected → primary button disabled
- No rule→generated-deadlines path; active-rule drawer "YOUR DECISION" panel renders empty
- J3 break: rules only generate at accept-time; clients created later never covered (UI promises automatic)
- Clicking client/deadline inside alert's affected-clients table wipes curated apply selection (in-tab nav)
- Client rename unreachable (only adjacent action: Delete); no archive flow — delete is the only lifecycle action
- Dirty settings forms silently discarded on nav-away (incl. Smart Priority tuner)
- Malformed deadline ref (non-hex) → blank white pane (numeric-missing gets proper not-found)
- Sidebar Deadlines badge ≠ page ≠ rail ≠ lanes (4 unlabeled numbers)
- Palette entity pills (Deadlines/Alerts/Rules) return nothing — only clients + pages are searchable
- S1 failure-as-empty (see themes) — ≥6 surfaces
- /rules/preview + /rules/temporary orphaned (zero inbound links); rollover "Missing rule" ×14 = dead badges
- status.duedatehq.com dead DNS on onboarding/2FA/accept-invite/migration/readiness ("reassurance link" → DNS error)
- First-run create-deadline: onCreated wired nowhere; dashboard can say "All clear" right after first create
- Undo coverage gaps: assign, snooze, bulk set-status, bulk assign, extension

## P2 (top of ~60; full lists in agent reports)

- 2nd viewer of same deadline stale ≤60s (staleTime 60s + refetchOnWindowFocus:false) — multi-user product
- Scoped-count → unscoped-destination mismatches (/today pills, "See all 7 deadlines" → unfiltered 28) ✓✓
- Catch-up line "N changes in effect" → /alerts can't show them (no origin filter; rows sort off first page)
- Sync button zero feedback; notification prefs autosave silent; role change no toast
- Extension submit disabled with no reason shown (required memo below fold)
- Materials checkbox = select, not done (mental-model trap; real actions appear after selection)
- Login page has zero "this creates your account" copy under "Get 3 months free" CTAs
- zh-CN marketing 404 missing (EN 404 for zh visitors)
- Filtered arrivals keep global header/StatBand counts; identical "PP" avatars defeat assignee-filter confirmation
- Alert history groups by original date not handled date; "1 of 2" pager text-only
- 2FA inline enrollment has no cancel; ~90-session list unbounded
- Audit "SYSTEM 50" tile vs Category System = 0 (two taxonomies, one word)
- Workload owners ≠ members roster (Parker vs Nora, demo seed)
- Green "Monitoring 52 jurisdictions" pill vs "FETCHED LAST 24H: 0" + "Last checked May 1"
- Inbox (panel) vs Notifications (page) naming; no per-item read toggle
- Migration wizard: Back → about:blank on direct load; nested <button> hydration error
- Billing: "Renews 2026-06-01" (past); circular portal error copy; muddled no-param checkout
- Base UI console warnings: nativeButton (app-shell-nav via button.tsx) every page; key-spread on /audit
- Sources row whole-click ejects to external site; review list has no ready-vs-draft marker (7 ready hidden in 18)

## Healthy (verified, don't touch)

Responsive contracts (3 breakpoints, no overflow, crumb fallback <lg); cross-page
mutation propagation (scope-aware lists refetch); auth-edge graceful states
(accept-invite, readiness token, logged-in redirects); marketing↔app links (all 24
pages, zh parity, no hardcoded URLs); legacy redirects (10 aliases, query preserved);
audit log deep links + scoped banner; workload→deadlines precision links; Mark as
filed / migration wizard / calendar-sync / downgrade-dialog closures (the templates
to copy); in-shell 404; keyboard help.

## Fix waves

- **Wave 1 — SHIPPED 2026-07-02** (see docs/dev-log/ux-flow-wave1-fixes-2026-07-02.md):
  alert undo/restore (+ repo guard fix + key-repeat double-dismiss), history bulk
  chrome removal, pager buttons, /today source-chip + inline-dismiss + bucket links
  + onCreated + sync feedback, snooze P0 (return+undo+dated toast), crumb filters,
  malformed-ref guard, leave-note dialog, bulk-confirm honesty, extension hint,
  create-notes P0 (session draft), status URL, refetchOnWindowFocus, palette
  honesty, 2 console warnings, rules accept closure + review-next + bulk default +
  ready markers + decision rail + Tools menu. Investigations: notification-id P0
  disproven (was the snoozed row); practice-save revert = demo-only
  (ensureDemoIdentities). Drawer Back semantics moved to wave 2.
- **Wave 2:** shared query-error/retry primitive (S1); undo/closure convention rollout
  (S2: dismiss undo + history restore, snooze visibility + unsnooze, bulk confirms);
  rule-accept closure + next-candidate + bulk-modal default; leave-note dialog;
  dirty-form guard; palette honesty; count reconciliation (S4).
- **Wave 3 (needs product decisions / backend):** J3 retroactive rule application;
  client archive; alert Apply pacing; affected-clients on review-only alerts;
  rollover missing-rule path; practice-save persistence (backend); notification
  entity-ref freshness (seed + generation).
