---
title: 'Deadline materials menu width'
date: 2026-05-25
---

# Deadline materials menu width

## Context

The per-document overflow menu in the deadline detail Materials tab used the dropdown
primitive's narrow default width. The row action label "Mark needs review" wrapped onto
two lines in the side panel.

## Change

- Added a local minimum width to the Materials checklist overflow menu.
- Kept the menu text on one line so short action labels do not wrap inside the row.
- Marked anchor-backed drawer buttons as non-native Base UI buttons to keep the route
  console clean during validation.
