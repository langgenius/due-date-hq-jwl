# ui-skills → Claude Code skills install

_2026-07-22_

Installed two skills from the ui-skills registry (`npx ui-skills`, ibelick's
skill directory) as project Claude Code skills under `.claude/skills/`:

- **transitions-dev** (Jakubantalik) — 12 drop-in CSS transition recipes
  (modal, dropdown, panel reveal, icon swap, success check, error shake, …).
  Chosen because its Base UI `data-starting-style` / `data-ending-style`
  patterns match our overlay primitives exactly; its modal recipe drove the
  2026-07-22 dialog motion fix (see
  [dialog-modal-motion-2026-07-22](dialog-modal-motion-2026-07-22.md)).
  Source: github.com/Jakubantalik/transitions-dev — 14 files vetted (pure
  markdown + one CSS token file, no executable content).
- **fixing-motion-performance** (ibelick) — animation performance audit rules
  (compositor properties, layout thrashing, scroll-linked motion, blur cost).
  Shipped inside the ui-skills npm package itself.

Skills auto-register in new sessions and trigger on motion/transition work.
The rest of the registry stays fetch-on-demand: `npx ui-skills list
--category <topic>` / `npx ui-skills get <slug>`.
