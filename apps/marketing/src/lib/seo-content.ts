import type { GuidePageCopy, LandingCopy, StateCoverageCopy, StatePageCopy } from '../i18n/types'

type Locale = 'en' | 'zh-CN'
type StateCard = StateCoverageCopy['states'][number]

interface StateSpec {
  slug: string
  name: string
  abbreviation: string
  agency: string
  sourceSurface: string
  signal: string
  taxFocus: string
}

interface ComparisonSpec {
  slug: string
  product: string
  positioning: string
  bestFit: string
  contrast: string
}

interface RuleReferenceSpec {
  slug: string
  label: string
  sourceContext: string
  operationalRisk: string
  clientContext: string
}

const stateSpecs: StateSpec[] = [
  {
    slug: 'illinois',
    name: 'Illinois',
    abbreviation: 'IL',
    agency: 'Illinois Department of Revenue',
    sourceSurface: 'forms, bulletins, and taxpayer guidance',
    signal: 'income, replacement, sales-tax, and relief notices',
    taxFocus: 'entity, sales-tax, and filing-window context',
  },
  {
    slug: 'new-jersey',
    name: 'New Jersey',
    abbreviation: 'NJ',
    agency: 'New Jersey Division of Taxation',
    sourceSurface: 'business tax pages, notices, and filing guidance',
    signal: 'corporation business tax, sales-tax, and relief updates',
    taxFocus: 'corporation tax, state filing, and taxpayer-class context',
  },
  {
    slug: 'pennsylvania',
    name: 'Pennsylvania',
    abbreviation: 'PA',
    agency: 'Pennsylvania Department of Revenue',
    sourceSurface: 'revenue guidance, tax forms, and public notices',
    signal: 'business tax, sales-tax, and filing-period updates',
    taxFocus: 'business filing, taxpayer type, and period context',
  },
  {
    slug: 'georgia',
    name: 'Georgia',
    abbreviation: 'GA',
    agency: 'Georgia Department of Revenue',
    sourceSurface: 'tax forms, news, and public filing guidance',
    signal: 'income tax, sales-tax, and deadline-related updates',
    taxFocus: 'state filing, form, and relief context',
  },
  {
    slug: 'massachusetts',
    name: 'Massachusetts',
    abbreviation: 'MA',
    agency: 'Massachusetts Department of Revenue',
    sourceSurface: 'DOR guidance, forms, and taxpayer notices',
    signal: 'corporate excise, sales-tax, and public filing updates',
    taxFocus: 'corporate excise, filing-period, and entity context',
  },
  {
    slug: 'north-carolina',
    name: 'North Carolina',
    abbreviation: 'NC',
    agency: 'North Carolina Department of Revenue',
    sourceSurface: 'tax forms, notices, and filing resources',
    signal: 'corporate income, franchise, sales-tax, and relief updates',
    taxFocus: 'corporate, franchise, and due-date context',
  },
  {
    slug: 'arizona',
    name: 'Arizona',
    abbreviation: 'AZ',
    agency: 'Arizona Department of Revenue',
    sourceSurface: 'forms, rulings, and taxpayer guidance',
    signal: 'income tax, transaction privilege tax, and relief notices',
    taxFocus: 'filing, TPT, and taxpayer-class context',
  },
  {
    slug: 'colorado',
    name: 'Colorado',
    abbreviation: 'CO',
    agency: 'Colorado Department of Revenue',
    sourceSurface: 'taxation guidance, forms, and notices',
    signal: 'income tax, sales-tax, and filing-window updates',
    taxFocus: 'state filing, sales-tax, and period context',
  },
  {
    slug: 'ohio',
    name: 'Ohio',
    abbreviation: 'OH',
    agency: 'Ohio Department of Taxation',
    sourceSurface: 'tax guidance, forms, and public updates',
    signal: 'commercial activity tax, sales-tax, and income-tax updates',
    taxFocus: 'CAT, sales-tax, and entity context',
  },
  {
    slug: 'michigan',
    name: 'Michigan',
    abbreviation: 'MI',
    agency: 'Michigan Department of Treasury',
    sourceSurface: 'tax forms, notices, and Treasury guidance',
    signal: 'corporate income tax, sales-tax, and public deadline updates',
    taxFocus: 'corporate filing, tax type, and period context',
  },
]

const comparisonSpecs: ComparisonSpec[] = [
  {
    slug: 'file-in-time-alternative',
    product: 'File In Time',
    positioning: 'tax deadline tracking built around due-date lists',
    bestFit: 'firms that mainly want a narrow deadline tracker',
    contrast:
      'DueDateHQ is built around risk triage, source evidence, Pulse state changes, and migration-assisted client context.',
  },
  {
    slug: 'taxdome-deadline-operations',
    product: 'TaxDome',
    positioning: 'an all-in-one practice management and client portal suite',
    bestFit:
      'firms standardizing client portals, organizers, documents, payments, and workflow in one platform',
    contrast:
      'DueDateHQ stays narrower: deadline risk, official-source evidence, state coverage, and weekly operations for CPA teams that do not want a full practice suite migration.',
  },
  {
    slug: 'karbon-deadline-operations',
    product: 'Karbon',
    positioning: 'collaborative accounting workflow and team work management',
    bestFit:
      'teams that want broad work management, email collaboration, and operational visibility',
    contrast:
      'DueDateHQ focuses on tax deadline work: source-backed rules, affected-client review, evidence drawers, and deadline-specific triage.',
  },
]

