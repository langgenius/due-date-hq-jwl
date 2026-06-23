import type { LandingCopy } from './types'

const en: LandingCopy = {
  meta: {
    title: 'DueDateHQ — Catch every tax-deadline change and see who it affects',
    description:
      'Deadline-change monitoring for US CPA practices. DueDateHQ catches when an IRS, state, or FEMA deadline moves and shows exactly which clients it affects, with a source on every date — layered on top of the tools you already use.',
    ogImage: '/og/home.en.png',
  },
  nav: {
    brand: 'DueDateHQ',
    audience: 'For US CPA practices',
    links: [
      { label: 'Product', href: '/#hero' },
      { label: 'Workflow', href: '/#workflow' },
      { label: 'Evidence', href: '/#proof' },
      { label: 'Security', href: '/#security' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Resources', href: '/rules' },
      { label: 'Trust', href: '/security' },
    ],
    statusPill: 'Monitoring 50 states + DC',
    cta: 'Open the workbench',
  },
  hero: {
    eyebrow: 'GLASS-BOX DEADLINE INTELLIGENCE',
    title: 'See deadline risk before it becomes a missed filing.',
    description:
      'DueDateHQ is the deadline-monitoring workbench for US CPA practices. Every deadline, every IRS rule, every state-level alert traces back to its official source — in one keyboard-first workbench built for the Monday 5-minute triage.',
    positioning:
      "It's deadline-and-rule-change monitoring that sits on top of your Drake, UltraTax, or TaxDome — replacing the Excel-and-Outlook patchwork you use to catch what they miss, not your stack.",
    primaryCta: 'Start free',
    secondaryCta: 'See the workflow',
    demoCta: 'Try a live demo',
    trust: [
      { label: 'Watches your stack' },
      { label: 'No black-box AI' },
      { label: 'Cites every number' },
      { label: 'Keyboard-first' },
      { label: 'Around the clock' },
    ],
    surface: {
      breadcrumb: { workbench: 'Workbench', dashboard: 'Today', week: 'This week' },
      kbdCommand: 'Command',
      brief: {
        status: 'READY',
        title: 'AI weekly brief',
        text: 'Start with Acme and Birchwood: both are inside the seven-day window, have complete source trails, and need review.',
        citation: '[1] IRS Pub 509',
      },
      alert: {
        tag: 'ALERT',
        text: 'CA-FTB extends Form 540 + 540-ES to Oct 15 · Affects 12 of your clients.',
        source: 'ftb.ca.gov · 2026-04-25',
        cta: 'Review',
      },
      metric: {
        eyebrow: 'DEADLINE MONITOR · THIS WEEK',
        range: 'Apr 25 — May 01',
        value: '12',
        delta: '+3 vs last Mon',
        stats: [
          { label: 'CRITICAL CLIENTS', value: '5' },
          { label: 'REVIEW NEEDED', value: '12' },
          { label: 'ALERTS (24h)', value: '3' },
          { label: 'FILED THIS WEEK', value: '11' },
        ],
      },
      triageTabs: [
        { label: 'This Week', count: '12' },
        { label: 'This Month', count: '21' },
        { label: 'Long-term', count: '8' },
      ],
      table: {
        headers: {
          priority: 'PRIORITY',
          client: 'CLIENT',
          form: 'FORM',
          due: 'DUE',
          days: 'DAYS',
          status: 'STATUS',
          severity: 'SEVERITY',
          exposure: 'NEXT STEP',
          evidence: 'EVIDENCE',
        },
        rows: [
          {
            priorityScore: '88.4',
            priorityRank: '#1',
            priorityTone: 'destructive',
            client: 'Acme LLC',
            ein: '87-1234567',
            form: '1120-S',
            due: 'Apr 28',
            daysLeft: 'in 3d',
            status: 'Review',
            statusTone: 'warning',
            statusDotTone: 'warning',
            severityLabel: 'critical',
            exposure: 'Review source',
            exposureTone: 'warning',
            evidence: 'IRS Pub 509',
            evidenceTone: 'info',
            severity: 'critical',
          },
          {
            priorityScore: '81.2',
            priorityRank: '#2',
            priorityTone: 'destructive',
            client: 'Birchwood Co',
            ein: '87-9988776',
            form: '1065',
            due: 'Apr 29',
            daysLeft: 'in 4d',
            status: 'Waiting',
            statusTone: 'outline',
            statusDotTone: 'warning',
            severityLabel: 'critical',
            exposure: 'Await client',
            exposureTone: 'warning',
            evidence: 'IRS Pub 509',
            evidenceTone: 'info',
            severity: 'critical',
          },
          {
            priorityScore: '63.7',
            priorityRank: '#3',
            priorityTone: 'warning',
            client: 'Crestmont Inc',
            ein: '88-2233445',
            form: '1120',
            due: 'May 02',
            daysLeft: 'in 7d',
            status: 'In progress',
            statusTone: 'info',
            statusDotTone: 'normal',
            severityLabel: 'high',
            exposure: 'Finish review',
            exposureTone: 'warning',
            evidence: 'IRS Pub 509',
            evidenceTone: 'info',
            severity: 'high',
          },
          {
            priorityScore: '42.5',
            priorityRank: '#4',
            priorityTone: 'info',
            client: 'Delta Group',
            ein: '88-7654321',
            form: '540-ES',
            due: 'May 10',
            daysLeft: 'in 15d',
            status: 'Pending',
            statusTone: 'secondary',
            statusDotTone: 'disabled',
            severityLabel: 'medium',
            exposure: 'Review alerts',
            exposureTone: 'warning',
            evidence: 'CA-FTB FR-31',
            evidenceTone: 'info',
            severity: 'medium',
          },
          {
            priorityScore: '34.1',
            priorityRank: '#5',
            priorityTone: 'info',
            client: 'Evergreen LLC',
            ein: '87-1100221',
            form: '1065',
            due: 'May 14',
            daysLeft: 'in 19d',
            status: 'Pending',
            statusTone: 'secondary',
            statusDotTone: 'disabled',
            severityLabel: 'medium',
            exposure: 'Assign owner',
            exposureTone: 'warning',
            evidence: 'IRS Pub 509',
            evidenceTone: 'info',
            severity: 'medium',
          },
        ],
      },
      hints: [
        { keys: 'E', label: 'Evidence' },
        { keys: 'J / K', label: 'Move row' },
        { keys: '⌘K', label: 'Command' },
        { keys: '?', label: 'Shortcuts' },
      ],
      liveLabel: 'live preview · not your data',
    },
  },
  sla: {
    items: [
      {
        ruleNumber: 'RULE 00',
        ruleLabel: '01 TRIAGE',
        value: '30',
        unit: 'sec',
        description:
          'See this week’s 5 most urgent clients on the Monday workbench. The deadline monitor loads instantly — your Monday triage queue is ready before you are.',
      },
      {
        ruleNumber: 'RULE 00',
        ruleLabel: '02 MIGRATE',
        value: '30',
        unit: 'min',
        description:
          'Paste, map, normalize, generate. 30 clients to a verified annual calendar in one sitting — no per-client setup wizards.',
      },
      {
        ruleNumber: 'RULE 00',
        ruleLabel: '03 ALERTS',
        value: '24',
        unit: 'hrs',
        description:
          'Monitored state filing notices and IRS updates reach Today and email within a day, with a source excerpt and a one-click apply across affected clients.',
      },
    ],
  },
  problem: {
    eyebrow: 'THE PROBLEM WITH TODAY’S STACK',
    index: '01',
    title: 'Excel + Outlook + 50 state websites — one missed deadline away from trouble.',
    paragraph:
      '1–10-person CPA practices stitch together legacy desktop trackers, regulatory PDFs, and spreadsheet calendars. The result: deadline work scattered across tools, state changes buried in email, and Monday triage that takes a full morning.',
    footnote: 'A single missed federal or state filing deadline can sit unnoticed for weeks',
    cards: [
      {
        tag: 'STATE WATCH',
        severity: 'critical',
        cadence: 'avg / firm / yr',
        headline:
          '14 rule changes ship in a 30-day window. You need to know which 4 hit your clients.',
        body: 'Alerts condense every IRS notice and 50-state filing change into a single in-app banner with `source_excerpt`, `source_url`, and a one-click apply path.',
        listTitle: 'Rule changes, last 30 days',
        listSummary: '14 changes · 50 states + DC',
        rows: [
          { pill: 'CA-FTB', text: 'Form 540 deadline change', date: 'Apr 25' },
          { pill: 'NY-DTF', text: 'MTA-305 surcharge update', date: 'Apr 22' },
          { pill: 'IRS', text: 'Pub 509 calendar revision', date: 'Apr 18' },
        ],
      },
      {
        tag: 'NOTICE TRIAGE',
        severity: 'high',
        cadence: 'avg / firm / yr',
        headline: '312 inbox items per week, 4 of which put a client deadline at risk.',
        body: 'Email digests + in-app banners replace inbox archeology. Owner is the only signer; no notice slips into a junior’s drafts.',
        listTitle: 'Inbox · unread',
        listSummary: '312 unread · 4 critical',
        rows: [
          { pill: 'CA-FTB', text: 'Disaster relief postponement — LA county', date: '9:42' },
          { pill: 'IRS', text: 'Quarterly publication update for tax year 2026', date: 'Wed' },
          { pill: 'Drake', text: 'Software update notice — needs your action', date: 'Mon' },
          { pill: 'QuickBooks', text: '8 client documents await classification', date: 'Sun' },
        ],
      },
      {
        tag: 'MIGRATION DRAG',
        severity: 'medium',
        cadence: 'avg / firm / yr',
        headline: '4 hours of typing to move 30 clients from File-In-Time to anywhere.',
        body: 'Migration Copilot maps, standardizes, and generates the year’s calendar in a typical 30-minute session — no per-client setup wizards. Every imported client carries an evidence link to its source row.',
        listTitle: 'File-In-Time export → spreadsheet',
        listSummary: '30 clients · 4 hrs typing',
        rows: [
          { pill: 'Acme LLC', text: '— missing EIN', date: 'LOW 0.62', severity: 'critical' },
          { pill: 'Birchwood Co', text: '— unclear state', date: 'LOW 0.62', severity: 'medium' },
          {
            pill: 'Crestmont Inc',
            text: '— wrong entity type',
            date: 'LOW 0.62',
            severity: 'critical',
          },
          {
            pill: 'Delta Group',
            text: '— deadline format ?',
            date: 'LOW 0.62',
            severity: 'medium',
          },
        ],
      },
    ],
  },
  workflow: {
    eyebrow: 'THE WORKFLOW',
    index: '02',
    title: 'Triage. Migrate. Verify. Three slices, one workbench.',
    paragraph:
      'DueDateHQ is built around three product rules: every action lives on the keyboard, every number is mono-tabular, every AI output cites its source. Below: three slices of the actual workbench.',
    steps: [
      {
        index: '01',
        tag: 'TRIAGE · 30 SECONDS',
        headline: 'The Monday workbench.',
        body: 'Owner opens the laptop, sees five urgent clients, the evidence status, and the first action keystroke. Smart Priority ranks by days remaining, evidence completeness, and alert status — no AI in the triage path.',
        hints: [
          { keys: '⌘K', label: 'Command' },
          { keys: 'E', label: 'Evidence' },
        ],
        surface: {
          kind: 'dashboard',
          header: { title: 'Today · Monday triage', timestamp: '2026-04-25 08:14' },
          ranges: ['This week', 'This month', 'Long term'],
          summary: [
            { label: 'OPEN', value: '18' },
            { label: 'DUE THIS WEEK', value: '12' },
            { label: 'NEEDS REVIEW', value: '5' },
          ],
          tableHeaders: {
            priority: 'PRIORITY',
            client: 'CLIENT',
            form: 'FORM',
            due: 'DEADLINE',
            status: 'STATUS',
            severity: 'SEVERITY',
            exposure: 'NEXT STEP',
            evidence: 'EVIDENCE',
          },
          alert: {
            tag: 'ALERT',
            text: 'IRS extends Form 1040 to Oct 15 · 18 of your clients now in the new window.',
            cta: 'Apply to 18',
          },
          rows: [
            {
              priorityScore: '88.4',
              priorityRank: '#1',
              priorityTone: 'destructive',
              client: 'Acme LLC',
              form: '1120-S',
              due: 'Apr 28',
              daysLeft: 'in 3d',
              status: 'Needs review',
              statusTone: 'warning',
              statusDotTone: 'warning',
              severityLabel: 'critical',
              exposure: 'Review source',
              exposureTone: 'warning',
              evidence: '2 sources',
              evidenceTone: 'info',
              severity: 'critical',
            },
            {
              priorityScore: '81.2',
              priorityRank: '#2',
              priorityTone: 'destructive',
              client: 'Birchwood Co',
              form: '1065',
              due: 'Apr 29',
              daysLeft: 'in 4d',
              status: 'Waiting',
              statusTone: 'outline',
              statusDotTone: 'warning',
              severityLabel: 'critical',
              exposure: 'Await client',
              exposureTone: 'warning',
              evidence: '1 source',
              evidenceTone: 'info',
              severity: 'critical',
            },
            {
              priorityScore: '63.7',
              priorityRank: '#3',
              priorityTone: 'warning',
              client: 'Crestmont Inc',
              form: '1120',
              due: 'May 02',
              daysLeft: 'in 7d',
              status: 'In progress',
              statusTone: 'info',
              statusDotTone: 'normal',
              severityLabel: 'medium',
              exposure: 'Finish review',
              exposureTone: 'warning',
              evidence: 'Open',
              evidenceTone: 'outline',
              severity: 'medium',
            },
          ],
        },
      },
      {
        index: '02',
        tag: 'MIGRATE · 30 MINUTES',
        headline: 'Paste, map, normalize, generate.',
        body: 'Migration Copilot maps 30 fields per client with confidence-graded suggestions. High-confidence matches apply automatically; lower-confidence ones are flagged for a quick human check — you nudge, you don’t retype.',
        hints: [
          { keys: '⌘V', label: 'Paste' },
          { keys: 'Tab', label: 'Next field' },
        ],
        surface: {
          kind: 'mapping',
          step: 'Migration Copilot · Step 2 of 4',
          steps: [
            { label: 'Intake' },
            { label: 'AI Mapping' },
            { label: 'Normalize' },
            { label: 'Genesis' },
          ],
          headers: {
            source: 'FIT EXPORT COLUMN',
            target: 'DUEDATEHQ FIELD',
            sample: 'SAMPLE',
            confidence: 'CONFIDENCE',
          },
          rows: [
            {
              source: 'ClientName',
              sample: 'Acme Holdings LLC',
              target: 'client.legal_name',
              confidenceLabel: 'HIGH 0.97',
              confidence: 'HIGH',
            },
            {
              source: 'EIN_TIN',
              sample: '87-1234567',
              target: 'client.ein',
              confidenceLabel: 'HIGH 0.99',
              confidence: 'HIGH',
            },
            {
              source: 'Entity',
              sample: 'LLC (S-corp election)',
              target: 'client.entity_type · entity.s_election=true',
              confidenceLabel: 'HIGH 0.96',
              confidence: 'HIGH',
            },
            {
              source: 'Filing State',
              sample: 'CA, NY',
              target: 'client.states[]',
              confidenceLabel: 'MED 0.84',
              confidence: 'MED',
            },
            {
              source: 'Notes',
              sample: 'Quarterly review needed',
              target: 'migration.notes',
              confidenceLabel: 'LOW 0.71',
              confidence: 'LOW',
            },
          ],
          footer: { summary: '30 rows · AI mapper avg conf 0.91', cta: 'Apply mapping' },
        },
      },
      {
        index: '03',
        tag: 'VERIFY · EVERY CLAIM',
        headline: 'No provenance, no render.',
        body: 'Every AI sentence and every rule citation links back to a `source_url`, a `source_excerpt`, and a `verified_at`. If those three fields are missing, DueDateHQ shows a verification-needed state instead of a recommendation.',
        hints: [
          { keys: 'E', label: 'Open evidence' },
          { keys: 'Esc', label: 'Close' },
        ],
        surface: {
          kind: 'evidence',
          drawerTitle: 'Evidence drawer · Acme LLC · 1120-S due Apr 28',
          confidence: 'HIGH 0.97',
          closeHint: 'ESC · close',
          fields: [
            { label: 'CLIENT', value: 'Acme Holdings LLC' },
            { label: 'EIN', value: '87-1234567' },
            { label: 'FORM', value: '1120-S' },
            { label: 'DUE DATE', value: '2026-04-28' },
            { label: 'DAYS LEFT', value: '3 days' },
            { label: 'NEXT STEP', value: 'Review source' },
            { label: 'DEADLINE RULE', value: 'IRS Pub 509 · filing calendar' },
          ],
          source: {
            label: 'SOURCE',
            value: 'irs.gov / pub / 509 · §3 · v17',
            verified: 'verified 2026-04-25T08:14:03Z by alert-ingest-3.2',
            quoteLabel: 'SOURCE EXCERPT',
            quote:
              '"If an S corporation election was made and the corporation files Form 1120-S on the basis of a calendar year, the return is due on or before March 15. If the corporation operates on a fiscal year, the return is due on or before the 15th day of the third month after the close of the tax year."',
          },
          meta: {
            source: 'irs.gov · v17',
            verifiedBy: 'alert-ingest-3.2',
            reviewed: 'sarah@firmname',
            status: 'done',
          },
        },
      },
    ],
  },
  proof: {
    eyebrow: 'THE GLASS-BOX GUARANTEE',
    index: '03',
    title: 'Every number on Today clicks back to its source.',
    paragraph:
      'AI is allowed to summarize, suggest, and draft. It is never allowed to render a recommendation without a verifiable source URL, a source excerpt, and a server-side timestamp. The interface fails closed: missing provenance → verification-needed state.',
    footnote: 'Glass-Box Guard · every AI claim is validated against its source',
    stats: [
      {
        label: 'VERIFIED CITATIONS',
        value: '100',
        unit: '%',
        body: 'Every AI sentence and every rule citation carries source_url + source_excerpt + verified_at, or is suppressed.',
      },
      {
        label: 'JURISDICTIONS',
        value: '50',
        unit: '+ DC',
        body: 'Federal, all 50 states, and DC — official tax authorities (IRS, FTB, state DORs) organized into one source-backed rule library.',
      },
      {
        label: 'MONITORING',
        value: '24',
        unit: '/7',
        body: 'Sources scanned around the clock — when one publishes a change, it reaches an in-app banner + email digest with the affected client list pre-computed.',
      },
      {
        label: 'BLACK-BOX SUGGESTIONS',
        value: '0',
        unit: '',
        body: 'AI never auto-applies a rule. Apply is always a keyboard action by a human in the loop.',
      },
    ],
  },
  security: {
    title: 'WHY CPAs TRUST IT',
    items: [
      {
        pill: 'Per-practice isolation',
        body: 'your data stays inside your own practice — never shared across firms',
      },
      { pill: 'Evidence', body: 'every claim · source + excerpt' },
      { pill: 'Audit log', body: 'apply · undo · revert recorded' },
      { pill: 'Email-first', body: 'no client portal vault required' },
    ],
  },
  finalCta: {
    pill: '30 sec / Monday triage',
    pillCaption: 'SOURCE-BACKED DEADLINE OPERATIONS',
    title: 'Start free. Let the sources speak.',
    body: 'Start with a trial or demo workspace, then keep the practice live on Solo when the first source-backed queue is ready. No native app. Sign in with Google and the first deadline review appears within ten minutes of your first paste.',
    primaryCta: 'Start free',
    secondaryCta: 'Contact sales',
    trust: 'trial available · cancel anytime',
  },
  pricing: {
    meta: {
      title: 'DueDateHQ Pricing — Deadline intelligence for CPA practices',
      description:
        'Simple plans for US CPA practices that need deadline risk, source-backed rules, and a shared worklist.',
      ogImage: '/og/home.en.png',
    },
    navPricingHref: '/pricing',
    hero: {
      eyebrow: 'PRICING',
      title: 'Free during the beta. Honest tiers after launch.',
      description:
        'DueDateHQ watches IRS, all 50 states, and FEMA so your firm catches every deadline move and knows exactly which clients it hits. Every plan is free to run today; the prices below are what each tier will cost once we leave beta, so you can size the plan that fits as your client count and team grow.',
      note: 'Free for every plan during the beta · sign in with Google · we never store card numbers',
    },
    plansHeader: {
      eyebrow: 'PLANS',
      title: 'Priced by how many clients you watch.',
      note: 'POST-BETA PRICING · FREE TO RUN TODAY · USD · BILLED TO THE PRACTICE OWNER · CANCEL ANYTIME',
    },
    billingToggle: {
      ariaLabel: 'Billing interval',
      monthly: 'Monthly',
      yearly: 'Yearly',
      yearlyBadge: 'Save 20%',
    },
    plans: [
      {
        name: 'Free',
        price: '$0',
        yearlyPrice: '$0',
        priceKind: 'numeric',
        cadence: '/ month',
        yearlyCadence: '/ month',
        description: 'Watch your first 10 clients, free forever.',
        clients: 'Up to 10 clients',
        firms: '1 practice workspace',
        seats: '1 seat',
        cta: 'Start free',
        hrefKind: 'app',
        features: [
          'Monitoring: live IRS + state change alerts',
          'Evidence: official source on every date',
          'History: 30-day alert window',
          'Apply: one owner, manual review',
        ],
      },
      {
        name: 'Solo',
        price: '$39',
        yearlyPrice: '$31',
        priceKind: 'numeric',
        cadence: '/ month',
        yearlyCadence: '/ mo, billed yearly',
        yearlySavings: 'Save $96 a year',
        description: 'Full monitoring for a one-owner practice.',
        clients: 'Up to 100 clients',
        firms: '1 practice workspace',
        seats: '1 owner seat',
        cta: 'Start Solo',
        hrefKind: 'checkout',
        checkoutPlan: 'solo',
        features: [
          'Monitoring: live IRS + state change alerts',
          'Evidence: official source on every date',
          'History: complete alert record',
          'Apply: migration preview before import',
        ],
      },
      {
        name: 'Pro',
        badge: 'Most popular',
        price: '$79',
        yearlyPrice: '$63',
        priceKind: 'numeric',
        cadence: '/ month',
        yearlyCadence: '/ mo, billed yearly',
        yearlySavings: 'Save $192 a year',
        description: 'A shared worklist for a small team.',
        clients: 'Up to 300 clients',
        firms: '1 production practice',
        seats: '3 seats included',
        cta: 'Start Pro',
        hrefKind: 'checkout',
        checkoutPlan: 'pro',
        features: [
          'Monitoring: bulk apply across affected clients',
          'Evidence: official source on every date',
          'History: complete alert record',
          'Apply: guided production imports',
        ],
      },
      {
        name: 'Team',
        price: '$149',
        yearlyPrice: '$119',
        priceKind: 'numeric',
        cadence: '/ month',
        yearlyCadence: '/ mo, billed yearly',
        yearlySavings: 'Save $360 a year',
        description: 'Oversight for a larger practice.',
        clients: 'Up to 1,000 clients',
        firms: '1 production practice',
        seats: '10 seats included',
        cta: 'Start Team',
        hrefKind: 'checkout',
        checkoutPlan: 'team',
        features: [
          'Monitoring: priority alert review queue',
          'Evidence: official source on every date',
          'History: complete alert record',
          'Apply: migration review + audit exports',
        ],
      },
    ],
    faqHeader: {
      eyebrow: 'FAQ',
      title: 'Questions before you pick a plan.',
    },
    faq: [
      {
        question: 'What does "free during the beta" mean?',
        answer:
          'Every plan — Solo, Pro, and Team — is free to use while DueDateHQ is in beta. You can pick the plan that fits and run your real practice on it today, with nothing to pay until we launch. The prices shown on each tier are what that plan will cost after beta, not a charge today.',
      },
      {
        question: 'Which plan should I start on?',
        answer:
          'Match the plan to your client count: Free covers your first 10, Solo up to 100 for a one-owner practice, Pro up to 300 for a small team sharing a worklist, and Team up to 1,000 with manager oversight. You can move up at any time.',
      },
      {
        question: 'What does Pro add over Solo?',
        answer:
          'Pro turns a single-owner workspace into a shared one: three seats, bulk apply across every affected client, and the shared deadline worklist a small team works from together.',
      },
      {
        question: 'When should I choose Team?',
        answer:
          'Team fits one practice that needs up to ten seats, a priority alert review queue, and manager-level audit exports — without running multiple separate practices.',
      },
      {
        question: 'Who handles billing, and can I cancel?',
        answer:
          'Only the practice owner can start or change a paid plan; members can see plan status but make no billing changes. There is no contract — cancel anytime, and we never store your card number.',
      },
      {
        question: 'Can I run more than one practice?',
        answer:
          'Solo, Pro, and Team each include one active practice. For additional practices, separate offices, or demo/production separation, contact us about a multi-practice plan.',
      },
    ],
  },
  geo: {
    structuredData: {
      organizationName: 'DueDateHQ',
      organizationDescription:
        'DueDateHQ builds deadline-change monitoring software for US CPA practices, catching when an IRS, state, or FEMA deadline moves and showing which clients it affects.',
      websiteName: 'DueDateHQ',
      productName: 'DueDateHQ',
      productDescription:
        'Deadline-change monitoring for CPA practices: it catches when an IRS, state, or FEMA deadline moves and shows exactly which clients it affects, with a source on every date — layered on top of the tools you already use.',
      audience: 'US CPA practices',
    },
    rules: {
      meta: {
        title: 'DueDateHQ Rule Library — Source-backed tax deadline coverage',
        description:
          'How DueDateHQ turns IRS and state filing rules into reviewed, source-backed deadline workflows for CPA teams.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'RULE LIBRARY',
        title: 'How does a filing rule become trusted work for a CPA team?',
        description:
          'DueDateHQ keeps rules, source evidence, generated deadlines, Alerts, and human review in one workflow. A rule is useful only when the team can see the official source, the affected client context, and the action history.',
        note: 'Coverage pages describe software behavior, not professional tax advice.',
      },
      sections: [
        {
          eyebrow: 'SOURCE INTAKE',
          title: 'Official sources first.',
          body: 'The rule workflow starts with public agency material instead of third-party summaries. DueDateHQ prioritizes IRS publications, state tax authority pages, filing calendars, form instructions, notices, and emergency relief announcements.',
          items: [
            {
              title: 'Canonical source URL',
              body: 'Each rule keeps the official page URL so reviewers and users can inspect the same source DueDateHQ used.',
            },
            {
              title: 'Source excerpt',
              body: 'A short excerpt is preserved for review context; the product avoids unsupported summaries in deadline workflows.',
            },
            {
              title: 'Verified timestamp',
              body: 'Rules carry a verification timestamp so CPA teams can see when a source was last reviewed.',
            },
          ],
        },
        {
          eyebrow: 'REVIEW MODEL',
          title: 'AI can assist, but it cannot become the source of truth.',
          body: 'DueDateHQ uses AI to summarize, classify, and draft operational changes only when source context is present. Human review remains the gate before deadline changes are applied to client-facing operations.',
          items: [
            {
              title: 'Human review required',
              body: 'A rule is not treated as ready for operational use until the review state is explicit.',
            },
            {
              title: 'No black-box recommendations',
              body: 'Missing source context moves work into a verification-needed state instead of producing a silent recommendation.',
            },
            {
              title: 'Audit-ready changes',
              body: 'Apply, undo, and revert workflows are designed to leave an operational record for the firm.',
            },
          ],
        },
      ],
      faqHeader: {
        eyebrow: 'FAQ',
        title: 'Rule workflow questions.',
      },
      faq: [
        {
          question: 'Can my firm trust a deadline rule if AI helped process it?',
          answer:
            'Only when the rule keeps official source context and a review state. DueDateHQ can use AI to summarize or classify, but the source and reviewer decision remain the trust boundary.',
        },
        {
          question: 'What happens before a rule affects Deadlines or Today triage?',
          answer:
            'The rule needs source evidence, normalized filing context, and review status before it can generate or update deadline work. The product does not silently change client work from an unsupported signal.',
        },
        {
          question: 'How does DueDateHQ connect rule changes to the right clients?',
          answer:
            'It uses the firm’s client filing profiles, jurisdictions, tax types, and deadline records to route reviewed changes into Alerts, Deadlines, and triage workflows for the clients that may be affected.',
        },
      ],
      cta: {
        title: 'See which state signals are in scope.',
        body: 'State coverage explains how DueDateHQ monitors public filing updates across all states and DC.',
        primary: 'View state coverage',
        secondary: 'Open pricing',
      },
    },
    stateCoverage: {
      meta: {
        title: 'DueDateHQ State Coverage — 50-state and DC filing signals',
        description:
          'Which state filing updates DueDateHQ monitors, how Alerts route them into review, and how CPA teams decide client impact.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'STATE COVERAGE',
        title: 'Which state updates can become deadline work for my firm?',
        description:
          'DueDateHQ monitors official IRS and state tax-authority pages across all 50 states and DC for rule and filing-date changes. Every change arrives with its source URL and excerpt and is routed through review before it can move a client deadline — comprehensive coverage you can trace and verify, not a black box.',
        note: 'Coverage is software monitoring scope; it is not a guarantee that every deadline applies to every firm.',
      },
      statesHeader: {
        eyebrow: 'STATE PAGES',
        title: 'Published state detail pages.',
      },
      states: [
        {
          slug: 'california',
          name: 'California',
          abbreviation: 'CA',
          status: 'Monitored',
          body: 'FTB-facing filing updates, deadline notices, form-instruction changes, and relief announcements that can affect CPA deadline triage.',
          href: '/states/california',
        },
        {
          slug: 'new-york',
          name: 'New York',
          abbreviation: 'NY',
          status: 'Monitored',
          body: 'Department of Taxation and Finance updates, filing notices, calendar changes, and state-level signals routed into evidence review.',
          href: '/states/new-york',
        },
        {
          slug: 'texas',
          name: 'Texas',
          abbreviation: 'TX',
          status: 'Monitored',
          body: 'Comptroller updates, franchise-tax filing signals, public notice changes, and deadline-related announcements.',
          href: '/states/texas',
        },
        {
          slug: 'florida',
          name: 'Florida',
          abbreviation: 'FL',
          status: 'Monitored',
          body: 'Department of Revenue updates, public notices, relief announcements, and filing-surface changes relevant to CPA operations.',
          href: '/states/florida',
        },
        {
          slug: 'washington',
          name: 'Washington',
          abbreviation: 'WA',
          status: 'Monitored',
          body: 'Department of Revenue public updates, due-date notices, and official filing signals that can enter review workflows.',
          href: '/states/washington',
        },
      ],
      sourceModel: {
        eyebrow: 'SOURCE MODEL',
        title: 'Coverage is a route from public signal to reviewed client impact.',
        body: 'Coverage starts with public monitoring, then routes candidate changes into source-backed review. A signal becomes operational only when source evidence, client-matching context, reviewer decision, and audit history are present.',
        items: [
          {
            title: 'Public agency sources',
            body: 'DueDateHQ prioritizes official tax authority pages, filing calendars, form instructions, notices, and emergency relief pages.',
          },
          {
            title: 'Firm-specific applicability',
            body: 'Coverage does not mean every signal applies to every client. The workbench helps a firm review impact against its own client profile.',
          },
          {
            title: 'Operational handoff',
            body: 'Relevant changes can surface in Today, Deadlines, and email workflows after review.',
          },
        ],
      },
      faqHeader: {
        eyebrow: 'FAQ',
        title: 'State monitoring questions.',
      },
      faq: [
        {
          question: 'Which states does DueDateHQ monitor today?',
          answer:
            'DueDateHQ public coverage spans all 50 states and DC. Source-backed candidates still require review before they can become reminder-ready work.',
        },
        {
          question: 'How do state updates become work for my firm?',
          answer:
            'A candidate update enters Alerts with source context, is reviewed for relevance, and can then be applied, marked reviewed, or reverted with an audit trail.',
        },
        {
          question: 'Does coverage mean the update applies to every client?',
          answer:
            'No. Coverage describes monitoring scope. Applicability depends on the firm’s client filing profiles, jurisdictions, tax types, and professional review.',
        },
      ],
    },
    states: [
      {
        slug: 'california',
        name: 'California',
        abbreviation: 'CA',
        meta: {
          title: 'California Tax Deadline Monitoring — DueDateHQ State Coverage',
          description:
            'How DueDateHQ monitors public California FTB filing signals with source URLs, excerpts, timestamps, and human review.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'STATE COVERAGE · CA',
          title: 'California filing signals with source-backed review.',
          description:
            'DueDateHQ monitors public California filing updates that can affect CPA deadline operations, then routes candidate changes through evidence review before they become operational work.',
          note: 'California coverage describes monitoring scope, not tax advice.',
        },
        sourceTypes: [
          {
            title: 'FTB public pages',
            body: 'Official Franchise Tax Board pages and public deadline material are preferred over summaries.',
          },
          {
            title: 'Form instructions',
            body: 'Form-specific instructions and calendar references can become source context for rule review.',
          },
          {
            title: 'Relief announcements',
            body: 'Public postponement and disaster-relief notices can trigger firm impact review.',
          },
        ],
        coveredSignals: [
          {
            title: 'Deadline changes',
            body: 'Changes to public due-date guidance that may affect entity, individual, or estimated-payment workflows.',
          },
          {
            title: 'Applicability clues',
            body: 'County, disaster, taxpayer type, form, and period references are preserved for review context.',
          },
          {
            title: 'Operational routing',
            body: 'Reviewed signals can surface as Today or Deadlines actions when firm data indicates possible impact.',
          },
        ],
        limitations: [
          'DueDateHQ does not determine whether a California rule applies without firm review.',
          'Coverage depends on public source availability and review status.',
          'Private notices and client-specific correspondence are not part of public state coverage.',
        ],
        faq: [
          {
            question: 'What California signals can affect my client queue?',
            answer:
              'FTB public updates, form instructions, filing calendars, and relief announcements can become review work when they may affect deadline timing or client applicability.',
          },
          {
            question: 'How does a California update become operational work?',
            answer:
              'DueDateHQ preserves the official source, keeps applicability clues, matches against firm client context, and requires review before the signal affects Today or Deadlines work.',
          },
        ],
      },
      {
        slug: 'new-york',
        name: 'New York',
        abbreviation: 'NY',
        meta: {
          title: 'New York Tax Deadline Monitoring — DueDateHQ State Coverage',
          description:
            'How DueDateHQ monitors public New York tax filing signals with official-source context and human review.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'STATE COVERAGE · NY',
          title: 'New York filing updates routed through evidence review.',
          description:
            'DueDateHQ monitors public New York tax authority updates and keeps source context attached when a filing signal may affect deadline operations.',
          note: 'New York coverage describes product scope, not a filing recommendation.',
        },
        sourceTypes: [
          {
            title: 'DTF public updates',
            body: 'Official Department of Taxation and Finance pages are the preferred source surface.',
          },
          {
            title: 'Filing calendars',
            body: 'Calendar and form references can become review context for deadline operations.',
          },
          {
            title: 'Official notices',
            body: 'Public notices and filing announcements are routed into review when they contain deadline impact.',
          },
        ],
        coveredSignals: [
          {
            title: 'State deadline movement',
            body: 'Candidate due-date changes are preserved with source URL, excerpt, and verification metadata.',
          },
          {
            title: 'Form-level context',
            body: 'Form, period, taxpayer type, and jurisdiction details are kept for human review.',
          },
          {
            title: 'Firm impact workflow',
            body: 'Reviewed changes can be matched against firm-managed clients before operational work is created.',
          },
        ],
        limitations: [
          'DueDateHQ does not replace New York source review by a qualified professional.',
          'Coverage is limited to public material and reviewed product workflows.',
          'Client-specific correspondence is outside public monitoring scope.',
        ],
        faq: [
          {
            question: 'What New York updates should an operations lead watch?',
            answer:
              'Public DTF updates, filing calendars, notices, and form-level changes are the signals most likely to create deadline review work.',
          },
          {
            question: 'Can a New York signal change client deadlines automatically?',
            answer:
              'No. Candidate changes require source-backed review, client-context matching, and human action before operational use.',
          },
        ],
      },
      {
        slug: 'texas',
        name: 'Texas',
        abbreviation: 'TX',
        meta: {
          title: 'Texas Filing Deadline Monitoring — DueDateHQ State Coverage',
          description:
            'How DueDateHQ monitors public Texas filing signals and franchise-tax deadline updates for CPA operations.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'STATE COVERAGE · TX',
          title: 'Texas filing signals for CPA deadline operations.',
          description:
            'DueDateHQ monitors public Texas Comptroller-facing updates and keeps source evidence attached when a signal may affect deadline triage.',
          note: 'Texas coverage is product monitoring scope and should be verified against official sources.',
        },
        sourceTypes: [
          {
            title: 'Comptroller updates',
            body: 'Public Texas Comptroller pages and official filing notices are prioritized for source review.',
          },
          {
            title: 'Franchise-tax signals',
            body: 'Public franchise-tax deadline and form references can enter evidence review.',
          },
          {
            title: 'Relief notices',
            body: 'Official relief or postponement material can trigger impact review when it names affected taxpayers or periods.',
          },
        ],
        coveredSignals: [
          {
            title: 'Deadline impact',
            body: 'Due-date changes and filing-window updates are captured as candidate operational signals.',
          },
          {
            title: 'Entity context',
            body: 'Entity type, filing period, and form references are preserved when available.',
          },
          {
            title: 'Review handoff',
            body: 'Reviewed signals can become Deadlines actions for CPA teams managing affected clients.',
          },
        ],
        limitations: [
          'DueDateHQ does not determine Texas tax treatment.',
          'Coverage depends on public source clarity and review state.',
          'Private agency correspondence is not covered by public monitoring.',
        ],
        faq: [
          {
            question: 'Which Texas signals matter for deadline operations?',
            answer:
              'Franchise-tax updates are important, but the workflow also watches public filing notices, deadline movement, relief material, and entity-context signals.',
          },
          {
            question: 'What happens after a Texas alert is reviewed?',
            answer:
              'Review-only alerts can be dismissed or marked reviewed, while apply-ready alerts can become deadline actions after CPA confirmation.',
          },
        ],
      },
      {
        slug: 'florida',
        name: 'Florida',
        abbreviation: 'FL',
        meta: {
          title: 'Florida Filing Deadline Monitoring — DueDateHQ State Coverage',
          description:
            'How DueDateHQ monitors public Florida filing notices and deadline-related state updates with evidence review.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'STATE COVERAGE · FL',
          title: 'Florida public filing updates with source context.',
          description:
            'DueDateHQ monitors public Florida Department of Revenue-facing updates and relief notices that may affect CPA deadline workflows.',
          note: 'Florida coverage describes public monitoring, not compliance advice.',
        },
        sourceTypes: [
          {
            title: 'DOR public pages',
            body: 'Official Florida Department of Revenue material is preferred for source-backed review.',
          },
          {
            title: 'Public notices',
            body: 'Filing notices and updates can become candidate deadline signals when they contain clear operational impact.',
          },
          {
            title: 'Relief announcements',
            body: 'Emergency or disaster-related public announcements are tracked for possible deadline implications.',
          },
        ],
        coveredSignals: [
          {
            title: 'Filing-surface changes',
            body: 'Public changes to deadlines, instructions, or filing windows can enter the review list.',
          },
          {
            title: 'Affected-period context',
            body: 'Dates, periods, taxpayer classes, and geographic constraints are retained when present.',
          },
          {
            title: 'Evidence drawer workflow',
            body: 'Source URL, excerpt, and verification metadata stay attached for reviewer inspection.',
          },
        ],
        limitations: [
          'DueDateHQ does not guarantee applicability to a specific Florida client.',
          'Coverage is limited to public sources and reviewed workflows.',
          'Professional verification against official state material remains required.',
        ],
        faq: [
          {
            question: 'Which Florida updates can appear in Alerts?',
            answer:
              'Public DOR updates, notices, relief announcements, and filing-window changes can appear when they may affect firm deadline operations.',
          },
          {
            question: 'Does DueDateHQ decide Florida applicability for a client?',
            answer:
              'No. It preserves source context and operationalizes review, but applicability still depends on client facts and professional judgment.',
          },
        ],
      },
      {
        slug: 'washington',
        name: 'Washington',
        abbreviation: 'WA',
        meta: {
          title: 'Washington Filing Deadline Monitoring — DueDateHQ State Coverage',
          description:
            'How DueDateHQ monitors public Washington Department of Revenue signals with official-source evidence workflows.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'STATE COVERAGE · WA',
          title: 'Washington filing signals kept tied to official sources.',
          description:
            'DueDateHQ monitors public Washington Department of Revenue-facing material for filing signals that may need source-backed CPA review.',
          note: 'Washington coverage is software scope, not tax advice.',
        },
        sourceTypes: [
          {
            title: 'DOR public updates',
            body: 'Official Department of Revenue updates are treated as primary source material.',
          },
          {
            title: 'Due-date notices',
            body: 'Public due-date and filing-window notices can enter review when they affect operational timing.',
          },
          {
            title: 'Instruction changes',
            body: 'Public instruction updates can be preserved with source excerpt and verification metadata.',
          },
        ],
        coveredSignals: [
          {
            title: 'Deadline operations',
            body: 'Signals are evaluated for operational impact before they become Today or Deadlines items.',
          },
          {
            title: 'Applicability context',
            body: 'Form, period, taxpayer type, and official language are retained when the source provides them.',
          },
          {
            title: 'Human review',
            body: 'Human review gates source-backed signals before firm workflows treat them as actionable.',
          },
        ],
        limitations: [
          'DueDateHQ is not a Washington tax authority.',
          'Coverage depends on public-source visibility and product review status.',
          'Client-specific deadlines require CPA review.',
        ],
        faq: [
          {
            question: 'What Washington signals does DueDateHQ route into review?',
            answer:
              'Public DOR updates, due-date notices, filing-window changes, and instruction updates can enter review when they affect operational timing.',
          },
          {
            question: 'What should a firm do before acting on a Washington signal?',
            answer:
              'Review the attached official source, inspect the matched client context, and determine applicability before changing client work.',
          },
        ],
      },
    ],
    guides: [
      {
        slug: 'cpa-deadline-risk',
        meta: {
          title: 'CPA Deadline Risk Guide — How firms catch deadlines before they slip',
          description:
            'How CPA teams decide which client deadline to touch first using migration data, evidence, ownership, readiness, and state alerts.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'GUIDE',
          title: 'Which deadline should a CPA team touch first this week?',
          description:
            'DueDateHQ treats deadline risk as an operational ranking problem. Imported client facts, filing profiles, state updates, evidence status, readiness, and owner assignment all shape what should rise to the top.',
          note: 'This guide explains operational risk patterns, not tax advice.',
        },
        sections: [
          {
            eyebrow: 'RISK MODEL',
            title: 'The risky deadline is the one with missing or mismatched context.',
            body: 'A date on a calendar is only one part of deadline operations. CPA teams also need imported client facts, filing profiles, deadline status, jurisdiction coverage, evidence source, and owner assignment.',
            items: [
              {
                title: 'Missing client facts',
                body: 'Entity type, state footprint, fiscal year, and extension status can change whether a deadline matters.',
              },
              {
                title: 'Source uncertainty',
                body: 'A rule copied from memory or a third-party note is harder to trust than a rule tied to an official source.',
              },
              {
                title: 'Ownership gaps',
                body: 'Deadline work becomes risky when no owner is assigned to review, file, or resolve missing data.',
              },
            ],
          },
          {
            eyebrow: 'TRIAGE',
            title: 'The Monday workflow should rank risk, not just dates.',
            body: 'Deadline risk becomes manageable when the team can scan days remaining, evidence completeness, readiness, state updates, and work ownership in one operational view.',
            items: [
              {
                title: 'Readiness signal',
                body: 'A risk list should show which deadlines are blocked by missing facts, stale evidence, or owner gaps.',
              },
              {
                title: 'Evidence completeness',
                body: 'Rows with missing or stale source evidence should be reviewed before the firm trusts the deadline.',
              },
              {
                title: 'State-change impact',
                body: 'A state filing update matters most when it can be matched to the clients it may affect.',
              },
            ],
          },
        ],
        faqHeader: {
          eyebrow: 'FAQ',
          title: 'CPA deadline risk questions.',
        },
        faq: [
          {
            question: 'Which deadline should a CPA team touch first?',
            answer:
              'The first item is rarely just the earliest date. DueDateHQ ranks work using days remaining, status, source quality, client context, readiness, and ownership signals.',
          },
          {
            question: 'How does imported client data affect deadline risk?',
            answer:
              'Migration data creates the client and deadline context the team uses for triage. Entity type, filing states, tax types, owner, and liability inputs all change the risk picture.',
          },
          {
            question: 'What makes a deadline queue defensible?',
            answer:
              'The queue should keep source evidence, deadline reasoning, client context, status changes, and audit history close to each action so the firm can explain why work was prioritized.',
          },
        ],
        cta: {
          title: 'See the evidence-backed product model.',
          body: 'DueDateHQ turns deadline risk into source-backed operational work.',
          primary: 'Read the evidence guide',
          secondary: 'View rule library',
        },
      },
      {
        slug: 'evidence-backed-tax-deadline-software',
        meta: {
          title: 'Evidence-backed Tax Deadline Software — DueDateHQ Guide',
          description:
            'What CPA teams should be able to prove before a deadline, alert, AI suggestion, or migration action changes client work.',
          ogImage: '/og/home.en.png',
        },
        hero: {
          eyebrow: 'GUIDE',
          title: 'What proof should exist before deadline work changes?',
          description:
            'For CPA operations, a filing reminder is not enough. Teams need source evidence, review state, client context, AI trace where applicable, and an audit trail for apply, undo, revert, and import actions.',
          note: 'Evidence-backed workflows support review; they do not replace professional judgment.',
        },
        sections: [
          {
            eyebrow: 'DEFINITION',
            title: 'Evidence-backed means every operational claim can be inspected.',
            body: 'The product should preserve enough context for a reviewer to understand where a rule, deadline, alert, or migration-created deadline came from and why it entered the workflow.',
            items: [
              {
                title: 'Source URL',
                body: 'The official page remains attached to the rule or signal.',
              },
              {
                title: 'Source excerpt',
                body: 'The relevant passage is visible near the operational action.',
              },
              {
                title: 'Verified metadata',
                body: 'The product records when the source was reviewed and the state of that review.',
              },
            ],
          },
          {
            eyebrow: 'WORKFLOW',
            title: 'The interface should fail closed when evidence is missing.',
            body: 'If a rule lacks source context, the safer product behavior is to request verification instead of generating a confident deadline recommendation.',
            items: [
              {
                title: 'Verification-needed states',
                body: 'Ambiguous or unsupported signals should be visible as review work.',
              },
              {
                title: 'Human-in-the-loop apply',
                body: 'A person at the firm should approve operational changes before they affect client work.',
              },
              {
                title: 'Audit trail',
                body: 'Apply, undo, and revert actions should leave a record the firm can inspect later.',
              },
            ],
          },
        ],
        faqHeader: {
          eyebrow: 'FAQ',
          title: 'Evidence-backed software questions.',
        },
        faq: [
          {
            question: 'What proof should exist before a deadline changes?',
            answer:
              'A reviewer should see the official source URL, relevant excerpt, verification metadata, client context, review state, and the audit event for the change.',
          },
          {
            question: 'How do alert apply and revert actions stay auditable?',
            answer:
              'Alert decisions are explicit actions. Apply, mark-reviewed, and revert flows keep source context and write audit records so the firm can inspect what changed and why.',
          },
          {
            question: 'Where does AI fit in evidence-backed workflows?',
            answer:
              'AI can map imports, normalize fields, summarize source changes, or draft operational context, but review status, source evidence, and human action remain the control points.',
          },
        ],
        cta: {
          title: 'Review the public rule model.',
          body: 'The DueDateHQ rule library explains how source-backed signals move into deadline workflows.',
          primary: 'Open rule library',
          secondary: 'View state coverage',
        },
      },
    ],
  },
  notFound: {
    meta: {
      title: 'Page not found — DueDateHQ',
      description:
        'This DueDateHQ public page is not available. Return to the homepage or review pricing.',
      ogImage: '/og/home.en.png',
    },
    eyebrow: '404 · PUBLIC PAGE NOT FOUND',
    title: 'This page is not available.',
    body: 'The public marketing site only serves published DueDateHQ pages. You can return to the homepage, review pricing, or open the app if you were trying to reach your workbench.',
    primaryCta: 'Return home',
    secondaryCta: 'View pricing',
    statusLabel: 'ROUTE STATUS',
    statusValue: 'No client data loaded',
    routesLabel: 'PUBLISHED PATHS',
    routes: [
      { label: 'Homepage', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Open the workbench', href: 'app' },
    ],
  },
  footer: {
    brand: 'DueDateHQ',
    tagline: 'Glass-box deadline intelligence for US CPA practices.',
    audience: 'For US CPA practices · Audit-ready · 50 states + DC',
    columns: [
      {
        title: 'PRODUCT',
        links: [
          { label: 'Workbench', href: '/#hero' },
          { label: 'Alerts', href: '/#workflow' },
          { label: 'Migration Copilot', href: '/guides/cpa-deadline-risk' },
          { label: 'Evidence drawer', href: '/rules' },
          { label: 'Pricing', href: '/pricing' },
        ],
      },
      {
        title: 'RESOURCES',
        links: [
          { label: 'Rule library', href: '/rules' },
          { label: 'State coverage', href: '/state-coverage' },
          { label: 'CPA deadline risk', href: '/guides/cpa-deadline-risk' },
          {
            label: 'Evidence-backed software',
            href: '/guides/evidence-backed-tax-deadline-software',
          },
          { label: 'Form 7004 reference', href: '/rules/form-7004-extension-deadline' },
          { label: 'Weekly triage', href: '/guides/weekly-cpa-deadline-triage' },
          { label: 'Compare File In Time', href: '/compare/file-in-time-alternative' },
          { label: 'Status', href: '/status' },
        ],
      },
      {
        title: 'COMPANY',
        links: [
          { label: 'Security', href: '/security' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
          { label: 'Contact', href: 'mailto:sales@duedatehq.com?subject=DueDateHQ' },
        ],
      },
    ],
    copyright: '© 2026 DueDateHQ Inc. · duedatehq.com',
    theme: {
      label: 'Theme',
      system: 'Match system',
      light: 'Light',
      dark: 'Dark',
    },
    language: {
      label: 'Language',
      enShort: 'EN',
      zhShort: '中',
      enLong: 'English',
      zhLong: '简体中文',
    },
    status: 'Service status',
  },
}

export default en
