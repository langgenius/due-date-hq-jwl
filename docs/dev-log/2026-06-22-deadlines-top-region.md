# /deadlines top-region cleanup

_2026-06-22_

Feedback pass on the /deadlines header. The top stacked **two** summaries that
echoed each other plus a legend-less bar.

- **Removed the proportion bar** (feedback: "this does not make sense") — a thin
  green/red/gray segmented bar with no legend, sitting below the StatBand. Its 3
  tones didn't map to the 5 columns above and it just re-stated counts the cells
  already label. Removed the bar wiring + the `statBandProportion` memo (the
  StatBand primitive keeps the optional `proportionBar` prop; /deadlines no longer
  passes it).
- **Reordered: editorial banner now ABOVE the StatBand** (feedback: "should this
  be above the stats row?" — yes). The page now reads story → numbers: the
  one-sentence read of the week ("5 overdue, 7 filing today — clear the urgent
  set…") leads, the numeric triage band follows.
- **De-duplicated the banner** — dropped its "28 filings tracked · across N
  entities" metric line, which repeated the StatBand's TOTAL TRACKED. The banner
  is now a tight editorial lead (date + one sentence); the StatBand owns the
  numbers.

## Verification

tsgo 0 · i18n extract 0 (−1 obsolete string, zh-CN Missing 0) · compile --strict 0
· build green · app tests 550/2.

## Still open (design calls put to the user)

- **Summary "designed better" (deeper):** make the StatBand cells **interactive
  triage filters** (click "Overdue 5" → filter the table) — currently read-only.
- **"Make the table more 'deadline'":** open direction (calendar/time cues,
  countdown emphasis, urgency banding) — awaiting the user's pick.
