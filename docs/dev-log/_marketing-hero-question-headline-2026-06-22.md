# Marketing — hero headline → a provocative question

**Date:** 2026-06-22
**Scope:** `apps/marketing/src/components/home/Hero.astro` (copy)

Owner liked AgentCard's question-style CTA ("What will your AI agent buy first?").
Reframed our hero from a statement to a question that opens the "not knowing" gap
the Villain section already names:

- **H1:** "A deadline just moved. Do you know *who* it hits?" (`who` in the display-
  serif italic accent)
- **Sub:** "DueDateHQ watches the IRS, every state, and FEMA around the clock — *the
  moment a date moves,* you see exactly which clients it affects, with the source on
  every change." (keeps the question legible to a cold visitor)
- Reassure line + points + CTAs unchanged.
- zh: "截止日刚刚变了。你知道它影响到谁吗？" + matching sub. Added a
  `html[lang='zh-CN'] .hero__sub em` guard so the emphasis is weight/colour, not the
  broken faux-italic oblique on CJK.

Page `<title>` left as the descriptive SEO line (provocative H1, descriptive title).
Build clean (76 pages); copy verified live (EN).
