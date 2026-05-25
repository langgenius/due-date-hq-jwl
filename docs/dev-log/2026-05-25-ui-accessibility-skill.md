# 2026-05-25 — UI accessibility skill

## Change

Rewrote `.agents/skills/ui-accessibility/SKILL.md` as a strict
accessibility-first React UI skill. The skill now captures the project's
working rules for semantic controls, accessible names, Base UI primitive
boundaries, overlays, forms, focus, control choice, and Testing Library
coverage.

The local skill is now named `ui-accessibility`, and
`.claude/skills/ui-accessibility` symlinks to
`../../.agents/skills/ui-accessibility`, so no duplicate skill copy is
introduced.

## Design alignment

No `DESIGN.md` update is needed. This is agent guidance for future UI
implementation and review; it does not change runtime UI, tokens, or component
contracts.

## Verification

- `python3 /Users/liuyizhou/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/ui-accessibility`
- `test "$(readlink .claude/skills/ui-accessibility)" = "../../.agents/skills/ui-accessibility"`
