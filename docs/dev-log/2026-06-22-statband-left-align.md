# StatBand first-cell left alignment

_2026-06-22_

Feedback: "work on the alignment — ensure the text and info are left-aligned."
Measured the /deadlines left edges and found a staircase: the page h1 + editorial
line sat at the content margin, but the **StatBand's first stat was 20px inset**
(its `px-5` first-cell padding), and the table sat further right.

Fix: `first:pl-0` on the StatBand column class (loaded + skeleton) flushes the first
stat's text to the band's left edge — which is the page content margin — so the
summary now left-aligns with the header, the editorial line, and the table's left
edge. Subsequent cells keep `px-5` for inter-column spacing + the hairline dividers.

Shared primitive, so /clients, /rules/sources, /rules/library, and /alerts/history
all get the same flush-left first stat — one aligned left column everywhere.

Verified live on /deadlines: h1, "TOTAL TRACKED", and the table container now share
the same left edge (~16px in the inspected viewport).

tsgo 0 · build green · app tests 550/2 · no new strings (class-only change).