const ruleReferenceSpecs: RuleReferenceSpec[] = [
  {
    slug: 'form-7004-extension-deadline',
    label: 'Form 7004 extension deadline',
    sourceContext: 'IRS extension instructions and filing-period guidance',
    operationalRisk:
      'extension work can reduce filing risk while leaving payment timing, readiness, and client communication open for review',
    clientContext:
      'entity type, tax year, filing status, payment estimate, owner, and evidence state',
  },
  {
    slug: 's-corp-deadline-operations',
    label: 'S-Corp deadline operations',
    sourceContext: 'IRS S corporation filing guidance, form instructions, and state entity signals',
    operationalRisk:
      'S-Corp work often combines federal filing timing, state registration, extension status, and client readiness',
    clientContext:
      'entity profile, fiscal year, state footprint, responsible owner, and source-backed obligation state',
  },
  {
    slug: 'partnership-form-1065-deadline',
    label: 'Partnership Form 1065 deadline',
    sourceContext:
      'IRS partnership return guidance, extension instructions, and state filing references',
    operationalRisk:
      'partnership deadline work can affect partner schedules, extension handling, payment context, and review ownership',
    clientContext:
      'partnership profile, filing period, state footprint, materials readiness, and evidence completeness',
  },
]

function ruleReferencePage(spec: RuleReferenceSpec, locale: Locale): GuidePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      meta: {
        title: `${spec.label} — DueDateHQ Rule Reference`,
        description: `DueDateHQ 如何把 ${spec.label} 这类截止日规则转成带来源、客户上下文和人工复核的运营工作。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: 'RULE REFERENCE',
        title: `${spec.label} as source-backed deadline work.`,
        description: `DueDateHQ 不把 ${spec.label} 当作孤立日期，而是把 ${spec.sourceContext}、客户上下文、review state 和 audit history 放在同一条运营链路里。`,
        note: 'Rule reference 页面解释软件建模方式，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: 'SOURCE MODEL',
          title: '规则先从官方来源进入复核。',
          body: `${spec.sourceContext} 是 DueDateHQ 优先保存的来源上下文。AI 可以辅助摘要，但不能替代官方来源和 reviewer decision。`,
          items: [
            { title: 'Source URL', body: '规则需要保留官方来源链接，方便 reviewer 和用户回看。' },
            { title: 'Source excerpt', body: '相关摘录靠近运营动作展示，避免黑盒结论。' },
            {
              title: 'Verified metadata',
              body: '复核时间和 review state 决定规则能否进入生产工作。',
            },
          ],
        },
        {
          eyebrow: 'OPERATIONS',
          title: '规则只有结合客户上下文才成为 deadline work。',
          body: `${spec.operationalRisk}。DueDateHQ 会把规则和 ${spec.clientContext} 放在一起复核。`,
          items: [
            { title: 'Client fit', body: 'Applicability 取决于事务所的 client facts 和专业复核。' },
            {
              title: 'Review gate',
              body: '低置信度或缺少来源的信号先进入 review，而不是自动改 deadline。',
            },
            {
              title: 'Audit trail',
              body: 'Apply、dismiss、undo、revert 都应该留下可检查的操作历史。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.label} questions.` },
      faq: [
        {
          question: `DueDateHQ 会判断 ${spec.label} 是否适用吗？`,
          answer: '不会。它保留来源证据和客户上下文，由事务所复核 applicability。',
        },
        {
          question: 'AI 在这里做什么？',
          answer:
            'AI 可以摘要来源、提示缺失上下文或辅助 migration mapping，但 source 和 human review 是控制点。',
        },
        {
          question: '这个页面是税务建议吗？',
          answer: '不是。它只是解释 DueDateHQ 如何把 deadline rules 建模成运营工作。',
        },
      ],
      cta: {
        title: 'Review the public rule model.',
        body: 'DueDateHQ keeps source evidence and review state close to deadline work.',
        primary: 'Open rule library',
        secondary: 'Read weekly triage',
      },
    }
  }

  return {
    slug: spec.slug,
    meta: {
      title: `${spec.label} — DueDateHQ Rule Reference`,
      description: `How DueDateHQ turns ${spec.label} into source-backed deadline operations with client context, review state, and audit history.`,
      ogImage: '/og/home.en.png',
    },
    hero: {
      eyebrow: 'RULE REFERENCE',
      title: `${spec.label} as source-backed deadline work.`,
      description: `DueDateHQ does not treat ${spec.label} as an isolated date. It keeps ${spec.sourceContext}, client context, review state, and audit history in the same operational chain.`,
      note: 'Rule reference pages explain software modeling, not tax advice.',
    },
    sections: [
      {
        eyebrow: 'SOURCE MODEL',
        title: 'The rule starts with official-source review.',
        body: `${spec.sourceContext} are the source context DueDateHQ prioritizes. AI can assist with summaries, but it does not replace the source or reviewer decision.`,
        items: [
          {
            title: 'Source URL',
            body: 'The rule should keep the official page URL so reviewers and users can inspect the same material.',
          },
          {
            title: 'Source excerpt',
            body: 'The relevant excerpt stays near the operational action instead of becoming a black-box recommendation.',
          },
          {
            title: 'Verified metadata',
            body: 'Review timestamp and review state decide whether a rule can enter production deadline work.',
          },
        ],
      },
      {
        eyebrow: 'OPERATIONS',
        title: 'A rule becomes deadline work only with client context.',
        body: `${spec.operationalRisk}. DueDateHQ reviews the rule alongside ${spec.clientContext}.`,
        items: [
          {
            title: 'Client fit',
            body: 'Applicability depends on firm client facts and professional review.',
          },
          {
            title: 'Review gate',
            body: 'Low-confidence or source-missing signals become review work instead of silently changing deadlines.',
          },
          {
            title: 'Audit trail',
            body: 'Apply, dismiss, undo, and revert actions should leave inspectable operational history.',
          },
        ],
      },
    ],
    faqHeader: { eyebrow: 'FAQ', title: `${spec.label} questions.` },
    faq: [
      {
        question: `Does DueDateHQ decide whether ${spec.label} applies?`,
        answer:
          'No. It preserves source evidence and client context so the CPA firm can review applicability.',
      },
      {
        question: 'What does AI do in this workflow?',
        answer:
          'AI can summarize sources, flag missing context, or assist migration mapping, but source evidence and human review are the control points.',
      },
      {
        question: 'Is this page tax advice?',
        answer: 'No. It explains how DueDateHQ models deadline rules as operational work.',
      },
    ],
    cta: {
      title: 'Review the public rule model.',
      body: 'DueDateHQ keeps source evidence and review state close to deadline work.',
      primary: 'Open rule library',
      secondary: 'Read weekly triage',
    },
  }
}

