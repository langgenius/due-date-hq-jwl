# /alerts list — clip the day-group bands to the rounded frame

Date: 2026-06-08

Feedback: *"add overflow to clip."*

The `PulseAlertList` frame (`rounded-[12px] border`) had no `overflow-hidden`
(dropped back in round 84 to avoid clipping tooltips). The full-bleed gray
day-group bands (`bg-[#e9ebf0]`) have square corners that poked past the
rounded frame at the top/bottom edge. Restored `overflow-hidden` on the
frame so the bands clip to the radius. Row tooltips/popovers portal to
`<body>`, so the clip no longer truncates them.

Verified live on :5177. Typecheck clean.
