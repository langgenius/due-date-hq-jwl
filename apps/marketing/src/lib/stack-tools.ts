/**
 * "Works with your stack" — the tools a US CPA practice already runs, grouped by
 * the job they do, plus the deadline-change layer DueDateHQ adds on top of each.
 *
 * Honesty rules (docs: only-show-shipped + no-fiction + compare-page policy):
 *  - `role` describes each tool by its PUBLIC positioning only. Never claims a
 *    competitor's private capability.
 *  - The shared "gap" line per group uses the site's hedged phrasing
 *    ("not its focus"), a CATEGORY statement — not an assertion that a specific
 *    product cannot do something.
 *  - The DueDateHQ side (`layersOn`) only describes SHIPPED capability: watching
 *    official IRS/state sources for deadline & rule changes and routing each,
 *    with the source attached, to the clients it affects.
 *  - `compareSlug` / `guideSlug` point only at pages that actually exist
 *    (see seo-content.ts comparisonSpecs + guide slugs).
 */
type Locale = 'en' | 'zh-CN'

export interface StackTool {
  name: string
  /** Public positioning, one line. */
  role: string
  roleZh: string
  /** Existing /compare/<slug> page, if we publish one for this product. */
  compareSlug?: string
  /** Existing /guides/<slug> page, if one is the better destination. */
  guideSlug?: string
}

export interface StackGroup {
  id: string
  /** What this class of tool is for. */
  title: string
  titleZh: string
  /** The shared, hedged gap this category leaves — stated once per group. */
  gap: string
  gapZh: string
  /** What DueDateHQ adds on top of anything in this group (shipped only). */
  layersOn: string
  layersOnZh: string
  tools: StackTool[]
}

