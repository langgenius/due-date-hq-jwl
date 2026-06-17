# Runbook · 迁移到 LangGenius, Inc 账号 + duedatehq.com 上线

> 创建：2026-06-17 · 状态：待执行
>
> 目标：把整套生产栈从 **LangGenius OPC**（account `8f7d374db5cb1f025b7f71e28b84c9bb`，
> 域名 `due.langgenius.app` / `app.due.langgenius.app`）整体搬到 **LangGenius, Inc** 账号，
> 正式域名换为 **duedatehq.com**（营销首页）+ **app.duedatehq.com**（SaaS）。

## 0. 核心前提（先读）

- **Cloudflare 资源不能跨账号转移**。迁移 = 在新账号「重建同名资源 + 搬数据 + 改配置」。
- 新旧域名相互独立，**整个新栈可以与旧栈并行搭建、并行验证**，搭好前旧站照常运行，**零停机**。
- 只有 **D1 有需要保留的关系型数据**（规则 catalog / pulse / concrete-draft / 已核实证据）。
  其它资源要么是临时数据（KV）、要么可按需重生（R2）、要么休眠未用（Vectorize）。
- 资源**名字可以与旧账号完全一致**（D1 名 / R2 桶名 / Queue 名在「账号内」唯一即可），
  迁移只改 **account_id** 和 **会变的资源 ID**（D1 `database_id`、KV `id`），diff 最小、最不容易错。
  （是否顺手把 `-staging` 改名 `-prod` 见 §8 可选项，默认**不改名**。）

## 1. 准备：两个账号各一个 API token

新账号有 admin，去 Cloudflare 面板 → My Profile → API Tokens 各建一个：

- **OLD token**（OPC 账号，只读即可）：用于导出 D1。权限 `Account · D1 · Read`。
- **NEW token**（Inc 账号）：用于建资源 + 部署。权限至少：
  `Workers Scripts:Edit` · `D1:Edit` · `Workers KV Storage:Edit` · `R2:Edit` ·
  `Queues:Edit` · `Vectorize:Edit` · `Workers Routes:Edit` · `Account Settings:Read`。

记下两个 account id：

```
OLD_ACCOUNT_ID=8f7d374db5cb1f025b7f71e28b84c9bb
NEW_ACCOUNT_ID=<填 LangGenius, Inc 的 account id>
```

> 多账号下 wrangler 不会自动选对账号，**所有命令都显式带 `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`**，
> 不要依赖 `wrangler login` 的默认账号。命令都在 `apps/server` 目录下跑。

## 2. 从旧账号导出 D1（SQL dump）

此时 `apps/server/wrangler.toml` 仍指向 OPC，直接导出：

```bash
cd apps/server
CLOUDFLARE_ACCOUNT_ID=$OLD_ACCOUNT_ID CLOUDFLARE_API_TOKEN=$OLD_TOKEN \
  wrangler d1 export due-date-hq-staging --remote --output ../../d1-dump.sql
```

- dump 含 `CREATE TABLE` + 全部 `INSERT` + `d1_migrations` 历史表 → 导入后新库迁移状态自动对齐，
  首次 CI 部署的 `db:migrate:remote` 变成 no-op。
- 验证：`wc -l ../../d1-dump.sql`、`grep -c "INSERT INTO" ../../d1-dump.sql` 行数合理即可。
- ⚠️ 导出瞬间的数据是「快照」。当前处于 pre-launch（已清掉测试 firm，无真实客户写入），
  catalog/pulse 是系统生成数据，漂移风险低，一次性导出导入即可。若届时已有真实客户写入，
  选一个维护窗口、先在旧站冻结写入再导出。

## 3. 在新账号建资源

全部用 NEW token：

