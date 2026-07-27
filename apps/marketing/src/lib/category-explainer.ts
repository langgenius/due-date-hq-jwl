/**
 * Category-definition ("what is …") pages — the GEO pillar that lets DueDateHQ
 * own the term an AI answer engine uses. Two deliberately distinct pages, not
 * name-swaps (docs/dev-file/13 §5 thin-content rule):
 *
 *   deadline-monitoring    — the DATES axis: active monitoring vs passive
 *                            due-date tracking/lists. Owns "monitors IRS
 *                            deadline changes".
 *   rule-change-monitoring — the RULES superset: a moved deadline is one kind
 *                            of rule change (also new forms, thresholds,
 *                            eligibility, disaster relief). Owns "IRS / state
 *                            filing change alerts".
 *
 * Each cross-links the other. Copy states shipped capability only and stays
 * inside the §1.2 honesty rails: monitoring across 50 states + DC (true, lean
 * in); deep multi-agency in CA/NY/TX/FL/WA/MA; candidates require review; add-on
 * layer, never a replacement. No dollars-at-risk, no integration/API/mobile
 * claims, no "AI", no "radar".
 */
type Locale = 'en' | 'zh-CN'

export type CategoryPageKey = 'deadline-monitoring' | 'rule-change-monitoring'

export interface CategorySection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface CategoryCompareRow {
  axis: string
  passive: string
  active: string
}

export interface CategoryFaqItem {
  question: string
  answer: string
}

export interface CategoryLink {
  href: string // locale-less path; the component prefixes /zh-CN
  label: string
}

export interface CategoryContent {
  slug: string
  eyebrow: string
  title: string
  lead: string
  term: string
  definition: string
  sections: CategorySection[]
  compare?: {
    caption: string
    passiveLabel: string
    activeLabel: string
    rows: CategoryCompareRow[]
  }
  crosslink: { lead: string; link: CategoryLink }
  relatedHeading: string
  related: CategoryLink[]
  faq: CategoryFaqItem[]
  cta: { title: string; body: string; primary: string; secondary: string; secondaryHref: string }
}

