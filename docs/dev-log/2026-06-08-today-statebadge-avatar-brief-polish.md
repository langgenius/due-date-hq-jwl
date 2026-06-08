# /today — state badge restored + avatar/brief polish (Yuqi)

Date: 2026-06-08

Four page-feedback items.

## Alert card (`needs-attention-card.tsx`)

- **#1 State badge restored**: the jurisdiction pill showed a generic `MapPin`;
  Yuqi wanted the actual state badge ("之前的"). Swapped in the shared `StateBadge`
  (the state-seal graphic used on /alerts), 13px, inside the existing pill. Same
  primitive across /today + /alerts now.
- **#2 Overflow "+N"**: the circled "+1" read as a mystery avatar. Changed to
  plain text after the stack (`+1`, tertiary) so it reads as "and N more."

## Daily Brief (`daily-brief-card.tsx`)

- **#3** title→body gap tightened (`gap-2` → `gap-1`) so the heading and the prose
  read as one block.
- **#4** removed the `Astroid` (sparkles) icon before "Daily Brief"; the title now
  leads, and takes the **dark brand color on hover** (`group-hover:text-text-accent`).

## Verify

- tsgo 0; `vp check` 0 errors; dashboard tests 10/10; verified in preview @1512 —
  seals render on CA/NY/FL pills, "MF +1" plain overflow, tighter brief, no icon.
- No new i18n strings.