```bash
cd apps/server
export CLOUDFLARE_ACCOUNT_ID=$NEW_ACCOUNT_ID
export CLOUDFLARE_API_TOKEN=$NEW_TOKEN

# D1（记下输出的 database_id → 回填 toml）
wrangler d1 create due-date-hq-staging

# KV（记下输出的 id → 回填 toml）
wrangler kv namespace create CACHE

# R2 四个桶（数据不迁，建空桶；名字与旧账号一致）
wrangler r2 bucket create due-date-hq-pdf-staging
wrangler r2 bucket create due-date-hq-migration-staging
wrangler r2 bucket create due-date-hq-audit-staging
wrangler r2 bucket create due-date-hq-pulse-staging

# Queues（含 DLQ；或部署前用 pnpm cf:ensure-queues 一次性补齐）
wrangler queues create due-date-hq-email-staging
wrangler queues create due-date-hq-email-dlq-staging
wrangler queues create due-date-hq-pulse-staging
wrangler queues create due-date-hq-pulse-dlq-staging
wrangler queues create due-date-hq-dashboard-staging
wrangler queues create due-date-hq-dashboard-dlq-staging
wrangler queues create due-date-hq-audit-staging
wrangler queues create due-date-hq-audit-dlq-staging

# Vectorize：休眠未用。二选一——
#   (a) 建空 index 占位（保留绑定，需指定 dimensions/metric）：
# wrangler vectorize create due-date-hq-rules-staging --dimensions=768 --metric=cosine
#   (b) 推荐：删掉 toml 的 [[vectorize]] 块 + env.ts 的 VECTORS 字段（RAG 接线时再加回）。
```

> KV / Queues / Rate-limit / Cron 都无需迁数据，建好空的即可。Rate-limit（`unsafe.bindings`）和
> Cron triggers 是 Worker 配置，部署时自动生效，无独立资源。

## 4. （可选）迁 R2 历史对象

pdf / migration / audit 都可按需重生，**建议跳过**。只有 pulse 原始快照想留存档时拷：

```bash
# 用 rclone 走 R2 的 S3 API（两端各配一个 remote：old-r2 / new-r2）
rclone copy old-r2:due-date-hq-pulse-staging new-r2:due-date-hq-pulse-staging --progress
```

## 5. 把 D1 dump 导入新库

```bash
cd apps/server
CLOUDFLARE_ACCOUNT_ID=$NEW_ACCOUNT_ID CLOUDFLARE_API_TOKEN=$NEW_TOKEN \
  wrangler d1 execute due-date-hq-staging --remote --file ../../d1-dump.sql --yes
```

- 大文件 wrangler 会自动走 D1 import API，耐心等。
- 校验：
  ```bash
  CLOUDFLARE_ACCOUNT_ID=$NEW_ACCOUNT_ID CLOUDFLARE_API_TOKEN=$NEW_TOKEN \
    wrangler d1 execute due-date-hq-staging --remote \
    --command "SELECT name FROM sqlite_master WHERE type='table';"
  # 再抽查关键表行数：rules / rule_concrete_drafts / pulse_* 与旧库一致
  ```

## 6. 改仓库配置（拿到新 ID 后回填）

| 文件:行                                 | 改什么                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `apps/server/wrangler.toml:2`           | `account_id` → `NEW_ACCOUNT_ID`                      |
| `apps/server/wrangler.toml:31`          | `d1_databases.database_id` → 新 D1 id                |
| `apps/server/wrangler.toml:39`          | `kv_namespaces.id` → 新 KV id                        |
| `apps/server/wrangler.toml:152-153`     | `AUTH_URL` / `APP_URL` → `https://app.duedatehq.com` |
| `apps/server/wrangler.toml:154`         | `EMAIL_FROM` → `noreply@duedatehq.com`               |
| `apps/server/wrangler.toml:161`         | `AI_GATEWAY_ACCOUNT_ID` → `NEW_ACCOUNT_ID`           |
| `apps/marketing/wrangler.toml:20`       | `PUBLIC_APP_URL` → `https://app.duedatehq.com`       |
| `.github/workflows/ci.yml:116`          | `CLOUDFLARE_ACCOUNT_ID` → `NEW_ACCOUNT_ID`           |
| `.github/workflows/alert-recall.yml:37` | `CLOUDFLARE_ACCOUNT_ID` → `NEW_ACCOUNT_ID`           |

- R2 桶名 / Queue 名 / Vectorize index 名**不用改**（同名重建）。
- marketing toml 没有 `account_id`，靠部署时的 `CLOUDFLARE_ACCOUNT_ID`；可考虑显式加一行 `account_id` 防误部署到旧账号。
- dev-file `docs/dev-file/07-DevOps-Testing.md` 与 `docs/dev-log/2026-05-29-wrangler-account-id.md` 里
  旧 account id / 域名是说明文字，迁完后一并更新（非阻塞）。

## 7. 重配外部服务（与 Cloudflare 账号无关，但绑域名）

1. **Google OAuth**（client id 复用，去 Google Cloud Console 该 OAuth client）：
   - Authorized redirect URIs 增加 `https://app.duedatehq.com/api/auth/callback/google`
   - Authorized JS origins 增加 `https://app.duedatehq.com`
