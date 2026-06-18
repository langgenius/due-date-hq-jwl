import type { GuidePageCopy, LandingCopy, StateCoverageCopy, StatePageCopy } from '../i18n/types'

type Locale = 'en' | 'zh-CN'
type StateCard = StateCoverageCopy['states'][number]

interface StateSpec {
  slug: string
  name: string
  abbreviation: string
  agency: string
  sourceSurface: string
  sourceSurfaceZh: string
  signal: string
  signalZh: string
  taxFocus: string
  taxFocusZh: string
}

interface ComparisonSpec {
  slug: string
  product: string
  positioning: string
  positioningZh: string
  bestFit: string
  bestFitZh: string
  contrast: string
  contrastZh: string
}

interface RuleReferenceSpec {
  slug: string
  label: string
  labelZh: string
  sourceContext: string
  sourceContextZh: string
  operationalRisk: string
  operationalRiskZh: string
  clientContext: string
  clientContextZh: string
  keyDates?: {
    sourceLabel: string
    sourceHref: string
    rows: { label: string; labelZh: string; value: string; valueZh: string }[]
  }
}

// Internal coverage-depth truth per docs/dev-file/11-Pulse-Ingest-Source-Catalog.md
// §3: these 6 states run deep multi-agency live adapters. Retained for internal /
// future use ONLY — public state coverage is presented UNIFORMLY (comprehensive
// 50 states + DC), not by depth tier, so this set no longer drives any visible badge.
export const DEEP_COVERAGE_STATE_ABBRS = new Set(['CA', 'NY', 'TX', 'FL', 'WA', 'MA'])

// One uniform, honest coverage badge for every state — emphasizes comprehensive
// monitoring across 50 states + DC, never depth tiers.
function stateStatusLabel(locale: Locale): string {
  return locale === 'zh-CN' ? '监控中' : 'Monitored'
}

const stateSpecs: StateSpec[] = [
  {
    slug: 'illinois',
    name: 'Illinois',
    abbreviation: 'IL',
    agency: 'Illinois Department of Revenue',
    sourceSurface: 'forms, bulletins, and taxpayer guidance',
    sourceSurfaceZh: '表格、公告与纳税人指南',
    signal: 'income, replacement, sales-tax, and relief notices',
    signalZh: '所得税、replacement tax、销售税与救济通知',
    taxFocus: 'entity, sales-tax, and filing-window context',
    taxFocusZh: '实体类型、销售税与申报窗口上下文',
  },
  {
    slug: 'new-jersey',
    name: 'New Jersey',
    abbreviation: 'NJ',
    agency: 'New Jersey Division of Taxation',
    sourceSurface: 'business tax pages, notices, and filing guidance',
    sourceSurfaceZh: '企业税页面、通知与申报指南',
    signal: 'corporation business tax, sales-tax, and relief updates',
    signalZh: '公司营业税、销售税与救济更新',
    taxFocus: 'corporation tax, state filing, and taxpayer-class context',
    taxFocusZh: '公司税、州申报与纳税人类别上下文',
  },
  {
    slug: 'pennsylvania',
    name: 'Pennsylvania',
    abbreviation: 'PA',
    agency: 'Pennsylvania Department of Revenue',
    sourceSurface: 'revenue guidance, tax forms, and public notices',
    sourceSurfaceZh: '税务指南、税表与公开通知',
    signal: 'business tax, sales-tax, and filing-period updates',
    signalZh: '企业税、销售税与申报期间更新',
    taxFocus: 'business filing, taxpayer type, and period context',
    taxFocusZh: '企业申报、纳税人类型与期间上下文',
  },
  {
    slug: 'georgia',
    name: 'Georgia',
    abbreviation: 'GA',
    agency: 'Georgia Department of Revenue',
    sourceSurface: 'tax forms, news, and public filing guidance',
    sourceSurfaceZh: '税表、新闻与公开申报指南',
    signal: 'income tax, sales-tax, and deadline-related updates',
    signalZh: '所得税、销售税与截止日相关更新',
    taxFocus: 'state filing, form, and relief context',
    taxFocusZh: '州申报、表格与救济上下文',
  },
  {
    slug: 'massachusetts',
    name: 'Massachusetts',
    abbreviation: 'MA',
    agency: 'Massachusetts Department of Revenue',
    sourceSurface: 'DOR guidance, forms, and taxpayer notices',
    sourceSurfaceZh: '税务局指南、表格与纳税人通知',
    signal: 'corporate excise, sales-tax, and public filing updates',
    signalZh: 'corporate excise、销售税与公开申报更新',
    taxFocus: 'corporate excise, filing-period, and entity context',
    taxFocusZh: 'corporate excise、申报期间与实体上下文',
  },
  {
    slug: 'north-carolina',
    name: 'North Carolina',
    abbreviation: 'NC',
    agency: 'North Carolina Department of Revenue',
    sourceSurface: 'tax forms, notices, and filing resources',
    sourceSurfaceZh: '税表、通知与申报资源',
    signal: 'corporate income, franchise, sales-tax, and relief updates',
    signalZh: '公司所得税、franchise tax、销售税与救济更新',
    taxFocus: 'corporate, franchise, and due-date context',
    taxFocusZh: '公司税、franchise tax 与截止日上下文',
  },
  {
    slug: 'arizona',
    name: 'Arizona',
    abbreviation: 'AZ',
    agency: 'Arizona Department of Revenue',
    sourceSurface: 'forms, rulings, and taxpayer guidance',
    sourceSurfaceZh: '表格、裁定与纳税人指南',
    signal: 'income tax, transaction privilege tax, and relief notices',
    signalZh: '所得税、transaction privilege tax 与救济通知',
    taxFocus: 'filing, TPT, and taxpayer-class context',
    taxFocusZh: '申报、TPT 与纳税人类别上下文',
  },
  {
    slug: 'colorado',
    name: 'Colorado',
    abbreviation: 'CO',
    agency: 'Colorado Department of Revenue',
    sourceSurface: 'taxation guidance, forms, and notices',
    sourceSurfaceZh: '税务指南、表格与通知',
    signal: 'income tax, sales-tax, and filing-window updates',
    signalZh: '所得税、销售税与申报窗口更新',
    taxFocus: 'state filing, sales-tax, and period context',
    taxFocusZh: '州申报、销售税与期间上下文',
  },
  {
    slug: 'ohio',
    name: 'Ohio',
    abbreviation: 'OH',
    agency: 'Ohio Department of Taxation',
    sourceSurface: 'tax guidance, forms, and public updates',
    sourceSurfaceZh: '税务指南、表格与公开更新',
    signal: 'commercial activity tax, sales-tax, and income-tax updates',
    signalZh: 'commercial activity tax、销售税与所得税更新',
    taxFocus: 'CAT, sales-tax, and entity context',
    taxFocusZh: 'CAT、销售税与实体上下文',
  },
  {
    slug: 'michigan',
    name: 'Michigan',
    abbreviation: 'MI',
    agency: 'Michigan Department of Treasury',
    sourceSurface: 'tax forms, notices, and Treasury guidance',
    sourceSurfaceZh: '税表、通知与财政部指南',
    signal: 'corporate income tax, sales-tax, and public deadline updates',
    signalZh: '公司所得税、销售税与公开截止日更新',
    taxFocus: 'corporate filing, tax type, and period context',
    taxFocusZh: '公司申报、税种与期间上下文',
  },
]

