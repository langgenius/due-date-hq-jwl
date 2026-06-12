# 2026-06-12 — /alerts: de-gray the rows ("too much gray")

Yuqi: "too much gray don't you think?" — correct. The earlier de-red pass
turned the ACTION chip into a gray slab, which stacked with the gray day
bands + gray form chips + gray meta into gray-on-gray soup. The information
was right; the CONTAINERS were the problem. Fix = fewer gray boxes, not more
color:

- **ACTION suggestion → boxless text line.** The elbow glyph + small-caps
  ACTION label already structure the line; the `bg-background-subtle` slab is
  gone. (Demote-don't-delete: same content, quieter form.)
- **Day band → white.** The small-caps label + bottom hairline carry the day
  break alone; the gray fill was the biggest slab on the page. Opaque white
  keeps the sticky pin masking rows scrolling under.

Per row the only gray FILL left is the canonical TaxCodeBadge form chip; the
title is unambiguously the dominant ink again.

Verify: tsgo clean (other session's in-flight merged-brief-card error
excluded); live — band bg rgb(255,255,255), action wrapper transparent/0
padding; screenshot reads as a calm editorial feed.