2. **Resend**：验证 `duedatehq.com` 发信域（在 duedatehq.com zone 加 SPF/DKIM 记录，zone 已在新账号，
   面板里点几下即可）；webhook endpoint 改 `https://app.duedatehq.com/api/webhook/resend`，
   新 signing secret 写回 `RESEND_WEBHOOK_SECRET`。
3. **Stripe**（与 CF 账号无关，price id 不变）：webhook endpoint 改
   `https://app.duedatehq.com/api/auth/stripe/webhook`，新 `whsec_*` 写回 `STRIPE_WEBHOOK_SECRET`。
   ⚠️ 正式发布若切 **live mode**，需整组换 live：`STRIPE_SECRET_KEY` / 各 `STRIPE_PRICE_*` / `STRIPE_WEBHOOK_SECRET`。
4. **Cloudflare AI Gateway**：在新账号建 gateway，slug 仍为 `duedatehq`，provider `openrouter`。
   OpenRouter key（`AI_GATEWAY_PROVIDER_API_KEY`）可复用旧值。

## 8. 配 GitHub Actions 部署密钥

GitHub repo → Settings → Environments → `due-date-hq-staging`：

- `CLOUDFLARE_API_TOKEN` → 换成 **NEW token**（须覆盖 Workers/D1/KV/R2/Queues，否则 Queue preflight 失败）。
- `AUTH_SECRET`：**保持原值**（D1 已迁含 session 表，不必失效）；想干净发布可轮换。
- `GOOGLE_CLIENT_SECRET` / `AI_GATEWAY_PROVIDER_API_KEY`：复用旧值。
- `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET`：按 §7 更新（webhook secret 必新）。
- `STRIPE_*`：按 §7 更新（live mode 则整组换）。
- 必填校验项见 `docs/dev-file/07-DevOps-Testing.md §2.3`。

> （可选改名）若要把 `-staging` 改成 `-prod`/去 `-staging`：D1 create 用新名、所有 toml 资源名同步改、
> CI 不变。代价是 diff 变大、cutover 期多处易错；**默认不改名**，上线后另起一次低风险改名。

## 9. 部署到新账号

```bash
# 本地一键（会跑 check/test/build → ensure-queues → d1 migrate → deploy server → deploy marketing）
CLOUDFLARE_ACCOUNT_ID=$NEW_ACCOUNT_ID CLOUDFLARE_API_TOKEN=$NEW_TOKEN pnpm deploy
# 或：合并改动到 main，让 CI 的 deploy-staging job 自动部署（已改 CLOUDFLARE_ACCOUNT_ID + token）
```

部署后服务跑在 `*.workers.dev`，还没绑正式域名。

## 10. 绑自定义域名（zone 已在新账号且激活）

新账号面板 → Workers & Pages → 各 Worker → Settings → Domains & Routes → Add Custom Domain：

- `due-date-hq-marketing-staging` ← `duedatehq.com` + `www.duedatehq.com`
- `due-date-hq-app-staging` ← `app.duedatehq.com`

zone 已激活，Cloudflare 自动建 DNS 记录 + 签发证书，几分钟生效。

## 11. 验证 cutover

- `https://duedatehq.com` 首页打开，CTA「登录/试用」跳 `https://app.duedatehq.com`。
- `https://app.duedatehq.com` 能 Google 登录（验证 OAuth 回调）、能看到迁移过来的规则数据。
- 发一封测试邮件（验证 Resend 新发信域 + webhook）。
- 触发一次 Stripe test/live checkout（验证 webhook 签名）。
- Cron / Queue：观察 `*/30` pulse 与 email outbox 正常消费；`pnpm cost:report` 看 AI Gateway 走新 slug。
- 旧站 `*.langgenius.app` 仍在线作为回退。

## 12. 收尾（确认新站稳定后）

- 旧域名 `due.langgenius.app` / `app.due.langgenius.app` 加 301 → duedatehq.com（OPC 账号里改 Worker route 或 zone redirect），或直接下线。
- OPC 账号的 D1/R2/Worker 保留一段冷却期再清理。
- 更新 dev-file / dev-log 里的 account id 与域名记述。

## 回退

- 新栈未稳定前不动旧站；出问题直接继续用 `*.langgenius.app`。
- Worker 单独回退用 `wrangler rollback`；D1 已迁移则只回滚到兼容 schema 的上一版 Worker（见 dev-file §2.2 DB 纪律）。
