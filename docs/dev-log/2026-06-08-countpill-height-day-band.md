# /alerts — CountPill height + day-band background

Date: 2026-06-08

Two Yuqi page-feedback items.

## 1. CountPill "so tall?"
The header pill rendered 38px tall: `text-[12px]` but it inherited the page
title's `line-height: 32px`, so the line-box (32) + py (3+3) = 38. Added
`leading-none` to `CountPill` so it owns its ~18px height wherever it sits
(header beside the 28px title, rail head beside the 15px title). Now 18px.

## 2. Day-group band "no background colour"
The /alerts day-group header carried a solid `bg-[#e9ebf0]` fill. Removed it —
this band is a DATE divider (not a status/urgency band like /today's Actions
table, which keeps its `bg-background-subtle` fill), so a quiet bottom rule with
no fill reads cleaner and honors the colored-background restraint. Border-b
kept as the separator.

## Verify
tsgo clean; `/alerts` at 1512×861 — pill measured 18px (was 38px); day bands
transparent with just the bottom divider.
