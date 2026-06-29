# BeScout Project Memory Index

> Projekt-interne Memory-Files fuer Agents und Sessions.
> User-Memory (auto-loaded) liegt in `~/.claude/projects/`.

## Strategic + Architectural Decisions
- **[decisions.md](decisions.md)** — Persistent Decisions Log (PRODUCT + ARCHITECTURE + PROCESS) mit ID-Schema D<n>, Alternativen, Superseded-Tracking. **Erster Stop bei "was haben wir nochmal entschieden?"**

## Knowledge Base
- [errors.md](errors.md) — Top 50 Fehler nach Kategorie mit Fixes
- [patterns.md](patterns.md) — Top 20 etablierte Code-Patterns
- [failures.md](failures.md) — Failure-Mode Quick-Lookup (Slice 188) — "meine 3 typischen Fehler beim X" in 30 Sek, Domain-Tables verlinkt zu errors-*.md
- [session-handoff.md](session-handoff.md) — Letzte Session + naechste Schritte
- Aktueller Slice/Sprint-Stand: `worklog/active.md` (SSOT) — current-sprint.md retired E0-W3b.

## Operative Runbooks (post-Beta, INDEX-geroutet — Beta ABGEBROCHEN D111)
> Beta-Test-Ops-Docs (exit-criteria/cost-budget/tr-locale/testplan/results/testing-runbook) entfernt Slice 452 (K2.2c). 2 generische Runbooks behalten:
- [beta-rollback-runbook.md](beta-rollback-runbook.md) — Vercel-Rollback-Prozedur / Deploy-Notfall (INDEX research)
- [beta-sentry-alerts-runbook.md](beta-sentry-alerts-runbook.md) — Sentry-Alert-Rules Setup (INDEX research)

## Feature Specs
- [features/fantasy.md](features/fantasy.md) — Fantasy System (12 Flows)
- [features/trading-missions-order-expiry.md](features/trading-missions-order-expiry.md) — Trading Missions + Order Expiry
- [features/card-visual-overhaul.md](features/card-visual-overhaul.md) — Scout Card Visual Overhaul
- [features/data-integrity-audit.md](features/data-integrity-audit.md) — Data Integrity Audit
- [features/dead-code-cleanup.md](features/dead-code-cleanup.md) — Dead Code Cleanup
- [features/fantasy-api-cron.md](features/fantasy-api-cron.md) — Fantasy API Cron
- [features/push-notification-strategy.md](features/push-notification-strategy.md) — Push Notifications

## Dependencies
- [deps/cross-domain-map.md](deps/cross-domain-map.md) — Cross-Domain Trigger Table + Dependency Matrix

## Learnings (Agent Skills)
- [learnings/beScout-frontend.md](learnings/beScout-frontend.md) — Frontend Agent Learnings
- [learnings/beScout-backend.md](learnings/beScout-backend.md) — Backend Agent Learnings
- [learnings/beScout-business.md](learnings/beScout-business.md) — Business Agent Learnings
- [learnings/cto-review.md](learnings/cto-review.md) — CTO Review Learnings
- [learnings/deliver.md](learnings/deliver.md) — Deliver Skill Learnings
- [learnings/impact.md](learnings/impact.md) — Impact Analysis Learnings

## Metrics
- [metrics/sessions.jsonl](metrics/sessions.jsonl) — Session Metrics (JSONL)

## Business
- [project_missing_revenue_streams.md](project_missing_revenue_streams.md) — 7 identified revenue opportunities

## Rules Pending
- [rules-pending/common-errors-pending.md](rules-pending/common-errors-pending.md) — Pending error rules for promotion
