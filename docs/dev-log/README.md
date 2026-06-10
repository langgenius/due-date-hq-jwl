# Dev Log

开发过程中的关键决策与迭代记录。跟 `docs/dev-file/*`（稳定的架构规格）和 `docs/adr/*`（正式架构决策）分开：

- `docs/dev-file/`：**是什么** —— 当前生效的架构/接口/约束。读者默认这是最新的。
- `docs/adr/`：**为什么不那样** —— 形成过的正式决策（提案 / 状态 / 后果）。
- `docs/dev-log/`：**怎么走到这里** —— 一次具体的开发迭代做了什么、为什么做、遇到了什么、怎么验证。不强求格式，类似工程日志。

## 命名

`YYYY-MM-DD-<短标题>.md`，按日期排序。一天多条时追加序号或更具体的标题。

只收**带日期前缀的事后记录**。前瞻性的工作文档（实现 spec、工程简报 eng-brief、
roadmap、position memo 等）不属于这里——放到 `docs/product-design/<feature>/` 或
`docs/PRD/`。

## 模板（建议）

```md
---
title: '<标题>'
date: YYYY-MM-DD
author: '<name>'
updates:
  - note: '<why this log changed after the primary entry>'
---

# <标题>

## 背景

（改之前什么样、为什么要改）

## 做了什么

（改动要点 / 文件列表 / 关键代码片段）

## 为什么这样做

（权衡、放弃的备选、参考的最佳实践）

## 验证

（运行了哪些命令、观察了什么现象）

## 后续 / 未闭环

（遗留 TODO、埋点、需要写回规格文档的部分）
```

`updates` 只在日志被后续提交修正时填写，例如路径重命名、同主题 follow-up、关闭
上一条未闭环项。大多数 dev-log 只需要 `title / date / author` 三个字段。

## 什么时候写

- 重构或架构性调整（哪怕影响只有几个文件）
- 修了"为什么会这样"不直观的 bug（比如竞态、闪烁、缓存相关）
- 引入/替换了第三方依赖
- 决策了一个约定（例如"受保护组件禁止 `useSession`"）

纯功能开发不强求写，commit message 足够。
