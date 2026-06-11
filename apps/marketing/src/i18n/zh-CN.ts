import type { LandingCopy } from './types'

const zhCN: LandingCopy = {
  meta: {
    title: 'DueDateHQ — 在罚款发生前看清截止日风险',
    description:
      '面向美国 CPA 团队的玻璃盒截止日智能工作台，把客户迁移、IRS 规则、州税变化、证据复核、负责人分工和每周分诊放在同一条可审计运营链路里。',
    ogImage: '/og/home.zh-CN.png',
  },
  nav: {
    brand: 'DueDateHQ',
    audience: 'For US CPA practices',
    links: [
      { label: '产品', href: '/zh-CN#hero' },
      { label: '工作流', href: '/zh-CN#workflow' },
      { label: '证据', href: '/zh-CN#proof' },
      { label: '安全', href: '/zh-CN#security' },
      { label: '价格', href: '/zh-CN/pricing' },
      { label: '资源', href: '/zh-CN/rules' },
      { label: '信任', href: '/zh-CN/security' },
    ],
    statusPill: '已上线 CA · NY · TX · FL · WA',
    cta: '打开工作台',
  },
  hero: {
    eyebrow: '玻璃盒截止日智能',
    title: '在罚款发生前看清截止日风险。',
    description:
      'DueDateHQ 是为美国 CPA 团队打造的截止日智能工作台。每一个截止日、每一条 IRS 规则、每一次州税变更都可追溯到官方原始来源 —— 全部归并在一个键盘优先、为周一 5 分钟分诊设计的控制台里。',
    primaryCta: '打开工作台',
    secondaryCta: '查看工作流',
    demoCta: '试用在线 Demo',
    trust: [
      { label: '不用黑盒 AI' },
      { label: '每个数字都有出处' },
      { label: '键盘优先' },
      { label: '24 小时提醒 SLA' },
    ],
    surface: {
      breadcrumb: { workbench: 'Workbench', dashboard: '今天', week: '本周' },
      kbdCommand: 'Command',
      brief: {
        status: 'READY',
        title: 'AI weekly brief',
        text: '先处理 Acme 和 Birchwood：两者都在七天窗口内，来源链完整，并且需要复核。',
        citation: '[1] IRS Pub 509',
      },
      alert: {
        tag: '提醒',
        text: 'CA-FTB 将 Form 540 + 540-ES 延期至 10 月 15 日 · 影响你的 12 位客户。',
        source: 'ftb.ca.gov · 2026-04-25',
        cta: '查看',
      },
      metric: {
        eyebrow: 'DEADLINE RADAR · 本周',
        range: 'Apr 25 — May 01',
        value: '12',
        delta: '+3 vs 上周一',
        stats: [
          { label: '高危客户', value: '5' },
          { label: '需要复核', value: '12' },
          { label: '提醒 (24h)', value: '3' },
          { label: '本周已申报', value: '11' },
        ],
      },
      triageTabs: [
        { label: '本周', count: '12' },
        { label: '本月', count: '21' },
        { label: '长期', count: '8' },
      ],
      table: {
        headers: {
          priority: '优先级',
          client: '客户',
          form: '表单',
          due: '到期',
          days: '天数',
          status: '状态',
          severity: '风险',
          exposure: '下一步',
          evidence: '证据',
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
            daysLeft: '3 天',
            status: '待复核',
            statusTone: 'warning',
            statusDotTone: 'warning',
            severityLabel: 'critical',
            exposure: '复核来源',
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
            daysLeft: '4 天',
            status: '等客户',
            statusTone: 'outline',
            statusDotTone: 'warning',
            severityLabel: 'critical',
            exposure: '等待客户',
            exposureTone: 'warning',
            evidence: 'IRS §6072(b)',
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
            daysLeft: '7 天',
            status: '处理中',
            statusTone: 'info',
            statusDotTone: 'normal',
            severityLabel: 'high',
            exposure: '完成复核',
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
            daysLeft: '15 天',
            status: '待处理',
            statusTone: 'secondary',
            statusDotTone: 'disabled',
            severityLabel: 'medium',
            exposure: '查看提醒',
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
            daysLeft: '19 天',
            status: '待处理',
            statusTone: 'secondary',
            statusDotTone: 'disabled',
            severityLabel: 'medium',
            exposure: '分配 owner',
            exposureTone: 'warning',
            evidence: 'IRS §6072(b)',
            evidenceTone: 'info',
            severity: 'medium',
          },
        ],
      },
      hints: [
        { keys: 'E', label: '查看证据' },
        { keys: 'J / K', label: '上下移动' },
        { keys: '⌘K', label: '命令面板' },
        { keys: '?', label: '快捷键' },
      ],
      liveLabel: '示例预览 · 非真实数据',
    },
  },
  sla: {
    items: [
      {
        ruleNumber: 'RULE 00',
        ruleLabel: '01 TRIAGE',
        value: '30',
        unit: '秒',
        description:
          '在周一控制台一眼看清本周最紧急的 5 位客户。Deadline Radar 在服务端预聚合，队列在页面绘制前就已就位。',
      },
      {
        ruleNumber: 'RULE 00',
        ruleLabel: '02 MIGRATE',
        value: '30',
        unit: '分钟',
        description:
          '粘贴、映射、归一、生成。一次性把 30 位客户搬上一份可校验的年度日历 —— 不需要逐客户走配置向导。',
      },
      {
        ruleNumber: 'RULE 00',
        ruleLabel: '03 提醒',
        value: '24',
        unit: '小时',
        description:
          '所有州的申报通知和 IRS 更新在 24 小时内进入今天页与邮件摘要，附来源摘录与一键应用至 12 位客户。',
      },
    ],
  },
  problem: {
    eyebrow: 'THE PROBLEM WITH TODAY’S STACK',
    index: '01',
    title: 'Excel + Outlook + 50 个州网站 —— 用罚款标价。',
    paragraph:
      '1–10 人规模的 CPA 实务把传统桌面跟踪器、监管 PDF、电子表格日历拼在一起。结果可预期且昂贵：错过的截止日、滚动累加的罚款，以及一个完整上午都耗在的周一分诊。',
    footnote: 'IRS § 6651 · 未申报罚款 → 每月 5%，封顶 25%',
    cards: [
      {
        tag: 'STATE WATCH',
        severity: 'critical',
        cadence: '平均 / 每家 / 每年',
        headline: '一个 30 天窗口内会发布 14 条规则变更。你需要知道命中你客户的是哪 4 条。',
        body: '提醒把每条 IRS 通知和 50 州申报变更压缩成一条仪表盘横幅，附 `source_excerpt`、`source_url` 和一键应用入口。',
        listTitle: '近 30 天规则变更',
        listSummary: '14 条 · 50 州 + DC',
        rows: [
          { pill: 'CA-FTB', text: 'Form 540 截止日变更', date: 'Apr 25' },
          { pill: 'NY-DTF', text: 'MTA-305 附加费更新', date: 'Apr 22' },
          { pill: 'IRS', text: 'Pub 509 日历修订', date: 'Apr 18' },
        ],
      },
      {
        tag: 'NOTICE TRIAGE',
        severity: 'high',
        cadence: '平均 / 每家 / 每年',
        headline: '每周 312 封邮件，其中 4 封会让你的客户被罚。',
        body: '邮件摘要 + 仪表盘横幅取代收件箱考古。Owner 是唯一签发人；不会再有通知滑进初级同事的草稿夹。',
        listTitle: '收件箱 · 未读',
        listSummary: '312 未读 · 4 紧急',
        rows: [
          { pill: 'CA-FTB', text: '灾害延期 — 洛杉矶县', date: '9:42' },
          { pill: 'IRS', text: '2026 税年季度刊物更新', date: 'Wed' },
          { pill: 'Drake', text: '软件更新通知 — 需要你处理', date: 'Mon' },
          { pill: 'QuickBooks', text: '8 份客户文件等待分类', date: 'Sun' },
        ],
      },
      {
        tag: 'MIGRATION DRAG',
        severity: 'medium',
        cadence: '平均 / 每家 / 每年',
        headline: '把 30 位客户从 File-In-Time 搬到任何地方，要敲 4 小时。',
        body: 'Migration Copilot 在 30 分钟内完成映射、归一与年度日历生成。每位导入的客户都带一条指向源行的证据链接。',
        listTitle: 'File-In-Time 导出 → 电子表格',
        listSummary: '30 位客户 · 4 小时打字',
        rows: [
          { pill: 'Acme LLC', text: '— 缺失 EIN', date: 'LOW 0.62', severity: 'critical' },
          { pill: 'Birchwood Co', text: '— 州不明确', date: 'LOW 0.62', severity: 'medium' },
          { pill: 'Crestmont Inc', text: '— 实体类型错误', date: 'LOW 0.62', severity: 'critical' },
          { pill: 'Delta Group', text: '— 截止日格式 ?', date: 'LOW 0.62', severity: 'medium' },
        ],
      },
    ],
  },
  workflow: {
    eyebrow: '工作流',
    index: '02',
    title: '分诊。迁移。校验。三个界面，一个控制台。',
    paragraph:
      'DueDateHQ 围绕三条产品规则构建：所有操作都在键盘上、所有数字都是等宽对齐、所有 AI 输出都引证来源。下面是工作台的三个真实切片。',
    steps: [
      {
        index: '01',
        tag: 'TRIAGE · 30 SECONDS',
        headline: '周一控制台。',
        body: 'Owner 打开笔记本，看到 5 位高风险客户、证据状态，以及第一个动作的快捷键。Smart Priority 是纯函数排序 —— 仪表盘热路径里没有 LLM。',
        hints: [
          { keys: '⌘K', label: '命令面板' },
          { keys: 'E', label: '证据' },
        ],
        surface: {
          kind: 'dashboard',
          header: { title: '今天 · 周一分诊', timestamp: '2026-04-25 08:14' },
          ranges: ['本周', '本月', '长期'],
          summary: [
            { label: '未完成', value: '18' },
            { label: '本周到期', value: '12' },
            { label: '待复核', value: '5' },
          ],
          tableHeaders: {
            priority: '优先级',
            client: '客户',
            form: '表单',
            due: '截止日',
            status: '状态',
            severity: '风险',
            exposure: '下一步',
            evidence: '证据',
          },
          alert: {
            tag: '提醒',
            text: 'IRS 将 Form 1040 延期至 10 月 15 日 · 你的 18 位客户进入新窗口。',
            cta: '应用至 18 位',
          },
          rows: [
            {
              priorityScore: '88.4',
              priorityRank: '#1',
              priorityTone: 'destructive',
              client: 'Acme LLC',
              form: '1120-S',
              due: 'Apr 28',
              daysLeft: '3 天',
              status: '待复核',
              statusTone: 'warning',
              statusDotTone: 'warning',
              severityLabel: 'critical',
              exposure: '复核来源',
              exposureTone: 'warning',
              evidence: '2 个来源',
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
              daysLeft: '4 天',
              status: '等客户',
              statusTone: 'outline',
              statusDotTone: 'warning',
              severityLabel: 'critical',
              exposure: '等待客户',
              exposureTone: 'warning',
              evidence: '1 个来源',
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
              daysLeft: '7 天',
              status: '处理中',
              statusTone: 'info',
              statusDotTone: 'normal',
              severityLabel: 'medium',
              exposure: '完成复核',
              exposureTone: 'warning',
              evidence: '打开',
              evidenceTone: 'outline',
              severity: 'medium',
            },
          ],
        },
      },
      {
        index: '02',
        tag: 'MIGRATE · 30 MINUTES',
        headline: '粘贴、映射、归一、生成。',
        body: 'Migration Copilot 为每位客户映射 30 个字段，附置信度评分。低于 0.80 不会阻塞流程；运营只需轻推，不必重打。',
        hints: [
          { keys: '⌘V', label: '粘贴' },
          { keys: 'Tab', label: '下一字段' },
        ],
        surface: {
          kind: 'mapping',
          step: 'Migration Copilot · 第 2 步 / 共 4 步',
          steps: [{ label: '导入' }, { label: 'AI 映射' }, { label: '归一化' }, { label: '生成' }],
          headers: {
            source: 'FIT 导出列',
            target: 'DUEDATEHQ 字段',
            sample: '示例',
            confidence: '置信度',
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
          footer: { summary: '30 行 · AI 平均置信度 0.91', cta: '应用映射' },
        },
      },
      {
        index: '03',
        tag: 'VERIFY · EVERY CLAIM',
        headline: '没有出处，就不渲染。',
        body: '每一句 AI 文案、每一条规则引用都链回 `source_url`、`source_excerpt` 与 `verified_at`。三者缺一，DueDateHQ 渲染"待校验"状态而非建议。',
        hints: [
          { keys: 'E', label: '打开证据' },
          { keys: 'Esc', label: '关闭' },
        ],
        surface: {
          kind: 'evidence',
          drawerTitle: '证据抽屉 · Acme LLC · 1120-S 4 月 28 日到期',
          confidence: 'HIGH 0.97',
          closeHint: 'ESC · 关闭',
          fields: [
            { label: '客户', value: 'Acme Holdings LLC' },
            { label: 'EIN', value: '87-1234567' },
            { label: '表单', value: '1120-S' },
            { label: '到期日', value: '2026-04-28' },
            { label: '剩余', value: '3 天' },
            { label: '下一步', value: '复核来源' },
            { label: '罚则', value: 'IRC § 6651(a)(1)' },
          ],
          source: {
            label: '来源',
            value: 'irs.gov / pub / 509 · §3 · v17',
            verified: '2026-04-25T08:14:03Z 由 alert-ingest-3.2 校验',
            quoteLabel: 'SOURCE EXCERPT',
            quote:
              '"If an S corporation election was made and the corporation files Form 1120-S on the basis of a calendar year, the return is due on or before March 15. If the corporation operates on a fiscal year, the return is due on or before the 15th day of the third month after the close of the tax year."',
          },
          meta: {
            source: 'irs.gov · v17',
            verifiedBy: 'alert-ingest-3.2',
            reviewed: 'sarah@firmname',
            status: '完成',
          },
        },
      },
    ],
  },
  proof: {
    eyebrow: '玻璃盒保证',
    index: '03',
    title: '仪表盘上的每个数字都能点回它的出处。',
    paragraph:
      'AI 可以总结、建议、起草。但只要缺少可验证的 source URL、来源摘录与服务端时间戳，它就不被允许渲染推荐。界面优雅失败：缺出处 → 待校验状态。',
    footnote: 'Glass-Box Guard · 每条 AI 主张都对照来源校验',
    stats: [
      {
        label: '已验证引用',
        value: '100',
        unit: '%',
        body: '每一句 AI 文案、每一条规则引用都附 source_url + source_excerpt + verified_at，否则不予渲染。',
      },
      {
        label: '官方来源',
        value: '48',
        unit: '+',
        body: 'IRS、FTB、DTF · 50 个州的申报机构，全部映射到一套规则模式。',
      },
      {
        label: '提醒 SLA',
        value: '24',
        unit: 'h',
        body: '从来源发布到仪表盘横幅 + 邮件摘要，受影响客户列表已预先计算。',
      },
      {
        label: '黑盒建议',
        value: '0',
        unit: '',
        body: 'AI 永远不会自动应用规则。"应用"始终是人在回路里的键盘动作。',
      },
    ],
  },
  security: {
    title: 'WHY CPAs TRUST IT',
    items: [
      { pill: 'Per-firm', body: '数据始终留在当前事务所工作区内' },
      { pill: 'Evidence', body: '每条主张 · 来源 + 摘录' },
      { pill: 'Audit log', body: '应用 · 撤销 · 回滚均留痕' },
      { pill: 'Email-first', body: '无需客户门户库' },
    ],
  },
  finalCta: {
    pill: '30 秒 / 周一分诊',
    pillCaption: 'SOURCE-BACKED DEADLINE OPERATIONS',
    title: '打开工作台。让来源自己说话。',
    body: '先用 trial 或 demo workspace 体验；当第一条带来源的队列准备好后，再用 Solo 保持生产 practice 在线。无需安装客户端，用 Google 登录，第一次粘贴后十分钟内看到截止日复核事项。',
    primaryCta: '打开工作台',
    secondaryCta: '联系销售',
    trust: '可试用 · 随时取消',
  },
  pricing: {
    meta: {
      title: 'DueDateHQ 价格 — 面向 CPA 团队的截止日智能',
      description:
        '查看 DueDateHQ 面向美国 CPA 团队的订阅方案：一个 practice 工作区、席位数量、提醒与 Deadlines 访问权限、可追溯规则和共享运营队列如何对应 Solo、Pro、Team 与 Enterprise。',
      ogImage: '/og/home.zh-CN.png',
    },
    navPricingHref: '/zh-CN/pricing',
    hero: {
      eyebrow: '价格',
      title: '只为你能看清的截止日风险付费。',
      description:
        '先用 Solo 运营一个 practice 工作区；当这个 practice 需要多人协作时升级到 Pro 或 Team；需要多个办公室或多个工作区时再与我们定制 Enterprise。',
      note: '可使用 trial/demo workspace · DueDateHQ 不保存卡号',
    },
    plansHeader: {
      eyebrow: '套餐',
      title: '选择适合你 practice 的计划。',
      note: '美元定价 · Owner 授权升级',
    },
    billingToggle: {
      ariaLabel: '账单周期',
      monthly: '月付',
      yearly: '年付',
      yearlyBadge: '约省 20%',
    },
    plans: [
      {
        name: 'Solo',
        price: '$39',
        yearlyPrice: '$31',
        priceKind: 'numeric',
        cadence: '/ 月',
        yearlyCadence: '/ 月，按年支付',
        yearlySavings: '每年省 $96',
        description: '适合一位 Owner 运营一个 practice 工作区。',
        seats: '1 个 practice 工作区 · 1 个 Owner 席位',
        aiLabel: 'Basic AI',
        aiDescription: '提供带来源的预览和适合单 Owner 的轻量迁移辅助。',
        aiFeatures: ['仅用于预览的 AI 辅助', '受来源约束的摘要'],
        cta: '开始 Solo',
        hrefKind: 'checkout',
        checkoutPlan: 'solo',
        features: ['1 个 practice 工作区', '1 个 Owner 席位', '带来源的证据', '迁移与规则预览'],
      },
      {
        name: 'Pro',
        badge: '推荐',
        price: '$79',
        yearlyPrice: '$63',
        priceKind: 'numeric',
        cadence: '/ 月',
        yearlyCadence: '/ 月，按年支付',
        yearlySavings: '每年省 $192',
        description: '适合需要共享截止日运营的小型 CPA 事务所。',
        seats: '1 个生产 practice · 3 个席位',
        aiLabel: '包含 Practice AI',
        aiDescription:
          '包含每日简报、提醒摘要、客户风险摘要、截止日提示和正式客户数据的智能导入辅助。',
        aiFeatures: ['完整 practice AI 工作流', '与 Team 相同的 AI 能力'],
        cta: '升级到 Pro',
        hrefKind: 'checkout',
        checkoutPlan: 'pro',
        features: [
          '1 个生产 practice',
          '包含 3 个席位',
          '共享截止日运营',
          '提醒与 Deadlines 访问权限',
        ],
      },
      {
        name: 'Team',
        price: '$149',
        yearlyPrice: '$119',
        priceKind: 'numeric',
        cadence: '/ 月',
        yearlyCadence: '/ 月，按年支付',
        yearlySavings: '每年省 $360',
        description: '适合需要更大运营团队协同的 practice。',
        seats: '1 个生产 practice · 10 个席位',
        aiLabel: '与 Pro 相同的 Practice AI · 为 10 席运营设计',
        aiDescription: '与 Pro 使用同一档 practice AI，并增加团队规模的管理与复核工作流。',
        aiFeatures: ['与 Pro 相同的 AI 能力', '团队规模的 fair-use 保护'],
        cta: '升级到 Team',
        hrefKind: 'checkout',
        checkoutPlan: 'team',
        features: [
          '1 个生产 practice',
          '包含 10 个席位',
          'Team workload 与共享分诊',
          '面向 Manager 的运营协作',
        ],
      },
      {
        name: 'Enterprise',
        price: 'From $399',
        yearlyPrice: 'From $319',
        priceKind: 'text',
        cadence: '/ 月 · 定制',
        yearlyCadence: '/ 月等效 · 年度合同',
        yearlySavings: '每年省 $960 起',
        description: '适合多 practice 运营、API 访问和定制覆盖。',
        seats: '多个 practice/办公室 · 10+ 席位',
        aiLabel: '按合同定制 AI 与覆盖范围',
        aiDescription: '提供合同级模型路由、定制覆盖和审计级 AI 控制。',
        aiFeatures: ['定制 AI 路由', '合同覆盖与审计控制'],
        cta: '联系销售',
        hrefKind: 'contact',
        features: [
          '多个 practice 或办公室',
          '按合同开放 API',
          'SSO 与定制覆盖',
          '优先 onboarding 与审计导出',
        ],
      },
    ],
    faqHeader: {
      eyebrow: 'FAQ',
      title: '关于计划的常见问题。',
    },
    faq: [
      {
        question: '谁可以升级 practice？',
        answer:
          '只有当前 practice Owner 可以创建或变更付费订阅。其他成员可以查看计划状态，但不能更改账单。',
      },
      {
        question: 'Pro 比 Solo 多什么？',
        answer:
          'Pro 增加 3 席共享工作区、提醒监控和小型 practice 管理截止日运营所需的 Deadlines 视图。',
      },
      {
        question: '什么时候选择 Team？',
        answer:
          'Team 适合一个生产 practice 需要最多 10 个席位和更大的运营协同，但还不需要多个 active practice 工作区的情况。',
      },
      {
        question: '可以继续使用 Solo 吗？',
        answer:
          '可以。Solo 是面向单 Owner 的付费生产计划，包含一个 live practice 工作区。trial 和 demo workspace 可以与生产账单分开处理。',
      },
      {
        question: '我可以创建多个 practice 吗？',
        answer:
          'Solo、Pro 和 Team 均包含 1 个 active practice 工作区。额外 practice、办公室，或 demo/production 分离属于 Enterprise 计划。',
      },
    ],
  },
  geo: {
    structuredData: {
      organizationName: 'DueDateHQ',
      organizationDescription: 'DueDateHQ 为美国 CPA 团队构建玻璃盒截止日智能软件。',
      websiteName: 'DueDateHQ',
      productName: 'DueDateHQ',
      productDescription:
        '面向 CPA 团队的可追溯截止日智能工作台，用于管理申报风险、州税更新、证据复核和共享截止日运营。',
      audience: '美国 CPA 团队',
    },
    rules: {
      meta: {
        title: 'DueDateHQ 规则库 — 带官方来源的税务截止日覆盖',
        description:
          '了解 DueDateHQ 如何把 IRS 与州级申报规则转化为带官方来源、客户上下文、人工复核、证据抽屉和审计历史的 CPA 截止日工作流。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '规则库',
        title: '一条申报规则如何变成 CPA 团队可信的工作？',
        description:
          'DueDateHQ 把规则、来源证据、生成的截止日、提醒和人工复核放在同一条工作流里。规则只有在团队能看到官方来源、受影响客户上下文和操作历史时，才真正有用。',
        note: '覆盖页面描述软件行为，不构成专业税务建议。',
      },
      sections: [
        {
          eyebrow: '来源接入',
          title: '优先使用官方来源。',
          body: '规则工作流从公开机构材料开始，而不是第三方摘要。DueDateHQ 优先处理 IRS publication、州税务机关页面、申报日历、表单说明、公告和灾害延期信息。',
          items: [
            {
              title: 'Canonical 来源 URL',
              body: '每条规则保留官方页面 URL，便于复核者和用户查看同一来源。',
            },
            {
              title: '来源摘录',
              body: '短摘录会作为复核上下文保留；产品避免在截止日工作流中输出没有来源支撑的摘要。',
            },
            {
              title: '复核时间戳',
              body: '规则带有验证时间戳，让 CPA 团队知道来源最近一次被复核的时间。',
            },
          ],
        },
        {
          eyebrow: '复核模型',
          title: 'AI 可以辅助，但不能成为事实来源。',
          body: '只有当来源上下文存在时，DueDateHQ 才让 AI 辅助总结、分类和草拟运营变更。真正应用到截止日运营前，仍需要人工复核。',
          items: [
            {
              title: '必须人工复核',
              body: '规则在复核状态明确之前，不会被视为可直接用于运营。',
            },
            {
              title: '不输出黑盒建议',
              body: '缺少来源上下文时，工作会进入需要验证状态，而不是生成静默建议。',
            },
            {
              title: '可审计变更',
              body: '应用、撤销和回滚流程都设计为给事务所留下运营记录。',
            },
          ],
        },
      ],
      faqHeader: {
        eyebrow: 'FAQ',
        title: '规则工作流常见问题。',
      },
      faq: [
        {
          question: '如果 AI 参与处理规则，事务所还能信任它吗？',
          answer:
            '只有当规则保留官方来源上下文和复核状态时才值得信任。DueDateHQ 可以让 AI 辅助总结或分类，但来源和复核决定才是信任边界。',
        },
        {
          question: '规则影响 Deadlines 或今天页分诊前会发生什么？',
          answer:
            '规则需要来源证据、归一化的申报上下文和复核状态，之后才可能生成或更新截止日工作。产品不会根据没有支撑的信号静默改变客户工作。',
        },
        {
          question: 'DueDateHQ 如何把规则变化连接到正确客户？',
          answer:
            '它使用事务所的客户申报档案、辖区、税种和截止日记录，把已复核变化路由到可能受影响客户的提醒、Deadlines 和分诊工作流。',
        },
      ],
      cta: {
        title: '查看哪些州信号在覆盖范围内。',
        body: '州覆盖页说明 DueDateHQ 如何监控美国所有州和 DC 的公开申报更新。',
        primary: '查看州覆盖',
        secondary: '查看价格',
      },
    },
    stateCoverage: {
      meta: {
        title: 'DueDateHQ 州覆盖 — 50 州和 DC 申报信号',
        description:
          'DueDateHQ 说明哪些州级申报更新会进入监控，提醒如何把公开来源信号送入人工复核，以及 CPA 团队如何结合客户事实判断影响范围。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '州覆盖',
        title: '哪些州级更新会变成事务所的截止日工作？',
        description:
          'DueDateHQ 公开覆盖已经扩展到美国 50 州和 DC。覆盖表示公开州级信号可以被监控、匹配事务所客户上下文，并在影响截止日运营前进入提醒复核。',
        note: '覆盖是软件监控范围，不代表每项义务都适用于每个事务所。',
      },
      statesHeader: {
        eyebrow: '已发布覆盖',
        title: '已发布的州详情页。',
      },
      states: [
        {
          slug: 'california',
          name: 'California',
          abbreviation: 'CA',
          status: '已上线',
          body: 'FTB 公开申报更新、截止日公告、表单说明变化和延期救济信息，均可进入 CPA 截止日分诊复核。',
          href: '/zh-CN/states/california',
        },
        {
          slug: 'new-york',
          name: 'New York',
          abbreviation: 'NY',
          status: '已上线',
          body: 'Department of Taxation and Finance 更新、申报公告、日历变化和州级信号会进入证据复核。',
          href: '/zh-CN/states/new-york',
        },
        {
          slug: 'texas',
          name: 'Texas',
          abbreviation: 'TX',
          status: '已上线',
          body: 'Comptroller 更新、franchise tax 申报信号、公开公告变化和截止日相关通知。',
          href: '/zh-CN/states/texas',
        },
        {
          slug: 'florida',
          name: 'Florida',
          abbreviation: 'FL',
          status: '已上线',
          body: 'Department of Revenue 更新、公开公告、救济信息和与 CPA 运营相关的申报页面变化。',
          href: '/zh-CN/states/florida',
        },
        {
          slug: 'washington',
          name: 'Washington',
          abbreviation: 'WA',
          status: '已上线',
          body: 'Department of Revenue 公开更新、到期日公告和可进入复核工作流的官方申报信号。',
          href: '/zh-CN/states/washington',
        },
      ],
      sourceModel: {
        eyebrow: '来源模型',
        title: '覆盖是一条从公开信号到客户影响复核的路径。',
        body: '覆盖从公开监控开始，然后把候选变更送入带来源的复核。只有当来源证据、客户匹配上下文、复核决定和审计历史都存在时，信号才会成为运营工作。',
        items: [
          {
            title: '公开机构来源',
            body: 'DueDateHQ 优先处理官方税务机关页面、申报日历、表单说明、公告和紧急救济页面。',
          },
          {
            title: '事务所特定适用性',
            body: '覆盖不代表每个信号都适用于每个客户。工作台帮助事务所根据自己的客户画像复核影响。',
          },
          {
            title: '运营交接',
            body: '相关变更复核后，可以出现在今天页、Deadlines 和邮件工作流中。',
          },
        ],
      },
      faqHeader: {
        eyebrow: 'FAQ',
        title: '州级监控常见问题。',
      },
      faq: [
        {
          question: 'DueDateHQ 当前监控哪些州？',
          answer:
            'DueDateHQ 公开覆盖已经扩展到美国 50 州和 DC。带来源的候选规则仍需要复核后，才能成为可提醒的工作项。',
        },
        {
          question: '州级更新如何变成事务所工作？',
          answer:
            '候选更新会带来源上下文进入提醒队列，先复核相关性，然后可以被应用、标记已复核或回滚，并留下审计记录。',
        },
        {
          question: '覆盖是否代表更新适用于每个客户？',
          answer: '不是。覆盖描述监控范围。适用性取决于事务所客户申报档案、辖区、税种和专业复核。',
        },
      ],
    },
    states: [
      {
        slug: 'california',
        name: 'California',
        abbreviation: 'CA',
        meta: {
          title: 'California 税务截止日监控 — DueDateHQ 州覆盖',
          description:
            '了解 DueDateHQ 如何用官方 source URL、来源摘录、验证时间戳和人工复核监控 California FTB 公开申报信号，并在影响客户队列前保留证据上下文。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '州覆盖 · CA',
          title: '带来源复核的 California 申报信号。',
          description:
            'DueDateHQ 监控可能影响 CPA 截止日运营的 California 公开申报更新，并在变成运营工作之前把候选变化送入证据复核。',
          note: 'California 覆盖描述监控范围，不构成税务建议。',
        },
        sourceTypes: [
          {
            title: 'FTB 公开页面',
            body: '官方 Franchise Tax Board 页面和公开截止日材料优先于摘要来源。',
          },
          {
            title: '表单说明',
            body: '表单级说明和日历引用可作为规则复核的来源上下文。',
          },
          {
            title: '延期救济公告',
            body: '公开延期和灾害救济公告可以触发事务所影响复核。',
          },
        ],
        coveredSignals: [
          {
            title: '截止日变化',
            body: '可能影响实体、个人或预估税工作流的公开到期日指导变化。',
          },
          {
            title: '适用性线索',
            body: '县、灾害、纳税人类型、表单和期间引用会作为复核上下文保留。',
          },
          {
            title: '运营路由',
            body: '当事务所数据提示可能受影响时，已复核信号可以出现在今天页或 Deadlines 动作中。',
          },
        ],
        limitations: [
          'DueDateHQ 不会在没有事务所复核的情况下判断 California 规则是否适用。',
          '覆盖取决于公开来源可用性和复核状态。',
          '私人通知和客户特定通信不属于公开州覆盖。',
        ],
        faq: [
          {
            question: '哪些 California 信号会影响客户队列？',
            answer:
              'FTB 公开更新、表单说明、申报日历和延期救济公告，在可能影响截止日时间或客户适用性时，可以成为复核工作。',
          },
          {
            question: 'California 更新如何变成运营工作？',
            answer:
              'DueDateHQ 会保留官方来源、适用性线索，并匹配事务所客户上下文；信号在影响今天页或 Deadlines 工作前需要先复核。',
          },
        ],
      },
      {
        slug: 'new-york',
        name: 'New York',
        abbreviation: 'NY',
        meta: {
          title: 'New York 税务截止日监控 — DueDateHQ 州覆盖',
          description:
            '了解 DueDateHQ 如何用官方来源上下文、来源摘录、客户申报档案和人工复核监控 New York 公开税务申报信号，避免把州级更新直接变成黑盒截止日。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '州覆盖 · NY',
          title: '进入证据复核的 New York 申报更新。',
          description:
            'DueDateHQ 监控 New York 税务机关公开更新，并在申报信号可能影响截止日运营时保留来源上下文。',
          note: 'New York 覆盖描述产品范围，不是申报建议。',
        },
        sourceTypes: [
          {
            title: 'DTF 公开更新',
            body: '官方 Department of Taxation and Finance 页面是优先来源。',
          },
          {
            title: '申报日历',
            body: '日历和表单引用可以成为截止日运营复核上下文。',
          },
          {
            title: '官方公告',
            body: '当公开公告和申报通知含有截止日影响时，会进入复核。',
          },
        ],
        coveredSignals: [
          {
            title: '州级截止日移动',
            body: '候选到期日变化会保留 source URL、摘录和验证元数据。',
          },
          {
            title: '表单级上下文',
            body: '表单、期间、纳税人类型和辖区细节会保留给人工复核。',
          },
          {
            title: '事务所影响工作流',
            body: '已复核变更可在生成运营工作前匹配事务所管理的客户。',
          },
        ],
        limitations: [
          'DueDateHQ 不能替代合格专业人士对 New York 来源的复核。',
          '覆盖限制在公开材料和已复核产品工作流。',
          '客户特定通信不在公开监控范围内。',
        ],
        faq: [
          {
            question: '运营负责人应该关注哪些 New York 更新？',
            answer: '公开 DTF 更新、申报日历、公告和表单级变化，是最可能形成截止日复核工作的信号。',
          },
          {
            question: 'New York 信号会自动改变客户截止日吗？',
            answer: '不会。候选变化需要来源复核、客户上下文匹配和人工操作后才能用于运营。',
          },
        ],
      },
      {
        slug: 'texas',
        name: 'Texas',
        abbreviation: 'TX',
        meta: {
          title: 'Texas 申报截止日监控 — DueDateHQ 州覆盖',
          description:
            '了解 DueDateHQ 如何为 CPA 截止日运营监控 Texas Comptroller 公开申报信号、franchise tax 截止日更新、来源证据和人工复核状态。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '州覆盖 · TX',
          title: '面向 CPA 截止日运营的 Texas 申报信号。',
          description:
            'DueDateHQ 监控 Texas Comptroller 公开更新，并在信号可能影响截止日分诊时保留来源证据。',
          note: 'Texas 覆盖是产品监控范围，应对照官方来源核验。',
        },
        sourceTypes: [
          {
            title: 'Comptroller 更新',
            body: 'Texas Comptroller 公开页面和官方申报公告会被优先复核。',
          },
          {
            title: 'Franchise tax 信号',
            body: '公开 franchise tax 截止日和表单引用可进入证据复核。',
          },
          {
            title: '救济公告',
            body: '当官方救济或延期材料点名受影响纳税人或期间时，可触发影响复核。',
          },
        ],
        coveredSignals: [
          {
            title: '截止日影响',
            body: '到期日变化和申报窗口更新会作为候选运营信号被捕获。',
          },
          {
            title: '实体上下文',
            body: '实体类型、申报期间和表单引用会在可用时保留。',
          },
          {
            title: '复核交接',
            body: '已复核信号可以成为 CPA 团队管理受影响客户的 Deadlines 动作。',
          },
        ],
        limitations: [
          'DueDateHQ 不判断 Texas 税务处理。',
          '覆盖取决于公开来源清晰度和复核状态。',
          '私人机构通信不属于公开监控。',
        ],
        faq: [
          {
            question: '哪些 Texas 信号对截止日运营重要？',
            answer:
              'Franchise tax 更新很重要，但工作流也会关注公开申报公告、截止日移动、救济材料和实体上下文信号。',
          },
          {
            question: 'Texas 来源信号复核后会发生什么？',
            answer:
              '已复核信号可以成为受影响客户的 Deadlines 动作或分诊上下文；申报决策仍属于 CPA 事务所。',
          },
        ],
      },
      {
        slug: 'florida',
        name: 'Florida',
        abbreviation: 'FL',
        meta: {
          title: 'Florida 申报截止日监控 — DueDateHQ 州覆盖',
          description:
            '了解 DueDateHQ 如何用证据复核、来源摘录、客户上下文和提醒复核监控 Florida 公开申报公告、救济信息和截止日相关州级更新。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '州覆盖 · FL',
          title: '带来源上下文的 Florida 公开申报更新。',
          description:
            'DueDateHQ 监控可能影响 CPA 截止日工作流的 Florida Department of Revenue 公开更新和救济公告。',
          note: 'Florida 覆盖描述公开监控，不构成合规建议。',
        },
        sourceTypes: [
          {
            title: 'DOR 公开页面',
            body: '官方 Florida Department of Revenue 材料会被优先用于来源复核。',
          },
          {
            title: '公开公告',
            body: '当申报公告和更新含有明确运营影响时，可成为候选截止日信号。',
          },
          {
            title: '救济公告',
            body: '紧急或灾害相关公开公告会被跟踪是否存在截止日影响。',
          },
        ],
        coveredSignals: [
          {
            title: '申报页面变化',
            body: '截止日、说明或申报窗口的公开变化可以进入复核队列。',
          },
          {
            title: '受影响期间上下文',
            body: '日期、期间、纳税人类别和地理约束会在出现时保留。',
          },
          {
            title: '证据抽屉工作流',
            body: '来源 URL、摘录和验证元数据会保留给复核者查看。',
          },
        ],
        limitations: [
          'DueDateHQ 不保证适用于某个具体 Florida 客户。',
          '覆盖限制在公开来源和已复核工作流。',
          '仍需要根据官方州级材料进行专业核验。',
        ],
        faq: [
          {
            question: '哪些 Florida 更新可以进入提醒？',
            answer:
              '公开 DOR 更新、公告、救济信息和申报窗口变化，在可能影响事务所截止日运营时可以进入提醒。',
          },
          {
            question: 'DueDateHQ 会判断某个 Florida 客户是否适用吗？',
            answer: '不会。它保留来源上下文并运营化复核，但适用性仍取决于客户事实和专业判断。',
          },
        ],
      },
      {
        slug: 'washington',
        name: 'Washington',
        abbreviation: 'WA',
        meta: {
          title: 'Washington 申报截止日监控 — DueDateHQ 州覆盖',
          description:
            '了解 DueDateHQ 如何用官方来源证据、验证元数据和人工复核工作流监控 Washington Department of Revenue 公开申报信号，并把可能影响客户的更新送入截止日运营。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '州覆盖 · WA',
          title: '与官方来源绑定的 Washington 申报信号。',
          description:
            'DueDateHQ 监控 Washington Department of Revenue 公开材料中可能需要 CPA 来源复核的申报信号。',
          note: 'Washington 覆盖是软件范围，不构成税务建议。',
        },
        sourceTypes: [
          {
            title: 'DOR 公开更新',
            body: '官方 Department of Revenue 更新会被视为主要来源材料。',
          },
          {
            title: '到期日公告',
            body: '当公开到期日和申报窗口公告影响运营时，可进入复核。',
          },
          {
            title: '说明变化',
            body: '公开说明更新可与来源摘录和验证元数据一起保存。',
          },
        ],
        coveredSignals: [
          {
            title: '截止日运营',
            body: '信号在成为今天页或 Deadlines 项目前会被评估运营影响。',
          },
          {
            title: '适用性上下文',
            body: '表单、期间、纳税人类型和官方文本会在来源提供时保留。',
          },
          {
            title: '人工复核',
            body: '人工复核会在事务所工作流把信号视为可操作之前拦截。',
          },
        ],
        limitations: [
          'DueDateHQ 不是 Washington 税务机关。',
          '覆盖取决于公开来源可见性和产品复核状态。',
          '客户特定义务需要 CPA 复核。',
        ],
        faq: [
          {
            question: 'DueDateHQ 会把哪些 Washington 信号送入复核？',
            answer:
              '公开 DOR 更新、到期日公告、申报窗口变化和说明更新，在影响运营时间时可以进入复核。',
          },
          {
            question: '处理 Washington 信号前应该先看什么？',
            answer: '在改变客户工作之前，先查看附带的官方来源、匹配到的客户上下文，并判断适用性。',
          },
        ],
      },
    ],
    guides: [
      {
        slug: 'cpa-deadline-risk',
        meta: {
          title: 'CPA 截止日风险指南 — 如何在罚款前看清风险',
          description:
            '了解 CPA 团队如何结合迁移数据、来源证据、负责人、资料准备状态、罚款敞口、州级提醒和审计历史判断本周先处理哪个客户截止日。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '指南',
          title: 'CPA 团队本周应该先处理哪个截止日？',
          description:
            'DueDateHQ 把截止日风险当作运营排序问题处理。导入的客户事实、申报档案、州级更新、证据状态、准备状态和负责人分配，都会影响什么应该排到最前面。',
          note: '本指南解释运营风险模式，不构成税务建议。',
        },
        sections: [
          {
            eyebrow: '风险模型',
            title: '真正危险的截止日，是上下文缺失或不匹配的截止日。',
            body: '日历上的日期只是截止日运营的一部分。CPA 团队还需要导入的客户事实、申报档案、义务状态、辖区覆盖、证据来源和负责人分配。',
            items: [
              {
                title: '客户事实缺失',
                body: '实体类型、州足迹、财年和延期状态都会改变截止日是否重要。',
              },
              {
                title: '来源不确定',
                body: '来自记忆或第三方笔记的规则，远不如绑定官方来源的规则可信。',
              },
              {
                title: 'Owner 缺口',
                body: '当没有人负责复核、申报或补齐缺失数据时，截止日工作就会变危险。',
              },
            ],
          },
          {
            eyebrow: '分诊',
            title: '周一工作流应该排序风险，而不仅是排序日期。',
            body: '当团队能在一个运营视图中扫描剩余天数、证据完整度、准备状态、州级更新和工作 owner 时，截止日风险才可管理。',
            items: [
              {
                title: '准备状态信号',
                body: '风险队列应该显示哪些截止日被缺失事实、过期证据或 owner 缺口阻塞。',
              },
              {
                title: '证据完整度',
                body: '缺失或过期来源证据的行，应先复核再信任。',
              },
              {
                title: '州税变化影响',
                body: '州级申报更新只有在能匹配到可能受影响客户时，才真正重要。',
              },
            ],
          },
        ],
        faqHeader: {
          eyebrow: 'FAQ',
          title: 'CPA 截止日风险常见问题。',
        },
        faq: [
          {
            question: 'CPA 团队应该先处理哪个截止日？',
            answer:
              '第一个事项通常不只是最早到期的日期。DueDateHQ 会结合剩余天数、状态、来源质量、客户上下文、准备状态和 owner 信号排序。',
          },
          {
            question: '导入的客户数据如何影响截止日风险？',
            answer:
              'Migration 数据会形成分诊所需的客户和义务上下文。实体类型、申报州、税种、owner 和 liability 输入都会改变风险图景。',
          },
          {
            question: '什么样的截止日队列是可解释的？',
            answer:
              '队列应该把来源证据、罚款原因、客户上下文、状态变化和审计历史放在动作附近，让事务所能解释为什么先处理这件事。',
          },
        ],
        cta: {
          title: '查看带证据的产品模型。',
          body: 'DueDateHQ 把截止日风险转化为带来源的运营工作。',
          primary: '阅读证据指南',
          secondary: '查看规则库',
        },
      },
      {
        slug: 'evidence-backed-tax-deadline-software',
        meta: {
          title: '带证据的税务截止日软件 — DueDateHQ 指南',
          description:
            '了解 CPA 团队在截止日、提醒、AI 建议或迁移动作改变客户工作前，应该保留哪些官方来源、摘录、验证元数据、复核状态和审计历史。',
          ogImage: '/og/home.zh-CN.png',
        },
        hero: {
          eyebrow: '指南',
          title: '截止日工作改变前，应该先有什么证据？',
          description:
            '对 CPA 运营来说，申报提醒不够。团队需要来源证据、复核状态、客户上下文、必要时的 AI trace，以及 apply、undo、revert 和导入动作的审计历史。',
          note: '带证据工作流支持复核，不替代专业判断。',
        },
        sections: [
          {
            eyebrow: '定义',
            title: '带证据意味着每个运营主张都可检查。',
            body: '产品应保留足够上下文，让复核者理解规则、截止日、提醒或迁移创建的义务从哪里来、为什么进入工作流。',
            items: [
              {
                title: '来源 URL',
                body: '官方页面始终附着在规则或信号上。',
              },
              {
                title: '来源摘录',
                body: '相关段落在运营动作附近可见。',
              },
              {
                title: '复核元数据',
                body: '产品记录来源何时被复核，以及当前复核状态。',
              },
            ],
          },
          {
            eyebrow: '工作流',
            title: '缺少证据时，界面应该 fail closed。',
            body: '如果规则缺少来源上下文，更安全的产品行为是请求验证，而不是生成自信的截止日建议。',
            items: [
              {
                title: '需要验证状态',
                body: '模糊或没有支撑的信号应该以复核工作形式可见。',
              },
              {
                title: '人工批准后应用',
                body: '事务所中的人应该在运营变化影响客户工作前批准它。',
              },
              {
                title: '审计历史',
                body: '应用、撤销和回滚动作应留下事务所之后可检查的记录。',
              },
            ],
          },
        ],
        faqHeader: {
          eyebrow: 'FAQ',
          title: '带证据软件常见问题。',
        },
        faq: [
          {
            question: '截止日改变前应该有哪些证据？',
            answer:
              '复核者应看到官方 source URL、相关摘录、验证元数据、客户上下文、复核状态和本次变更的审计事件。',
          },
          {
            question: '提醒应用和回滚如何保持可审计？',
            answer:
              '提醒决策是显式动作。应用、标记已复核和回滚都会保留来源上下文并写入审计记录，便于事务所检查发生了什么以及为什么。',
          },
          {
            question: 'AI 在带证据工作流中扮演什么角色？',
            answer:
              'AI 可以映射导入字段、归一化信息、总结来源变化或草拟运营上下文，但复核状态、来源证据和人工动作仍是控制点。',
          },
        ],
        cta: {
          title: '查看公开规则模型。',
          body: 'DueDateHQ 规则库说明带来源信号如何进入截止日工作流。',
          primary: '打开规则库',
          secondary: '查看州覆盖',
        },
      },
    ],
  },
  notFound: {
    meta: {
      title: '页面未找到 — DueDateHQ',
      description: '这个 DueDateHQ 公开页面暂不可用。你可以返回首页或查看价格页。',
      ogImage: '/og/home.zh-CN.png',
    },
    eyebrow: '404 · PUBLIC PAGE NOT FOUND',
    title: '这个页面暂不可用。',
    body: '公开 marketing 站只提供已经发布的 DueDateHQ 页面。你可以返回首页、查看价格页，或直接打开工作台。',
    primaryCta: '返回首页',
    secondaryCta: '查看价格',
    statusLabel: 'ROUTE STATUS',
    statusValue: '未加载客户数据',
    routesLabel: 'PUBLISHED PATHS',
    routes: [
      { label: '首页', href: '/zh-CN' },
      { label: '价格', href: '/zh-CN/pricing' },
      { label: '打开工作台', href: 'app' },
    ],
  },
  footer: {
    brand: 'DueDateHQ',
    tagline: '面向美国 CPA 团队的玻璃盒截止日智能。',
    audience: 'For US CPA practices · 可审计 · 50 州 + DC',
    columns: [
      {
        title: 'PRODUCT',
        links: [
          { label: 'Workbench', href: '/zh-CN#hero' },
          { label: '提醒', href: '/zh-CN#workflow' },
          { label: 'Migration Copilot', href: '/zh-CN/guides/cpa-deadline-risk' },
          { label: '证据抽屉', href: '/zh-CN/rules' },
          { label: '价格', href: '/zh-CN/pricing' },
        ],
      },
      {
        title: 'RESOURCES',
        links: [
          { label: '规则库', href: '/zh-CN/rules' },
          { label: '州覆盖', href: '/zh-CN/state-coverage' },
          { label: 'CPA 截止日风险', href: '/zh-CN/guides/cpa-deadline-risk' },
          {
            label: '带证据的软件',
            href: '/zh-CN/guides/evidence-backed-tax-deadline-software',
          },
          { label: 'Form 7004 参考', href: '/zh-CN/rules/form-7004-extension-deadline' },
          { label: '每周分诊', href: '/zh-CN/guides/weekly-cpa-deadline-triage' },
          { label: 'File In Time 对比', href: '/zh-CN/compare/file-in-time-alternative' },
          { label: '状态', href: '/zh-CN/status' },
        ],
      },
      {
        title: 'COMPANY',
        links: [
          { label: '关于', href: '/zh-CN/about' },
          { label: '安全', href: '/zh-CN/security' },
          { label: '隐私', href: '/zh-CN/privacy' },
          { label: '条款', href: '/zh-CN/terms' },
          { label: '联系', href: 'mailto:sales@duedatehq.com?subject=DueDateHQ' },
        ],
      },
    ],
    copyright: '© 2026 DueDateHQ Inc. · due.langgenius.app',
    theme: {
      label: '主题',
      system: '跟随系统',
      light: '浅色',
      dark: '深色',
    },
    language: {
      label: '语言',
      enShort: 'EN',
      zhShort: '中',
      enLong: 'English',
      zhLong: '简体中文',
    },
    status: 'all systems operational',
  },
}

export default zhCN
