# Real logos & screenshots — drop-in guide

The build **auto-wires** any file you drop here. Name it by the tool's slug and run `node build.mjs`; it renders and the placeholder disappears. Missing/broken → the branded tile/panel stays (nothing breaks). Current state: 25 logos are already inlined (from each vendor's favicon); screenshot slots are empty.

- **Logos** → `logos/<slug>.<ext>` (SVG preferred, or transparent/white PNG, ~square) — shown in the small tile.
- **Screenshots** → `shots/<slug>.<ext>` (16:9, ~1280×720, PNG/JPG/WebP) — shown in the card panel.

Optimize before adding (SVGO / squoosh) — page speed is an SEO asset.

## Official brand / press kits (researched 2026-07)

Where you can legitimately get **official logos** (higher-res than the favicons currently used) and, in two cases, **product screenshots licensed for media use**. Verified URLs.

| Tool | Brand/press kit | Logos | Screenshots | Notes |
|---|---|---|---|---|
| **Xero** | [xero.com/us/media/downloads](https://www.xero.com/us/media/downloads/) | ✅ SVG/PNG | ✅ **yes** | "Images for media use" — logo, offices, **and product screenshots**. Cleanest source of both. |
| **Ignition** | [ignitionapp.com/mediakit](https://www.ignitionapp.com/mediakit) | ✅ | ✅ **yes** | Full media kit: Logo Sets, **Press Images**, partnership badges + usage guidelines. |
| **TaxDome** | [taxdome.com/press](https://taxdome.com/press) | ✅ | ~ | Press room with logo guidelines + media kit. |
| **Canopy** | [getcanopy.com/brand-guideline/logo](https://www.getcanopy.com/brand-guideline/logo) | ✅ | ~ | Public logo/brand guideline (a "ready to use" logo for external collateral). |
| **Bill.com** | [bill.com/newsroom](https://www.bill.com/newsroom) | ✅ SVG/PNG | ~ | Newsroom offers logo + brand assets to download. |
| **Sage** | [sage.com → digital newsroom resources](https://www.sage.com/en-gb/company/digital-newsroom/resources/) | ✅ hi-res | ~ | Logos + HQ/exec photos; product screenshots not confirmed. |
| **Pixie** | [brandfolder.com/pixie](https://brandfolder.com/pixie) | ✅ (gated) | ~ | Official Brandfolder — sign-in / access request to download. |
| **QuickBooks / Intuit** | [intuit.com/company/press-room/logos](https://www.intuit.com/company/press-room/logos/) · [design.intuit.com/quickbooks/brand](https://design.intuit.com/quickbooks/brand/) | ✅ (corporate/QuickBooks) | ✗ | Editorial-use logos; **no** Lacerte/ProConnect/ProSeries-specific logo, no screenshots. |
| **CCH Axcess, ATX** (Wolters Kluwer) | [wolterskluwer.com/about-us/resources](https://www.wolterskluwer.com/en/about-us/resources) | ✅ (corporate WK) | ✗ | Corporate WK guidelines/images only — not product-specific. |
| **UltraTax CS, ONESOURCE** (Thomson Reuters) | brand.thomsonreuters.com (**login-gated**) · [newsroom](https://newsroom.thomsonreuters.com/) | ~ (gated) | ~ (gated) | No self-serve public product kit; email TR comms. |
| **Drake, File In Time, Financial Cents, Jetpack, Keeper (→Double), Firm360, Aiwyn, ProAdvisor, DueDateHQ** | none first-party | ✗ | ✗ | No public kit. Favicon is the practical logo; email the vendor's comms team for assets. ProAdvisor badges download from inside QuickBooks Online (certified). |

## Screenshots — the honest situation

Real product **UI** is login-gated, and vendors' marketing images are copyrighted — don't scrape and republish them. The clean options:
1. **Press-kit screenshots** where offered for media use — currently **Xero** and **Ignition** (see table).
2. **Your own captures** from trial accounts — the most reliable and honest, and the norm for the rest.

Drop whatever you get into `shots/<slug>.*` and rebuild.

## Rebuild

```bash
node docs/integrations/cpa-tools/deploy/build.mjs   # re-wires logos/ + shots/, regenerates all 33 pages + sitemap
```
