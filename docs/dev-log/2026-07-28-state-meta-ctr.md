# duedatehq: state meta descriptions lead with the verified date (CTR)

2026-07-28 (fourth pass — CTR, prompted by the comparison GSC export)

New comparison export: US position 39.7 → 22.3 in the recent window, homepage pos 3 with
14.8% CTR — but the pages reaching page 1–2 (file-in-time 38 imp pos 9.5, michigan 22 imp
pos 15, NE/ND pos 9) get near-zero clicks. Their descriptions opened with a software blurb,
not the answer.

`stateDeadlineSnippet()`: when STATE_DEADLINES has a verified entry, the meta description
now leads with the actual deadline ("Nebraska tax deadlines: Form 1120N … April 15 — …"),
EN+zh; states without a verified entry keep the previous copy (facts-only — no invented
dates). Rule pages already got question-led descriptions earlier today.

Build OK, 24/24 tests, lint clean.
