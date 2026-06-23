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
  /** Optional signature line shown directly under the hero — a single,
   *  page-defining statement (posture for security, mission for about). */
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
      slug: 'about',
      meta: {
        title: 'About DueDateHQ — Deadline operations for CPA practices',
        description:
          'DueDateHQ helps US CPA practices manage deadline risk with source-backed rules, state filing signals, evidence review, and audit-ready workflow history.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'ABOUT DUEDATEHQ',
        title: 'A missed deadline is rarely a knowledge gap. It is a visibility gap.',
        description:
          'DueDateHQ is built for the US CPA practices that carry hundreds of filing dates across spreadsheets, inboxes, and agency websites — and feel the quiet dread that one of them moved without anyone noticing. We put those deadlines, their official sources, and the clients they touch in one reviewable place.',
        note: 'Public pages describe software workflows and source handling. DueDateHQ does not provide tax, legal, or accounting advice.',
      },
      statement: {
        label: 'Why we built it',
        text: 'Deadline risk should be visible long before it becomes a missed-deadline conversation with a client. That single conviction shapes every part of the product — what we monitor, what we surface, and what we deliberately leave to your judgment.',
      },
      sections: [
        {
          eyebrow: 'PRODUCT BOUNDARY',
          title: 'Software for deadline operations — never a substitute for CPA judgment.',
          body: 'We stay in our lane on purpose. DueDateHQ handles operational visibility: which clients may be at risk, which official source supports a rule, which state signal changed, and who reviewed the action. The call is always yours.',
          items: [
            {
              title: 'Source-backed rules',
              body: 'Every rule carries its official-source URL, the exact excerpt, a verification timestamp, and its review state — right next to the action it drives.',
            },
            {
              title: 'Firm context',
              body: 'Client filing profiles, jurisdictions, obligation status, ownership, and evidence quality shape what surfaces first in triage.',
            },
            {
              title: 'Audit history',
              body: 'Apply, undo, revert, and import each leave a reviewable record — so any decision can be explained months later.',
            },
          ],
        },
        {
          eyebrow: 'WHO IT IS FOR',
          title: 'Built for the small and mid-sized teams that carry the most deadlines.',
          body: 'We design for the deadline-heavy practice that runs filing work across spreadsheets, inboxes, legacy trackers, and a dozen agency websites — the team that does not have a spare analyst to babysit due dates.',
          items: [
            {
              title: 'The Monday review',
              body: 'Missed-deadline risk, days remaining, evidence state, and alerts are shaped to fit a short weekly read — not a research project.',
            },
            {
              title: 'Migration-first setup',
              body: 'Your existing client export becomes structured deadline work in one pass, not a per-client setup project that never ends.',
            },
            {
              title: 'Human review gates',
              body: 'AI helps classify and summarize, but source evidence and a reviewer’s decision stay the control points. Nothing moves on its own.',
            },
          ],
        },
        {
          eyebrow: 'SOURCING & GOVERNANCE',
          title: 'How the rule catalog is sourced, and how we keep it honest.',
          body: 'Our deadline and rule catalog is curated by accounting-operations practitioners against primary sources. Every entry is human-reviewed from candidate to verified before it can ever become reminder-ready — no scraped guesses, no unsourced dates.',
          items: [
            {
              title: 'Primary sources',
              body: "IRS Publication 509, the Internal Revenue Bulletin and IRS form instructions, and each state Department of Revenue's official pages.",
            },
            {
              title: 'Candidate → verified',
              body: 'A rule starts as a source-backed candidate and only becomes reminder-ready after a person has reviewed it. The path is visible, not implied.',
            },
            {
              title: 'Evidence beside the rule',
              body: 'The source URL, the excerpt, and the verification timestamp travel with each rule and alert — so the proof is always one glance away.',
            },
          ],
        },
      ],
      contact: {
        title: 'Talk to the people building it.',
        body: 'Reach the team directly for product questions, pilots, and a candid read on whether we fit your practice. A real person answers.',
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
      slug: 'about',
      meta: {
        title: '关于 DueDateHQ — 面向 CPA 事务所的截止日运营',
        description:
          'DueDateHQ 帮助美国 CPA 事务所用带来源的规则、州级申报信号、证据复核、客户上下文、负责人分工和可审计工作流持续管理截止日风险。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '关于 DueDateHQ',
        title: '错过截止日，往往不是不知道，而是没看见。',
        description:
          'DueDateHQ 面向那些在表格、收件箱和一堆机构网站之间，背着成百上千个申报日期的美国 CPA 事务所——也面向那份隐隐的担心：会不会有一个日期已经变了，却没人发现。我们把这些截止日、它们的官方来源、以及它们影响到的客户，放进同一个可复核的地方。',
        note: '公开页面说明软件工作流和来源处理方式。DueDateHQ 不提供税务、法律或会计建议。',
      },
      statement: {
        label: '我们为什么做这件事',
        text: '截止日风险应该在它变成「要跟客户解释为什么错过」之前，就已经看得见。正是这一个信念，决定了产品的每一处——我们监控什么、把什么呈现出来，以及哪些事我们有意留给你的判断。',
      },
      sections: [
        {
          eyebrow: '产品边界',
          title: '这是截止日运营软件，永远不替代 CPA 专业判断。',
          body: '我们有意守在自己的位置。DueDateHQ 负责运营可见性：哪些客户可能有风险、哪条官方来源支撑规则、哪个州级信号发生了变化、谁复核了动作。最终的判断，永远在你手里。',
          items: [
            {
              title: '带来源的规则',
              body: '每条规则都带着官方来源 URL、原文摘录、验证时间戳和复核状态——就放在它驱动的那个动作旁边。',
            },
            {
              title: '事务所上下文',
              body: '客户申报档案、辖区、义务状态、负责人和证据质量，决定了分诊时什么先浮上来。',
            },
            {
              title: '审计历史',
              body: '应用、撤销、回滚和导入都各自留下可复核的记录——几个月后，任何一个决定都还解释得清楚。',
            },
          ],
        },
        {
          eyebrow: '服务对象',
          title: '为背着最多截止日的中小团队而建。',
          body: '我们为截止日密集型事务所设计——那些在表格、收件箱、旧 tracker 和一打机构网站之间协调申报、又没有多余人手专门盯日期的团队。',
          items: [
            {
              title: '周一那次复核',
              body: '错过截止日的风险、剩余天数、证据状态和提醒，都打磨成能在一次短会里读完的样子，而不是一个调研项目。',
            },
            {
              title: '迁移优先',
              body: '已有的客户导出，一次就变成结构化截止日工作——而不是每个客户重设一遍、永远做不完的项目。',
            },
            {
              title: '人工复核闸口',
              body: 'AI 帮忙分类和总结，但来源证据和复核者的决定始终是控制点。没有什么会自己动起来。',
            },
          ],
        },
        {
          eyebrow: '来源与治理',
          title: '规则目录如何取源，又如何守住可信。',
          body: '我们的截止日与规则目录，由会计运营实践者对照一手来源整理。每一条都经人工从候选复核到已核验，之后才可能进入可提醒状态——没有抓取来的猜测，也没有无来源的日期。',
          items: [
            {
              title: '一手来源',
              body: 'IRS Publication 509、Internal Revenue Bulletin 与 IRS 表格说明，以及各州 Department of Revenue 的官方页面。',
            },
            {
              title: '候选 → 已核验',
              body: '规则从带来源的候选项开始，只有经人复核后才成为可提醒工作。这条路径是看得见的，不是默认发生的。',
            },
            {
              title: '证据留在规则旁',
              body: '来源链接、原文摘录和核验时间戳，始终跟着每条规则与提醒走——证据永远在一眼之内。',
            },
          ],
        },
      ],
      contact: {
        title: '直接找做这件事的人聊聊。',
        body: '产品问题、试点，还是想听一句关于是否合适的实话，都可以直接联系团队。回你的是真人。',
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
