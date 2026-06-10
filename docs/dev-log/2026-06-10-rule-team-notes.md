# Rule team-notes feature + Practice-review card (irBJ8)

**Date:** 2026-06-10

irBJ8's "Practice review" card is a team-note composer + thread ("View N team
notes"). There was no rule-notes persistence (the old "review note" was just the
accept/reject _reason_). Built the feature by mirroring the existing alert-notes
pattern.

## Backend (mirrors pulse alert-notes)

- `rule_note` table (`schema/rules.ts`) + migration `0075_rule_note.sql` (applied
  local). `rule_id` is plain text (rules are global string-id templates — no FK);
  `firm_id` / `author_id` keep FKs; index on (firmId, ruleId, createdAt).
- ports `RulesRepo`: `listRuleNotes` / `addRuleNote` (+ `RuleNoteRow`,
  `RuleAddNoteInput`).
- repo `makeRulesRepo`: list (join user for authorName, firm-scoped, asc) + add.
- contract: `RuleNoteSchema` + `listRuleNotes` / `addRuleNote` endpoints.
- server handlers (read = tenant; write = current-firm-role + `rules.note_added`
  audit event).

## UI

- `RulePracticeReviewCard` (`rule-detail-drawer.tsx`): NOTE textarea + char count
  (/2000) + "View N team notes" disclosure of the thread (author · relative time
  · body) + Add note. Wired to the real endpoints. Rendered between Impact and
  Activity (review-context rules).
- Renamed the `CandidateReviewSection` heading "Practice review" → "Decision" so
  the note card owns "Practice review" (no double heading).

tsgo clean across ports/contracts/db/server/app; migration applied. Verified live:
add note → "Note added" toast → "View 1 team note".
