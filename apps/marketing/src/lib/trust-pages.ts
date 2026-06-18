import type { Locale } from '@duedatehq/i18n/locales'

import type { MetaCopy } from '../i18n/types'

export const trustPageSlugs = ['about', 'security', 'privacy', 'terms', 'status'] as const

export type TrustPageSlug = (typeof trustPageSlugs)[number]

export interface TrustPageCopy {
  slug: TrustPageSlug
  meta: MetaCopy
  hero: {
    eyebrow: string
    title: string
    description: string
    note: string
  }
  sections: {
    eyebrow: string
    title: string
    body: string
    items: { title: string; body: string }[]
  }[]
  contact: {
    title: string
    body: string
    label: string
    href: string
  }
}

export const trustPages: Record<Locale, TrustPageCopy[]> = {
  en: [
    {
      slug: 'about',
      meta: {
        title: 'About DueDateHQ — Deadline operations for CPA practices',
        description:
          'DueDateHQ helps US CPA practices manage deadline risk with source-backed rules, state filing signals, evidence review, and audit-ready workflow history.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'ABOUT DUEDATEHQ',
        title: 'Deadline operations should be visible before they become missed-deadline risk.',
        description:
          'DueDateHQ is built for US CPA practices that need one place to migrate client deadline data, monitor source-backed filing rules, review state changes, and explain why work was prioritized.',
        note: 'Public pages describe software workflows and source handling. DueDateHQ does not provide tax, legal, or accounting advice.',
      },
      sections: [
        {
          eyebrow: 'PRODUCT BOUNDARY',
          title: 'Software for deadline operations, not a substitute for CPA judgment.',
          body: 'DueDateHQ focuses on operational visibility: which clients may be at risk, which source supports a rule, which state signal changed, and who reviewed the action.',
          items: [
            {
              title: 'Source-backed rules',
              body: 'Rules keep official-source URLs, excerpts, verification timestamps, and review state near the operational action.',
            },
            {
              title: 'Firm context',
              body: 'Client filing profiles, jurisdictions, obligation status, ownership, and evidence quality shape triage.',
            },
            {
              title: 'Audit history',
              body: 'Apply, undo, revert, and import workflows are designed to leave a reviewable operational record.',
            },
          ],
        },
        {
          eyebrow: 'AUDIENCE',
          title: 'Built for small and mid-sized US CPA teams.',
          body: 'The product is designed around deadline-heavy practices that currently coordinate filing work across spreadsheets, inboxes, legacy trackers, and agency websites.',
          items: [
            {
              title: 'Monday triage',
              body: 'Missed-deadline risk, days remaining, evidence state, and alerts are meant to fit into a short weekly review.',
            },
            {
              title: 'Migration-first setup',
              body: 'Existing client exports can become structured deadline work without a per-client setup project.',
            },
            {
              title: 'Human review gates',
              body: 'AI can assist classification and summaries, but source evidence and reviewer action remain the control points.',
            },
          ],
        },
      ],
      contact: {
        title: 'Talk to the team.',
        body: 'Use the public contact channel for product questions, pilots, and implementation fit.',
        label: 'Contact DueDateHQ',
        href: 'mailto:sales@duedatehq.com?subject=DueDateHQ',
      },
    },
    {
      slug: 'security',
      meta: {
        title: 'DueDateHQ Security — Source-backed deadline operations',
        description:
          'How DueDateHQ protects deadline operations with tenant isolation, reviewable source evidence, audit history, and production security boundaries.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'SECURITY',
        title: 'Deadline risk workflows need security boundaries and evidence boundaries.',
        description:
          'DueDateHQ separates public marketing pages from the authenticated app, keeps client operations behind the SaaS app domain, and designs deadline changes around reviewable source evidence.',
        note: 'This page summarizes product and operational security posture. Detailed security reviews are handled with the DueDateHQ team.',
      },
      sections: [
        {
          eyebrow: 'APP BOUNDARY',
          title: 'The public site and SaaS app have different roles.',
          body: 'The marketing domain is for public discovery. The app domain is for authenticated practice work, tenant data, and operational actions.',
          items: [
            {
              title: 'Authenticated workspace',
              body: 'Client deadline operations live in the app workspace, not the public marketing sitemap.',
            },
            {
              title: 'Tenant-aware API',
              body: 'Server procedures run through session, firm-access, tenant, and rate-limit middleware before protected business actions.',
            },
            {
              title: 'No client data in SEO pages',
              body: 'Public pages explain product behavior and examples; they do not expose practice client records.',
            },
          ],
        },
        {
          eyebrow: 'OPERATIONAL CONTROLS',
          title: 'Evidence and audit trails are part of the control model.',
          body: 'Deadline changes should be explainable. DueDateHQ keeps source context, reviewer state, and action history close to the workflow.',
          items: [
            {
              title: 'Source evidence',
              body: 'Rules and alerts preserve source URL, excerpt, verification timestamp, and review status.',
            },
            {
              title: 'Human approval',
              body: 'Candidate changes route through review before they become firm operations.',
            },
            {
              title: 'Reversible actions',
              body: 'Apply, undo, and revert paths are designed for reviewable operational history.',
            },
          ],
        },
      ],
      contact: {
        title: 'Need a security review?',
        body: 'Contact the team for deployment, data handling, and security review questions.',
        label: 'Contact security',
        href: 'mailto:security@duedatehq.com?subject=DueDateHQ%20Security',
      },
    },
    {
      slug: 'privacy',
      meta: {
        title: 'DueDateHQ Privacy — Public privacy summary',
        description:
          'DueDateHQ privacy summary for public visitors and CPA practices evaluating deadline operations software.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'PRIVACY',
        title: 'Privacy starts with keeping public pages and practice work separate.',
        description:
          'DueDateHQ public pages describe product capabilities. Authenticated practice data belongs in the app workspace and is not part of the public SEO surface.',
        note: 'This public summary is not a replacement for a signed agreement or formal privacy review.',
      },
      sections: [
        {
          eyebrow: 'DATA BOUNDARY',
          title: 'Public content does not require client records.',
          body: 'Marketing, resource, and state coverage pages explain how the product works without publishing firm client data.',
          items: [
            {
              title: 'Public pages',
              body: 'Public pages contain product copy, examples, and source-handling explanations.',
            },
            {
              title: 'Authenticated app',
              body: 'Practice operations, client records, filings, evidence review, and audit history belong in the app.',
            },
            {
              title: 'Support channels',
              body: 'Privacy requests should avoid sending sensitive client records through public email unless a secure process is agreed.',
            },
          ],
        },
        {
          eyebrow: 'AI BOUNDARY',
          title: 'AI is used as an assistive workflow layer.',
          body: 'DueDateHQ describes AI as a way to reduce operational friction, not as a source of tax truth or a replacement for professional review.',
          items: [
            {
              title: 'Source context',
              body: 'AI-assisted summaries and classifications should remain tied to source evidence.',
            },
            {
              title: 'Human review',
              body: 'Human decisions remain the boundary before operational changes affect client work.',
            },
            {
              title: 'Minimized public claims',
              body: 'Public pages avoid hidden data claims and keep structured data aligned with visible content.',
            },
          ],
        },
      ],
      contact: {
        title: 'Privacy questions.',
        body: 'Use the privacy channel for data handling and privacy review questions.',
        label: 'Contact privacy',
        href: 'mailto:privacy@duedatehq.com?subject=DueDateHQ%20Privacy',
      },
    },
    {
      slug: 'terms',
      meta: {
        title: 'DueDateHQ Terms — Public terms summary',
        description:
          'DueDateHQ public terms summary explaining product boundaries for deadline operations software.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'TERMS',
        title: 'DueDateHQ is deadline operations software for professional teams.',
        description:
          'The product helps practices organize source-backed deadline work, evidence review, Alerts monitoring, migration, and audit-ready operational history.',
        note: 'This page is a public summary. Contractual terms are handled through the DueDateHQ legal channel.',
      },
      sections: [
        {
          eyebrow: 'USE BOUNDARY',
          title: 'The product supports review; it does not make filing decisions for a firm.',
          body: 'DueDateHQ helps surface risk and source context. The CPA practice remains responsible for professional judgment, client facts, and filing decisions.',
          items: [
            {
              title: 'No tax advice',
              body: 'Public pages and product workflows do not provide tax, legal, accounting, or compliance advice.',
            },
            {
              title: 'Source verification',
              body: 'Users should verify obligations against official IRS and state tax authority sources.',
            },
            {
              title: 'Firm responsibility',
              body: 'Professional users decide applicability, client impact, and filing actions.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT OPERATION',
          title: 'Review state matters before deadline work changes.',
          body: 'DueDateHQ workflows are designed to preserve source context and review history before an operational signal becomes firm work.',
          items: [
            {
              title: 'Candidate signals',
              body: 'Alerts and source updates start as review work until a firm decides what to do.',
            },
            {
              title: 'Migration outputs',
              body: 'Imported data should be reviewed before it becomes trusted production operations.',
            },
            {
              title: 'Auditability',
              body: 'Actions should remain explainable through source, reviewer, and workflow history.',
            },
          ],
        },
      ],
      contact: {
        title: 'Need formal terms?',
        body: 'Use the legal channel for contracting and terms questions.',
        label: 'Contact legal',
        href: 'mailto:legal@duedatehq.com?subject=DueDateHQ%20Terms',
      },
    },
    {
      slug: 'status',
      meta: {
        title: 'DueDateHQ Status — Public service status',
        description: 'Public service status summary for DueDateHQ marketing and app surfaces.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'STATUS',
        title: 'Service status and incidents.',
        description:
          'DueDateHQ currently separates the public marketing site from the authenticated app. Public discovery pages and app operations are monitored as distinct surfaces.',
        note: 'For incident-specific updates, contact support. This page is the current public status summary.',
      },
      sections: [
        {
          eyebrow: 'SURFACES',
          title: 'The public site and app are tracked separately.',
          body: 'The marketing site is responsible for public discovery. The app is responsible for authenticated practice work and API-backed operations.',
          items: [
            {
              title: 'Marketing site',
              body: 'Public pages, sitemap, robots.txt, llms.txt, canonical URLs, and static SEO content.',
            },
            {
              title: 'App workspace',
              body: 'Authenticated workbench, RPC API, billing, tenant operations, queues, and protected workflows.',
            },
            {
              title: 'Source monitoring',
              body: 'Alert source monitoring and email/queue workflows are operational surfaces distinct from public SEO pages.',
            },
          ],
        },
        {
          eyebrow: 'REPORTING',
          title: 'Report service issues through support.',
          body: 'Support requests should include the affected surface, workspace, timestamp, and a concise description of the user-visible impact.',
          items: [
            {
              title: 'Availability',
              body: 'Use support for app access, login, or availability issues.',
            },
            {
              title: 'Data operations',
              body: 'Use support for migration, Alerts, evidence, or deadline workflow issues.',
            },
            {
              title: 'Public site',
              body: 'Use support for public page, sitemap, or SEO discovery issues.',
            },
          ],
        },
      ],
      contact: {
        title: 'Report an issue.',
        body: 'Use the support channel for service status and incident questions.',
        label: 'Contact support',
        href: 'mailto:support@duedatehq.com?subject=DueDateHQ%20Status',
      },
    },
  ],
  'zh-CN': [
    {
      slug: 'about',
      meta: {
        title: '关于 DueDateHQ — 面向 CPA 事务所的截止日运营',
        description:
          'DueDateHQ 帮助美国 CPA 事务所用带来源的规则、州级申报信号、证据复核、客户上下文、负责人分工和可审计工作流持续管理截止日风险。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '关于 DueDateHQ',
        title: '截止日运营应该在错过截止日之前就可见。',
        description:
          'DueDateHQ 面向美国 CPA 事务所，把客户截止日迁移、带来源规则、州级变化复核和风险排序放在同一个运营工作台。',
        note: '公开页面说明软件工作流和来源处理方式。DueDateHQ 不提供税务、法律或会计建议。',
      },
      sections: [
        {
          eyebrow: '产品边界',
          title: '这是截止日运营软件，不替代 CPA 专业判断。',
          body: 'DueDateHQ 关注运营可见性：哪些客户可能有风险、哪条官方来源支撑规则、哪个州级信号发生变化，以及谁复核了动作。',
          items: [
            {
              title: '带来源的规则',
              body: '规则把官方来源 URL、摘录、验证时间戳和复核状态放在运营动作旁边。',
            },
            {
              title: '事务所上下文',
              body: '客户申报档案、辖区、义务状态、负责人和证据质量会影响分诊。',
            },
            {
              title: '审计历史',
              body: '应用、撤销、回滚和导入工作流都设计为留下可复核的运营记录。',
            },
          ],
        },
        {
          eyebrow: '服务对象',
          title: '面向美国中小型 CPA 团队。',
          body: '产品围绕截止日密集型事务所设计，这些团队通常在表格、收件箱、旧 tracker 和机构网站之间协调申报工作。',
          items: [
            {
              title: '周一分诊',
              body: '错过截止日的风险、剩余天数、证据状态和提醒应能进入短时间周会复核。',
            },
            {
              title: '迁移优先',
              body: '已有客户导出可以成为结构化截止日工作，而不是每个客户重新设置一次。',
            },
            {
              title: '人工复核闸口',
              body: 'AI 可以辅助分类和总结，但来源证据和复核动作仍是控制点。',
            },
          ],
        },
      ],
      contact: {
        title: '联系团队。',
        body: '产品问题、试点和实施适配可以通过公开联系渠道沟通。',
        label: '联系 DueDateHQ',
        href: 'mailto:sales@duedatehq.com?subject=DueDateHQ',
      },
    },
    {
      slug: 'security',
      meta: {
        title: 'DueDateHQ 安全 — 带来源的截止日运营',
        description:
          'DueDateHQ 如何通过租户隔离、认证 app 边界、可复核来源证据、人工复核流程、审计历史、操作留痕和生产安全边界保护截止日运营数据。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '安全',
        title: '截止日风险工作流需要安全边界和证据边界。',
        description:
          'DueDateHQ 区分公开 marketing 页面和认证后的 app，把客户运营留在 SaaS app 域名内，并围绕可复核来源证据设计截止日变更。',
        note: '本页总结产品和运营安全姿态。详细安全评审请联系 DueDateHQ 团队。',
      },
      sections: [
        {
          eyebrow: 'App 边界',
          title: '公开站和 SaaS app 承担不同职责。',
          body: 'Marketing 域名用于公开发现；app 域名用于认证后的事务所工作、租户数据和运营动作。',
          items: [
            {
              title: '认证工作台',
              body: '客户截止日运营位于 app 工作台内，不进入公开 marketing sitemap。',
            },
            {
              title: '租户感知 API',
              body: '受保护业务动作会先经过 session、firm-access、tenant 和 rate-limit middleware。',
            },
            {
              title: 'SEO 页面无客户数据',
              body: '公开页面只解释产品行为和示例，不暴露事务所客户记录。',
            },
          ],
        },
        {
          eyebrow: '运营控制',
          title: '证据和审计轨迹是控制模型的一部分。',
          body: '截止日变化应该可解释。DueDateHQ 把来源上下文、复核状态和动作历史放在工作流附近。',
          items: [
            {
              title: '来源证据',
              body: '规则和提醒保留 source URL、摘录、验证时间戳和复核状态。',
            },
            {
              title: '人工批准',
              body: '候选变化在成为事务所运营前会进入复核。',
            },
            {
              title: '可回滚动作',
              body: '应用、撤销和回滚路径都服务于可复核的运营历史。',
            },
          ],
        },
      ],
      contact: {
        title: '需要安全评审？',
        body: '部署、数据处理和安全评审问题可以联系团队。',
        label: '联系安全团队',
        href: 'mailto:security@duedatehq.com?subject=DueDateHQ%20Security',
      },
    },
    {
      slug: 'privacy',
      meta: {
        title: 'DueDateHQ 隐私 — 公开隐私摘要',
        description:
          'DueDateHQ 面向公开访客和正在评估截止日运营软件的 CPA 事务所说明隐私边界：公开页面不发布客户记录，认证后的 practice 数据留在 app 工作台。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '隐私',
        title: '隐私从区分公开页面和事务所工作开始。',
        description:
          'DueDateHQ 公开页面描述产品能力。认证后的事务所数据属于 app 工作台，不属于公开 SEO surface。',
        note: '本公开摘要不替代签署协议或正式隐私评审。',
      },
      sections: [
        {
          eyebrow: '数据边界',
          title: '公开内容不需要客户记录。',
          body: 'Marketing、resource 和 state coverage 页面解释产品如何工作，但不发布事务所客户数据。',
          items: [
            {
              title: '公开页面',
              body: '公开页面包含产品文案、示例和来源处理说明。',
            },
            {
              title: '认证 app',
              body: '事务所运营、客户记录、申报、证据复核和审计历史属于 app。',
            },
            {
              title: '支持渠道',
              body: '除非已约定安全流程，隐私请求不应通过公开邮件发送敏感客户记录。',
            },
          ],
        },
        {
          eyebrow: 'AI 边界',
          title: 'AI 是辅助工作流层。',
          body: 'DueDateHQ 把 AI 描述为降低运营摩擦的方式，而不是税务事实来源或专业复核替代品。',
          items: [
            {
              title: '来源上下文',
              body: 'AI 辅助总结和分类应保持与来源证据绑定。',
            },
            {
              title: '人工复核',
              body: '运营变化影响客户工作前，人工决定仍是边界。',
            },
            {
              title: '公开声明最小化',
              body: '公开页面避免隐藏数据声明，结构化数据与可见内容保持一致。',
            },
          ],
        },
      ],
      contact: {
        title: '隐私问题。',
        body: '数据处理和隐私评审问题可以通过隐私渠道联系。',
        label: '联系隐私团队',
        href: 'mailto:privacy@duedatehq.com?subject=DueDateHQ%20Privacy',
      },
    },
    {
      slug: 'terms',
      meta: {
        title: 'DueDateHQ 条款 — 公开条款摘要',
        description:
          'DueDateHQ 公开条款摘要说明截止日运营软件的产品边界：产品支持来源复核、迁移、提醒和审计历史，但不替事务所做申报或专业判断。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '条款',
        title: 'DueDateHQ 是面向专业团队的截止日运营软件。',
        description:
          '产品帮助事务所组织带来源的截止日工作、证据复核、提醒监控、迁移和可审计运营历史。',
        note: '本页是公开摘要。合同条款通过 DueDateHQ legal 渠道处理。',
      },
      sections: [
        {
          eyebrow: '使用边界',
          title: '产品支持复核，不替事务所做申报决定。',
          body: 'DueDateHQ 帮助呈现风险和来源上下文。CPA 事务所仍负责专业判断、客户事实和申报决定。',
          items: [
            {
              title: '不提供税务建议',
              body: '公开页面和产品工作流不提供税务、法律、会计或合规建议。',
            },
            {
              title: '来源核验',
              body: '用户应对照官方 IRS 和州税务机关来源核验义务。',
            },
            {
              title: '事务所责任',
              body: '专业用户决定适用性、客户影响和申报动作。',
            },
          ],
        },
        {
          eyebrow: '产品运营',
          title: '截止日工作变化前，复核状态很重要。',
          body: 'DueDateHQ 工作流设计为在运营信号成为事务所工作前保留来源上下文和复核历史。',
          items: [
            {
              title: '候选信号',
              body: '提醒和来源更新在事务所决定处理方式前都是复核工作。',
            },
            {
              title: '迁移输出',
              body: '导入数据在成为可信生产运营前应先复核。',
            },
            {
              title: '可审计性',
              body: '动作应能通过来源、复核者和工作流历史解释。',
            },
          ],
        },
      ],
      contact: {
        title: '需要正式条款？',
        body: '合同和条款问题可以通过 legal 渠道联系。',
        label: '联系法务',
        href: 'mailto:legal@duedatehq.com?subject=DueDateHQ%20Terms',
      },
    },
    {
      slug: 'status',
      meta: {
        title: 'DueDateHQ 状态 — 公开服务状态',
        description:
          'DueDateHQ 公开服务状态摘要，说明 marketing 公开站、认证 app 工作台、提醒来源监控和数据运营工作流如何作为不同 surface 跟踪。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '状态',
        title: '当前公开状态：所有系统正常。',
        description:
          'DueDateHQ 当前区分公开 marketing 站和认证 app。公开发现页面和 app 运营作为不同 surface 维护。',
        note: '具体事故更新请联系 support。本页是当前公开状态摘要。',
      },
      sections: [
        {
          eyebrow: '服务面',
          title: '公开站和 app 分开跟踪。',
          body: 'Marketing 站负责公开发现；app 负责认证后的事务所工作和 API-backed 运营。',
          items: [
            {
              title: 'Marketing 站',
              body: '公开页面、sitemap、robots.txt、llms.txt、canonical URL 和静态 SEO 内容。',
            },
            {
              title: 'App 工作台',
              body: '认证工作台、RPC API、billing、租户运营、队列和受保护工作流。',
            },
            {
              title: '来源监控',
              body: '提醒来源监控和邮件/队列工作流是不同于公开 SEO 页面的一类运营 surface。',
            },
          ],
        },
        {
          eyebrow: '问题报告',
          title: '服务问题通过 support 反馈。',
          body: '支持请求应包含受影响 surface、workspace、时间戳和用户可见影响。',
          items: [
            {
              title: '可用性',
              body: 'app 访问、登录或可用性问题走 support。',
            },
            {
              title: '数据运营',
              body: '迁移、提醒、证据或截止日工作流问题走 support。',
            },
            {
              title: '公开站',
              body: '公开页面、sitemap 或 SEO discovery 问题走 support。',
            },
          ],
        },
      ],
      contact: {
        title: '报告问题。',
        body: '服务状态和事故问题可以通过 support 渠道联系。',
        label: '联系支持',
        href: 'mailto:support@duedatehq.com?subject=DueDateHQ%20Status',
      },
    },
  ],
}

export function getTrustPage(locale: Locale, slug: string): TrustPageCopy | undefined {
  return trustPages[locale].find((page) => page.slug === slug)
}
