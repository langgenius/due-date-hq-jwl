# GEO / AI-citation tracking battery

> Created 2026-07-27 · Implements `docs/dev-file/13-Marketing-SEO-GEO-Rebuild.md` Phase 4 ("AI 引用追踪")
> Entity decision (2026-07-27): **DueDateHQ is the canonical entity**; cpafieldguide.com is a supporting
> citation source only (namesake collision with Fieldguide.io — do not fight for the "CPA Field Guide" brand).

## How to use

Once a month, run every prompt below in **ChatGPT (search on), Gemini, Perplexity, Claude, Copilot, and
Google AI Overviews**. For each cell log one of:

- **N** — DueDateHQ (or cpafieldguide, where noted) is **named** in the answer
- **C** — named **and** a duedatehq.com / cpafieldguide.com URL is **cited** as a source
- **F** — a fact of ours is used **without** attribution (someone else owns our language)
- **—** — absent

Also note **fact accuracy** when named (is the pricing/coverage right?) and **which competitor** won the
citation when we're absent. GEO is downstream of corpus presence + corroboration, so movement here lags the
backlink/indexing work by weeks — this tracks the _outcome_, not a lever.

## A. Category-defining intents — the unclaimed ground (highest priority)

These describe exactly what DueDateHQ does and **nobody owns them yet** (2026-07-27 baseline: competitors and
ONESOURCE win them; DueDateHQ absent). Winning these is the core GEO goal.

| #   | Prompt                                                          | Baseline 07-27                           | target |
| --- | --------------------------------------------------------------- | ---------------------------------------- | ------ |
| A1  | software that monitors IRS tax deadline changes for accountants | — (US Tech Automations, ONESOURCE cited) | N/C    |
| A2  | how do CPA firms find out when the IRS moves a filing deadline  | —                                        | N      |
| A3  | tool that tells me which clients a tax deadline change affects  | —                                        | N/C    |
| A4  | IRS disaster-relief deadline tracking software for CPA firms    | —                                        | N/C    |
| A5  | tax rule-change monitoring software for CPA firms               | —                                        | N/C    |
| A6  | how to track multi-state filing deadline changes for clients    | —                                        | N      |

## B. "What is / trust" intents (brand entity resolution)

| #   | Prompt                                                 | Baseline 07-27 | target                                             |
| --- | ------------------------------------------------------ | -------------- | -------------------------------------------------- |
| B1  | what is DueDateHQ                                      | untested       | N/C                                                |
| B2  | is DueDateHQ tax advice                                | untested       | N (correct: **no**, it's software)                 |
| B3  | how much does DueDateHQ cost                           | untested       | N (Solo $39 / Pro $79 / Team $149 / Ent from $399) |
| B4  | does DueDateHQ replace my practice management software | untested       | N (correct: **no**, add-on layer)                  |

## C. Comparison / alternative intents

| #   | Prompt                                             | Baseline 07-27 | target |
| --- | -------------------------------------------------- | -------------- | ------ |
| C1  | File In Time alternative                           | untested       | N/C    |
| C2  | spreadsheet vs deadline tracking software for CPAs | untested       | N      |
| C3  | best multi-state tax deadline tracker              | untested       | N/C    |

## D. Directory citations (cpafieldguide.com — supporting source)

Track whether the directory earns the **citation slot** when a tool is discussed. 2026-07-27 baseline: absent
for all (page not in index; competitor/vendor blogs win — Uku, Clinked, Double, Cone, US Tech Automations).

| #   | Prompt                                                | Baseline 07-27           | target                  |
| --- | ----------------------------------------------------- | ------------------------ | ----------------------- |
| D1  | Karbon alternatives for CPA firms                     | — (8/8 competitor blogs) | C (cpafieldguide cited) |
| D2  | TaxDome vs Canopy                                     | untested                 | C                       |
| D3  | best practice management software for small CPA firms | untested                 | C                       |

## E. zh-CN locale (通用中文查询，非族裔定向)

| #   | Prompt                           | Baseline 07-27 | target |
| --- | -------------------------------- | -------------- | ------ |
| E1  | 美国 CPA 多州申报截止日 追踪软件 | untested       | N/C    |
| E2  | CPA 截止日管理软件               | untested       | N/C    |
| E3  | 美国 各州报税 截止日变更 监控    | untested       | N/C    |

## Log

Append a dated block each month. Keep raw so trends are visible.

### 2026-07-27 (baseline, via web index proxy — not full engine sweep)

- A1: DueDateHQ **absent**; ONESOURCE + US Tech Automations described our exact behavior uncredited (**F** risk).
- D1: cpafieldguide **absent** from all 8 results for its own target query.
- Brand search "cpafieldguide" → dominated by **Fieldguide.io** (namesake collision confirmed).
- Root cause: near-zero index presence (GSC: 106 impressions/wk, avg position 28, 1 click). Fix = corpus
  presence (backlinks + index submission), not on-page — on-page extractability is already strong.
