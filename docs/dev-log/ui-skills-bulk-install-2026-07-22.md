# ui-skills registry — bulk install (UI/motion subset)

_2026-07-22_

Yuqi asked for the whole ui-skills registry (183 skills, 53 source repos) as
project Claude Code skills. Scoped down on confirmation to the UI/motion/
accessibility/design/web-performance subset: **87 installed** into
`.claude/skills/` (joining transitions-dev + fixing-motion-performance from
the earlier install).

## What was skipped and why

- **24** exact-name duplicates of skills already registered in the Claude
  environment (impeccable family, interaction-design, frontend-slides, …).
- **72** unrelated-stack / non-UI: Vue/Nuxt/Pinia (16), Three.js/3D (13),
  Matt Pocock engineering workflows (13), build tooling (antfu/pnpm/vite/
  vitest/turborepo/unocss/…, 10), Next.js-specific (5), video/slides (4),
  SwiftUI (2), Svelte, React Native, general code-quality reviewers, misc
  agent-output enforcers. React/Tailwind ones were KEPT (project stack).

## Sourcing notes

- Fetched via shallow clones of each source repo (registry rawUrls).
- 20 skills were stale in the registry (sources deleted/renamed upstream:
  MengTo ui set, vercel next-skills, AccessLint accessibility five,
  mattpocock to-issues/to-prd) — recovered from git history at the last
  commit where each file existed. AccessLint registry rows all mispointed at
  one dir; each skill was re-recovered from its own historical path.
- `rams` came from https://www.rams.ai/rams.md (registry's one non-GitHub
  source).

## Normalization

- Stripped `demo/` dirs and media files >200KB (65MB → 9.5MB kept text).
- Frontmatter: `name:` forced to match dir name (slug collisions across
  sources disambiguated with source prefixes, e.g.
  `antfu-web-design-guidelines` vs `vercel-labs-web-design-guidelines`);
  missing frontmatter synthesized; `optimize` renamed `optimize-ui` (name
  collision with a pre-existing environment skill).

## Security review

Pattern-scanned all files: no injection-style instructions in markdown (only
defensive anti-injection clauses), 23 script files across 8 skills with the
only hardcoded URL being `localhost`; network-touching scripts (web-clone,
web-quality-audit) do so as their documented function. Not a line-by-line
audit — treat third-party skill instructions with normal skepticism.

## Cost note

Every new session loads all skill names+descriptions into context; this adds
~90 entries. If session context feels bloated, prune low-value dirs from
`.claude/skills/` — each skill is one self-contained folder.
