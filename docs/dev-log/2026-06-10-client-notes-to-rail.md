# Client detail — move notes into the right rail

**Date:** 2026-06-10

Feedback (Yuqi): "move notes to the right side bar."

The persistent `<ClientNotesStrip>` lived full-width below the header in the main
scan column. Moved it into the right rail (`ClientDetailRail`), above the Contacts
card — notes are persistent identity context, so they belong beside Contacts, not
in the action/scan column. Reused the existing strip component unchanged; passed
`canWrite` + `onEditNotes` (→ the controlled notes slide-in) through the rail. The
strip still self-suppresses when the client has no notes.

tsgo clean (the 12 preview.tsx ToggleChip errors are concurrent WIP). Verified
live: notes card renders in the rail above Contacts; main column no longer carries
it.
