# Marketing — Sources map is interactive (click a state → its sources)

**Date:** 2026-06-23. From the landing critique (#1: the product showcase was four
static mockups). First interactive anchor: the coverage map.

Each state tile is now a real button. Click one → it highlights (accent) and a panel
beside the map shows that state's official sources: IRS (federal), the state's tax
agency (real names for CA/NY/TX/FL/WA/MA, a clean generic for the rest), and FEMA.
The live monitoring feed and the state panel are **stacked in one grid cell**, so the
panel cross-fades in over the feed's footprint — the layout never jumps. Keyboard +
aria-pressed + aria-live wired. Honest: every state is watched the same way, so the
panel needs no per-state fiction.

Verified live: CA → Franchise Tax Board, TX → Comptroller, NY → Dept. of Taxation &
Finance; tile highlights, feed hides (visibility, keeps height), no jump. Build 76
pages clean.
