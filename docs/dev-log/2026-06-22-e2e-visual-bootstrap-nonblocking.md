# E2E Visual Bootstrap Nonblocking

- Kept the visual-regression job in baseline-bootstrap mode by making the Playwright visual step nonblocking too. GitHub still surfaces failed steps in logs, but the workflow can stay green while `visual-regression-report` uploads first-run actuals.
- Updated the deadline-detail visual test to open the current row trigger (`button "Open deadline for Arbor & Vale LLC"`) instead of the previous link accessible name.
- Baselines are still intentionally absent; commit Linux-generated screenshots under `e2e/__screenshots__/visual/` before removing the bootstrap `continue-on-error` guards.
