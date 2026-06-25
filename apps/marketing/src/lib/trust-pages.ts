import type { Locale } from '@duedatehq/i18n/locales'

import type { MetaCopy } from '../i18n/types'

export const trustPageSlugs = ['security', 'privacy', 'terms', 'status', 'about'] as const

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
          'How DueDateHQ protects deadline operations with tenant isolation, reviewable source evidence, audit history, and production security boundaries.',
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
    {
      slug: 'about',
      meta: {
        title: 'About DueDateHQ — deadline-change monitoring for CPA practices',
        description:
          'What DueDateHQ is, how it watches official IRS, state, and FEMA sources, why every deadline traces to its source, and what it deliberately is not.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'ABOUT',
        title:
          'We watch the official sources so a moved deadline never reaches your clients unseen.',
        description:
          'DueDateHQ is deadline-change monitoring for US CPA practices. We watch official IRS, state tax-agency, and FEMA sources around the clock, catch when a filing deadline or rule moves, and show exactly which of a firm’s clients each change affects — with the official source on every date.',
        note: 'This page explains who we are and how the product works. It is not tax advice.',
      },
      statement: {
        label: 'Why we exist',
        text: 'The deadline that hurts a practice is the one nobody saw move. We built DueDateHQ so a change at the source reaches the right clients as reviewable, source-backed work — not as a surprise in April.',
      },
      sections: [
        {
          eyebrow: 'WHAT WE DO',
          title: 'One loop, around the clock: watch, match, rank, apply.',
          body: 'DueDateHQ runs a single monitoring loop on top of the tools a firm already uses — it does not replace them.',
          items: [
            {
              title: 'Watch official sources',
              body: 'We monitor public IRS, state Department of Revenue, and FEMA relief sources across all 50 states and DC for deadline and rule changes.',
            },
            {
              title: 'Match to your clients',
              body: 'Each source-backed change is matched against firm filing profiles so you see which clients it actually affects.',
            },
            {
              title: 'Rank and apply with a source',
              body: 'The week is ranked by client risk, and every applied change carries its official source and a reviewable audit trail.',
            },
          ],
        },
        {
          eyebrow: 'HOW WE KNOW IT IS RIGHT',
          title: 'Evidence first — we never invent a date.',
          body: 'Authority here comes from sources, not assertions. Anything that cannot be grounded in official text is held for review rather than guessed.',
          items: [
            {
              title: 'Source on every date',
              body: 'Every rule and alert keeps its official source URL, the exact excerpt, and a verification timestamp.',
            },
            {
              title: 'Human review gate',
              body: 'A candidate change becomes client work only after a person reviews and approves it — there is no silent auto-apply.',
            },
            {
              title: 'Audit-ready history',
              body: 'Apply, undo, and revert all leave an inspectable record, so any change can be explained later.',
            },
          ],
        },
        {
          eyebrow: 'WHAT WE ARE NOT',
          title: 'Deliberately narrow, by design.',
          body: 'DueDateHQ is a monitoring layer, not a system of record. Staying narrow is what lets it sit alongside your existing stack.',
          items: [
            {
              title: 'Not tax advice',
              body: 'We surface official sources and client context; applicability and professional judgment stay with the firm.',
            },
            {
              title: 'Not a filing system',
              body: 'We do not file returns or store completed engagement files — we watch the dates and the rules behind them.',
            },
            {
              title: 'Not a full practice suite',
              body: 'We layer on top of Drake, UltraTax, TaxDome, or Karbon instead of replacing them.',
            },
          ],
        },
        {
          eyebrow: 'COVERAGE',
          title: 'Federal plus all 50 states and DC.',
          body: 'We monitor official tax-authority sources nationwide, with source-backed review before any change becomes reminder-ready work.',
          items: [
            {
              title: 'Federal',
              body: 'IRS filing-calendar rules, form instructions, official notices, and disaster relief.',
            },
            {
              title: 'State + DC',
              body: 'Public Department of Revenue sources across all 50 states and the District of Columbia.',
            },
            {
              title: 'Relief events',
              body: 'FEMA and IRS disaster postponements that move deadlines for affected clients.',
            },
          ],
        },
      ],
      contact: {
        title: 'Talk to the team.',
        body: 'Questions about coverage, sources, or how DueDateHQ fits your practice? We are happy to walk through it.',
        label: 'Contact us',
        href: 'mailto:sales@duedatehq.com?subject=DueDateHQ',
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
    {
      slug: 'about',
      meta: {
        title: '关于 DueDateHQ — 面向 CPA 事务所的截止日变化监控',
        description:
          'DueDateHQ 是什么、如何监控官方 IRS、各州与 FEMA 来源、为何每个截止日都可追溯到来源，以及它刻意不做什么。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '关于',
        title: '我们替你盯着官方来源，让变动的截止日不会无声地落到客户身上。',
        description:
          'DueDateHQ 是面向美国 CPA 事务所的截止日变化监控。我们全天候监控官方 IRS、各州税务机关与 FEMA 来源，在申报截止日或规则变动时第一时间抓住，并精确显示它影响到事务所的哪些客户——每个日期都附官方来源。',
        note: '本页说明我们是谁、产品如何运作，不提供税务建议。',
      },
      statement: {
        label: '为何而做',
        text: '真正伤害事务所的，是那条没人看见在变动的截止日。我们做 DueDateHQ，是为了让来源处的变化以可复核、带来源的工作形式抵达对应客户——而不是在四月变成一个意外。',
      },
      sections: [
        {
          eyebrow: '我们做什么',
          title: '一个闭环，全天候：监控、匹配、排序、应用。',
          body: 'DueDateHQ 在事务所已有工具之上运行一个监控闭环——它不替换这些工具。',
          items: [
            {
              title: '监控官方来源',
              body: '我们监控全部 50 州加 DC 的公开 IRS、州税务局与 FEMA 救济来源，捕捉截止日与规则变化。',
            },
            {
              title: '匹配到你的客户',
              body: '每条带来源的变化都会与事务所的客户申报档案匹配，让你看清它真正影响哪些客户。',
            },
            {
              title: '带来源地应用',
              body: '一周按客户风险排序，每次应用的变更都附带官方来源和可复核的审计历史。',
            },
          ],
        },
        {
          eyebrow: '我们如何确保正确',
          title: '证据优先——我们绝不编造日期。',
          body: '这里的权威来自来源，而非断言。任何无法落实到官方原文的内容都会先进入复核，而不是猜测。',
          items: [
            {
              title: '每个日期都附来源',
              body: '每条规则和提醒都保留官方来源 URL、精确摘录和验证时间戳。',
            },
            {
              title: '人工复核门槛',
              body: '候选变化必须经人工复核批准才会成为客户工作——没有静默自动应用。',
            },
            {
              title: '可审计的历史',
              body: 'Apply、undo、revert 都留下可检查的记录，任何变更日后都能解释清楚。',
            },
          ],
        },
        {
          eyebrow: '我们不做什么',
          title: '刻意做窄，是设计选择。',
          body: 'DueDateHQ 是监控层，不是 system of record。保持窄，正是它能与你现有系统并行的原因。',
          items: [
            {
              title: '不是税务建议',
              body: '我们呈现官方来源和客户上下文；适用性与专业判断仍归事务所。',
            },
            {
              title: '不是报税系统',
              body: '我们不报税、不存储已完成的 engagement 文件——我们盯的是日期和背后的规则。',
            },
            {
              title: '不是完整 practice suite',
              body: '我们叠加在 Drake、UltraTax、TaxDome 或 Karbon 之上，而不是替换它们。',
            },
          ],
        },
        {
          eyebrow: '覆盖范围',
          title: '联邦加全部 50 州与 DC。',
          body: '我们在全国范围监控官方税务机关来源，任何变化在成为提醒就绪工作前都经过带来源的复核。',
          items: [
            {
              title: '联邦',
              body: 'IRS 申报日历规则、表格说明、官方通知和灾害救济。',
            },
            {
              title: '州 + DC',
              body: '覆盖全部 50 州和哥伦比亚特区的公开 Department of Revenue 来源。',
            },
            {
              title: '救济事件',
              body: '为受影响客户移动截止日的 FEMA 与 IRS 灾害延期。',
            },
          ],
        },
      ],
      contact: {
        title: '联系团队。',
        body: '关于覆盖范围、来源，或 DueDateHQ 如何契合你的事务所有疑问？我们很乐意为你逐一讲解。',
        label: '联系我们',
        href: 'mailto:sales@duedatehq.com?subject=DueDateHQ',
      },
    },
  ],
}

export function getTrustPage(locale: Locale, slug: string): TrustPageCopy | undefined {
  return trustPages[locale].find((page) => page.slug === slug)
}
