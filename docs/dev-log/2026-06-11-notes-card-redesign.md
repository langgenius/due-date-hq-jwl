# Client detail — rail notes card redesign

**Date:** 2026-06-11

Feedback (Yuqi): notes card "这好丑" (#18). The `ClientNotesStrip` was a washed-out
`tone="muted"` row strip that clashed with the rail's white labeled cards
(Contacts / Active alerts). Reframed it as a matching white card (`tone="default"
radius="xl"`): a "NOTES" eyebrow (uppercase, ScrollText glyph) + a quiet pencil
edit icon on the right + the note body (`line-clamp-3`). Whole card still opens the
slide-in. Dropped the now-unused `cn` import. tsgo clean; verified live — rail now
reads as one vocabulary (Alerts · Notes · Contacts).
