# 2026-05-24 - Rule Library section checkbox hierarchy

Adjusted the expanded Rule Library section and rule-row checkbox spacing to make the nested table
hierarchy clearer.

- The Needs review select-all checkbox now aligns with the expanded jurisdiction badge.
- Individual rule-row checkboxes now align with the Needs review label, creating a second nested
  level under the section header.
- `DESIGN.md` stays aligned; this is a local spacing adjustment within the existing 4px spacing
  scale and does not introduce a new pattern or token.

2026-05-25 follow-up:

- Restored the intended stepped hierarchy after the section/header alignment pass: child rule rows
  now begin one level deeper than `NEEDS REVIEW` / `ACTIVE`, with selectable row checkboxes aligned
  under the section label and active-row titles using the same reserved slot.
