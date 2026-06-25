import type { Locale } from '@duedatehq/i18n/locales'

import type { MetaCopy } from '../i18n/types'

export const trustPageSlugs = ['security', 'privacy', 'terms', 'status'] as const

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
  /** Optional signature line shown directly under the hero — a single,
   *  page-defining statement (e.g. the security posture). */
  statement?: {
    label: string
    text: string
  }
  sections: {
    eyebrow: string
    title: string
    body: string
    items: { title: string; body: string }[]
  }[]
  /** Optional FAQ — renders a visible accordion + an FAQPage JSON-LD node. */
  faq?: { question: string; answer: string }[]
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
      slug: 'security',
      meta: {
        title: 'DueDateHQ Security — Source-backed deadline operations',
        description:
          'How DueDateHQ protects CPA deadline operations: tenant isolation, a source on every date, human-approved changes, audit history, and security-review support.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'SECURITY',
        title:
          'Two boundaries hold the product together: who can reach your data, and what stands behind every date.',
        description:
          'DueDateHQ keeps the public marketing site fully separate from the authenticated app, holds all client operations behind the SaaS app domain, and designs every deadline change around source evidence you can review yourself. Security here is not a badge — it is how the workflow is shaped.',
        note: 'This page summarizes our product and operational security posture in plain terms. Deeper security reviews and documentation are handled directly with the DueDateHQ team.',
      },
      statement: {
        label: 'Our posture',
        text: 'We earn trust the same way we ask you to: with evidence, not assertions. Nothing changes a client deadline on its own, every action is reversible and recorded, and we make no security claim on this page that the product does not actually do.',
      },
      sections: [
        {
          eyebrow: 'ACCESS BOUNDARY',
          title: 'The public site and the app are deliberately different places.',
          body: 'The marketing domain exists for public discovery. The app domain exists for authenticated practice work, tenant data, and operational actions — and the two never share a surface.',
          items: [
            {
              title: 'Authenticated workspace',
              body: 'Client deadline operations live entirely inside the app workspace — never in the public marketing sitemap, robots, or SEO surface.',
            },
            {
              title: 'Tenant-aware API',
              body: 'Every protected action passes through session, firm-access, tenant, and rate-limit middleware before it can touch business data.',
            },
            {
              title: 'No client data on public pages',
              body: 'Public pages explain how the product behaves using examples — they do not, and structurally cannot, expose a practice’s client records.',
            },
          ],
        },
        {
          eyebrow: 'EVIDENCE BOUNDARY',
          title: 'Audit trails and source evidence are the control model — not an afterthought.',
          body: 'A deadline change you cannot explain is a deadline change you cannot trust. We keep source context, reviewer state, and action history right inside the workflow, so any change can be defended later.',
          items: [
            {
              title: 'Source on every date',
              body: 'Rules and alerts carry the source URL, the exact excerpt, a verification timestamp, and review status — the proof travels with the change.',
            },
            {
              title: 'Human approval gate',
              body: 'A candidate change cannot become firm operations until a person reviews and approves it. There is no silent auto-apply path.',
            },
            {
              title: 'Reversible by design',
              body: 'Apply, undo, and revert are built for a clean, reviewable history — a mistake is recoverable, and the recovery is recorded too.',
            },
          ],
        },
        {
          eyebrow: 'DATA BOUNDARY',
          title: 'We hold the deadlines and their evidence — not your whole practice.',
          body: 'DueDateHQ layers on the systems you already run. We keep the filing dates, the official sources behind them, and the review history a deadline workflow needs — and leave documents, returns, and billing to the tools you already trust.',
          items: [
            {
              title: 'Scoped to deadline operations',
              body: 'We store rules, dates, source evidence, and review and audit history — not client documents, completed returns, or engagement files.',
            },
            {
              title: 'Layered, not a system of record',
              body: 'DueDateHQ sits alongside TaxDome, Karbon, or whatever you already run. It does not pull in their data or try to replace them.',
            },
            {
              title: 'Isolated per firm',
              body: 'Every record is scoped to your workspace and tenant — nothing is shared across practices, and nothing is surfaced on a public page.',
            },
          ],
        },
        {
          eyebrow: 'ACCOUNT BOUNDARY',
          title: 'Getting in is deliberate, and staying scoped is automatic.',
          body: 'Access is controlled at the account, the firm, and the request — so reaching any business data takes a signed-in person with the right firm membership, every time.',
          items: [
            {
              title: 'Sign in with Google',
              body: 'Accounts authenticate through Google — there is no separate DueDateHQ password for us to store, reset, or leak.',
            },
            {
              title: 'Owner-controlled billing',
              body: 'Only a practice owner can start or change a paid plan, and we never store card numbers — payments run through our payment processor.',
            },
            {
              title: 'Least access by default',
              body: 'Members see plan status and shared work — not billing or other practices. Access is granted per firm, not across the platform.',
            },
          ],
        },
      ],
      faq: [
        {
          question: 'Where does my client data live, and is any of it on public pages?',
          answer:
            'All client deadline operations live inside the authenticated app workspace, isolated per firm. The public marketing pages contain product copy and examples only — by design they never expose a practice’s client records.',
        },
        {
          question: 'Can a deadline change apply on its own?',
          answer:
            'No. A candidate change cannot become firm operations until a person reviews and approves it. Apply, undo, and revert are all recorded, so every change can be explained later.',
        },
        {
          question: 'How do people sign in, and who can change billing?',
          answer:
            'Accounts authenticate through Google — there is no separate DueDateHQ password for us to store. Only a practice owner can start or change a paid plan, and we never store card numbers.',
        },
        {
          question: 'Can you support a security review?',
          answer:
            'Yes. Reach the team for deployment details, data handling, and security-questionnaire support — we would rather show you than tell you.',
        },
      ],
      contact: {
        title: 'Running a security review?',
        body: 'Reach the team directly for deployment details, data handling, and security questionnaire support. We would rather show you than tell you.',
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
        title: 'Privacy begins with a structural choice: public pages never touch practice data.',
        description:
          'These public pages describe what the product can do. Your authenticated practice data lives in the app workspace and is never part of the public SEO surface — that separation is built in, not promised.',
        note: 'This public summary is not a replacement for a signed agreement or a formal privacy review.',
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
        title: 'Have a privacy question?',
        body: 'Reach the privacy channel for data-handling and privacy-review questions. Please do not send sensitive client records over public email.',
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
        title:
          'DueDateHQ is deadline operations software — a tool for professionals, not a decision-maker.',
        description:
          'The product helps a practice organize source-backed deadline work, evidence review, Alerts monitoring, migration, and an audit-ready operational history. What it does not do is just as important as what it does.',
        note: 'This page is a plain-language public summary. Contractual terms are handled through the DueDateHQ legal channel.',
      },
      sections: [
        {
          eyebrow: 'USE BOUNDARY',
          title: 'The product supports your review; it never makes the filing decision for you.',
          body: 'DueDateHQ surfaces risk and source context. The CPA practice stays responsible for professional judgment, the client’s facts, and every filing decision. We are the instrument panel, not the pilot.',
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
        title: 'Current status: all systems operating normally.',
        description:
          'DueDateHQ tracks the public marketing site and the authenticated app as distinct surfaces, so an issue on one is never an issue everywhere. This page is the current public status summary.',
        note: 'For incident-specific updates, contact support. We keep this page honest and current.',
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
      slug: 'security',
      meta: {
        title: 'DueDateHQ 安全 — 带来源的截止日运营',
        description:
          'DueDateHQ 如何通过租户隔离、认证 app 边界、可复核来源证据、人工复核流程、审计历史、操作留痕和生产安全边界保护截止日运营数据。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '安全',
        title: '两条边界撑起整个产品：谁能碰到你的数据，以及每个日期背后站着什么。',
        description:
          'DueDateHQ 把公开 marketing 站和认证后的 app 完全分开，把全部客户运营留在 SaaS app 域名内，并围绕你能亲自复核的来源证据设计每一次截止日变更。这里的安全不是一枚徽章，而是工作流本身的形状。',
        note: '本页用平实的话总结产品和运营安全姿态。更深入的安全评审与文档，直接与 DueDateHQ 团队对接。',
      },
      statement: {
        label: '我们的姿态',
        text: '我们用要求你的同一种方式赢得信任：靠证据，不靠声明。没有什么会自行改动客户截止日，每个动作都可回滚、可记录，本页上也不会出现产品其实做不到的任何安全说法。',
      },
      sections: [
        {
          eyebrow: '访问边界',
          title: '公开站和 app，是被有意分开的两个地方。',
          body: 'Marketing 域名为公开发现而存在；app 域名为认证后的事务所工作、租户数据和运营动作而存在——两者从不共用一个 surface。',
          items: [
            {
              title: '认证工作台',
              body: '客户截止日运营完全位于 app 工作台内——不进入公开 marketing sitemap、robots 或 SEO surface。',
            },
            {
              title: '租户感知 API',
              body: '每个受保护动作都要先经过 session、firm-access、tenant 和 rate-limit middleware，才能碰到业务数据。',
            },
            {
              title: '公开页面无客户数据',
              body: '公开页面用示例解释产品如何运作——在结构上就不会、也无法暴露事务所的客户记录。',
            },
          ],
        },
        {
          eyebrow: '证据边界',
          title: '审计轨迹和来源证据就是控制模型，不是事后补的。',
          body: '一个你解释不清的截止日变化，就是一个你信不过的变化。我们把来源上下文、复核状态和动作历史放进工作流本身，让任何一次变更日后都站得住。',
          items: [
            {
              title: '每个日期都有来源',
              body: '规则和提醒都带着 source URL、原文摘录、验证时间戳和复核状态——证据跟着变更一起走。',
            },
            {
              title: '人工批准闸口',
              body: '候选变化在有人复核并批准之前，不会成为事务所运营。没有悄悄自动应用的路径。',
            },
            {
              title: '为可回滚而设计',
              body: '应用、撤销、回滚都为干净、可复核的历史而建——出了错可以恢复，连恢复本身也会被记录。',
            },
          ],
        },
        {
          eyebrow: '数据边界',
          title: '我们保管的是截止日和它们的证据——不是你的整个事务所。',
          body: 'DueDateHQ 装在你已有的系统之上。我们保留截止日工作流需要的申报日期、背后的官方来源和复核历史——把文档、报税表和开票留给你本来就信任的工具。',
          items: [
            {
              title: '只聚焦截止日运营',
              body: '我们存的是规则、日期、来源证据，以及复核与审计历史——不存客户文档、已完成的报税表或业务底稿。',
            },
            {
              title: '叠加，而非系统底座',
              body: 'DueDateHQ 与 TaxDome、Karbon 或你现有的工具并行；它不会读取它们的数据，也不试图取代它们。',
            },
            {
              title: '按事务所隔离',
              body: '每条记录都限定在你的工作区和租户内——不跨事务所共享，也不会出现在任何公开页面上。',
            },
          ],
        },
        {
          eyebrow: '账户边界',
          title: '进来是刻意为之的，而留在权限范围内是自动的。',
          body: '访问在账户、事务所和每一次请求三个层面被控制——要碰到任何业务数据，都需要一个已登录、且具备相应事务所成员身份的人，每次都是。',
          items: [
            {
              title: '用 Google 登录',
              body: '账户通过 Google 认证——没有单独的 DueDateHQ 密码需要我们去存储、重置或泄露。',
            },
            {
              title: '计费由所有者掌控',
              body: '只有事务所所有者能开通或变更付费套餐，而且我们从不存储卡号——支付通过支付服务商完成。',
            },
            {
              title: '默认最小权限',
              body: '成员看到的是套餐状态和共享工作，而非计费或其他事务所；权限按事务所授予，而非平台级。',
            },
          ],
        },
      ],
      faq: [
        {
          question: '我的客户数据存在哪里？公开页面上会有吗？',
          answer:
            '所有客户截止日运营都在已认证的 app 工作区内，并按事务所隔离。公开营销页面只包含产品说明和示例——设计上绝不暴露事务所的客户记录。',
        },
        {
          question: '截止日变化会自动生效吗？',
          answer:
            '不会。候选变化必须经人工复核并批准，才会成为事务所运营工作。apply、undo、revert 都会被记录，任何变更日后都能解释清楚。',
        },
        {
          question: '如何登录？谁能更改账单？',
          answer:
            '账户通过 Google 登录——我们不会存储单独的 DueDateHQ 密码。只有事务所 owner 能开通或变更付费套餐，而且我们从不保存卡号。',
        },
        {
          question: '能配合安全评审吗？',
          answer:
            '可以。就部署细节、数据处理和安全问卷支持联系团队——比起讲给你听，我们更愿意做给你看。',
        },
      ],
      contact: {
        title: '正在做安全评审？',
        body: '部署细节、数据处理和安全问卷支持，都可以直接联系团队。比起讲给你听，我们更愿意做给你看。',
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
        title: '隐私从一个结构上的选择开始：公开页面永远不碰事务所数据。',
        description:
          '这些公开页面描述产品能做什么。你认证后的事务所数据留在 app 工作台，永远不属于公开 SEO surface——这道分隔是built-in 的，不是承诺出来的。',
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
        title: '有隐私问题？',
        body: '数据处理和隐私评审问题可以通过隐私渠道联系。请不要通过公开邮件发送敏感客户记录。',
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
        title: 'DueDateHQ 是截止日运营软件——一件给专业人士用的工具，而不是替你做决定的人。',
        description:
          '产品帮助事务所组织带来源的截止日工作、证据复核、提醒监控、迁移和可审计运营历史。它不做什么，和它做什么一样重要。',
        note: '本页是平实的公开摘要。合同条款通过 DueDateHQ legal 渠道处理。',
      },
      sections: [
        {
          eyebrow: '使用边界',
          title: '产品支持你的复核，永远不替你做申报决定。',
          body: 'DueDateHQ 帮助呈现风险和来源上下文。CPA 事务所仍负责专业判断、客户事实和每一个申报决定。我们是仪表盘，不是飞行员。',
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
        title: '当前状态：所有系统运行正常。',
        description:
          'DueDateHQ 把公开 marketing 站和认证 app 当作不同 surface 跟踪，所以一处出问题，从不等于处处出问题。本页是当前公开状态摘要。',
        note: '具体事故更新请联系 support。我们让这一页保持诚实、保持最新。',
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
