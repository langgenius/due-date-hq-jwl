# Client detail — tabs into header chrome + dial back red

**Date:** 2026-06-11

Feedback (Yuqi): "the tabs should be part of the header" + "be aware the use of
red colours.... too many times."

- **Tabs flush to the header:** the Tabs root gets `-mt-4` to cancel the Body
  section's gap, so the tab bar sits tight under the summary strip and reads as
  the bottom band of the header chrome (title · meta · strip · tabs) rather than a
  floating control. Verified live.
- **Less red in the Filings table:** dropped the overdue red left rule
  (`border-l-state-destructive-solid`) AND the red `AlertTriangleIcon` from the
  table row (grid / inline-expand branch only — flex layout for /today /alerts is
  untouched). Overdue is now signalled by the red due-countdown alone, matching
  VtC73 which uses neither bar nor icon. Red is reserved for the single hottest
  signal instead of triple-encoding.

tsgo clean; verified live.