const EN: Record<CategoryPageKey, CategoryContent> = {
  'deadline-monitoring': {
    slug: 'what-is-deadline-monitoring',
    eyebrow: 'Deadline monitoring',
    title: 'What is deadline monitoring?',
    lead: 'Deadline monitoring is software that continuously watches the official IRS, state, and FEMA sources for changes to tax filing deadlines — and shows which of a firm’s clients each change affects. It is the active counterpart to passive due-date tracking, which only stores the dates a firm typed in.',
    term: 'Deadline monitoring',
    definition:
      'Software that continuously watches official IRS, state tax-agency, and FEMA sources for changes to tax filing deadlines and surfaces which clients each change affects — distinct from passive due-date tracking, which only stores the dates a firm enters and goes stale when a date moves at the source.',
    sections: [
      {
        heading: 'Monitoring vs tracking: the difference that matters',
        paragraphs: [
          'Most firms already <em>track</em> deadlines — in a spreadsheet, a calendar, or a due-date tool. That list is only ever as current as the last time someone updated it by hand. When the IRS postpones a deadline for a disaster area, or a state moves a franchise-tax date, the stored list does not change on its own. It goes stale silently, and nobody notices until the wrong date is worked to.',
          'Deadline <em>monitoring</em> inverts that. Instead of trusting a list, it watches the official source itself. When the agency moves a date, the change is caught at the source, carried with the official notice it came from, and routed to the specific clients it affects. The firm learns the date moved because a source moved it — not because someone happened to re-check.',
        ],
      },
    ],
    compare: {
      caption: 'Passive due-date tracking vs active deadline monitoring',
      passiveLabel: 'Passive tracking',
      activeLabel: 'Active monitoring',
      rows: [
        {
          axis: 'Source of truth',
          passive: 'A list you maintain by hand',
          active: 'The official IRS / state / FEMA source',
        },
        {
          axis: 'When a date moves',
          passive: 'Nothing changes until someone re-enters it',
          active: 'The change is caught at the source, with the notice attached',
        },
        {
          axis: 'Who notices',
          passive: 'Whoever happens to re-check in time',
          active: 'The firm is surfaced the change automatically',
        },
        {
          axis: 'Client impact',
          passive: 'Worked out manually, client by client',
          active: 'Each change is mapped to the specific clients it hits',
        },
      ],
    },
    crosslink: {
      lead: 'A moved deadline is only the most visible kind of rule change. For the fuller picture — new forms, changed thresholds, disaster relief — see',
      link: { href: '/what-is-rule-change-monitoring', label: 'what is rule-change monitoring' },
    },
    relatedHeading: 'Keep reading',
    related: [
      { href: '/what-is-rule-change-monitoring', label: 'What is rule-change monitoring?' },
      { href: '/how-it-works', label: 'How DueDateHQ works' },
      { href: '/works-with-your-stack', label: 'Works with the tools you already run' },
      { href: '/irs-disaster-relief', label: 'IRS disaster-relief deadline postponements' },
    ],
    faq: [
      {
        question: 'What is the difference between deadline monitoring and deadline tracking?',
        answer:
          'Tracking stores the dates you enter; it is only current as of your last manual update. Monitoring watches the official source, so when the IRS or a state moves a date the change is caught at the source and routed to the affected clients — no one has to re-check the list.',
      },
      {
        question: 'Does deadline monitoring replace my calendar or practice-management tool?',
        answer:
          'No. It is an add-on layer that sits on top of the tools you already run. You keep doing the work in your own software; deadline monitoring only catches when a date changes at the official source and shows which clients that change affects.',
      },
      {
        question: 'How does it know a deadline changed?',
        answer:
          'It watches the official IRS, state tax-agency, and FEMA sources across all 50 states plus DC, with deeper multi-agency coverage in California, New York, Texas, Florida, Washington, and Massachusetts. A change is carried with the official notice it came from, and source-backed changes are reviewed before they become reminder-ready.',
      },
      {
        question: 'Is deadline monitoring the same as deadline reminders?',
        answer:
          'No. Reminders fire on the dates you set. Monitoring catches when the date itself moves at the source — the case a reminder cannot cover, because a reminder is only as right as the date behind it.',
      },
    ],
    cta: {
      title: 'Add active deadline monitoring over the tools you already run.',
      body: 'DueDateHQ watches the official sources across 50 states + DC and shows which clients each deadline change affects — with the source on every date.',
      primary: 'Get started',
      secondary: 'See how it works',
      secondaryHref: '/how-it-works',
    },
  },
  'rule-change-monitoring': {
    slug: 'what-is-rule-change-monitoring',
    eyebrow: 'Rule-change monitoring',
    title: 'What is rule-change monitoring?',
    lead: 'Rule-change monitoring is software that watches the official tax sources — the IRS, state tax agencies, and FEMA — for changes to the rules that govern filing, and shows which of a firm’s clients each change affects, with the official source attached. A moved deadline is one kind of rule change; it is not the only one.',
    term: 'Rule-change monitoring',
    definition:
      'Software that continuously watches official IRS, state tax-agency, and FEMA sources for changes to the rules that govern tax filing — deadline postponements, new or retired forms, changed thresholds, eligibility and conformity changes, and disaster-relief postponements — and maps each change to the clients it affects, with the source attached.',
    sections: [
      {
        heading: 'A moved deadline is just one kind of rule change',
        paragraphs: [
          'The most visible rule change is a filing date moving — but it is one of several. A firm’s exposure to change is broader than the calendar:',
        ],
        bullets: [
          'Deadline postponements — an IRS disaster declaration or a state extension moves a due date.',
          'New or retired forms — a filing requirement appears, changes, or goes away.',
          'Changed thresholds — a dollar or eligibility line that decides who has to file, or how.',
          'Conformity and eligibility changes — a state adopts, drops, or diverges from a federal rule.',
        ],
      },
      {
        heading: 'Source-first, not alert noise',
        paragraphs: [
          'Rule-change monitoring is only useful if you can trust it, so the discipline is source-first: every change carries the official source URL and the exact excerpt it came from. Nothing is asserted without the evidence behind it.',
          'Source-backed changes are treated as candidates and reviewed by a person before they become reminder-ready work. Monitoring surfaces the change and the evidence; a human confirms it belongs on a client’s list. That is what keeps it a signal instead of noise.',
        ],
      },
      {
        heading: 'Why a firm cannot do this by hand',
        paragraphs: [
          'The rules that govern filing live across the IRS and 50 state agencies plus DC, and they change without a firm-wide announcement. No one can watch every official source continuously and still do the returns. Rule-change monitoring is the layer that does the watching, so the firm can act on the change instead of hunting for it.',
        ],
      },
    ],
    crosslink: {
      lead: 'Deadlines are the rule change firms feel most often. For that specific case — active monitoring vs passive due-date lists — see',
      link: { href: '/what-is-deadline-monitoring', label: 'what is deadline monitoring' },
    },
    relatedHeading: 'Keep reading',
    related: [
      { href: '/what-is-deadline-monitoring', label: 'What is deadline monitoring?' },
      { href: '/how-it-works', label: 'How DueDateHQ works' },
      { href: '/state-coverage', label: 'Which states DueDateHQ monitors' },
      { href: '/irs-disaster-relief', label: 'IRS disaster-relief deadline postponements' },
    ],
    faq: [
      {
        question: 'What counts as a rule change?',
        answer:
          'Anything that changes how or when a client files: a postponed deadline, a new or retired form, a changed dollar or eligibility threshold, a state conforming to or diverging from a federal rule, or a disaster-relief postponement. A moved deadline is the most common one.',
      },
      {
        question: 'How is this different from a tax newsletter or news feed?',
        answer:
          'A newsletter tells every reader the same thing and leaves the "does this touch my clients?" work to you. Rule-change monitoring maps each change to the specific clients on your list and carries the official source, so the output is your affected clients — not general news.',
      },
      {
        question: 'Which sources does it watch?',
        answer:
          'Official IRS, state tax-agency, and FEMA sources across all 50 states plus DC, with deeper multi-agency coverage in California, New York, Texas, Florida, Washington, and Massachusetts. Source-backed changes are reviewed before they become reminder-ready.',
      },
      {
        question: 'Is rule-change monitoring tax advice?',
        answer:
          'No. It monitors official sources and supports evidence-backed review; it is not tax advice, not a filing system, and not a substitute for professional judgment.',
      },
    ],
    cta: {
      title: 'Watch the rules, not just the calendar.',
      body: 'DueDateHQ monitors official IRS, state, and FEMA sources across 50 states + DC and shows which clients each rule change affects — with a source on every date.',
      primary: 'Get started',
      secondary: 'See how it works',
      secondaryHref: '/how-it-works',
    },
  },
}