const comparisonSpecs: ComparisonSpec[] = [
  {
    slug: 'file-in-time-alternative',
    product: 'File In Time',
    positioning: 'tax deadline tracking built around due-date lists',
    positioningZh: '围绕截止日清单构建的税务截止日追踪工具',
    bestFit: 'firms that mainly want a narrow deadline tracker',
    bestFitZh: '主要需要窄范围截止日跟踪器的事务所',
    contrast:
      'DueDateHQ is built around risk triage, source evidence, state alerts, and migration-assisted client context.',
    contrastZh: 'DueDateHQ 更关注风险分诊、来源证据、州级提醒复核，以及迁移后保留的客户上下文。',
  },
  {
    slug: 'taxdome-deadline-operations',
    product: 'TaxDome',
    positioning: 'an all-in-one practice management and client portal suite',
    positioningZh: '一体化 practice management 与客户门户套件',
    bestFit:
      'firms standardizing client portals, organizers, documents, payments, and workflow in one platform',
    bestFitZh: '希望把客户门户、organizer、文档、支付和工作流统一到一个平台的事务所',
    contrast:
      'DueDateHQ stays narrower: deadline risk, official-source evidence, state coverage, and weekly operations for CPA teams that do not want a full practice suite migration.',
    contrastZh:
      'DueDateHQ 范围更窄：截止日风险、官方来源证据、州覆盖和每周运营分诊，适合不想做完整 practice suite 迁移的 CPA 团队。',
  },
  {
    slug: 'karbon-deadline-operations',
    product: 'Karbon',
    positioning: 'collaborative accounting workflow and team work management',
    positioningZh: '会计团队协作工作流与 work management 平台',
    bestFit:
      'teams that want broad work management, email collaboration, and operational visibility',
    bestFitZh: '需要更广义 work management、邮件协作和团队可视化的团队',
    contrast:
      'DueDateHQ focuses on tax deadline work: source-backed rules, affected-client review, evidence drawers, and deadline-specific triage.',
    contrastZh:
      'DueDateHQ 聚焦税务截止日运营：带来源的规则、受影响客户复核、证据抽屉和专门面向截止日的分诊。',
  },
]

