---
title: 'Translate 256 zh-CN strings: replace English placeholders with proper Simplified Chinese'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: i18n
---

# Translate 256 zh-CN strings

## Context

Earlier today's commit `bf874f1` filled 256 newly-added zh-CN catalog
entries with English placeholders so `lingui compile --strict` would
pass. This commit replaces those placeholders with proper Simplified
Chinese translations.

## Translation approach

A single-pass script (`/tmp/translate-zh-cn.py`, not committed) walked
the catalog and applied a static dict of 256 English→Chinese mappings.
Translations were written to match the existing 2,039 entries'
voice — formal-practical, CPA-domain vocabulary, consistent with the
established translations of core nouns:

| English                 | Chinese (used here)                             |
| ----------------------- | ----------------------------------------------- |
| firm / practice         | 事务所                                          |
| client                  | 客户                                            |
| obligation              | 申报义务                                        |
| rule                    | 规则                                            |
| due date                | 截止日                                          |
| in review               | 复核中                                          |
| waiting on client       | 等待客户                                        |
| blocked                 | 受阻                                            |
| filed                   | 已申报                                          |
| accepted (rule)         | 已接受                                          |
| rejected (rule)         | 已拒绝                                          |
| accepted (by authority) | 已被税务机关接受                                |
| rejected (by authority) | 已被税务机关拒绝                                |
| coverage                | 覆盖                                            |
| jurisdiction            | 司法管辖区                                      |
| evidence                | 证据                                            |
| extension               | 延期                                            |
| workpapers              | 工作底稿                                        |
| engagement letter       | 业务约定书                                      |
| 8879 (IRS e-file auth)  | 8879 (kept as-is — the form number IS the term) |

## Plural-form simplification

English plurals like
`{0, plural, one {# day past due} other {# days past due}}`
became
`{0, plural, other {逾期 # 天}}`

Chinese has no singular/plural distinction in nouns, so only the
`other` case is retained. Lingui handles this — the existing 2,039
entries follow the same pattern.

## What's covered

The 256 strings span every surface touched today:

- **Rule Library V3**: stats bar, batch review modal, new rule modal,
  gap rows, By-Entity filter (CONFIGURE / DISCOVER labels, etc.).
- **ObligationPanelV2**: pipeline status labels, milestone timeline,
  stage detail copy, the "Try the new panel shape →" toggle.
- **SurfaceSummaryStrip primitive**: "at risk", "missing facts",
  "Pulse hits" — short tile labels.
- **Pulse vocabulary**: severity scale terminology.
- **Client fields** (new from teammate's commit): "Sole proprietorship",
  "C Corporation", "S Corporation", "Other states", etc.
- **Status taxonomy**: every lifecycle V2 state + sub-status copy
  ("Accepted by authority", "Submitted, awaiting acceptance", etc.).
- **Action labels**: "Mark filed", "Mark 8879 signed", "Send readiness
  request", etc.

## Verification

- `pnpm run i18n:compile` → exits 0 (strict mode passes).
- Spot-check: "New custom rule" → 新建自定义规则 ✓
- Spot-check: "DISCOVER" → 发现 ✓
- Spot-check: "Reviewing pending rules" → 正在审核待审规则 ✓

## What's NOT included

This pass is a single-pass translation by an AI assistant. It needs:

1. **Native-speaker review.** I matched established vocabulary and
   tested compile, but tone calibration on specific phrases
   (microcopy, error messages, button labels) is worth a human pass
   before a real zh-CN release. Likely candidates for review:
   - "Try the new panel shape →" (试试新的面板形态 →) — could be
     warmer.
   - "Pulse hits" — kept as "Pulse 命中"; if the product team has
     a localized name for Pulse alerts, swap in.
   - "8879" form-number references — kept as-is, may or may not be
     conventional in China-localized US-CPA contexts.

2. **Brand-tone polish.** The translations are _accurate_, not
   necessarily _brand-voice-tuned_. If Yuqi has a Chinese brand voice
   doc, a follow-up edit pass would tighten everything.

3. **Plural variant testing.** Lingui's plural collapse to `other`
   means the same string fires for #=1 and #>1. CPAs reading
   `1 项缺失` vs `5 项缺失` should both read naturally. Looks fine to
   me but worth eyeballing in the actual UI.
