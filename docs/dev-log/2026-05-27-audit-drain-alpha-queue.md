# 2026-05-27 — Audit drain (alpha queue): 5 obligations.tsx findings

## Why

Second drain pass on `routes/obligations.tsx` after batch 1 (commit
`c583b334`). The Step 6 + Step 6-cont audits flagged ~20 obligations.tsx
findings; this pass picks off the safe mechanical ones — single-file edits,
no design call, no contract change. Anything that needed Yuqi sign-off,
a new primitive, or layout reshuffling was skipped.

File line numbers in the source audit dev-logs were off by ~370 (the file
has shrunk since the audit was written) but the bugs themselves were live.

## What shipped (5 findings)

### Q4.4 — Bulk Set-status DropdownMenuItem mutation lock (P1)

`routes/obligations.tsx:3299-3318`. Each bulk-status item now carries
`disabled={bulkStatusMutation.isPending}`. Pre-fix, a CPA hammering
"Filed" on a 47-row selection during the first request could fire the
mutation twice — the items had no in-flight gate. Base UI's
`DropdownMenuItem` honors `disabled` for both pointer and keyboard
activation so the keyboard path closes too.

### Q5.4 — Penalty inputs dialog title carries client name (P3)

`routes/obligations.tsx:10708-10722`. Title was generic
"Penalty inputs" with `{clientName} - {taxCode}` buried in the
description. CPAs running through a list of clients in one sitting
open this dialog repeatedly — the title should answer "whose
penalty am I editing?" in a glance. Description retains the
tax-code suffix so filing context is still legible.

### #61 — "Internal Due" column header restored "date" (P3)

`routes/obligations.tsx:1173, 2028`. Was `t\`Internal Due\``;
neighbouring column header is `t\`Due date\``. Renamed to
`t\`Internal due date\`` so the two read as a consistent pair. Old
zh-CN translation was "内部截止日"; new is "内部截止日期".

### #56 — Export Selected toast names the destination (P3)

`routes/obligations.tsx:1408-1420`. Toast description was
`Audit ${auditId.slice(0,8)}` — power-user UX. A first-time CPA who
clicks Export Selected sees a CSV vanish into their browser with no
hint where it landed. Changed description to "Saved to your Downloads
folder." (matches default Chrome / Safari / Firefox behavior). Audit
ID is still queryable from the audit log if a power-user needs it.

### #156 — Status-change toast names the chosen status (P2)

`routes/obligations.tsx:1346-1356, 1620-1640`. Both the bulk and
per-row status mutations toasted `t\`Status updated\``regardless of
which status was applied. A CPA marking 10 rows filed in succession
saw 10 visually identical toasts — losing the ability to spot
at-a-glance when the wrong status was picked. Reused the existing`t\`Status changed to ${statusLabels[next]}\`` pattern from the
drawer (line 5303) so the three call-sites now converge on one
msgid — "Status updated" is dead and Lingui's extract auto-removed
it.

## What was skipped

- **Q7.1** — already shipped. The `_statusDropdownOptions` dead
  computation was deleted in a prior pass; only the comment marker
  remains at line 4714.
- **Q8.1 / Q8.5** — both live inside `CalendarSyncPopover` which the
  task spec told me to leave alone (batch 1 just rewrote it). Q8.1
  would need verification that Base UI's Popover outside-click
  closes the popover before stripping the hand-rolled scrim, and
  Q8.5's `w-80` overflow needs a real narrow-viewport check — not
  mechanical.
- **Q9.1** — active filter chip already carries trailing XIcon + accent
  border/bg. Dev-log marked "needs design call" — the audit-suggested
  fix (leading CheckIcon) competes with the XIcon symmetry-breaker
  Yuqi shipped. Skipped.
- **Q9.2 / Q10.1 / Q10.2** — all marked "deferred / needs design call"
  in the source dev-log; unchanged here.
- **#45** — view-pref persistence is feature work, not mechanical.
- **#47-50** — toast wording variants; #49 already shipped, #48/#50
  (audit-ID exposure) need a product call.
- **#58** — sort dropdown direction icon. Already shipped in the
  "2026-05-25 Yuqi sort-arrow audit" pass — `ObligationQueueSortableHeader`
  renders ChevronUp / ChevronDown by direction.
- **#150** — hotkey discoverability cross-surface; feature work.

## i18n

Three new zh-CN translations added to
`apps/app/src/i18n/locales/zh-CN/messages.po`:

| msgid                             | zh-CN                      |
| --------------------------------- | -------------------------- |
| `Internal due date`               | `内部截止日期`             |
| `Penalty inputs for {0}`          | `{0} 的罚款输入`           |
| `Saved to your Downloads folder.` | `已保存到你的下载文件夹。` |

The "Status changed to {0}" msgid is pre-existing — the bulk + per-row
toasts now de-dupe onto the same msgid as the drawer toast. Lingui's
`extract --clean` removed the now-orphaned "Status updated" string.

## Verification

- `cd apps/app && pnpm exec tsc --noEmit` — clean.
- `pnpm i18n:extract` — 3 new msgids, all translated.
- `pnpm i18n:compile` — strict-mode pass.
