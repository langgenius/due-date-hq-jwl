# Real logos & screenshots — drop-in guide

The build **auto-wires** any file you drop here. Name it by the tool's slug and run `node build.mjs`; it renders and the branded placeholder disappears. Missing or broken → the branded panel/tile stays (nothing breaks).

- **Logos** → `logos/<slug>.<ext>` — SVG preferred (crisp), or transparent/white-bg PNG, ~square, ≥80×80. Shown in the small tile, `object-fit: contain` on white.
- **Screenshots** → `shots/<slug>.<ext>` — 16:9, ~1280×720, PNG/JPG/WebP, `object-fit: cover`.

**Sourcing (do it right):** use each vendor's **official brand / press / media kit** (usually linked in the site footer, or at `/brand`, `/press`, `/media`, `/newsroom`) for logos — that's the licensed asset. Capture **your own screenshots** of each product (trial account) rather than lifting copyrighted marketing images. Optimize before adding (SVGO for SVG; squoosh/`sharp` for PNG) — the site's speed is an SEO asset, so keep files small.

| Tool | logo file | screenshot file | logo source (official brand kit) |
|---|---|---|---|
| Drake Tax | `logos/drake-tax.*` | `shots/drake-tax.*` | drakesoftware.com (footer → brand/press) |
| Lacerte | `logos/lacerte.*` | `shots/lacerte.*` | intuit.com brand portal |
| ProConnect | `logos/proconnect.*` | `shots/proconnect.*` | intuit.com brand portal |
| ProSeries | `logos/proseries.*` | `shots/proseries.*` | intuit.com brand portal |
| UltraTax CS | `logos/ultratax-cs.*` | `shots/ultratax-cs.*` | thomsonreuters.com brand/newsroom |
| CCH Axcess | `logos/cch-axcess.*` | `shots/cch-axcess.*` | wolterskluwer.com brand |
| ATX | `logos/atx.*` | `shots/atx.*` | wolterskluwer.com brand |
| File In Time | `logos/file-in-time.*` | `shots/file-in-time.*` | timevalue.com |
| DueDateHQ | `logos/duedatehq.*` | `shots/duedatehq.*` | your own asset |
| ONESOURCE Calendar | `logos/onesource-calendar.*` | `shots/onesource-calendar.*` | thomsonreuters.com brand |
| Karbon | `logos/karbon.*` | `shots/karbon.*` | karbonhq.com/brand |
| TaxDome | `logos/taxdome.*` | `shots/taxdome.*` | taxdome.com (press) |
| Canopy | `logos/canopy.*` | `shots/canopy.*` | getcanopy.com (press) |
| Financial Cents | `logos/financial-cents.*` | `shots/financial-cents.*` | financial-cents.com |
| Jetpack Workflow | `logos/jetpack-workflow.*` | `shots/jetpack-workflow.*` | jetpackworkflow.com |
| Keeper | `logos/keeper.*` | `shots/keeper.*` | keeper.app |
| Firm360 | `logos/firm360.*` | `shots/firm360.*` | myfirm360.com |
| Pixie | `logos/pixie.*` | `shots/pixie.*` | usepixie.com |
| Aiwyn | `logos/aiwyn.*` | `shots/aiwyn.*` | aiwyn.ai |
| Ignition | `logos/ignition.*` | `shots/ignition.*` | ignitionapp.com/brand |
| QuickBooks Online | `logos/quickbooks-online.*` | `shots/quickbooks-online.*` | intuit.com brand portal |
| Xero | `logos/xero.*` | `shots/xero.*` | xero.com/brand |
| Bill.com | `logos/bill-com.*` | `shots/bill-com.*` | bill.com (press) |
| Sage | `logos/sage.*` | `shots/sage.*` | sage.com/newsroom (brand) |
| ProAdvisor | `logos/proadvisor.*` | `shots/proadvisor.*` | intuit.com brand portal |

After adding files: `node docs/integrations/cpa-tools/deploy/build.mjs` then redeploy.
