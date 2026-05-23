---
title: 'Obligation evidence tab: Workpapers spacing polish'
date: 2026-05-23
author: 'Codex'
area: obligations
---

# Obligation evidence tab: Workpapers spacing polish

## Context

The Workpapers empty state in the obligation panel's Evidence tab sat too close
to the sticky snapshot/tab header. In browser comments, the comment marker could
land directly on the `Workpapers` microheading, making the section look blocked
or clipped.

## Change

- Added a small top buffer to the Workpapers section in
  `apps/app/src/routes/obligations.tsx`.
- Kept the Evidence tab structure unchanged: Workpapers stays first, Authority
  citation stays collapsed below it.

## Verification

- Visual check on `/obligations?...&tab=evidence`: Workpapers now has breathing
  room below the tab bar and the empty state remains aligned with the panel.