function stateSummary(spec: StateSpec, locale: Locale): StateCard {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      name: spec.name,
      abbreviation: spec.abbreviation,
      status: 'Live',
      body: `${spec.agency} 的公开 ${spec.sourceSurface} 可进入来源复核，用于 ${spec.taxFocus} 的截止日运营判断。`,
      href: `/zh-CN/states/${spec.slug}`,
    }
  }

  return {
    slug: spec.slug,
    name: spec.name,
    abbreviation: spec.abbreviation,
    status: 'Live',
    body: `${spec.agency} ${spec.sourceSurface} can enter source review for ${spec.taxFocus} in deadline operations.`,
    href: `/states/${spec.slug}`,
  }
}

function statePage(spec: StateSpec, locale: Locale): StatePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      name: spec.name,
      abbreviation: spec.abbreviation,
      meta: {
        title: `${spec.name} Filing Deadline Monitoring — DueDateHQ State Coverage`,
        description: `DueDateHQ 如何用官方来源上下文复核 ${spec.name} 的 ${spec.signal}。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: `STATE COVERAGE · ${spec.abbreviation}`,
        title: `${spec.name} filing signals with source-backed review.`,
        description: `DueDateHQ 监控 ${spec.agency} 的公开 ${spec.sourceSurface}，在 ${spec.signal} 可能影响事务所截止日运营时保留来源、摘录和复核状态。`,
        note: `${spec.name} coverage 描述软件监控范围，不是税务建议。`,
      },
      sourceTypes: [
        {
          title: `${spec.agency} public material`,
          body: `优先使用 ${spec.agency} 的官方 ${spec.sourceSurface}，避免把第三方摘要当成来源。`,
        },
        {
          title: 'Form and period context',
          body: `表格、期间、纳税人类型和 jurisdiction 线索会保留给人工复核。`,
        },
        {
          title: 'Relief and notice updates',
          body: `公开 relief、notice 或 deadline movement 会先进入候选复核，而不是自动改客户工作。`,
        },
      ],
      coveredSignals: [
        {
          title: spec.signal,
          body: `这些公开信号可以进入 Pulse 复核，并保持 source URL、excerpt、verified metadata。`,
        },
        {
          title: spec.taxFocus,
          body: `DueDateHQ 将信号和事务所客户 filing profile、tax type、period context 放在一起审查。`,
        },
        {
          title: 'Operational routing',
          body: `复核后的信号可以成为 Dashboard、Obligations 或 email workflow 的上下文。`,
        },
      ],
      limitations: [
        `DueDateHQ 不判断某条 ${spec.name} 规则是否适用于具体客户。`,
        'Coverage 依赖公开来源可访问性、来源清晰度和产品复核状态。',
        '客户专属信件、私有通知和专业判断不属于公开 state coverage。',
      ],
      faq: [
        {
          question: `${spec.name} 哪些信号会进入复核？`,
          answer: `${spec.signal} 会在可能影响 deadline operations 时进入 source-backed review。`,
        },
        {
          question: `${spec.name} 信号会自动改变客户截止日吗？`,
          answer: '不会。信号需要来源证据、客户上下文匹配和人工动作，才会影响实际运营工作。',
        },
      ],
    }
  }

  return {
    slug: spec.slug,
    name: spec.name,
    abbreviation: spec.abbreviation,
    meta: {
      title: `${spec.name} Filing Deadline Monitoring — DueDateHQ State Coverage`,
      description: `How DueDateHQ monitors ${spec.agency} ${spec.sourceSurface} with source-backed review for CPA deadline operations.`,
      ogImage: '/og/home.en.png',
    },
    hero: {
      eyebrow: `STATE COVERAGE · ${spec.abbreviation}`,
      title: `${spec.name} filing signals with source-backed review.`,
      description: `DueDateHQ monitors public ${spec.agency} ${spec.sourceSurface}, then preserves source context when ${spec.signal} may affect CPA deadline operations.`,
      note: `${spec.name} coverage describes monitoring scope, not tax advice.`,
    },
    sourceTypes: [
      {
        title: `${spec.agency} public material`,
        body: `Official ${spec.sourceSurface} are preferred over unsupported third-party summaries.`,
      },
      {
        title: 'Form and period context',
        body: 'Form, period, taxpayer type, jurisdiction, and relief details are retained when the public source provides them.',
      },
      {
        title: 'Relief and notice updates',
        body: 'Public relief notices, filing changes, and deadline movement enter review before they can affect client work.',
      },
    ],
    coveredSignals: [
      {
        title: spec.signal,
        body: 'Candidate signals keep source URL, excerpt, verification metadata, and review state attached.',
      },
      {
        title: spec.taxFocus,
        body: 'DueDateHQ reviews the signal against firm client filing profiles, tax types, and period context.',
      },
      {
        title: 'Operational routing',
        body: 'Reviewed signals can become Dashboard, Obligations, or email workflow context for affected clients.',
      },
    ],
    limitations: [
      `DueDateHQ does not decide whether a ${spec.name} rule applies to a specific client.`,
      'Coverage depends on public source availability, source clarity, and product review state.',
      'Client-specific notices, private correspondence, and professional judgment are outside public state coverage.',
    ],
    faq: [
      {
        question: `Which ${spec.name} signals can enter review?`,
        answer: `${spec.signal} can enter source-backed review when they may affect deadline operations.`,
      },
      {
        question: `Can a ${spec.name} signal automatically change client deadlines?`,
        answer:
          'No. Candidate signals require source evidence, client-context matching, and human action before operational use.',
      },
    ],
  }
}

export const supplementalGuides: Record<Locale, GuidePageCopy[]> = {
  en: [
    {
      slug: 'weekly-cpa-deadline-triage',
      meta: {
        title: 'Weekly CPA Deadline Triage — How to rank client filing risk',
        description:
          'A weekly workflow for ranking CPA deadline work by days remaining, penalty exposure, source evidence, client readiness, ownership, and state changes.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'How should a CPA firm triage deadlines every Monday?',
        description:
          'A reliable deadline workflow starts with a risk-ranked queue, not a calendar dump. DueDateHQ combines source evidence, client context, status, owner, and state-change signals so teams can see what needs attention first.',
        note: 'This guide describes deadline operations, not tax advice.',
      },
      sections: [
        {
          eyebrow: 'WEEKLY TRIAGE',
          title: 'The first question is not what is due next.',
          body: 'The work that deserves attention first is the work where deadline timing, client readiness, penalty exposure, and evidence quality create operational risk.',
          items: [
            {
              title: 'Days remaining',
              body: 'Short timelines matter, but they should be read together with readiness and exposure.',
            },
            {
              title: 'Penalty exposure',
              body: 'Dollar impact helps a small team avoid spending the morning on low-risk work.',
            },
            {
              title: 'Source evidence',
              body: 'A row without verified source context should be treated differently from a reviewed obligation.',
            },
          ],
        },
        {
          eyebrow: 'OPERATING MODEL',
          title: 'A deadline queue should explain why each row is risky.',
          body: 'DueDateHQ keeps client facts, filing profile, state signal, owner, status, and evidence close to the action so the firm can defend the priority order.',
          items: [
            {
              title: 'Client readiness',
              body: 'Missing materials or unresolved facts can make a later deadline more urgent than an earlier ready one.',
            },
            {
              title: 'Owner assignment',
              body: 'Unowned deadline work is riskier because nobody is accountable for the next review step.',
            },
            {
              title: 'Pulse changes',
              body: 'State updates should move into review only with source context and affected-client clues.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Weekly deadline triage questions.' },
      faq: [
        {
          question: 'What should a CPA team review first on Monday?',
          answer:
            'Review the rows with the highest combined operational risk: days remaining, exposure, readiness gaps, missing evidence, owner gaps, and state-change impact.',
        },
        {
          question: 'Why is a calendar not enough?',
          answer:
            'A calendar shows dates. It does not explain client readiness, source confidence, penalty exposure, or who owns the next action.',
        },
        {
          question: 'How does DueDateHQ keep triage defensible?',
          answer:
            'It keeps source evidence, client context, owner, status, and audit history near the deadline action.',
        },
      ],
      cta: {
        title: 'See how source evidence supports triage.',
        body: 'The public rule model explains how source-backed signals become reviewed deadline work.',
        primary: 'Open rule library',
        secondary: 'View state coverage',
      },
    },
    {
      slug: 'migrate-cpa-deadlines-from-excel',
      meta: {
        title: 'Migrate CPA Deadlines from Excel — DueDateHQ Guide',
        description:
          'How CPA firms move client deadline work from spreadsheets into source-backed filing profiles, obligations, evidence review, and weekly triage.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'How should a CPA firm move deadline work out of Excel?',
        description:
          'Spreadsheet migration should not just copy dates. The useful migration creates client context, filing profiles, obligation records, readiness state, source evidence, and ownership that can drive weekly deadline operations.',
        note: 'Migration support helps organize work; firms still review filing obligations.',
      },
      sections: [
        {
          eyebrow: 'MIGRATION MODEL',
          title: 'A spreadsheet row needs to become operational context.',
          body: 'DueDateHQ treats migration as a review workflow. Imported facts should be normalized, checked, and tied to the deadline work they create.',
          items: [
            {
              title: 'Client facts',
              body: 'Entity type, fiscal year, state footprint, owner, and contact context shape deadline generation.',
            },
            {
              title: 'Obligation mapping',
              body: 'Raw spreadsheet labels need to map to known filing surfaces before the team trusts them.',
            },
            {
              title: 'Review state',
              body: 'Low-confidence rows should become review work instead of silently creating confident reminders.',
            },
          ],
        },
        {
          eyebrow: 'AFTER IMPORT',
          title: 'The goal is a better weekly queue, not a prettier spreadsheet.',
          body: 'A successful migration lets the firm triage by risk, inspect evidence, and update obligations with an audit trail.',
          items: [
            {
              title: 'Evidence attachment',
              body: 'Imported obligations should eventually connect to official-source rules and reviewed state.',
            },
            {
              title: 'Owner handoff',
              body: 'The team needs to know who must resolve missing data or verify a candidate obligation.',
            },
            {
              title: 'Audit history',
              body: 'Apply, undo, and correction flows should leave operational history for later review.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Excel migration questions.' },
      faq: [
        {
          question: 'Should a firm import every spreadsheet column?',
          answer:
            'No. Import the fields that affect filing profile, deadline generation, readiness, ownership, and review state.',
        },
        {
          question: 'Can AI map spreadsheet fields?',
          answer:
            'AI can suggest mappings and summarize low-confidence rows, but source evidence and human review remain the trust boundary.',
        },
        {
          question: 'What is the migration success metric?',
          answer:
            'The firm can run weekly deadline triage from reviewed client and obligation context instead of manually reconciling spreadsheets.',
        },
      ],
      cta: {
        title: 'Review the weekly triage model.',
        body: 'Migration creates the context that makes deadline risk visible.',
        primary: 'Read weekly triage',
        secondary: 'Open pricing',
      },
    },
    {
      slug: 'extension-vs-payment-deadlines',
      meta: {
        title: 'Extension vs Payment Deadlines — CPA Operations Guide',
        description:
          'Why CPA deadline software must separate filing extensions, payment timing, client readiness, source evidence, and review state.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'Why should extension and payment deadlines be tracked separately?',
        description:
          'For CPA operations, filing extension work and payment timing can create different risks. A workbench should keep source evidence, client facts, review state, and next actions visible before the team treats a deadline as safe.',
        note: 'This guide is operational guidance, not tax advice.',
      },
      sections: [
        {
          eyebrow: 'RISK SPLIT',
          title: 'An extension can reduce one risk while leaving another open.',
          body: 'Deadline operations should make the difference visible so teams do not assume a filing extension resolves every payment or client-readiness concern.',
          items: [
            {
              title: 'Filing action',
              body: 'The team needs to know whether extension paperwork is prepared, reviewed, and filed.',
            },
            {
              title: 'Payment context',
              body: 'Payment timing and estimate context may need separate review from the filing extension workflow.',
            },
            {
              title: 'Client readiness',
              body: 'Missing facts can still block good judgment even when a filing extension exists.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT MODEL',
          title: 'The product should keep the evidence and action split visible.',
          body: 'DueDateHQ frames extensions as reviewed operational work tied to source-backed rules, client context, and audit history.',
          items: [
            {
              title: 'Source-backed rule',
              body: 'The rule should point back to official material and a verification state.',
            },
            {
              title: 'Separate status',
              body: 'Filing, payment, readiness, and review status should not collapse into one vague reminder.',
            },
            {
              title: 'Audit trail',
              body: 'When the team applies or changes an extension-related action, the change should be inspectable later.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Extension operations questions.' },
      faq: [
        {
          question: 'Why is extension tracking risky in spreadsheets?',
          answer:
            'A spreadsheet row often hides source evidence, payment context, readiness state, and who owns the next review step.',
        },
        {
          question: 'Does DueDateHQ decide payment requirements?',
          answer:
            'No. It keeps operational context and source evidence visible so the CPA firm can review and decide.',
        },
        {
          question: 'What should a deadline tool show for extension work?',
          answer:
            'It should show the filing action, payment context, client readiness, source evidence, owner, and audit trail.',
        },
      ],
      cta: {
        title: 'See how DueDateHQ models deadline risk.',
        body: 'Weekly triage keeps extension, payment, evidence, and readiness signals visible.',
        primary: 'Read weekly triage',
        secondary: 'Open rule library',
      },
    },
  ],
  'zh-CN': [
    {
      slug: 'weekly-cpa-deadline-triage',
      meta: {
        title: 'CPA 每周截止日分诊 — DueDateHQ Guide',
        description:
          'CPA 团队如何按剩余天数、罚款暴露、来源证据、客户 readiness、owner 和州变化来排序截止日风险。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'CPA 团队每周一应该如何分诊 deadline？',
        description:
          '可靠的 deadline workflow 不是日历列表，而是按风险排序的工作队列。DueDateHQ 把来源证据、客户上下文、状态、owner 和州变化信号放在一起，让团队先看最该处理的工作。',
        note: '本 guide 解释 deadline operations，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: 'WEEKLY TRIAGE',
          title: '第一个问题不是哪个日期最早。',
          body: '真正该先处理的是 deadline timing、client readiness、penalty exposure 和 evidence quality 共同形成风险的工作。',
          items: [
            { title: 'Days remaining', body: '剩余天数重要，但要和 readiness、exposure 一起看。' },
            { title: 'Penalty exposure', body: '金额影响帮助小团队先处理真正有代价的工作。' },
            {
              title: 'Source evidence',
              body: '缺少 verified source 的行，不能和 reviewed obligation 一样处理。',
            },
          ],
        },
        {
          eyebrow: 'OPERATING MODEL',
          title: 'Deadline queue 应该解释每一行为什么 risky。',
          body: 'DueDateHQ 把 client facts、filing profile、state signal、owner、status 和 evidence 放在 action 旁边，让优先级可以被解释。',
          items: [
            {
              title: 'Client readiness',
              body: '材料缺失会让较晚的 deadline 比较早但已 ready 的工作更紧急。',
            },
            {
              title: 'Owner assignment',
              body: '没有 owner 的 deadline work 风险更高，因为没有人负责下一步。',
            },
            {
              title: 'Pulse changes',
              body: '州变化必须带 source context 和 affected-client 线索进入复核。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '每周 deadline 分诊问题。' },
      faq: [
        {
          question: 'CPA 团队周一应该先看什么？',
          answer:
            '先看综合运营风险最高的行：剩余天数、exposure、readiness gap、缺失 evidence、owner gap 和州变化影响。',
        },
        {
          question: '为什么 calendar 不够？',
          answer:
            'Calendar 展示日期，但不解释 client readiness、source confidence、penalty exposure 或下一步 owner。',
        },
        {
          question: 'DueDateHQ 如何让分诊可解释？',
          answer:
            '它把来源证据、客户上下文、owner、status 和 audit history 放在 deadline action 附近。',
        },
      ],
      cta: {
        title: '查看来源证据如何支持分诊。',
        body: '公开规则模型解释 source-backed signals 如何变成 reviewed deadline work。',
        primary: '打开规则库',
        secondary: '查看州覆盖',
      },
    },
    {
      slug: 'migrate-cpa-deadlines-from-excel',
      meta: {
        title: '从 Excel 迁移 CPA Deadlines — DueDateHQ Guide',
        description:
          'CPA 事务所如何把 spreadsheet deadline work 转成带来源、obligation、review state 和每周分诊的运营模型。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'CPA 事务所应该如何把 deadline work 从 Excel 迁出来？',
        description:
          '迁移不是复制日期。真正有用的迁移会创建 client context、filing profiles、obligations、readiness state、source evidence 和 ownership。',
        note: 'Migration support 帮助组织工作，具体 filing obligations 仍需事务所复核。',
      },
      sections: [
        {
          eyebrow: 'MIGRATION MODEL',
          title: 'Spreadsheet row 需要变成 operational context。',
          body: 'DueDateHQ 把 migration 当成 review workflow。导入事实需要 normalized、checked，并和 deadline work 关联。',
          items: [
            {
              title: 'Client facts',
              body: 'Entity type、fiscal year、state footprint、owner 和 contact context 会影响 deadline。',
            },
            {
              title: 'Obligation mapping',
              body: '原始 spreadsheet label 要映射到已知 filing surface 才能被信任。',
            },
            {
              title: 'Review state',
              body: '低置信度行应该进入 review work，而不是静默创建 confident reminders。',
            },
          ],
        },
        {
          eyebrow: 'AFTER IMPORT',
          title: '目标是更好的 weekly queue，不是更漂亮的表格。',
          body: '成功迁移后，事务所可以按风险分诊、检查 evidence，并带 audit trail 更新 obligations。',
          items: [
            {
              title: 'Evidence attachment',
              body: '导入后的 obligations 最终应连接到 official-source rules 和 reviewed state。',
            },
            {
              title: 'Owner handoff',
              body: '团队要知道谁负责解决 missing data 或验证 candidate obligation。',
            },
            {
              title: 'Audit history',
              body: 'Apply、undo 和 correction flows 应留下后续可检查的运营历史。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Excel migration 问题。' },
      faq: [
        {
          question: '事务所应该导入每个 spreadsheet 字段吗？',
          answer:
            '不应该。优先导入会影响 filing profile、deadline generation、readiness、ownership 和 review state 的字段。',
        },
        {
          question: 'AI 可以映射 spreadsheet 字段吗？',
          answer:
            'AI 可以建议 mapping 并总结低置信度行，但 source evidence 和 human review 仍是信任边界。',
        },
        {
          question: '迁移成功的标准是什么？',
          answer:
            '事务所可以从 reviewed client 和 obligation context 运行 weekly deadline triage，而不是继续手工对账 spreadsheet。',
        },
      ],
      cta: {
        title: '查看 weekly triage model。',
        body: 'Migration 创建让 deadline risk 可见的上下文。',
        primary: '阅读 weekly triage',
        secondary: '查看价格',
      },
    },
    {
      slug: 'extension-vs-payment-deadlines',
      meta: {
        title: 'Extension vs Payment Deadlines — CPA Operations Guide',
        description:
          '为什么 CPA deadline software 需要区分 filing extension、payment timing、client readiness、source evidence 和 review state。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: '为什么 extension 和 payment deadline 要分开跟踪？',
        description:
          '对 CPA operations 来说，filing extension 和 payment timing 会产生不同风险。Workbench 应在团队认为 deadline 安全前展示 source evidence、client facts、review state 和 next actions。',
        note: '本 guide 是运营解释，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: 'RISK SPLIT',
          title: 'Extension 可能降低一种风险，但留下另一种风险。',
          body: 'Deadline operations 应明确区分这些风险，避免团队以为 filing extension 解决了所有 payment 或 readiness 问题。',
          items: [
            {
              title: 'Filing action',
              body: '团队需要知道 extension paperwork 是否准备、复核、提交。',
            },
            {
              title: 'Payment context',
              body: 'Payment timing 和 estimate context 可能需要独立于 filing extension 的复核。',
            },
            {
              title: 'Client readiness',
              body: '即使存在 extension，缺失 facts 仍可能阻断专业判断。',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT MODEL',
          title: '产品应该让 evidence 和 action split 保持可见。',
          body: 'DueDateHQ 把 extensions 当成和 source-backed rules、client context、audit history 绑定的 reviewed operational work。',
          items: [
            { title: 'Source-backed rule', body: '规则应指向官方材料和 verification state。' },
            {
              title: 'Separate status',
              body: 'Filing、payment、readiness、review status 不应该被压成一个模糊 reminder。',
            },
            {
              title: 'Audit trail',
              body: '团队应用或修改 extension-related action 时，后续应可检查。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Extension operations 问题。' },
      faq: [
        {
          question: '为什么 spreadsheet 里 tracking extension 有风险？',
          answer:
            'Spreadsheet row 往往隐藏 source evidence、payment context、readiness state 和下一步 owner。',
        },
        {
          question: 'DueDateHQ 会判断 payment requirements 吗？',
          answer: '不会。它让运营上下文和来源证据可见，由 CPA firm 复核和决定。',
        },
        {
          question: 'Deadline tool 应该展示 extension work 的什么？',
          answer:
            '应展示 filing action、payment context、client readiness、source evidence、owner 和 audit trail。',
        },
      ],
      cta: {
        title: '查看 DueDateHQ 如何建模 deadline risk。',
        body: 'Weekly triage 让 extension、payment、evidence 和 readiness signals 保持可见。',
        primary: '阅读 weekly triage',
        secondary: '打开规则库',
      },
    },
  ],
}

function comparisonPage(spec: ComparisonSpec, locale: Locale): GuidePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      meta: {
        title: `DueDateHQ vs ${spec.product} — Deadline Operations Comparison`,
        description: `如何在 ${spec.product} 和 DueDateHQ 之间选择 CPA deadline operations 工作流。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: 'COMPARISON',
        title: `DueDateHQ vs ${spec.product}: which fits deadline operations?`,
        description: `${spec.product} 更接近 ${spec.positioning}。DueDateHQ 的选择角度更窄：CPA deadline risk、official-source evidence、state Pulse review 和每周运营分诊。`,
        note: 'Comparison 页面基于公开定位和产品边界，不是竞品攻击。',
      },
      sections: [
        {
          eyebrow: 'WHEN TO CHOOSE',
          title: `${spec.product} 更适合什么情况？`,
          body: `${spec.product} 通常更适合 ${spec.bestFit}。如果这是主要目标，它可能比 DueDateHQ 的窄工作台更合适。`,
          items: [
            {
              title: 'Broader platform fit',
              body: '当主要需求是更大范围的 practice platform，应该优先评估完整平台能力。',
            },
            {
              title: 'Existing workflow',
              body: '如果团队已经在该平台中稳定运行，不应为了 SEO 页面而迁移。',
            },
            {
              title: 'Procurement fit',
              body: '采购应按团队真实 workflow、迁移成本和维护成本判断。',
            },
          ],
        },
        {
          eyebrow: 'DUEDATEHQ FIT',
          title: 'DueDateHQ 更适合 deadline risk operations。',
          body: spec.contrast,
          items: [
            {
              title: 'Source-backed rules',
              body: 'Deadline work 保留官方来源、摘录、复核时间和 review state。',
            },
            { title: 'Weekly triage', body: '首页关注本周谁最急、为什么急、下一步检查什么。' },
            {
              title: 'State Pulse review',
              body: '州变化进入 Pulse 后先复核，再影响客户运营工作。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.product} comparison questions.` },
      faq: [
        {
          question: `DueDateHQ 会替代 ${spec.product} 吗？`,
          answer: `不一定。DueDateHQ 更窄，专注 CPA deadline operations；${spec.product} 的公开定位更接近 ${spec.positioning}。`,
        },
        {
          question: '什么时候选 DueDateHQ？',
          answer:
            '当核心问题是 weekly deadline triage、source evidence、state changes 和 migration-assisted client context。',
        },
        {
          question: '这个 comparison 是否是税务建议？',
          answer: '不是。它只解释软件工作流和产品边界。',
        },
      ],
      cta: {
        title: 'Review the deadline risk workflow.',
        body: 'DueDateHQ is designed for source-backed CPA deadline operations.',
        primary: 'Read weekly triage',
        secondary: 'Open pricing',
      },
    }
  }

  return {
    slug: spec.slug,
    meta: {
      title: `DueDateHQ vs ${spec.product} — Deadline Operations Comparison`,
      description: `How CPA firms should compare ${spec.product} with DueDateHQ for deadline risk, source evidence, state coverage, and weekly triage workflows.`,
      ogImage: '/og/home.en.png',
    },
    hero: {
      eyebrow: 'COMPARISON',
      title: `DueDateHQ vs ${spec.product}: which fits deadline operations?`,
      description: `${spec.product} is closer to ${spec.positioning}. DueDateHQ takes a narrower angle: CPA deadline risk, official-source evidence, state Pulse review, and weekly operations triage.`,
      note: 'This comparison is based on public positioning and product boundaries, not competitor claims beyond visible market framing.',
    },
    sections: [
      {
        eyebrow: 'WHEN TO CHOOSE',
        title: `Where ${spec.product} can be the better fit.`,
        body: `${spec.product} is usually a better fit for ${spec.bestFit}. If that is the main buying job, a narrower DueDateHQ workflow may not be the right first system.`,
        items: [
          {
            title: 'Broader platform fit',
            body: 'When the main need is a larger practice platform, evaluate the full platform surface first.',
          },
          {
            title: 'Existing workflow',
            body: 'If the firm already runs well in that system, switching only for deadline content may not be worth the migration cost.',
          },
          {
            title: 'Procurement fit',
            body: 'Buying should follow real workflow scope, setup cost, and maintenance burden.',
          },
        ],
      },
      {
        eyebrow: 'DUEDATEHQ FIT',
        title: 'DueDateHQ fits deadline risk operations.',
        body: spec.contrast,
        items: [
          {
            title: 'Source-backed rules',
            body: 'Deadline work keeps official source URL, excerpt, verified timestamp, and review state attached.',
          },
          {
            title: 'Weekly triage',
            body: 'The homepage focuses on who is risky this week, why they are risky, and what the team should inspect next.',
          },
          {
            title: 'State Pulse review',
            body: 'State changes enter Pulse review before they can affect client operations.',
          },
        ],
      },
    ],
    faqHeader: { eyebrow: 'FAQ', title: `${spec.product} comparison questions.` },
    faq: [
      {
        question: `Does DueDateHQ replace ${spec.product}?`,
        answer: `Not necessarily. DueDateHQ is narrower and focused on CPA deadline operations; ${spec.product} is publicly positioned closer to ${spec.positioning}.`,
      },
      {
        question: 'When should a firm choose DueDateHQ?',
        answer:
          'Choose DueDateHQ when the core problem is weekly deadline triage, source evidence, state changes, and migration-assisted client context.',
      },
      {
        question: 'Is this comparison tax advice?',
        answer: 'No. It only explains software workflow boundaries and product fit.',
      },
    ],
    cta: {
      title: 'Review the deadline risk workflow.',
      body: 'DueDateHQ is designed for source-backed CPA deadline operations.',
      primary: 'Read weekly triage',
      secondary: 'Open pricing',
    },
  }
}

export const comparisonPages: Record<Locale, GuidePageCopy[]> = {
  en: comparisonSpecs.map((spec) => comparisonPage(spec, 'en')),
  'zh-CN': comparisonSpecs.map((spec) => comparisonPage(spec, 'zh-CN')),
}

export const ruleReferencePages: Record<Locale, GuidePageCopy[]> = {
  en: ruleReferenceSpecs.map((spec) => ruleReferencePage(spec, 'en')),
  'zh-CN': ruleReferenceSpecs.map((spec) => ruleReferencePage(spec, 'zh-CN')),
}

export function getGuidePages(siteCopy: LandingCopy, locale: Locale): GuidePageCopy[] {
  return [...siteCopy.geo.guides, ...supplementalGuides[locale]]
}

export function getComparisonPages(locale: Locale): GuidePageCopy[] {
  return comparisonPages[locale]
}

export function getRuleReferencePages(locale: Locale): GuidePageCopy[] {
  return ruleReferencePages[locale]
}

export function getStatePages(siteCopy: LandingCopy, locale: Locale): StatePageCopy[] {
  return [...siteCopy.geo.states, ...stateSpecs.map((spec) => statePage(spec, locale))]
}

export function getStateCoveragePage(siteCopy: LandingCopy, locale: Locale): StateCoverageCopy {
  return {
    ...siteCopy.geo.stateCoverage,
    states: [
      ...siteCopy.geo.stateCoverage.states,
      ...stateSpecs.map((spec) => stateSummary(spec, locale)),
    ],
  }
}

export function getResourceCtaHrefs(
  slug: string,
  locale: Locale,
): { primaryHref: string; secondaryHref: string } {
  const prefix = locale === 'zh-CN' ? '/zh-CN' : ''
  const hrefs: Record<string, { primaryHref: string; secondaryHref: string }> = {
    'cpa-deadline-risk': {
      primaryHref: `${prefix}/guides/evidence-backed-tax-deadline-software`,
      secondaryHref: `${prefix}/rules`,
    },
    'evidence-backed-tax-deadline-software': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/state-coverage`,
    },
    'weekly-cpa-deadline-triage': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/state-coverage`,
    },
    'migrate-cpa-deadlines-from-excel': {
      primaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
      secondaryHref: `${prefix}/pricing`,
    },
    'extension-vs-payment-deadlines': {
      primaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
      secondaryHref: `${prefix}/rules`,
    },
    'form-7004-extension-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    's-corp-deadline-operations': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'partnership-form-1065-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
  }

  return (
    hrefs[slug] ?? {
      primaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
      secondaryHref: `${prefix}/pricing`,
    }
  )
}