const ruleReferenceSpecs: RuleReferenceSpec[] = [
  {
    slug: 'form-7004-extension-deadline',
    label: 'Form 7004 extension deadline',
    labelZh: 'Form 7004 延期截止日',
    sourceContext: 'IRS extension instructions and filing-period guidance',
    sourceContextZh: 'IRS 延期说明与申报期间指南',
    operationalRisk:
      'extension work can reduce filing risk while leaving payment timing, readiness, and client communication open for review',
    operationalRiskZh: '延期工作可以降低申报风险，但付款时点、资料准备度和客户沟通仍需要单独复核',
    clientContext:
      'entity type, tax year, filing status, payment estimate, owner, and evidence state',
    clientContextZh: '实体类型、税年、申报状态、付款估算、负责人和证据状态',
    keyDates: {
      sourceLabel: 'IRS — About Form 7004',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-7004',
      rows: [
        {
          label: 'What it is',
          labelZh: '这是什么',
          value:
            'Form 7004 is the automatic extension application for business returns — it extends time to file, not time to pay.',
          valueZh: 'Form 7004 是企业申报的自动延期申请——它延长申报时间，不延长付款时间。',
        },
        {
          label: 'File by',
          labelZh: '何时提交',
          value:
            "The underlying return's original due date — March 15 for calendar-year Form 1065 and Form 1120-S.",
          valueZh:
            '在被延期申报表的原始截止日前提交——日历年 Form 1065 和 Form 1120-S 为 3 月 15 日。',
        },
        {
          label: 'Extension granted',
          labelZh: '延长时长',
          value:
            'An automatic 6 months — moving the calendar-year Form 1065 and Form 1120-S deadline to September 15.',
          valueZh: '自动延长 6 个月——把日历年 Form 1065 和 Form 1120-S 的截止日移到 9 月 15 日。',
        },
      ],
    },
  },
  {
    slug: 's-corp-deadline-operations',
    label: 'S-Corp deadline operations',
    labelZh: 'S-Corp 截止日运营',
    sourceContext: 'IRS S corporation filing guidance, form instructions, and state entity signals',
    sourceContextZh: 'IRS S corporation 申报指南、表格说明和州级实体信号',
    operationalRisk:
      'S-Corp work often combines federal filing timing, state registration, extension status, and client readiness',
    operationalRiskZh: 'S-Corp 工作通常同时涉及联邦申报时点、州注册状态、延期状态和客户资料准备度',
    clientContext:
      'entity profile, fiscal year, state footprint, responsible owner, and source-backed obligation state',
    clientContextZh: '实体档案、财年、州足迹、负责人和带来源的义务状态',
    keyDates: {
      sourceLabel: 'IRS — About Form 1120-S',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1120-s',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value:
            'March 15 — the 15th day of the 3rd month after the tax year ends, for calendar-year filers.',
          valueZh: '3 月 15 日——日历年纳税人为税年结束后第 3 个月的第 15 天。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 7004 — an automatic 6-month extension of time to file, to September 15.',
          valueZh: 'Form 7004——自动延长 6 个月的申报时间，至 9 月 15 日。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by the original deadline.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在原始截止日前缴清。',
        },
      ],
    },
  },
  {
    slug: 'partnership-form-1065-deadline',
    label: 'Partnership Form 1065 deadline',
    labelZh: 'Partnership Form 1065 截止日',
    sourceContext:
      'IRS partnership return guidance, extension instructions, and state filing references',
    sourceContextZh: 'IRS partnership return 指南、延期说明和州申报参考',
    operationalRisk:
      'partnership deadline work can affect partner schedules, extension handling, payment context, and review ownership',
    operationalRiskZh:
      'partnership 截止日工作会影响 partner schedule、延期处理、付款上下文和复核负责人',
    clientContext:
      'partnership profile, filing period, state footprint, materials readiness, and evidence completeness',
    clientContextZh: '合伙企业档案、申报期间、州足迹、资料准备度和证据完整度',
    keyDates: {
      sourceLabel: 'IRS — About Form 1065',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1065',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value:
            'March 15 — the 15th day of the 3rd month after the tax year ends, for calendar-year filers.',
          valueZh: '3 月 15 日——日历年纳税人为税年结束后第 3 个月的第 15 天。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 7004 — an automatic 6-month extension of time to file, to September 15.',
          valueZh: 'Form 7004——自动延长 6 个月的申报时间，至 9 月 15 日。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by the original deadline.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在原始截止日前缴清。',
        },
      ],
    },
  },
]

const KEY_DATES_NOTE: Record<Locale, string> = {
  en: 'If a deadline falls on a Saturday, Sunday, or legal holiday, it moves to the next business day. Always verify against the official IRS source; this page describes software workflows, not tax advice.',
  'zh-CN':
    '若截止日为周六、周日或法定假日，顺延至下一个工作日。请始终对照 IRS 官方来源核实；本页说明软件工作流，不提供税务建议。',
}

function buildKeyDates(spec: RuleReferenceSpec, locale: Locale): GuidePageCopy['keyDates'] {
  if (!spec.keyDates) return undefined
  const zh = locale === 'zh-CN'
  return {
    eyebrow: zh ? '关键日期' : 'KEY DATES',
    title: zh
      ? `${spec.labelZh} —— 联邦截止日（日历年纳税人）`
      : `${spec.label} — federal due dates (calendar-year filers)`,
    note: KEY_DATES_NOTE[locale],
    sourceLabel: spec.keyDates.sourceLabel,
    sourceHref: spec.keyDates.sourceHref,
    rows: spec.keyDates.rows.map((r) => ({
      label: zh ? r.labelZh : r.label,
      value: zh ? r.valueZh : r.value,
    })),
  }
}

