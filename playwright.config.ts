import { defineConfig, devices } from '@playwright/test'

const localWorkerPort = process.env.E2E_WORKER_PORT ?? '8787'
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${localWorkerPort}`
const marketingBaseURL = process.env.E2E_MARKETING_BASE_URL ?? 'http://127.0.0.1:4321'
const marketingPort = new URL(marketingBaseURL).port || '4321'
const usesExternalTarget = Boolean(process.env.E2E_BASE_URL)
const reuseExistingServer = Boolean(process.env.E2E_REUSE_EXISTING_SERVER)
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
const wranglerPersistTo =
  process.env.E2E_WRANGLER_PERSIST_TO ??
  `${process.env.RUNNER_TEMP ?? '/tmp'}/duedatehq-e2e-wrangler-${process.pid}`
const wranglerPersistArg = `--persist-to ${shellQuote(wranglerPersistTo)}`

const localWorkerCommand = [
  'pnpm --filter @duedatehq/app build',
  [
    'pnpm --dir apps/server exec wrangler d1 migrations apply DB --local',
    wranglerPersistArg,
    '--config wrangler.toml',
  ].join(' '),
  [
    `pnpm --dir apps/server exec wrangler dev --local --ip 127.0.0.1 --port ${localWorkerPort}`,
    wranglerPersistArg,
    '--var AI_GATEWAY_PROVIDER_API_KEY:',
    '--var AI_GATEWAY_API_KEY:',
    '--var STRIPE_SECRET_KEY:stripe_e2e_secret',
    '--var STRIPE_WEBHOOK_SECRET:stripe_e2e_webhook_secret',
    '--var STRIPE_PRICE_SOLO_MONTHLY:price_solo_monthly_e2e',
    '--var STRIPE_PRICE_SOLO_YEARLY:price_solo_yearly_e2e',
    '--var STRIPE_PRICE_PRO_MONTHLY:price_pro_monthly_e2e',
    '--var STRIPE_PRICE_PRO_YEARLY:price_pro_yearly_e2e',
    '--var STRIPE_PRICE_TEAM_MONTHLY:price_team_monthly_e2e',
    '--var STRIPE_PRICE_TEAM_YEARLY:price_team_yearly_e2e',
  ].join(' '),
].join(' && ')

const localMarketingCommand = [
  `PUBLIC_APP_URL=${baseURL} pnpm --filter @duedatehq/marketing build`,
  `pnpm --filter @duedatehq/marketing preview --host 127.0.0.1 --port ${marketingPort}`,
].join(' && ')

// Visual-regression spec (screenshot snapshots). It runs ONLY in the
// dedicated `visual` project (opt-in via E2E_VISUAL=1) so the functional
// chromium suite never compares pixels. See e2e/tests/visual-regression.spec.ts
// and e2e/README.md ("Visual regression") for the baseline bootstrap.
const visualSpecPattern = /visual-regression\.spec\.ts$/

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './test-results/e2e',
  timeout: 30_000,
  // Screenshot baselines are OS/font-sensitive, so they are LINUX-generated
  // (the CI ubuntu runner / the Playwright Linux Docker image) and committed
  // under e2e/__screenshots__/{projectName}/... — the path template below
  // deliberately omits {platform} so a macOS run compares against the Linux
  // baselines instead of silently writing a parallel darwin set.
  snapshotPathTemplate: 'e2e/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Playwright already disables CSS animations/transitions for the
      // shot; caret hidden + CSS-pixel scale keep text fields and HiDPI
      // runners from producing phantom diffs.
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // Tolerate up to 1% of pixels drifting (antialiasing noise) before
      // a page counts as visually regressed.
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  ...(usesExternalTarget
    ? {}
    : {
        webServer: [
          {
            command: localWorkerCommand,
            url: `${baseURL}/api/health`,
            reuseExistingServer,
            timeout: 120_000,
            stdout: 'pipe',
            stderr: 'pipe',
          },
          {
            command: localMarketingCommand,
            url: marketingBaseURL,
            reuseExistingServer,
            timeout: 120_000,
            stdout: 'pipe',
            stderr: 'pipe',
          },
        ],
      }),
  projects: [
    {
      name: 'chromium',
      // The visual spec only makes sense with screenshot baselines; keep it
      // out of the functional suite so `pnpm test:e2e` stays green without
      // any committed baselines.
      testIgnore: visualSpecPattern,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    // Opt-in screenshot-regression project: `E2E_VISUAL=1 pnpm exec playwright
    // test --project=visual`. Gated behind an env var so default local runs and
    // the functional CI job never pick it up by accident.
    ...(process.env.E2E_VISUAL
      ? [
          {
            name: 'visual',
            testMatch: visualSpecPattern,
            // Full-page shots of data-heavy surfaces (rules library) need
            // more headroom than the functional 30s budget.
            timeout: 60_000,
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1440, height: 900 },
              // toHaveScreenshot only freezes CSS animations — framer-motion
              // springs run in JS, so ask the app for reduced motion too.
              contextOptions: { reducedMotion: 'reduce' as const },
            },
          },
        ]
      : []),
  ],
})
