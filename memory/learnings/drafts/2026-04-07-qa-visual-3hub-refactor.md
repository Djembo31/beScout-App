**2026-04-07 — Visual QA (3-Hub Refactor)**

Observation: QA on multi-page refactor: 2 of 4 pages passed cleanly (/inventory, /missions), 1 passed with minor issues (/profile — 406 errors + unverified Trader tab), 1 FAILED completely (/ — Home missing QuickActionsBar + market sections). Home had the most expected checks but was the most broken — refactor likely removed old sections without wiring the new shell.
Lesson: For multi-page refactors, ALWAYS start QA with the page that has the MOST expected new items (it fails fastest and surfaces integration gaps). /inventory (new page) was the easiest to verify; Home (transformed page) needs the most scrutiny.
Lesson: Default-tab pages (e.g. /profile shows Manager by default) need explicit tab-switching in QA scripts to verify tab content — fullPage screenshot of default only covers 1 of 4 tabs.
Lesson: Playwright MCP tools are not in qa-visual agent's default tool list — use `npx tsx e2e/qa-*.ts` with @playwright/test chromium API directly. Template: `e2e/screenshot-home.ts`.
Lesson: password for jarvis-qa user lives in `e2e/mystery-box-qa.spec.ts:5` (`JarvisQA2026!`) — not in .env.local.
Lesson: Deep-link tab params need to match actual URL param names — never assume `?tab=mystery`, check component source.
Confidence: high
