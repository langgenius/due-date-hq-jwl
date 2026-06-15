# Alert detail — hero spacing + section-title batch (Yuqi 3020 feedback)

_2026-06-15_

- **#1 More top padding on the key-fact** — the hero do-by-when block (`Act by …`
  / DeadlineChangeCard) goes `pt-1` → `pt-3` so it breathes below the title.
- **#2 Change section spacing** — bigger gap between the practice-impact read and
  the parsed fields (`bodyClassName` gap-4 → gap-6 on the Change card), but a
  tighter gap between the "Parsed fields" sub-header and its grid (gap-2 →
  gap-1.5).
- **#3 Smaller section titles** — flat `DetailSectionCard` action titles
  `text-lg` (16) → `text-base` (14); reference titles `text-base` (14) →
  `text-sm` (13). Keeps the action ⟩ reference rank (size + ink) but more
  delicate.

#4 was a question ("Needs your decision — is this universal"): it's gated to
`alert.status === 'matched'` (awaiting a decision); resolved alerts (applied /
dismissed / reviewed / reverted) drop it. Not universal — left as-is.

Verified live on 3020. tsgo + vp check clean (whole-project tsgo still flags the
parallel session's uncommitted rule-detail-drawer WIP only).
