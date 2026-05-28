# 2026-05-28 — Responsive contract: desktop-first, no mobile

## What

把"不做 mobile"这条 product-level 决策 codify 进 `design-language-synthesis-2026-05-28.md`：

- §6 Surface dimensions 新增"Responsive contract"小节
- §19 Anti-patterns 新增第 20 条：禁止为 < 1024px 加 mobile-specific layout / 断点
- §20 决策框架速查表新增"要为手机 / 窄屏做适配吗？"问答

## Why

之前的 audit 任务 #65 只覆盖了 `/clients` + `/clients/[id]`。inspection 跑了一遍发现：

- Sidebar 是真正响应式的（`useIsMobile` + 768 breakpoint + 280px mobile Sheet drawer）
- `/obligations` 重度响应式（23 处断点）
- 其余路由：dashboard、settings 家族、rules.\*、workload 等大多 0-3 处断点
- 表格主件没 `overflow-x-auto`，硬编 `min-w-[200px]` 在窄屏直接溢出
- `needs-attention-section` 用 `grid-cols-2 + 160px overflow column` 不折叠

Yuqi 明确："不需要关注 mobile"。把这条写死，避免下一轮 audit 误把"不支持 mobile"
当成 bug 去修。

## Viewport 支持矩阵（写入 §6）

| viewport    | 状态                                  |
| ----------- | ------------------------------------- |
| ≥ 1280px    | ✅ 主要设计目标                       |
| 1024–1279px | ✅ 必须可用（允许密度降级，功能完整） |
| 768–1023px  | ⚠️ best-effort（不做 QA / 设计 pass） |
| < 768px     | ❌ 不支持                             |

## 影响

- 已知"问题"（needs-attention 在 < 720px 挤、表格 < 1024px 横溢出）**不修** — 不在支持范围
- 不再投资 `useIsMobile` 之外的 JS 视口检测
- 不引入 `sm:` / `xs:` 之类 phone 断点
- 已有的 `md:` (768px) padding bump 保留 — 无害福利

## Files

- `docs/Design/design-language-synthesis-2026-05-28.md` — §6 + §19 + §20
- `docs/dev-log/2026-05-28-responsive-contract.md` — 本文