const ZH: Record<CategoryPageKey, CategoryContent> = {
  'deadline-monitoring': {
    slug: 'what-is-deadline-monitoring',
    eyebrow: '截止日监控',
    title: '什么是截止日监控？',
    lead: '截止日监控是一类软件：它持续盯着官方的 IRS、各州与 FEMA 来源，捕捉报税截止日的变化，并显示这条变化影响到事务所名单上的哪些客户。它是被动“截止日记录”的主动对应物——后者只是存下你手动录入的日期。',
    term: '截止日监控',
    definition:
      '一类软件：持续监控官方 IRS、各州税务机构与 FEMA 来源，捕捉报税截止日的变化，并显示每条变化影响到哪些客户。它区别于被动的截止日记录——后者只存下事务所录入的日期，一旦来源端日期变动就会过时。',
    sections: [
      {
        heading: '监控与记录：真正的区别',
        paragraphs: [
          '大多数事务所已经在<em>记录</em>截止日——用表格、日历或某个截止日工具。但那份清单，永远只更新到上一次有人手动改它的时刻。当 IRS 因灾情推迟某个截止日、或某个州调整了 franchise tax 日期时，存下的清单不会自己改。它会悄无声息地过时，直到有人照着错误的日期开工才被发现。',
          '截止日<em>监控</em>把这件事反过来：不去信一份清单，而是盯着官方来源本身。当机构把日期改了，变化在来源端就被捕捉，并带着它出处的官方通知，路由到受影响的具体客户。事务所知道日期变了，是因为来源改了它——而不是因为碰巧有人回头复核。',
        ],
      },
    ],
    compare: {
      caption: '被动截止日记录 vs 主动截止日监控',
      passiveLabel: '被动记录',
      activeLabel: '主动监控',
      rows: [
        {
          axis: '真相来源',
          passive: '你手动维护的一份清单',
          active: '官方 IRS / 各州 / FEMA 来源',
        },
        {
          axis: '当日期变动时',
          passive: '除非有人重新录入，否则毫无变化',
          active: '在来源端即被捕捉，并附上通知',
        },
        {
          axis: '谁会注意到',
          passive: '碰巧及时回头复核的人',
          active: '变化自动呈现给事务所',
        },
        {
          axis: '对客户的影响',
          passive: '逐个客户手动推算',
          active: '每条变化映射到它牵动的具体客户',
        },
      ],
    },
    crosslink: {
      lead: '被推迟的截止日，只是最显眼的一类规则变化。要看更完整的图景——新表格、阈值变化、灾情减免——请看',
      link: { href: '/what-is-rule-change-monitoring', label: '什么是规则变化监控' },
    },
    relatedHeading: '继续阅读',
    related: [
      { href: '/what-is-rule-change-monitoring', label: '什么是规则变化监控？' },
      { href: '/how-it-works', label: 'DueDateHQ 的运作方式' },
      { href: '/works-with-your-stack', label: '兼容你已有的工具栈' },
      { href: '/irs-disaster-relief', label: 'IRS 灾情减免与截止日推迟' },
    ],
    faq: [
      {
        question: '截止日监控和截止日记录有什么区别？',
        answer:
          '记录只是存下你录入的日期，永远停留在上一次手动更新。监控盯着官方来源——当 IRS 或某个州移动了日期，变化在来源端就被捕捉并路由到受影响的客户，不需要有人回头核对清单。',
      },
      {
        question: '截止日监控会替换我的日历或 practice management 工具吗？',
        answer:
          '不会。它是叠加在你现有工具之上的一层。你仍在自己的软件里完成工作；截止日监控只负责在官方来源端捕捉日期变化，并显示这条变化影响到哪些客户。',
      },
      {
        question: '它怎么知道某个截止日变了？',
        answer:
          '它监控官方 IRS、各州税务机构与 FEMA 来源，覆盖全部 50 州加 DC；在加州、纽约、德州、佛州、华盛顿州与麻州有更深的多机构覆盖。每条变化都带着它出处的官方通知，且带来源的变化会先经复核，才成为可提醒的工作。',
      },
      {
        question: '截止日监控和截止日提醒是一回事吗？',
        answer:
          '不是。提醒是在你设定的日期上触发；监控捕捉的是日期本身在来源端被移动的情况——这正是提醒覆盖不了的，因为提醒的正确性，取决于它背后那个日期。',
      },
    ],
    cta: {
      title: '在你已有的工具之上，加一层主动的截止日监控。',
      body: 'DueDateHQ 监控覆盖 50 州加 DC 的官方来源，显示每条截止日变化影响到哪些客户——每个日期都附上来源。',
      primary: '开始使用',
      secondary: '查看工作原理',
      secondaryHref: '/how-it-works',
    },
  },
  'rule-change-monitoring': {
    slug: 'what-is-rule-change-monitoring',
    eyebrow: '规则变化监控',
    title: '什么是规则变化监控？',
    lead: '规则变化监控是一类软件：它盯着官方税务来源——IRS、各州税务机构与 FEMA——捕捉那些左右申报的规则变化，并显示每条变化影响到事务所的哪些客户，附上官方来源。被推迟的截止日，只是其中一类规则变化，并非全部。',
    term: '规则变化监控',
    definition:
      '一类软件：持续监控官方 IRS、各州税务机构与 FEMA 来源，捕捉左右报税的规则变化——截止日推迟、新增或废止的表格、阈值变化、适用性与 conformity 变化、以及灾情减免推迟——并把每条变化映射到它牵动的客户，附上来源。',
    sections: [
      {
        heading: '被推迟的截止日，只是一类规则变化',
        paragraphs: [
          '最显眼的规则变化是申报日期被移动——但它只是其中之一。事务所面对的变化，比日历宽得多：',
        ],
        bullets: [
          '截止日推迟——IRS 的灾情声明或某州的延期，移动了一个到期日。',
          '新增或废止的表格——某项申报要求出现、改变或消失。',
          '阈值变化——决定谁必须申报、如何申报的金额或适用性界线。',
          'Conformity 与适用性变化——某州采纳、放弃或偏离某项联邦规则。',
        ],
      },
      {
        heading: '来源优先，而非提醒噪音',
        paragraphs: [
          '规则变化监控只有可信才有用，所以纪律是来源优先：每条变化都带着官方来源 URL 和它出处的原文摘录。没有证据，就不下断言。',
          '带来源的变化被视为候选项，先经人工复核，才成为可提醒的工作。监控负责呈现变化与证据；由人来确认它是否该进某个客户的名单。这正是它保持“信号”而非“噪音”的原因。',
        ],
      },
      {
        heading: '为什么事务所无法靠人力盯着',
        paragraphs: [
          '左右申报的规则，分散在 IRS 与 50 个州机构加 DC，而且它们变动时并不会全所广播。没有人能一边持续盯着每一个官方来源，一边还把报税做完。规则变化监控就是替你盯着的那一层——让事务所去处理变化，而不是四处找变化。',
        ],
      },
    ],
    crosslink: {
      lead: '截止日是事务所最常遇到的规则变化。要看这一具体情形——主动监控 vs 被动的截止日清单——请看',
      link: { href: '/what-is-deadline-monitoring', label: '什么是截止日监控' },
    },
    relatedHeading: '继续阅读',
    related: [
      { href: '/what-is-deadline-monitoring', label: '什么是截止日监控？' },
      { href: '/how-it-works', label: 'DueDateHQ 的运作方式' },
      { href: '/state-coverage', label: 'DueDateHQ 监控哪些州' },
      { href: '/irs-disaster-relief', label: 'IRS 灾情减免与截止日推迟' },
    ],
    faq: [
      {
        question: '什么算是一次规则变化？',
        answer:
          '任何改变客户“如何申报”或“何时申报”的东西：被推迟的截止日、新增或废止的表格、变化的金额或适用性阈值、某州对某项联邦规则的采纳或偏离、或灾情减免推迟。其中最常见的，就是被移动的截止日。',
      },
      {
        question: '这和税务简报或新闻源有什么不同？',
        answer:
          '简报对每位读者说同样的话，把“这会不会牵动我的客户？”留给你自己做。规则变化监控把每条变化映射到你名单上的具体客户，并带上官方来源——它的产出是你的受影响客户，而不是泛泛的新闻。',
      },
      {
        question: '它监控哪些来源？',
        answer:
          '官方 IRS、各州税务机构与 FEMA 来源，覆盖全部 50 州加 DC；在加州、纽约、德州、佛州、华盛顿州与麻州有更深的多机构覆盖。带来源的变化会先经复核，才成为可提醒的工作。',
      },
      {
        question: '规则变化监控算税务建议吗？',
        answer:
          '不算。它监控官方来源、支持基于证据的复核；它不是税务建议，不是报税系统，也不能替代专业判断。',
      },
    ],
    cta: {
      title: '盯住规则，而不只是日历。',
      body: 'DueDateHQ 监控覆盖 50 州加 DC 的官方 IRS、各州与 FEMA 来源，显示每条规则变化影响到哪些客户——每个日期都附上来源。',
      primary: '开始使用',
      secondary: '查看工作原理',
      secondaryHref: '/how-it-works',
    },
  },
}

const CONTENT: Record<Locale, Record<CategoryPageKey, CategoryContent>> = { en: EN, 'zh-CN': ZH }

export function getCategoryContent(key: CategoryPageKey, locale: Locale): CategoryContent {
  return CONTENT[locale][key]
}
