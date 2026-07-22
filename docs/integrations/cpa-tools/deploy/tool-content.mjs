// Editorial content for tool detail pages: pros/cons, real-world scenarios, verdict.
// Rules (same as the rest of the site): qualitative claims from each vendor's public
// positioning and widely reported user experience — no invented numbers, no pay-to-say.
// Prices live in the card data (build.mjs toolData), not here, so they can't drift.
// `scenarios` are illustrative firm profiles, written as such — not client testimonials.

export const toolContent = {
  'drake-tax': {
    pros: [
      'Flat annual price with unlimited returns — the cost story that built its following among small firms',
      'Fast forms-based data entry once learned; keyboard-driven preparers are notably quick in it',
      'All states included rather than sold per-state',
      'Support has a long-standing reputation for picking up the phone',
      'Bundles extras (Drake Accounting, tax planner) without per-module upsells',
    ],
    cons: [
      'Interface looks and feels dated next to cloud-native competitors',
      'Desktop-first: multi-office or remote work means hosting it yourself or paying a third-party host',
      'No public API — getting data out is an export exercise',
      'Thinner fit for complex multi-state entity work than Lacerte or UltraTax',
    ],
    scenarios: [
      {
        h: 'The 1040-shop that watches every dollar',
        p: 'A two-preparer firm running a high volume of individual returns with a modest fee schedule. Unlimited returns at a flat price means software cost per return approaches zero at volume — the classic Drake profile.',
      },
      {
        h: 'The firm leaving a per-return pricing model',
        p: 'Firms migrating off pay-per-return products often land here first: the total-cost math is easy to defend to partners, and the conversion tooling for common competitors is mature.',
      },
    ],
    verdict:
      'The value benchmark in professional tax prep. If your work is volume 1040s and straightforward entities — and you can live with a desktop product and no API — Drake is hard to beat on cost per return. Firms with complex multi-entity work or a cloud-only stack should look up-market.',
  },

  lacerte: {
    pros: [
      'One of the deepest form libraries in professional tax — complex individual, multi-state, and entity work is its home turf',
      'Mature diagnostics that experienced preparers trust to catch cross-form issues',
      'Sits inside the Intuit pro ecosystem: QuickBooks Online Accountant, eSignature, Intuit Tax Advisor',
      'K-1 data flows between returns instead of being re-keyed',
    ],
    cons: [
      'Among the most expensive ways to file a return: custom quotes plus per-return (REP) fees that climb',
      'Pricing is opaque — you cannot see a number without talking to sales',
      'Windows desktop software; cloud means paying for hosting on top',
      'No self-serve API; the SDK is dated and integration is effectively closed',
    ],
    scenarios: [
      {
        h: 'The firm whose returns broke simpler software',
        p: 'A practice with multi-state partnerships, trusts, and high-net-worth individuals. The form coverage and diagnostics are why firms pay the premium — the alternative is preparing edge cases by hand.',
      },
      {
        h: 'The Intuit-stack firm moving up from ProSeries',
        p: 'Already on QuickBooks Online Accountant and ProSeries, hitting complexity limits. Lacerte is the in-family upgrade: same vendor relationship, materially deeper tax engine.',
      },
    ],
    verdict:
      'The complexity specialist. Lacerte earns its cost when your book of business includes returns other software handles badly — and burns money when it does not. Price-sensitive volume shops should run the math against Drake or ProSeries before renewing.',
  },

  proconnect: {
    pros: [
      'Fully cloud-native — nothing to install, host, or patch; work from anywhere by default',
      'Pay-per-return with published pricing: costs scale down to zero in a slow year',
      'Tightest integration in the market with QuickBooks Online Accountant — books-to-tax flows without re-keying',
      'Same Intuit tax engine family as Lacerte, so quality of calculations is credible',
    ],
    cons: [
      'Per-return pricing turns hostile at volume — busy firms often pay more than a flat-price desktop product would cost',
      'Form coverage sits below Lacerte; some complex or niche scenarios are not supported',
      'Browser-only workflow is slower for keyboard-heavy, high-volume data entry',
      'API access is gated rather than self-serve',
    ],
    scenarios: [
      {
        h: 'The cloud-first startup firm',
        p: 'A new practice built on QuickBooks Online with no office server and no appetite for one. ProConnect keeps the whole stack in the browser and the books-to-tax handoff inside one vendor.',
      },
      {
        h: 'The part-time or seasonal preparer',
        p: 'Someone filing a few dozen returns a year. Pay-per-return means no four-figure annual license standing between them and a small book of clients.',
      },
    ],
    verdict:
      'The right default for cloud-native firms on the QuickBooks stack — until return volume makes per-return pricing the most expensive option in the room. Model your volume honestly before choosing it over a flat-price product.',
  },

  proseries: {
    pros: [
      'Published, approachable entry price in a market that hides its numbers',
      'Forms-based entry that long-time preparers find fast and predictable',
      'Big installed base — hiring seasonal staff who already know it is realistic',
      'In-family upgrade path to Lacerte when complexity outgrows it',
    ],
    cons: [
      'The entry price is for a limited bundle; realistic configurations cost meaningfully more',
      'Desktop software with hosting as an extra, like its Intuit desktop siblings',
      'Complex entity and multi-state work hits its ceiling well before Lacerte or UltraTax',
      'No public API',
    ],
    scenarios: [
      {
        h: 'The established small firm with a stable book',
        p: 'A solo or two-person practice doing individual returns plus simple S-corps and partnerships. ProSeries covers the whole book at a known price without Lacerte-class fees.',
      },
      {
        h: 'The firm standardizing for seasonal hiring',
        p: 'Practices that staff up every spring pick ProSeries partly because the temp-preparer labor pool already knows it — training time is real money in March.',
      },
    ],
    verdict:
      'The pragmatic middle of the Intuit desktop line: cheaper and simpler than Lacerte, deeper than consumer-grade tools. Its risk is quiet obsolescence in a cloud-first firm — if you are building around a browser stack, look at ProConnect instead.',
  },

  'ultratax-cs': {
    pros: [
      'Depth on par with Lacerte for complex individual and entity work',
      'Part of the CS Professional Suite — with Practice CS, Fixed Assets CS, and Workpapers, the pieces genuinely interlock',
      'Multi-monitor input/form/prior-year view is a real productivity feature preparers miss elsewhere',
      'Thomson Reuters research (Checkpoint) integration for firms that live in it',
    ],
    cons: [
      'Custom-quote pricing, widely reported as premium and rising at renewal',
      'The full value requires buying into the whole CS suite — as a standalone it is expensive gravity',
      'On-prem/hosted desktop architecture; the cloud story is virtualization, not native',
      'Getting data out without Thomson Reuters tooling is painful; no open API',
    ],
    scenarios: [
      {
        h: 'The mid-size firm standardized on CS Suite',
        p: 'Ten to fifty staff already running Practice CS and Workpapers. UltraTax is the default tax engine for this profile — the suite integration does work the way the brochure says.',
      },
      {
        h: 'The complex-returns firm outside the Intuit orbit',
        p: 'Firms that need Lacerte-class depth but have a Thomson Reuters relationship (or a Checkpoint dependency) pick UltraTax and accept the pricing conversation.',
      },
    ],
    verdict:
      'A top-tier tax engine that makes most sense as the centerpiece of the CS Suite. Buy it for the depth and the suite; budget for the renewal letters. Firms without suite ambitions can get similar depth with less lock-in elsewhere.',
  },

  'cch-axcess': {
    pros: [
      'Genuinely cloud-based suite (tax, documents, workflow, portal) from a top-tier vendor — rare at this depth',
      'Handles large-firm scale: multi-office, role-based permissions, heavy entity work',
      'Has an actual API program (Open Integration Kit) — gated, but real, which beats most of this market',
      'Wolters Kluwer research (CCH AnswerConnect) integration',
    ],
    cons: [
      'Modular pricing by custom quote; assembling the suite gets expensive fast',
      'Implementation and migration are projects, not afternoons — firms report long onboarding',
      'Interface complexity reflects its enterprise ambitions; small firms find it heavy',
      'API access requires the partner/approval path, not a self-serve key',
    ],
    scenarios: [
      {
        h: 'The growing firm consolidating point tools',
        p: 'A twenty-plus-person practice running separate tax, DMS, and workflow products wants one cloud vendor. Axcess is one of the few credible single-vendor answers at that size.',
      },
      {
        h: 'The multi-office firm that needs real permissions',
        p: 'Offices in three states, staff roles that must not see every client. Axcess’s centralized administration is built for exactly this — and is overkill below it.',
      },
    ],
    verdict:
      'The most credible cloud suite for mid-size and larger firms. The trade is money and migration effort for consolidation and scale. Below roughly ten users the same money buys a lighter, faster stack.',
  },

  atx: {
    pros: [
      'Forms-first interface — preparers who think in forms feel at home immediately',
      'Published pricing at the affordable end of professional tax',
      'Large form library for the price tier, including many state and specialty forms',
      'Wolters Kluwer backing — the product line is stable, not a startup risk',
    ],
    cons: [
      'Aimed at preparers and very small firms; workflow features are minimal',
      'Desktop-only architecture, with third-party hosting the common workaround — note the volume of "ATX cloud hosting" searches',
      'Scales poorly past a couple of preparers',
      'No API, no integration story beyond import/export',
    ],
    scenarios: [
      {
        h: 'The independent preparer with a seasonal book',
        p: 'One professional, a few hundred returns, price sensitivity. ATX covers the forms without an enterprise price tag or an enterprise learning curve.',
      },
      {
        h: 'The bookkeeping firm that also files',
        p: 'A books-first practice filing returns for existing clients as a service line. ATX is the low-commitment way to keep that in-house.',
      },
    ],
    verdict:
      'A solid forms tool for solo preparers and side-of-desk filing. It is not a platform to grow a multi-preparer firm on — firms with those ambitions should start the search a tier up.',
  },

  'file-in-time': {
    pros: [
      'Does exactly one job — due-date tracking — and has done it for decades; the mental model is a filing cabinet, not a workflow engine',
      'Comprehensive built-in library of federal and state due dates',
      'One-time-style licensing rather than another monthly subscription',
      'Light footprint: no portal, no onboarding project, no per-client setup tax',
    ],
    cons: [
      'A static calendar: it tracks the dates you enter against its library, but nothing watches for the IRS or a state moving a date',
      'Windows desktop software with a dated interface',
      'No API, no integrations — it does not talk to your practice management or tax software',
      'Per-seat desktop licensing gets awkward for distributed teams',
    ],
    scenarios: [
      {
        h: 'The deadline spreadsheet graduate',
        p: 'A small firm whose master deadline spreadsheet has become load-bearing and scary. File In Time is the established, boring, reliable upgrade for tracking what is due when.',
      },
      {
        h: 'The compliance-calendar owner at a traditional firm',
        p: 'One admin owns the calendar for the whole office and wants software older than the intern — stable, local, predictable.',
      },
    ],
    verdict:
      'The incumbent for static due-date tracking, and fine at it. Its blind spot is change: when a deadline moves — disaster relief, mid-season IRS notices — it holds yesterday’s date until a human notices. Firms burned by that failure mode are the reason active monitoring tools exist as a category.',
  },

  duedatehq: {
    disclosure: true,
    pros: [
      'Actively monitors the official sources (IRS, state agencies, FEMA) instead of holding a static calendar — the category’s reason to exist',
      'Maps each rule or date change to the specific clients it affects, rather than announcing news and leaving the triage to you',
      'Every alert carries its official source, so review is evidence-backed instead of trust-based',
      'Tool-agnostic layer: works alongside whatever practice management or tax software the firm already runs',
      'Free during beta',
    ],
    cons: [
      'Young product from a small team — a fraction of the operating history of a File In Time or ONESOURCE',
      'A monitoring layer, not a full practice-management suite: no e-sign, portals, or billing, by design',
      'US federal and state scope only',
      'Beta means the roadmap is still moving',
    ],
    scenarios: [
      {
        h: 'The firm that got burned by a moved deadline',
        p: 'A state pushed a deadline during disaster relief; the firm’s tracker held the old date and clients called first. An active monitoring layer exists precisely so the firm hears it from the source before the client does.',
      },
      {
        h: 'The multi-state book with change exposure',
        p: 'Clients across many states means many agencies that can each move a date. Watching them manually does not scale; subscribing to the changes and seeing "which of my clients does this touch" does.',
      },
    ],
    verdict:
      'The active-monitoring counterpart to static trackers: pick it for hearing about deadline and rule changes from the official source with your affected clients attached. It deliberately does not replace a practice suite — it layers on top of one. (Disclosure below: this is our product.)',
  },

  'onesource-calendar': {
    pros: [
      'Enterprise-grade compliance calendar from Thomson Reuters, built for corporate tax departments',
      'Strong multi-entity, multi-jurisdiction obligation tracking at scale',
      'Lives inside the broader ONESOURCE platform for corporate tax',
      'Vendor stability and audit-friendly process pedigree',
    ],
    cons: [
      'Priced and scoped for corporate tax departments, not CPA firms — custom quote, enterprise sales cycle',
      'Heavy to implement and administer relative to firm-sized alternatives',
      'A calendar and workflow tracker at heart; monitoring for rule changes is not the product’s center of gravity',
      'Integration is enterprise-IT-shaped, not self-serve',
    ],
    scenarios: [
      {
        h: 'The corporate tax department with hundreds of entities',
        p: 'A multinational tracking filings across dozens of jurisdictions inside an existing ONESOURCE deployment. This is the product’s native habitat.',
      },
      {
        h: 'The firm serving corporate clients on ONESOURCE',
        p: 'CPA firms touch it mostly from the outside — working with clients whose tax departments run it — rather than buying it for the practice.',
      },
    ],
    verdict:
      'The enterprise answer to obligation tracking, and the wrong size for almost every CPA firm. Firms wanting deadline coverage should look at firm-scale tools; corporate departments already in ONESOURCE should stay there.',
  },

  karbon: {
    pros: [
      'Email triage is genuinely integrated with work — client emails, tasks, and jobs live on one timeline, which remains its signature',
      'The most complete self-serve public API in practice management, with webhooks — automation-minded firms can actually build',
      'Mature workflow automation: templates, client tasks, automatic reminders that reliably chase clients',
      'Strong multi-team visibility for firms past the everyone-knows-everything size',
    ],
    cons: [
      'Premium per-user pricing that stings as headcount grows',
      'Real onboarding curve — firms that skip implementation discipline churn off it',
      'Email-centric model is a mismatch for firms that live in portals or phones',
      'No tax prep, no ledger: it orchestrates work done in other tools',
    ],
    scenarios: [
      {
        h: 'The firm drowning in its shared inbox',
        p: 'Ten staff, one info@ inbox, no one sure who owns which client thread. Karbon’s email-to-work triage is the specific cure for this specific disease.',
      },
      {
        h: 'The automation-minded firm with an ops brain',
        p: 'A practice that wants to script its workflows — auto-create jobs, sync status to a dashboard, push data around. The open API is the differentiator no close competitor matches.',
      },
    ],
    verdict:
      'The premium pick for firms whose bottleneck is coordination and email chaos, and the default pick for firms that want to build on an API. Pay for it when those describe you; a simpler tracker is cheaper when they do not.',
  },

  taxdome: {
    pros: [
      'Widest all-in-one span in its price class: portal, CRM, workflow, e-signature, payments, and document management in one subscription',
      'Client portal and mobile app are genuinely strong — clients actually use them',
      'Unlimited e-signatures and contacts rather than per-envelope fees',
      'Self-serve API keys available, unusual for all-in-one suites',
    ],
    cons: [
      'Breadth over depth: individual modules are lighter than the point tools they replace',
      'Dense, option-heavy interface with a real setup investment',
      'Pricing favors multi-year commitments; month-to-month flexibility costs more',
      'Workflow automation is capable but less elegant than Karbon’s for email-driven firms',
    ],
    scenarios: [
      {
        h: 'The firm replacing four subscriptions with one',
        p: 'Separate portal, e-sign, CRM, and task tools — four logins, four invoices. TaxDome’s pitch is that consolidation, and for small firms the math usually works.',
      },
      {
        h: 'The client-experience-first practice',
        p: 'A firm competing on being easy to work with: branded portal, mobile app, digital signatures, online payment in one flow. This is TaxDome’s strongest face.',
      },
    ],
    verdict:
      'The consolidation play. Best value in its class if you will actually use four of its modules; a heavier lift than a focused tool if you only need one. Compare against Karbon when workflow depth matters more than breadth, and against Canopy when document management leads.',
  },

  canopy: {
    pros: [
      'Modular pricing — start with the base and add practice management, document management, or workflow as needed',
      'Document management and client portal are the standout modules',
      'Purpose-built IRS transcript and notice tooling that tax-resolution firms specifically seek out',
      'Cleaner, calmer interface than most all-in-ones',
    ],
    cons: [
      'Module pricing accumulates — the sticker base price is not the real price for full functionality',
      'Workflow automation is lighter than Karbon or TaxDome at the top end',
      'API access is gated rather than self-serve',
      'No tax prep; it coordinates around your tax engine',
    ],
    scenarios: [
      {
        h: 'The tax resolution practice',
        p: 'A firm whose work is IRS notices, transcripts, and representation. Canopy’s transcript tooling is the niche feature that decides this purchase.',
      },
      {
        h: 'The firm that wants to buy one module at a time',
        p: 'A practice replacing its DMS first, unsure about the rest. Canopy’s modularity allows an incremental migration where all-in-ones demand a leap.',
      },
    ],
    verdict:
      'The modular middle ground between point tools and all-in-one suites, with a genuine edge for tax-resolution work. Price the modules you will actually buy before comparing — the base price flatters it.',
  },

  'financial-cents': {
    pros: [
      'The value leader in practice management — lowest published per-user entry price in the category',
      'Deliberately simple: firms are productive in days, not quarters',
      'Solid core loop: recurring projects, due dates, client tasks, capacity view',
      'Built with bookkeepers and small accounting firms squarely in mind',
    ],
    cons: [
      'No direct API — automation runs through Zapier only',
      'Feature depth trails the premium tier: lighter reporting, simpler automation',
      'Client portal is serviceable rather than differentiating',
      'Less suited to complex multi-team firms',
    ],
    scenarios: [
      {
        h: 'The bookkeeping firm graduating from spreadsheets',
        p: 'Five staff tracking recurring monthly work in a grid of tabs. Financial Cents is the lowest-friction, lowest-cost step into real practice management.',
      },
      {
        h: 'The price-sensitive firm that needs the basics done well',
        p: 'A practice that wants deadlines, assignments, and client chasing without paying premium-tier prices for automation it will not use.',
      },
    ],
    verdict:
      'The best answer to "we need practice management but not a project." What you give up is depth and integration openness; what you get is the shortest path from spreadsheet chaos to organized recurring work at the lowest price on this page.',
  },

  'jetpack-workflow': {
    pros: [
      'Recurring-work checklists done simply — the core job for deadline-driven books and tax practices',
      'Quick to learn; small teams onboard themselves',
      'Affordable tier between the budget and premium ends of the category',
      'Focused product that has resisted feature bloat',
    ],
    cons: [
      'No client portal — client collaboration happens outside the tool',
      'Reporting and capacity planning are basic',
      'Zapier-only integration, no direct API',
      'Firms often outgrow it as team structure gets more complex',
    ],
    scenarios: [
      {
        h: 'The seasonal checklist firm',
        p: 'A small tax practice whose year is a repeating grid of returns and extensions. Jetpack’s recurring checklists mirror how the firm already thinks.',
      },
      {
        h: 'The firm that wants task tracking without a platform',
        p: 'No portal ambitions, no automation dreams — just "what is due, who owns it, is it done." Jetpack answers exactly that and nothing else.',
      },
    ],
    verdict:
      'A focused recurring-work tracker for small firms that want simplicity over surface area. Compare with Financial Cents at the value end; move to Karbon or TaxDome when portals and automation start mattering.',
  },

  keeper: {
    pros: [
      'Purpose-built for client accounting services: month-end close checklists, file review, and client questions in one loop',
      'Deep QuickBooks Online and Xero integration — it reads the actual books to power review',
      'Client portal shaped around bookkeeping questions rather than generic file exchange',
      'Flat firm pricing rather than per-user',
    ],
    cons: [
      'Bookkeeping-first scope: tax workflow and general practice management are not the product',
      'Flat price is a hurdle for very small books of business',
      'Narrower community and integration ecosystem than the big suites',
      'API story is thin; it is an endpoint, not a platform',
    ],
    scenarios: [
      {
        h: 'The CAS practice standardizing month-end close',
        p: 'A firm doing outsourced bookkeeping for dozens of clients wants every close to run the same checklist with the client Q&A attached to the books. This is Keeper’s exact center.',
      },
      {
        h: 'The bookkeeping team tired of chasing answers by email',
        p: 'Uncategorized-transaction questions scattered across inboxes become a portal queue clients actually answer.',
      },
    ],
    verdict:
      'The specialist for client accounting services — closer to the books than any general practice manager. Tax-led firms should treat it as a complement to their PM, not a replacement.',
  },

  firm360: {
    pros: [
      'Covers projects, time and billing, documents, and a client portal in one mid-priced package',
      'Time and billing included — several same-tier competitors leave invoicing to another tool',
      'Straightforward per-user pricing without module math',
      'Small-vendor responsiveness; customers report being heard',
    ],
    cons: [
      'Smaller brand and community than the category leaders — fewer templates, integrations, and hiring-pool familiarity',
      'Individual modules are lighter than dedicated tools',
      'Zapier-level integration only',
      'Less proven at larger team sizes',
    ],
    scenarios: [
      {
        h: 'The firm that bills time and wants one invoice trail',
        p: 'A practice invoicing hourly and fixed-fee work that wants projects and billing in the same system instead of syncing a PM tool to a billing tool.',
      },
      {
        h: 'The all-in-one buyer priced out of the big names',
        p: 'Wants the TaxDome shape at a smaller number with simpler setup, and accepts a smaller ecosystem as the trade.',
      },
    ],
    verdict:
      'A sensible all-rounder for small firms where included time-and-billing is the deciding feature. Shortlist it against TaxDome and Financial Cents and let the billing workflow break the tie.',
  },

  pixie: {
    pros: [
      'Flat monthly price for the whole firm — per-user math disappears',
      'Email-integrated task and client tracking in a deliberately simple package',
      'Minimal setup; small firms are running in an afternoon',
      'Built-in client request chasing without automation programming',
    ],
    cons: [
      'Flat price is only a bargain past a few users — tiny teams may pay more than per-user rivals',
      'Simplicity ceiling: light reporting, light workflow customization',
      'No public API',
      'Smaller vendor with a narrower ecosystem',
    ],
    scenarios: [
      {
        h: 'The five-person firm allergic to per-seat pricing',
        p: 'Growing headcount without renegotiating software spend every hire — the flat fee is the entire pitch, and it lands.',
      },
      {
        h: 'The email-native micro firm',
        p: 'Work arrives by email and the firm wants tasks born from those emails without adopting a heavyweight triage platform.',
      },
    ],
    verdict:
      'A simple, flat-priced practice manager for small email-driven firms. Do the per-user arithmetic at your headcount first; the answer decides between Pixie and Financial Cents more than features do.',
  },

  aiwyn: {
    pros: [
      'Focused on the revenue side larger firms actually bleed on: engagement letters, billing, collections, payments',
      'Practice-intelligence layer over existing PM/tax systems rather than a rip-and-replace',
      'Credible traction among top-few-hundred firms, including an AI-forward tax product direction',
      'Modern platform and integration posture by enterprise-accounting standards',
    ],
    cons: [
      'Enterprise product, enterprise sales cycle, custom pricing — not shaped for small firms',
      'Not general practice management: it assumes you already have one',
      'Young company relative to the incumbents it augments',
      'Value depends on integration into your existing suite going well',
    ],
    scenarios: [
      {
        h: 'The 100-person firm with a receivables problem',
        p: 'Partners under-bill, invoices lag, collections drift. Aiwyn’s engagement-to-payment automation targets exactly this leak at exactly this size.',
      },
      {
        h: 'The regional firm modernizing without replatforming',
        p: 'Layering automation over an entrenched CS/CCH stack, because replacing the stack is a five-year war nobody wants.',
      },
    ],
    verdict:
      'The enterprise revenue-automation layer — compelling for large firms, irrelevant below them. If your firm size has a managing-partner-of-operations, look; otherwise this page is a curiosity.',
  },

  ignition: {
    pros: [
      'Proposal-to-payment in one motion: engagement letter, e-signature, and automatic payment collection in a single client flow',
      'Recurring billing and payment collection that kills the awkward chasing conversation',
      'Strong integrations with the tools around it — QuickBooks, Xero, Karbon and peers',
      'Published pricing with an accessible entry tier',
    ],
    cons: [
      'A front-door tool, not practice management — work tracking happens elsewhere',
      'Payment processing fees are part of the real cost math',
      'Less valuable for firms with few clients or static annual engagements',
      'Templates push toward standardized packaging, which suits some practices better than others',
    ],
    scenarios: [
      {
        h: 'The firm productizing its services',
        p: 'Moving from bespoke hourly quotes to packaged monthly services. Ignition turns the package into a signed, auto-billing engagement without an invoice ever being manually raised.',
      },
      {
        h: 'The practice with a collections problem at onboarding',
        p: 'Getting payment details captured at signature time — before work starts — structurally ends the unpaid-invoice chase.',
      },
    ],
    verdict:
      'The best-known answer for engagement letters that collect their own payment. It complements a practice manager rather than replacing one; firms with billing pain at the front door get the clearest win.',
  },

  'quickbooks-online': {
    pros: [
      'The de facto US small-business ledger — client familiarity is the moat no competitor has cracked',
      'Deepest accountant channel in the market: QuickBooks Online Accountant, ProAdvisor program, books-to-tax into Intuit tax products',
      'Enormous app ecosystem and a genuinely open developer API',
      'Continuous feature investment at market-leader scale',
    ],
    cons: [
      'Per-client subscription economics add up across a large client base, with recurring price increases',
      'Feature churn and UI changes generate steady retraining friction',
      'Advanced accounting needs (multi-entity, heavy inventory) strain it',
      'Support quality at the standard tiers is a common complaint',
    ],
    scenarios: [
      {
        h: 'The firm that meets clients where they are',
        p: 'Most US small-business clients arrive already on QBO. Standardizing the practice on it converts client familiarity into workflow leverage.',
      },
      {
        h: 'The books-to-tax Intuit pipeline',
        p: 'QBOA books flowing into ProConnect or Lacerte returns keeps the busiest data path in the firm inside one vendor’s rails.',
      },
    ],
    verdict:
      'The default ledger for US practices, chosen as much by clients as by firms. Manage the subscription economics deliberately; the ecosystem and client familiarity are why it stays the center of gravity.',
  },

  xero: {
    pros: [
      'Clean, consistent ledger UX that bookkeepers frequently prefer',
      'Long-standing open API and a mature app ecosystem',
      'Unlimited users on every plan — collaboration without per-seat friction on the client side',
      'Strong accountant partner program',
    ],
    cons: [
      'US market share trails QuickBooks badly — client familiarity usually is not on your side here',
      'US-specific depth (payroll integrations, some tax touches) is thinner than its home markets',
      'Migrating a QBO-native client base is friction with limited payoff',
      'Practice tooling (Xero Practice Manager) is a separate product with its own learning curve',
    ],
    scenarios: [
      {
        h: 'The firm that standardizes on product quality',
        p: 'A practice that controls its clients’ ledger choice and picks Xero for the cleaner books and unlimited-user model, accepting the US-ecosystem trade.',
      },
      {
        h: 'The internationally connected practice',
        p: 'Clients with UK, AU, or NZ operations where Xero is the local default — one ledger family across borders.',
      },
    ],
    verdict:
      'A high-quality ledger fighting an ecosystem war in the US. Choose it when you control the client stack or serve international books; choose QBO when client familiarity decides.',
  },

  'bill-com': {
    pros: [
      'The standard for AP automation in client accounting services — approval workflows, payment execution, audit trail',
      'Syncs with the ledgers firms actually run: QBO, Xero, Sage Intacct',
      'Console for managing many clients’ AP from one place',
      'Handles the compliance details (payment records, approvals) that manual AP scatters',
    ],
    cons: [
      'Per-user and per-transaction fees stack into real money at volume',
      'Sync issues with ledgers are the perennial support theme',
      'Interface is workmanlike; client-side users need hand-holding',
      'AR features are weaker than the AP core',
    ],
    scenarios: [
      {
        h: 'The CAS firm running AP for dozens of clients',
        p: 'Bill approval and payment execution across a client roster from one console, with each client’s books syncing back — the firm-side use case the product is built around.',
      },
      {
        h: 'The client who must stop signing checks',
        p: 'Moving a paper-check business onto controlled digital approvals: the firm sets guardrails and the audit trail materializes for free.',
      },
    ],
    verdict:
      'The category leader for firm-managed AP. Model the fee stack honestly at your volume, and treat it as an AP specialist — not a general finance platform.',
  },

  sage: {
    pros: [
      'A real product ladder: entry cloud accounting up through Sage Intacct for mid-market finance',
      'Sage Intacct specifically is a leader for multi-entity, nonprofit, and dimensional accounting',
      'Accountant program and partner channel with long institutional history',
      'Strong in verticals (construction, nonprofits) where QBO thins out',
    ],
    cons: [
      'The US small-business Sage products live deep in QuickBooks’ shadow — client familiarity is rare',
      'A fragmented product family: "Sage" means five different products depending on who is talking',
      'Ecosystem and app marketplace are smaller at the low end',
      'Intacct, the compelling product, is a mid-market price point',
    ],
    scenarios: [
      {
        h: 'The firm serving clients that outgrew QBO',
        p: 'Multi-entity consolidation, dimensions, and reporting needs push a growing client to Intacct — and the firm follows with an Intacct practice.',
      },
      {
        h: 'The vertical practice',
        p: 'A construction- or nonprofit-focused firm standardizing on Sage’s vertical strengths rather than fighting them in a generic ledger.',
      },
    ],
    verdict:
      'In this guide’s context, Sage matters mostly as the up-market and vertical answer — especially Intacct for clients who outgrow QBO. As a general small-business ledger for US firms, it is a niche pick.',
  },

  proadvisor: {
    pros: [
      'Free to join, with training and certification that carry real weight with small-business clients',
      'Discounted and revenue-share access to the QuickBooks stack for the firm and its clients',
      'The Find-a-ProAdvisor directory is a genuine, ongoing lead source for certified firms',
      'Certification levels give newer practitioners a credible public credential',
    ],
    cons: [
      'A vendor loyalty program, not software — the value is coupled to committing to the Intuit ecosystem',
      'Directory leads skew small and price-sensitive',
      'Certification maintenance is recurring unpaid time',
      'Deepening Intuit dependence is a strategic choice, not a neutral one',
    ],
    scenarios: [
      {
        h: 'The new practice bootstrapping credibility',
        p: 'A first-year firm uses certification plus the directory listing as its cheapest working marketing channel while the referral network grows.',
      },
      {
        h: 'The QBO-standardized firm compounding its stack choice',
        p: 'Already all-in on QBO: the program converts that commitment into discounts, early feature access, and a badge clients recognize.',
      },
    ],
    verdict:
      'Not a tool but a channel: free credibility and leads in exchange for ecosystem commitment. For QBO-centric firms it is close to a no-brainer; for stack-agnostic firms it is quiet lock-in.',
  },
}