function ruleReferencePage(spec: RuleReferenceSpec, locale: Locale): GuidePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      meta: {
        title: `${spec.labelZh} — DueDateHQ 规则参考`,
        description: `了解 DueDateHQ 如何把 ${spec.labelZh} 转成带官方来源、客户上下文、人工复核、证据状态和审计历史的 CPA 截止日运营工作。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '规则参考',
        title: `${spec.labelZh} 不只是一个日期。`,
        description: `DueDateHQ 不把 ${spec.labelZh} 当作孤立日期，而是把${spec.sourceContextZh}、客户事实、复核状态和审计历史放在同一条运营链路里。`,
        note: '规则参考页面只解释软件建模方式，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '来源模型',
          title: '规则先从官方来源进入复核。',
          body: `${spec.sourceContextZh} 是 DueDateHQ 优先保存的来源上下文。AI 可以辅助摘要、提示缺口或整理来源摘录，但不能替代官方来源和人工复核决定。`,
          items: [
            {
              title: '来源链接',
              body: '规则需要保留官方页面链接，方便复核人和用户回看同一份材料。',
            },
            { title: '来源摘录', body: '相关摘录靠近运营动作展示，避免把结论变成黑盒建议。' },
            {
              title: '复核元数据',
              body: '复核时间、复核人和规则状态决定该规则能否进入生产截止日工作。',
            },
          ],
        },
        {
          eyebrow: '运营上下文',
          title: '规则只有结合客户事实才成为截止日工作。',
          body: `${spec.operationalRiskZh}。DueDateHQ 会把规则和${spec.clientContextZh}放在一起复核。`,
          items: [
            {
              title: '客户匹配',
              body: '适用性取决于事务所维护的客户事实、申报档案和专业复核。',
            },
            {
              title: '复核门槛',
              body: '低置信度或缺少来源的信号先进入复核，而不是静默改变客户截止日。',
            },
            {
              title: '审计历史',
              body: 'Apply、dismiss、undo 和 revert 都要留下可检查的操作历史。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: '这条规则最终服务于队列、证据和团队分工。',
          body: '当前 app 中，规则复核发生在 Rules Console，生成后的 deadline 进入 Dashboard 和 Deadlines 队列，证据抽屉与审计时间线解释为什么要处理这项工作。',
          items: [
            {
              title: 'Rules Console',
              body: 'Owner 或 manager 可以在 coverage、pending queue 和 source list 中复核规则来源和适用范围。',
            },
            {
              title: 'Deadlines 队列',
              body: '通过客户事实和规则生成的义务会带着状态、负责人、资料准备度、风险和证据一起进入队列。',
            },
            {
              title: 'Evidence drawer',
              body: '用户可以从 deadline、Dashboard 或提醒上下文打开证据链，解释来源、更新时间和操作历史。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.labelZh} 常见问题。` },
      faq: [
        {
          question: `DueDateHQ 会判断 ${spec.labelZh} 是否适用吗？`,
          answer: '不会。它保留来源证据和客户上下文，由事务所复核适用性。',
        },
        {
          question: 'AI 在这里做什么？',
          answer: 'AI 可以摘要来源、提示缺失上下文或辅助迁移映射，但官方来源和人工复核才是控制点。',
        },
        {
          question: '这个页面是税务建议吗？',
          answer: '不是。它只是解释 DueDateHQ 如何把截止日规则建模成事务所运营工作。',
        },
      ],
      cta: {
        title: '查看公开规则模型。',
        body: 'DueDateHQ 把来源证据、客户上下文和复核状态放在截止日工作旁边。',
        primary: '打开规则库',
        secondary: '阅读每周分诊指南',
      },
      keyDates: buildKeyDates(spec, locale),
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
      {
        eyebrow: 'PRODUCT SURFACE',
        title: 'The rule supports queues, evidence, and team ownership.',
        body: 'In the current app, rule review lives in Rules Console. Generated deadlines flow into Dashboard and Deadlines, while the evidence drawer and audit timeline explain why the work exists.',
        items: [
          {
            title: 'Rules Console',
            body: 'Owners and managers can review rule source, coverage, pending queue items, and source registry context before rules become active.',
          },
          {
            title: 'Deadlines queue',
            body: 'Generated obligations carry status, owner, readiness, risk, and evidence context into the daily queue.',
          },
          {
            title: 'Evidence drawer',
            body: 'Users can inspect the source chain from deadline, Dashboard, or Alerts context instead of trusting an unexplained date.',
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
    keyDates: buildKeyDates(spec, locale),
  }
}

function stateSummary(spec: StateSpec, locale: Locale): StateCard {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      name: spec.name,
      abbreviation: spec.abbreviation,
      status: stateStatusLabel(locale),
      body: `${spec.agency} 的公开${spec.sourceSurfaceZh}可进入来源复核，用于${spec.taxFocusZh}的截止日运营判断。`,
      href: `/zh-CN/states/${spec.slug}`,
    }
  }

  return {
    slug: spec.slug,
    name: spec.name,
    abbreviation: spec.abbreviation,
    status: stateStatusLabel(locale),
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
        title: `${spec.name} 州申报截止日监控 — DueDateHQ 州覆盖`,
        description: `了解 DueDateHQ 如何监控 ${spec.agency} 的公开${spec.sourceSurfaceZh}，并把 ${spec.name} ${spec.signalZh} 转成带来源、客户上下文和人工复核的截止日工作。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: `州覆盖 · ${spec.abbreviation}`,
        title: `${spec.name} 申报信号先进入来源复核。`,
        description: `DueDateHQ 监控 ${spec.agency} 的公开${spec.sourceSurfaceZh}，在 ${spec.signalZh} 可能影响事务所截止日运营时保留来源、摘录、复核状态和客户匹配上下文。`,
        note: `${spec.name} 覆盖只描述软件监控范围，不是税务建议。`,
      },
      sourceTypes: [
        {
          title: `${spec.agency} 官方材料`,
          body: `优先使用 ${spec.agency} 的官方${spec.sourceSurfaceZh}，避免把第三方摘要当成来源。`,
        },
        {
          title: '表格与期间上下文',
          body: '表格、期间、纳税人类型和辖区线索会保留给人工复核。',
        },
        {
          title: '救济与通知更新',
          body: '公开救济、通知或截止日变动会先进入候选复核，而不是自动改客户工作。',
        },
      ],
      coveredSignals: [
        {
          title: spec.signalZh,
          body: '这些公开信号可以进入提醒复核，并保留来源链接、来源摘录和验证元数据。',
        },
        {
          title: spec.taxFocusZh,
          body: 'DueDateHQ 将信号和事务所客户申报档案、税种、期间上下文放在一起审查。',
        },
        {
          title: '运营路由',
          body: '复核后的信号可以成为 Dashboard、Deadlines 或邮件工作流的上下文。',
        },
      ],
      limitations: [
        `DueDateHQ 不判断某条 ${spec.name} 规则是否适用于具体客户。`,
        '覆盖依赖公开来源可访问性、来源清晰度和产品复核状态。',
        '客户专属信件、私有通知和专业判断不属于公开州覆盖页面的承诺范围。',
      ],
      faq: [
        {
          question: `${spec.name} 哪些信号会进入复核？`,
          answer: `${spec.signalZh} 会在可能影响截止日运营时进入带来源的复核。`,
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
          'A weekly workflow for ranking CPA deadline work by days remaining, missed-deadline risk, source evidence, client readiness, ownership, and state changes.',
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
          body: 'The work that deserves attention first is the work where deadline timing, client readiness, missed-deadline risk, and evidence quality create operational urgency.',
          items: [
            {
              title: 'Days remaining',
              body: 'Short timelines matter, but they should be read together with readiness and deadline risk.',
            },
            {
              title: 'Missed-deadline risk',
              body: 'Surfacing which filings carry the most risk helps a small team avoid spending the morning on low-priority work.',
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
              title: 'State alerts',
              body: 'State updates should move into review only with source context and affected-client clues.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT SURFACE',
          title: 'Triage should land in Today, Deadlines, and evidence review.',
          body: 'The current app uses Dashboard/Today to aggregate risk and Alerts, while the Deadlines queue carries filters, status updates, readiness, extension, risk, evidence, and audit detail.',
          items: [
            {
              title: 'Today/Dashboard',
              body: 'The homepage answers what to inspect first: open obligations, due-this-week work, review needs, evidence gaps, and Deadline Radar.',
            },
            {
              title: 'Deadlines',
              body: 'The queue preserves URL filters, owner, status, evidence, and detail context so teams can share the same working state.',
            },
            {
              title: 'Audit/Evidence',
              body: 'The evidence drawer and audit timeline explain why the work exists and who changed what, when.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Weekly deadline triage questions.' },
      faq: [
        {
          question: 'What should a CPA team review first on Monday?',
          answer:
            'Review the rows with the highest combined operational risk: days remaining, missed-deadline risk, readiness gaps, missing evidence, owner gaps, and state-change impact.',
        },
        {
          question: 'Why is a calendar not enough?',
          answer:
            'A calendar shows dates. It does not explain client readiness, source confidence, missed-deadline risk, or who owns the next action.',
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
        {
          eyebrow: 'PRODUCT SURFACE',
          title: 'Migration Copilot is a four-step review flow, not a live sync engine.',
          body: 'The current product supports Intake, Mapping, Normalize, and Preview & apply. It can handle paste/upload and common export shapes, but public pages should not promise OAuth sync, webhook mirroring, or e-file transmission.',
          items: [
            {
              title: 'Intake',
              body: 'Users paste or upload client tables; SSN-like sensitive columns or parse failures block the flow.',
            },
            {
              title: 'Mapping and normalize',
              body: 'AI can suggest field mapping and normalization, while low-confidence values remain review work.',
            },
            {
              title: 'Preview & apply',
              body: 'The firm reviews dry-run output before apply writes clients, deadlines, evidence, and audit records.',
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
        {
          eyebrow: 'PRODUCT SURFACE',
          title:
            'Deadline detail should keep readiness, extension, risk, evidence, and audit separate.',
          body: 'The current app separates Readiness, Extension, Risk, Evidence, and Audit in deadline detail. Public content can explain that separation, but it should not decide payment requirements for users.',
          items: [
            {
              title: 'Readiness',
              body: 'Client facts, request state, and missing materials determine whether the team can proceed.',
            },
            {
              title: 'Extension',
              body: 'Filing extension actions need separate review from payment context, client communication, and source rules.',
            },
            {
              title: 'Risk / Evidence / Audit',
              body: 'Risk explanation, source evidence, and action history support review instead of producing an unexplained reminder.',
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
        title: 'CPA 每周截止日分诊 — DueDateHQ 指南',
        description:
          '了解 CPA 团队如何按剩余天数、错过截止日的风险、来源证据、客户资料准备度、负责人、州级变化和审计历史来排序截止日风险，而不是只看日历日期或静态表格。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: 'CPA 团队每周一应该如何分诊截止日？',
        description:
          '可靠的截止日工作流不是日历列表，而是按风险排序的工作队列。DueDateHQ 把来源证据、客户上下文、状态、负责人和州变化信号放在一起，让团队先看最该处理的工作。',
        note: '本指南解释截止日运营，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '每周分诊',
          title: '第一个问题不是哪个日期最早。',
          body: '真正该先处理的是截止日时点、客户资料准备度、错过截止日的风险和证据质量共同形成运营紧迫度的工作。',
          items: [
            { title: '剩余天数', body: '剩余天数重要，但要和资料准备度、截止日风险一起看。' },
            {
              title: '错过截止日的风险',
              body: '突出哪些申报风险最高，帮助小团队先处理优先级最高的工作。',
            },
            {
              title: '来源证据',
              body: '缺少已验证来源的行，不能和已复核义务一样处理。',
            },
          ],
        },
        {
          eyebrow: '运营模型',
          title: '截止日队列应该解释每一行为什么有风险。',
          body: 'DueDateHQ 把客户事实、申报档案、州级信号、负责人、状态和证据放在动作旁边，让优先级可以被解释。',
          items: [
            {
              title: '客户资料准备度',
              body: '材料缺失会让较晚的截止日比较早但已准备好的工作更紧急。',
            },
            {
              title: '负责人分配',
              body: '没有负责人的截止日工作风险更高，因为没有人负责下一步。',
            },
            {
              title: '州级提醒',
              body: '州变化必须带来源上下文和受影响客户线索进入复核。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: '分诊结果应能落到 Today、Deadlines 和证据抽屉。',
          body: '当前 app 的 Dashboard/Today surface 聚合风险和提醒，Deadlines 队列承载筛选、状态更新、readiness、extension、risk、evidence 和 audit 详情。',
          items: [
            {
              title: 'Today/Dashboard',
              body: '首页适合回答今天先看什么：未结义务、本周到期、待复核、证据缺口和 Deadline Radar。',
            },
            {
              title: 'Deadlines',
              body: '队列保留 URL filters、owner、status、evidence 和 detail panel，便于团队共享同一工作状态。',
            },
            {
              title: 'Audit/Evidence',
              body: '证据抽屉和审计时间线解释为什么这项工作存在，以及谁在何时做过什么动作。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '每周截止日分诊问题。' },
      faq: [
        {
          question: 'CPA 团队周一应该先看什么？',
          answer:
            '先看综合运营风险最高的行：剩余天数、错过截止日的风险、资料缺口、缺失证据、负责人缺口和州级变化影响。',
        },
        {
          question: '为什么 calendar 不够？',
          answer:
            'Calendar 展示日期，但不解释客户资料准备度、来源可信度、错过截止日的风险或下一步负责人。',
        },
        {
          question: 'DueDateHQ 如何让分诊可解释？',
          answer: '它把来源证据、客户上下文、负责人、状态和审计历史放在截止日动作附近。',
        },
      ],
      cta: {
        title: '查看来源证据如何支持分诊。',
        body: '公开规则模型解释带来源的信号如何变成已复核的截止日工作。',
        primary: '打开规则库',
        secondary: '查看州覆盖',
      },
    },
    {
      slug: 'migrate-cpa-deadlines-from-excel',
      meta: {
        title: '从 Excel 迁移 CPA 截止日 — DueDateHQ 指南',
        description:
          '了解 CPA 事务所如何把 Excel 或旧系统里的截止日表格转成客户事实、申报档案、截止日义务、复核状态、来源证据、负责人和每周分诊队列。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: 'CPA 事务所应该如何把截止日工作从 Excel 迁出来？',
        description:
          '迁移不是复制日期。真正有用的迁移会创建客户上下文、申报档案、截止日义务、资料准备状态、来源证据和负责人。',
        note: 'Migration Copilot 帮助组织工作，具体申报义务仍需事务所复核。',
      },
      sections: [
        {
          eyebrow: '迁移模型',
          title: '表格行需要变成运营上下文。',
          body: 'DueDateHQ 把迁移当成复核工作流。导入事实需要标准化、检查，并和截止日工作关联。',
          items: [
            {
              title: '客户事实',
              body: '实体类型、财年、州足迹、负责人和联系人上下文会影响截止日。',
            },
            {
              title: '义务映射',
              body: '原始表格标签要映射到已知申报面，才能被团队信任。',
            },
            {
              title: '复核状态',
              body: '低置信度行应该进入复核工作，而不是静默创建看似可靠的提醒。',
            },
          ],
        },
        {
          eyebrow: '导入后',
          title: '目标是更好的每周队列，不是更漂亮的表格。',
          body: '成功迁移后，事务所可以按风险分诊、检查证据，并带审计链路更新义务。',
          items: [
            {
              title: '证据连接',
              body: '导入后的义务最终应连接到官方来源规则和已复核状态。',
            },
            {
              title: '负责人交接',
              body: '团队要知道谁负责解决缺失数据或验证候选义务。',
            },
            {
              title: '审计历史',
              body: 'Apply、undo 和 correction flow 应留下后续可检查的运营历史。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: 'Migration Copilot 是四步复核流程，不是实时同步器。',
          body: '当前产品支持 Intake、Mapping、Normalize、Preview & apply。它可以处理粘贴、上传和常见导出形态，但公开页面不应承诺 OAuth 双向同步、webhook 镜像或电子申报传输。',
          items: [
            {
              title: 'Intake',
              body: '用户粘贴或上传客户表格；检测到 SSN-like 敏感列或无法解析时会阻止继续。',
            },
            {
              title: 'Mapping 与 Normalize',
              body: 'AI 可以建议字段映射和归一化，但低置信度值仍需要人工复核。',
            },
            {
              title: 'Preview & apply',
              body: '正式导入前先看 dry-run 结果；apply 后写入客户、截止日、证据和审计记录。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Excel 迁移问题。' },
      faq: [
        {
          question: '事务所应该导入每个 spreadsheet 字段吗？',
          answer:
            '不应该。优先导入会影响申报档案、截止日生成、资料准备度、负责人和复核状态的字段。',
        },
        {
          question: 'AI 可以映射 spreadsheet 字段吗？',
          answer: 'AI 可以建议字段映射并总结低置信度行，但来源证据和人工复核仍是信任边界。',
        },
        {
          question: '迁移成功的标准是什么？',
          answer: '事务所可以从已复核客户和义务上下文运行每周截止日分诊，而不是继续手工对账表格。',
        },
      ],
      cta: {
        title: '查看每周分诊模型。',
        body: '迁移创建让截止日风险可见的上下文。',
        primary: '阅读每周分诊',
        secondary: '查看价格',
      },
    },
    {
      slug: 'extension-vs-payment-deadlines',
      meta: {
        title: '延期申报 vs 付款截止日 — CPA 运营指南',
        description:
          '了解为什么 CPA 截止日软件需要区分申报延期、付款时点、客户资料准备度、来源证据、复核状态和审计历史，避免把延期申报误当成所有风险都已解决。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: '为什么延期申报和付款截止日要分开跟踪？',
        description:
          '对 CPA 运营来说，申报延期和付款时点会产生不同风险。工作台应在团队认为截止日安全前展示来源证据、客户事实、复核状态和下一步动作。',
        note: '本指南是运营解释，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '风险拆分',
          title: '延期申报可能降低一种风险，但留下另一种风险。',
          body: '截止日运营应明确区分这些风险，避免团队以为申报延期解决了所有付款或资料准备问题。',
          items: [
            {
              title: '申报动作',
              body: '团队需要知道延期申报材料是否准备、复核、提交。',
            },
            {
              title: '付款上下文',
              body: '付款时点和估算上下文可能需要独立于申报延期的复核。',
            },
            {
              title: '客户资料准备度',
              body: '即使存在延期，缺失事实仍可能阻断专业判断。',
            },
          ],
        },
        {
          eyebrow: '产品模型',
          title: '产品应该让证据和动作拆分保持可见。',
          body: 'DueDateHQ 把延期当成和带来源规则、客户上下文、审计历史绑定的已复核运营工作。',
          items: [
            { title: '带来源的规则', body: '规则应指向官方材料和验证状态。' },
            {
              title: '分离状态',
              body: '申报、付款、资料准备度和复核状态不应该被压成一个模糊提醒。',
            },
            {
              title: '审计历史',
              body: '团队应用或修改延期相关动作时，后续应可检查。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: 'Deadlines 详情页应该把资料准备、延期、风险和证据分开呈现。',
          body: '当前 app 的截止日详情用多个标签页承载 Readiness、Extension、Risk、Evidence 和 Audit。公开内容可以解释这种分离，但不能替用户判断付款要求。',
          items: [
            {
              title: 'Readiness',
              body: '客户资料、请求状态和缺失项决定团队是否可以继续处理。',
            },
            {
              title: '延期',
              body: '延期申报动作需要和付款上下文、客户沟通和来源规则分开复核。',
            },
            {
              title: 'Risk / Evidence / Audit',
              body: '风险解释、来源证据和操作历史共同支持后续复核，而不是生成不可追溯提醒。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '延期运营问题。' },
      faq: [
        {
          question: '为什么 spreadsheet 里 tracking extension 有风险？',
          answer: '表格行往往隐藏来源证据、付款上下文、资料准备状态和下一步负责人。',
        },
        {
          question: 'DueDateHQ 会判断付款要求吗？',
          answer: '不会。它让运营上下文和来源证据可见，由 CPA 事务所复核和决定。',
        },
        {
          question: '截止日工具应该展示延期工作的什么？',
          answer: '应展示申报动作、付款上下文、客户资料准备度、来源证据、负责人和审计链路。',
        },
      ],
      cta: {
        title: '查看 DueDateHQ 如何建模截止日风险。',
        body: '每周分诊让延期、付款、证据和资料准备度信号保持可见。',
        primary: '阅读每周分诊',
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
        title: `DueDateHQ vs ${spec.product} — 截止日运营对比`,
        description: `了解 CPA 事务所如何在 ${spec.product} 和 DueDateHQ 之间比较截止日风险、官方来源证据、州级提醒复核、迁移成本和每周分诊工作流。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '对比',
        title: `DueDateHQ vs ${spec.product}: 哪个更适合截止日运营？`,
        description: `${spec.product} 更接近${spec.positioningZh}。DueDateHQ 的选择角度更窄：CPA 截止日风险、官方来源证据、州级提醒复核和每周运营分诊。`,
        note: '对比页面基于公开定位和产品边界，不声称竞品私有能力。',
      },
      sections: [
        {
          eyebrow: '选择场景',
          title: `${spec.product} 更适合什么情况？`,
          body: `${spec.product} 通常更适合${spec.bestFitZh}。如果这是主要目标，它可能比 DueDateHQ 的窄工作台更合适。`,
          items: [
            {
              title: '更广的平台需求',
              body: '当主要需求是更大范围的 practice platform，应该优先评估完整平台能力。',
            },
            {
              title: '现有工作流',
              body: '如果团队已经在该平台中稳定运行，不应为了 SEO 页面而迁移。',
            },
            {
              title: '采购适配',
              body: '采购应按团队真实 workflow、迁移成本和维护成本判断。',
            },
          ],
        },
        {
          eyebrow: 'DueDateHQ 适配',
          title: 'DueDateHQ 更适合截止日风险运营。',
          body: spec.contrastZh,
          items: [
            {
              title: '带来源的规则',
              body: '截止日工作保留官方来源、摘录、复核时间和复核状态。',
            },
            { title: '每周分诊', body: '首页关注本周谁最急、为什么急、下一步检查什么。' },
            {
              title: '州级提醒复核',
              body: '州变化进入提醒后先复核，再影响客户运营工作。',
            },
          ],
        },
        {
          eyebrow: '边界',
          title: '这不是“替换所有 practice software”的承诺。',
          body: 'DueDateHQ 公开定位是截止日运营工作台。它可以和现有客户门户、文档工作流或更宽的事务所平台并存，重点是把截止日风险、来源证据和受影响客户复核做深。',
          items: [
            {
              title: '迁移成本',
              body: '如果团队主要痛点是全平台迁移，应该先评估原平台和数据迁移负担。',
            },
            {
              title: '产品边界',
              body: 'DueDateHQ 不提供报税提交、客户门户替代或自动税务判断。',
            },
            {
              title: '适用买点',
              body: '当事务所需要更好的截止日队列、提醒复核、证据抽屉和审计链路时，DueDateHQ 才是更直接的选择。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.product} 对比问题。` },
      faq: [
        {
          question: `DueDateHQ 会替代 ${spec.product} 吗？`,
          answer: `不一定。DueDateHQ 更窄，专注 CPA 截止日运营；${spec.product} 的公开定位更接近${spec.positioningZh}。`,
        },
        {
          question: '什么时候选 DueDateHQ？',
          answer: '当核心问题是每周截止日分诊、来源证据、州级变化和迁移辅助的客户上下文。',
        },
        {
          question: '这个对比是否是税务建议？',
          answer: '不是。它只解释软件工作流和产品边界。',
        },
      ],
      cta: {
        title: '查看截止日风险工作流。',
        body: 'DueDateHQ 为带来源的 CPA 截止日运营设计。',
        primary: '阅读每周分诊',
        secondary: '查看价格',
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
      description: `${spec.product} is closer to ${spec.positioning}. DueDateHQ takes a narrower angle: CPA deadline risk, official-source evidence, state alert review, and weekly operations triage.`,
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
            title: 'State alert review',
            body: 'State changes enter alert review before they can affect client operations.',
          },
        ],
      },
      {
        eyebrow: 'BOUNDARY',
        title: 'This is not a promise to replace every practice software category.',
        body: 'DueDateHQ is positioned as a deadline operations workbench. It can sit beside an existing client portal, document workflow, or broader practice platform when the firm wants deeper deadline risk, source evidence, and affected-client review.',
        items: [
          {
            title: 'Migration cost',
            body: 'If the main pain is a whole-platform migration, evaluate the incumbent platform and data migration burden first.',
          },
          {
            title: 'Product boundary',
            body: 'DueDateHQ does not provide tax filing transmission, client portal replacement, or automatic tax judgment.',
          },
          {
            title: 'Best-fit buying job',
            body: 'DueDateHQ is the more direct choice when the firm needs a better deadline queue, alert review, evidence drawer, and audit trail.',
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