export const STACK_GROUPS: StackGroup[] = [
  {
    id: 'practice-management',
    title: 'Practice management & workflow suites',
    titleZh: 'Practice management 与工作流套件',
    gap: 'These run your jobs, tasks, and client work. Watching official IRS and state sources for the deadline and rule changes that move those jobs is not their focus.',
    gapZh: '这类工具负责运行你的任务、job 和客户工作。而监控官方 IRS 与各州来源、捕捉会牵动这些 job 的截止日与规则变化，并不是它们的重点。',
    layersOn:
      'DueDateHQ sits above your suite: it monitors the official sources, and when a deadline or rule changes it shows exactly which clients are affected — with the source attached — so you can act inside whatever workflow you already run.',
    layersOnZh:
      'DueDateHQ 叠加在你的套件之上：它监控官方来源，一旦截止日或规则发生变化，就精确显示哪些客户受影响（并附上来源），你仍在自己现有的工作流里处理。',
    tools: [
      {
        name: 'TaxDome',
        role: 'All-in-one client portal, organizers, documents, payments, and workflow.',
        roleZh: '一体化客户门户、organizer、文档、支付与工作流。',
        compareSlug: 'taxdome-deadline-operations',
      },
      {
        name: 'Canopy',
        role: 'Cloud practice-management suite with client management, workflow, and a portal.',
        roleZh: '带客户管理、工作流与门户的云端 practice-management 套件。',
        compareSlug: 'canopy-deadline-operations',
      },
      {
        name: 'Karbon',
        role: 'Collaborative accounting work management with email and team visibility.',
        roleZh: '带邮件协作与团队可视化的会计 work management 平台。',
        compareSlug: 'karbon-deadline-operations',
      },
      {
        name: 'Financial Cents',
        role: 'Workflow and client management focused on recurring tasks and follow-up.',
        roleZh: '聚焦周期性任务与客户跟进的工作流与客户管理工具。',
        compareSlug: 'financial-cents-deadline-operations',
      },
      {
        name: 'Jetpack Workflow',
        role: 'Recurring client jobs from a template library, with team workload visibility.',
        roleZh: '用模板库标准化周期性客户 job，并掌握团队工作量。',
        compareSlug: 'jetpack-workflow-deadline-operations',
      },
      {
        name: 'Aero Workflow',
        role: 'Procedures library turned into assigned, time-tracked client tasks.',
        roleZh: '把流程库转成可分派、可计时的客户任务。',
        compareSlug: 'aero-workflow-deadline-operations',
      },
      {
        name: 'Keeper',
        role: 'Month-end close and bookkeeping workflow with client-facing review.',
        roleZh: '带客户端复核的月末结账与记账工作流。',
        compareSlug: 'keeper-deadline-operations',
      },
    ],
  },
  {
    id: 'tax-preparation',
    title: 'Tax preparation software',
    titleZh: '报税软件',
    gap: 'These prepare and file the returns. Monitoring the source-side deadline and rule changes that decide what is due, and when, is not their focus.',
    gapZh: '这类工具负责准备和提交申报表。而监控来源侧的截止日与规则变化——决定什么该报、何时报——并不是它们的重点。',
    layersOn:
      'DueDateHQ is the monitoring layer, not a filing engine: it catches the federal and state deadline and rule changes at the official source and routes each to the affected clients, so nothing reaches your prep software as a surprise.',
    layersOnZh:
      'DueDateHQ 是监控层，不是报税引擎：它在官方来源处捕捉联邦与州的截止日与规则变化，并路由到受影响的客户，让任何变化都不会突然出现在你的报税软件里。',
    tools: [
      {
        name: 'UltraTax CS',
        role: 'Thomson Reuters professional tax preparation and compliance software.',
        roleZh: 'Thomson Reuters 的专业报税与合规软件。',
      },
      {
        name: 'CCH Axcess Tax',
        role: 'Wolters Kluwer cloud tax preparation and firm compliance platform.',
        roleZh: 'Wolters Kluwer 的云端报税与事务所合规平台。',
      },
      {
        name: 'Lacerte',
        role: 'Intuit professional tax software for complex returns.',
        roleZh: 'Intuit 面向复杂申报的专业报税软件。',
      },
      {
        name: 'ProConnect Tax',
        role: 'Intuit cloud-based professional tax preparation.',
        roleZh: 'Intuit 云端专业报税工具。',
      },
      {
        name: 'Drake Tax',
        role: 'All-in-one professional tax preparation software for firms.',
        roleZh: '面向事务所的一体化专业报税软件。',
      },
    ],
  },
  {
    id: 'bookkeeping',
    title: 'Bookkeeping & general ledger',
    titleZh: '记账与总账',
    gap: 'These hold the books and the client roster. Turning an official deadline change into "here are the clients it affects" is not their focus.',
    gapZh: '这类工具承载账本和客户名册。而把一次官方截止日变化转成“这是受影响的客户”，并不是它们的重点。',
    layersOn:
      'DueDateHQ reads your client context and maps each source-side change to the specific clients on your list — so a QuickBooks or Xero roster becomes a triage queue when the IRS or a state moves a date.',
    layersOnZh:
      'DueDateHQ 读取你的客户上下文，把每次来源侧变化映射到名单上的具体客户——当 IRS 或某个州调整日期时，QuickBooks 或 Xero 上的名册就变成一条分诊队列。',
    tools: [
      {
        name: 'QuickBooks Online',
        role: 'The most widely used small-business bookkeeping and GL platform.',
        roleZh: '使用最广的小企业记账与总账平台。',
        guideSlug: 'deadline-monitoring-for-quickbooks-firms',
      },
      {
        name: 'Xero',
        role: 'Cloud accounting and bookkeeping for small businesses and firms.',
        roleZh: '面向小企业与事务所的云端会计与记账工具。',
      },
    ],
  },
  {
    id: 'deadline-trackers',
    title: 'Narrow deadline trackers',
    titleZh: '窄范围截止日跟踪器',
    gap: 'These track due dates from lists you maintain. Watching the official sources for changes to those dates — and attaching the evidence — is not their focus.',
    gapZh: '这类工具从你维护的清单里跟踪截止日。而监控官方来源、捕捉这些日期的变化并附上证据，并不是它们的重点。',
    layersOn:
      'DueDateHQ starts one step upstream: instead of a date list you keep current by hand, it watches the IRS and state sources for the change itself, attaches the source excerpt, and routes it to the affected clients for review.',
    layersOnZh:
      'DueDateHQ 从更上游一步开始：不是一张需要你手动维护的日期清单，而是直接监控 IRS 与各州来源、捕捉变化本身，附上来源摘录，并路由到受影响的客户等待复核。',
    tools: [
      {
        name: 'File In Time',
        role: 'Deadline tracking built around due-date lists.',
        roleZh: '围绕截止日清单构建的截止日跟踪工具。',
        compareSlug: 'file-in-time-alternative',
      },
    ],
  },
]

export interface StackToolLink {
  href: string
  label: string
}

/** Resolve a tool's best internal destination (compare page > guide page), or null. */
export function stackToolLink(tool: StackTool, locale: Locale): StackToolLink | null {
  const base = locale === 'zh-CN' ? '/zh-CN' : ''
  if (tool.compareSlug) {
    return {
      href: `${base}/compare/${tool.compareSlug}`,
      label: locale === 'zh-CN' ? `对比 ${tool.name}` : `Compare with ${tool.name}`,
    }
  }
  if (tool.guideSlug) {
    return {
      href: `${base}/guides/${tool.guideSlug}`,
      label: locale === 'zh-CN' ? `${tool.name} 指南` : `${tool.name} guide`,
    }
  }
  return null
}
